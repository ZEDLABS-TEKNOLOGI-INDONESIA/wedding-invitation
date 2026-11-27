package publik

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"wedding-zedlabs/internal/db"
	"wedding-zedlabs/internal/domain"
)

var privateKeys = map[string]bool{
	"WA_BASE_URL": true, "WA_API_KEY": true, "WA_API_SECRET": true,
	"WA_ADMIN_NUMBERS": true, "WA_NOTIFY_ADMIN_RSVP": true,
	"WA_NOTIFY_ADMIN_WISH": true, "WA_AUTO_CONFIRM_GUEST": true,
	"WA_AUTO_REMINDER_H1": true, "PLANNER_SAVINGS_TARGET": true,
}

type Handler struct {
	pool            *pgxpool.Pool
	resolver        *domain.Resolver
	statistikKeyID  string
	statistikSecret string
	muNonce         sync.Mutex
	nonces          map[string]time.Time
}

func NewHandler(pool *pgxpool.Pool, resolver *domain.Resolver, statKeyID, statSecret string) *Handler {
	return &Handler{
		pool:            pool,
		resolver:        resolver,
		statistikKeyID:  strings.TrimSpace(statKeyID),
		statistikSecret: strings.TrimSpace(statSecret),
		nonces:          make(map[string]time.Time),
	}
}

func tulisJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	tulisJSON(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"layanan": "wedding-v2",
		"waktu":   time.Now().UTC().Format(time.RFC3339),
	})
}

func (h *Handler) DomainPublik(w http.ResponseWriter, r *http.Request) {
	host := domain.NormalkanHost(r.URL.Query().Get("host"))
	if host == "" {
		host = domain.HostPermintaan(r)
	}
	if h.resolver.ApakahHostUtama(host) {
		tulisJSON(w, http.StatusOK, map[string]any{
			"mode":         "utama",
			"domain_utama": h.resolver.DomainUtama(),
			"host":         host,
			"undangan":     nil,
		})
		return
	}
	info, err := h.resolver.DariHost(r.Context(), host)
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal memeriksa domain"})
		return
	}
	if info == nil {
		tulisJSON(w, http.StatusNotFound, map[string]string{"error": "domain belum terdaftar pada layanan undangan"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]any{
		"mode":         "kustom",
		"domain_utama": h.resolver.DomainUtama(),
		"host":         host,
		"undangan":     info,
	})
}

func (h *Handler) DetailUndangan(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	info, err := h.resolver.DariSlug(r.Context(), slug)
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal membaca undangan"})
		return
	}
	if info == nil {
		tulisJSON(w, http.StatusNotFound, map[string]string{"error": "undangan tidak ditemukan"})
		return
	}

	cfg := make(map[string]string)
	wishes := make([]map[string]any, 0)
	err = db.DenganTenantTx(r.Context(), h.pool, info.ID, func(tx pgx.Tx) error {
		rows, err := tx.Query(r.Context(), `SELECT key, value FROM wedding_config`)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var k, v string
			if err := rows.Scan(&k, &v); err == nil && !privateKeys[k] {
				cfg[k] = v
			}
		}
		wRows, err := tx.Query(r.Context(), `SELECT id::text, name, message, dibuat_pada FROM wishes ORDER BY dibuat_pada DESC LIMIT 50`)
		if err != nil {
			return err
		}
		defer wRows.Close()
		for wRows.Next() {
			var id, nama, pesan string
			var tgl time.Time
			if err := wRows.Scan(&id, &nama, &pesan, &tgl); err == nil {
				wishes = append(wishes, map[string]any{"id": id, "name": nama, "message": pesan, "created_at": tgl})
			}
		}
		return nil
	})
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal memuat data undangan"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]any{"undangan": info, "config": cfg, "wishes": wishes})
}

func (h *Handler) KirimRSVP(w http.ResponseWriter, r *http.Request) {
	info, err := h.resolver.DariSlug(r.Context(), r.PathValue("slug"))
	if err != nil || info == nil {
		tulisJSON(w, http.StatusNotFound, map[string]string{"error": "undangan tidak ditemukan"})
		return
	}
	var req struct {
		GuestName  string `json:"guest_name"`
		Phone      string `json:"phone"`
		Attendance string `json:"attendance"`
		GuestCount int    `json:"guest_count"`
		Message    string `json:"message"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 8192)).Decode(&req); err != nil {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "payload tidak valid"})
		return
	}
	req.GuestName = strings.TrimSpace(req.GuestName)
	if req.GuestName == "" {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "nama tamu wajib diisi"})
		return
	}
	if req.Attendance != "hadir" && req.Attendance != "tidak_hadir" && req.Attendance != "ragu" {
		req.Attendance = "hadir"
	}
	if req.GuestCount < 0 {
		req.GuestCount = 1
	}

	var id string
	err = db.DenganTenantTx(r.Context(), h.pool, info.ID, func(tx pgx.Tx) error {
		if err := tx.QueryRow(r.Context(), `
			INSERT INTO rsvps (wedding_id, guest_name, phone, attendance, guest_count, message)
			VALUES ($1::uuid, $2, $3, $4, $5, $6) RETURNING id::text
		`, info.ID, req.GuestName, strings.TrimSpace(req.Phone), req.Attendance, req.GuestCount, strings.TrimSpace(req.Message)).Scan(&id); err != nil {
			return err
		}
		_, err := tx.Exec(r.Context(), `
			INSERT INTO outbox_pesan (wedding_id, tujuan, jenis, payload_json)
			VALUES ($1::uuid, 'admin_mempelai', 'notifikasi_rsvp', $2::jsonb)
		`, info.ID, fmt.Sprintf(`{"guest_name":%q,"attendance":%q,"guest_count":%d}`, req.GuestName, req.Attendance, req.GuestCount))
		return err
	})
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal menyimpan RSVP"})
		return
	}
	tulisJSON(w, http.StatusCreated, map[string]any{"id": id, "status": "tersimpan"})
}

func (h *Handler) KirimUcapan(w http.ResponseWriter, r *http.Request) {
	info, err := h.resolver.DariSlug(r.Context(), r.PathValue("slug"))
	if err != nil || info == nil {
		tulisJSON(w, http.StatusNotFound, map[string]string{"error": "undangan tidak ditemukan"})
		return
	}
	var req struct {
		Name    string `json:"name"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 8192)).Decode(&req); err != nil {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "payload tidak valid"})
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Message = strings.TrimSpace(req.Message)
	if req.Name == "" || req.Message == "" {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "nama dan ucapan wajib diisi"})
		return
	}
	var id string
	err = db.DenganTenantTx(r.Context(), h.pool, info.ID, func(tx pgx.Tx) error {
		return tx.QueryRow(r.Context(), `
			INSERT INTO wishes (wedding_id, name, message) VALUES ($1::uuid, $2, $3) RETURNING id::text
		`, info.ID, req.Name, req.Message).Scan(&id)
	})
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal menyimpan ucapan"})
		return
	}
	tulisJSON(w, http.StatusCreated, map[string]any{"id": id, "status": "tersimpan"})
}

