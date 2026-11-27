package admin

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"wedding-zedlabs/internal/audit"
	"wedding-zedlabs/internal/auth"
	"wedding-zedlabs/internal/db"
	"wedding-zedlabs/internal/domain"
)

const (
	hargaPerTamu   = 200
	minimalTagihan = 50000
)

type Handler struct {
	pool     *pgxpool.Pool
	resolver *domain.Resolver
	tokens   *auth.TokenService
	audit    *audit.Logger
}

func NewHandler(pool *pgxpool.Pool, resolver *domain.Resolver, tokens *auth.TokenService, auditLog *audit.Logger) *Handler {
	return &Handler{pool: pool, resolver: resolver, tokens: tokens, audit: auditLog}
}

func tulisJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func (h *Handler) Masuk(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 8192)).Decode(&req); err != nil {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "permintaan tidak valid"})
		return
	}
	uname := strings.TrimSpace(strings.ToLower(req.Username))
	if uname == "" || req.Password == "" {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "username dan password wajib diisi"})
		return
	}

	var id, role, hash, status, fullName string
	var weddingID *string
	var terkunci *time.Time
	err := h.pool.QueryRow(r.Context(), `
		SELECT id::text, wedding_id::text, role, password_hash, status, full_name, terkunci_hingga
		FROM users WHERE lower(username) = $1 LIMIT 1
	`, uname).Scan(&id, &weddingID, &role, &hash, &status, &fullName, &terkunci)
	if errors.Is(err, pgx.ErrNoRows) {
		tulisJSON(w, http.StatusUnauthorized, map[string]string{"error": "username atau password tidak valid"})
		return
	}
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal memeriksa akun"})
		return
	}
	if terkunci != nil && time.Now().Before(*terkunci) {
		tulisJSON(w, http.StatusTooManyRequests, map[string]string{"error": "akun terkunci sementara"})
		return
	}
	if status != "active" || !auth.VerifikasiSandi(req.Password, hash) {
		_, _ = h.pool.Exec(r.Context(), `
			UPDATE users SET gagal_login = gagal_login + 1,
				terkunci_hingga = CASE WHEN gagal_login + 1 >= 5 THEN now() + interval '15 minutes' ELSE terkunci_hingga END
			WHERE id = $1::uuid
		`, id)
		tulisJSON(w, http.StatusUnauthorized, map[string]string{"error": "username atau password tidak valid"})
		return
	}

	wid := ""
	if weddingID != nil {
		wid = *weddingID
	}
	ok, _, err := h.resolver.MengizinkanAkun(r.Context(), domain.HostPermintaan(r), role, wid)
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal memeriksa domain"})
		return
	}
	if !ok {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "akun ini tidak terdaftar pada domain undangan ini"})
		return
	}

	if auth.PerluRehashArgon2id(hash) {
		if baru, err := auth.HashSandi(req.Password); err == nil {
			_, _ = h.pool.Exec(r.Context(), `UPDATE users SET password_hash = $1, gagal_login = 0, terkunci_hingga = NULL, diperbarui_pada = now() WHERE id = $2::uuid`, baru, id)
		}
	} else {
		_, _ = h.pool.Exec(r.Context(), `UPDATE users SET gagal_login = 0, terkunci_hingga = NULL WHERE id = $1::uuid`, id)
	}

	tok, err := h.tokens.Terbitkan(id, wid, role, uname)
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal menerbitkan sesi"})
		return
	}
	_ = h.audit.Catat(r.Context(), wid, id, "auth_masuk", id, map[string]string{"role": role})
	tulisJSON(w, http.StatusOK, map[string]any{
		"token_akses": tok,
		"user": map[string]any{
			"id": id, "wedding_id": wid, "username": uname, "full_name": fullName, "role": role,
		},
	})
}

func (h *Handler) Saya(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil {
		tulisJSON(w, http.StatusUnauthorized, map[string]string{"error": "tidak terautentikasi"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]any{
		"id": k.UserID, "wedding_id": k.WeddingID, "username": k.Username, "role": k.Role,
	})
}

func (h *Handler) DaftarTamu(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	tamu := make([]map[string]any, 0)
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		rows, err := tx.Query(r.Context(), `
			SELECT id::text, code, name, phone, address, group_name, quota, checked_in, checked_in_pax
			FROM guests ORDER BY dibuat_pada DESC LIMIT 500
		`)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var id, code, name, phone, addr, grp string
			var quota, pax int
			var ci bool
			if err := rows.Scan(&id, &code, &name, &phone, &addr, &grp, &quota, &ci, &pax); err != nil {
				return err
			}
			tamu = append(tamu, map[string]any{
				"id": id, "code": code, "name": name, "phone": phone, "address": addr,
				"group_name": grp, "quota": quota, "checked_in": ci, "checked_in_pax": pax,
			})
		}
		return rows.Err()
	})
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal memuat tamu"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]any{"guests": tamu})
}

func (h *Handler) TambahTamu(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	var req struct {
		Name      string `json:"name"`
		Phone     string `json:"phone"`
		Address   string `json:"address"`
		GroupName string `json:"group_name"`
		Quota     int    `json:"quota"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 8192)).Decode(&req); err != nil {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "payload tidak valid"})
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "nama tamu wajib diisi"})
		return
	}
	if req.Quota < 1 {
		req.Quota = 2
	}
	if req.Address == "" {
		req.Address = "Di Tempat"
	}

	var kuotaLimit int
	if err := h.pool.QueryRow(r.Context(), `SELECT guest_quota_limit FROM weddings WHERE id = $1::uuid`, k.WeddingID).Scan(&kuotaLimit); err != nil {
		tulisJSON(w, http.StatusNotFound, map[string]string{"error": "undangan tidak ditemukan"})
		return
	}

	acak := make([]byte, 4)
	_, _ = rand.Read(acak)
	kode := "G-" + strings.ToUpper(hex.EncodeToString(acak))

	var guestID string
	var kuotaPenuh bool
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		var jml int
		if err := tx.QueryRow(r.Context(), `SELECT COUNT(*) FROM guests`).Scan(&jml); err != nil {
			return err
		}
		if jml >= kuotaLimit {
			kuotaPenuh = true
			return nil
		}
		return tx.QueryRow(r.Context(), `
			INSERT INTO guests (wedding_id, code, name, phone, address, group_name, quota)
			VALUES ($1::uuid, $2, $3, $4, $5, $6, $7) RETURNING id::text
		`, k.WeddingID, kode, req.Name, strings.TrimSpace(req.Phone), req.Address, strings.TrimSpace(req.GroupName), req.Quota).Scan(&guestID)
	})
	if kuotaPenuh {
		tulisJSON(w, http.StatusPaymentRequired, map[string]string{"error": "kuota tamu tercapai, silakan ajukan penambahan kuota"})
		return
	}
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal menambah tamu"})
		return
	}
	tulisJSON(w, http.StatusCreated, map[string]any{"id": guestID, "code": kode, "name": req.Name})
}

func (h *Handler) CheckinQR(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	var req struct {
		Code string `json:"code"`
		Pax  int    `json:"pax"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&req); err != nil || strings.TrimSpace(req.Code) == "" {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "kode QR wajib diisi"})
		return
	}
	if req.Pax < 1 {
		req.Pax = 1
	}
	var nama string
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		return tx.QueryRow(r.Context(), `
			UPDATE guests SET checked_in = true, checked_in_at = now(), checked_in_pax = $1
			WHERE code = $2 RETURNING name
		`, req.Pax, strings.TrimSpace(req.Code)).Scan(&nama)
	})
	if errors.Is(err, pgx.ErrNoRows) {
		tulisJSON(w, http.StatusNotFound, map[string]string{"error": "kode tamu tidak ditemukan"})
		return
	}
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal check-in"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]any{"status": "checked_in", "name": nama, "pax": req.Pax})
}

func (h *Handler) DaftarTagihan(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	hasil := make([]map[string]any, 0)
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		rows, err := tx.Query(r.Context(), `
			SELECT id::text, invoice_code, current_quota, requested_total_quota, added_guests, amount, status, versi, dibuat_pada
			FROM billing_orders ORDER BY dibuat_pada DESC LIMIT 50
		`)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var id, inv, status string
			var curQ, reqQ, addG, amt, ver int
			var tgl time.Time
			if err := rows.Scan(&id, &inv, &curQ, &reqQ, &addG, &amt, &status, &ver, &tgl); err != nil {
				return err
			}
			hasil = append(hasil, map[string]any{
				"id": id, "invoice_code": inv, "current_quota": curQ, "requested_total_quota": reqQ,
				"added_guests": addG, "amount": amt, "status": status, "versi": ver, "created_at": tgl,
			})
		}
		return rows.Err()
	})
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal memuat tagihan"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]any{"orders": hasil})
}