func (h *Handler) StatistikPublik(w http.ResponseWriter, r *http.Request) {
	if h.statistikKeyID == "" || h.statistikSecret == "" {
		tulisJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "endpoint statistik publik belum dikonfigurasi"})
		return
	}
	versi := r.Header.Get("X-Zedlabs-Signature-Version")
	keyID := r.Header.Get("X-Zedlabs-Key-Id")
	tsStr := r.Header.Get("X-Zedlabs-Timestamp")
	nonce := r.Header.Get("X-Zedlabs-Nonce")
	sig := r.Header.Get("X-Zedlabs-Signature")
	if versi != "2" || !hmac.Equal([]byte(keyID), []byte(h.statistikKeyID)) || len(nonce) < 16 {
		tulisJSON(w, http.StatusUnauthorized, map[string]string{"error": "autentikasi HMAC v2 tidak sah"})
		return
	}
	ts, err := strconv.ParseInt(tsStr, 10, 64)
	if err != nil || abs64(time.Now().Unix()-ts) > 300 {
		tulisJSON(w, http.StatusUnauthorized, map[string]string{"error": "stempel waktu kedaluwarsa"})
		return
	}
	body, _ := io.ReadAll(io.LimitReader(r.Body, 4096))
	bodySum := sha256.Sum256(body)
	canonical := fmt.Sprintf("%s\n%s\n%s\n%s\n%s", r.Method, r.URL.RequestURI(), tsStr, nonce, hex.EncodeToString(bodySum[:]))
	mac := hmac.New(sha256.New, []byte(h.statistikSecret))
	mac.Write([]byte(canonical))
	if !hmac.Equal([]byte(hex.EncodeToString(mac.Sum(nil))), []byte(sig)) || !h.pakaiNonce(nonce) {
		tulisJSON(w, http.StatusUnauthorized, map[string]string{"error": "tanda tangan HMAC tidak cocok atau replay"})
		return
	}

	var undanganAktif, tamuTotal, rsvpTotal, ucapanTotal int64
	_ = h.pool.QueryRow(r.Context(), `SELECT COUNT(*) FROM weddings WHERE status = 'active' AND is_demo = false`).Scan(&undanganAktif)
	_ = h.pool.QueryRow(r.Context(), `SELECT COUNT(*) FROM guests`).Scan(&tamuTotal)
	_ = h.pool.QueryRow(r.Context(), `SELECT COUNT(*) FROM rsvps`).Scan(&rsvpTotal)
	_ = h.pool.QueryRow(r.Context(), `SELECT COUNT(*) FROM wishes`).Scan(&ucapanTotal)

	now := time.Now().UTC().Format(time.RFC3339)
	tulisJSON(w, http.StatusOK, map[string]any{
		"produk": "wedding",
		"metrik": []map[string]any{
			{"kunci": "undangan_aktif", "label": "Undangan aktif", "nilai": undanganAktif, "satuan": "undangan", "per_waktu": now},
			{"kunci": "tamu_terdaftar", "label": "Tamu terdaftar", "nilai": tamuTotal, "satuan": "tamu", "per_waktu": now},
			{"kunci": "konfirmasi_hadir", "label": "Konfirmasi kehadiran", "nilai": rsvpTotal, "satuan": "konfirmasi", "per_waktu": now},
			{"kunci": "ucapan_masuk", "label": "Ucapan masuk", "nilai": ucapanTotal, "satuan": "ucapan", "per_waktu": now},
		},
	})
}

func (h *Handler) pakaiNonce(n string) bool {
	now := time.Now()
	h.muNonce.Lock()
	defer h.muNonce.Unlock()
	for k, exp := range h.nonces {
		if now.After(exp) {
			delete(h.nonces, k)
		}
	}
	if _, ada := h.nonces[n]; ada {
		return false
	}
	h.nonces[n] = now.Add(10 * time.Minute)
	return true
}

func abs64(v int64) int64 {
	if v < 0 {
		return -v
	}
	return v
}