func (h *Handler) BuatTagihan(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	var req struct {
		RequestedTotalQuota int `json:"requested_total_quota"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&req); err != nil {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "payload tidak valid"})
		return
	}
	var curQuota int
	if err := h.pool.QueryRow(r.Context(), `SELECT guest_quota_limit FROM weddings WHERE id = $1::uuid`, k.WeddingID).Scan(&curQuota); err != nil {
		tulisJSON(w, http.StatusNotFound, map[string]string{"error": "undangan tidak ditemukan"})
		return
	}
	added := req.RequestedTotalQuota - curQuota
	if added <= 0 {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "kuota baru harus lebih besar dari kuota saat ini"})
		return
	}
	amount := added * hargaPerTamu
	if amount < minimalTagihan {
		amount = minimalTagihan
	}
	acak := make([]byte, 3)
	_, _ = rand.Read(acak)
	inv := fmt.Sprintf("INV-WED-%s-%s", time.Now().UTC().Format("20060102"), strings.ToUpper(hex.EncodeToString(acak)))

	var orderID string
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		return tx.QueryRow(r.Context(), `
			INSERT INTO billing_orders (wedding_id, invoice_code, current_quota, requested_total_quota, added_guests, amount, status)
			VALUES ($1::uuid, $2, $3, $4, $5, $6, 'review') RETURNING id::text
		`, k.WeddingID, inv, curQuota, req.RequestedTotalQuota, added, amount).Scan(&orderID)
	})
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal membuat tagihan"})
		return
	}
	tulisJSON(w, http.StatusCreated, map[string]any{
		"id": orderID, "invoice_code": inv, "amount": amount, "requested_total_quota": req.RequestedTotalQuota, "versi": 1,
	})
}

func (h *Handler) SuperadminDaftarUndangan(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.Role != "superadmin" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus superadmin"})
		return
	}
	rows, err := h.pool.Query(r.Context(), `
		SELECT id::text, slug, title, COALESCE(custom_domain,''), status, is_demo, guest_quota_limit
		FROM weddings ORDER BY is_demo DESC, dibuat_pada DESC
	`)
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal memuat undangan"})
		return
	}
	defer rows.Close()
	hasil := make([]domain.InfoUndangan, 0)
	for rows.Next() {
		var u domain.InfoUndangan
		if err := rows.Scan(&u.ID, &u.Slug, &u.Title, &u.CustomDomain, &u.Status, &u.IsDemo, &u.GuestQuotaLimit); err == nil {
			hasil = append(hasil, u)
		}
	}
	tulisJSON(w, http.StatusOK, map[string]any{"weddings": hasil})
}

func (h *Handler) SuperadminUbahDomain(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.Role != "superadmin" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus superadmin"})
		return
	}
	wid := r.PathValue("id")
	var req struct {
		CustomDomain string `json:"custom_domain"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&req); err != nil {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "payload tidak valid"})
		return
	}
	dom, err := h.resolver.ValidasiDomainKustom(req.CustomDomain)
	if err != nil {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	_, err = h.pool.Exec(r.Context(), `UPDATE weddings SET custom_domain = NULLIF($1,''), diperbarui_pada = now() WHERE id = $2::uuid AND is_demo = false`, dom, wid)
	if err != nil {
		tulisJSON(w, http.StatusConflict, map[string]string{"error": "domain kustom sudah dipakai undangan lain"})
		return
	}
	_ = h.audit.Catat(r.Context(), wid, k.UserID, "ubah_domain_kustom", wid, map[string]string{"custom_domain": dom})
	tulisJSON(w, http.StatusOK, map[string]any{"status": "diperbarui", "custom_domain": dom})
}

func (h *Handler) SuperadminSetujuiTagihan(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.Role != "superadmin" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus superadmin"})
		return
	}
	orderID := r.PathValue("id")
	var req struct {
		VersiDasar int    `json:"versi_dasar"`
		AdminNote  string `json:"admin_note"`
	}
	_ = json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&req)
	if req.VersiDasar < 1 {
		req.VersiDasar = 1
	}

	var wid string
	var reqQuota int
	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal memulai transaksi"})
		return
	}
	defer func() { _ = tx.Rollback(r.Context()) }()

	err = tx.QueryRow(r.Context(), `
		UPDATE billing_orders
		SET status = 'paid', admin_note = $1, verified_at = now(), versi = versi + 1, diperbarui_pada = now()
		WHERE id = $2::uuid AND versi = $3 AND status NOT IN ('paid','cancelled')
		RETURNING wedding_id::text, requested_total_quota
	`, strings.TrimSpace(req.AdminNote), orderID, req.VersiDasar).Scan(&wid, &reqQuota)
	if errors.Is(err, pgx.ErrNoRows) {
		tulisJSON(w, http.StatusConflict, map[string]string{"error": "konflik versi atau tagihan sudah selesai diproses"})
		return
	}
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal menyetujui tagihan"})
		return
	}
	if _, err := tx.Exec(r.Context(), `
		UPDATE weddings SET guest_quota_limit = GREATEST(guest_quota_limit, $1), diperbarui_pada = now() WHERE id = $2::uuid
	`, reqQuota, wid); err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal memperbarui kuota"})
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal commit"})
		return
	}
	_ = h.audit.Catat(r.Context(), wid, k.UserID, "tagihan_disetujui", orderID, map[string]any{"kuota_baru": reqQuota})
	tulisJSON(w, http.StatusOK, map[string]any{"status": "paid", "guest_quota_limit": reqQuota})
}
