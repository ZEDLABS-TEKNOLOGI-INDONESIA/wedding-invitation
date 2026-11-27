package admin

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"wedding-zedlabs/internal/auth"
	"wedding-zedlabs/internal/db"
)

// --- Konfigurasi Undangan (wedding_config) ---

func (h *Handler) AmbilKonfigurasi(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	cfg := make(map[string]string)
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		rows, err := tx.Query(r.Context(), `SELECT key, value FROM wedding_config`)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var kk, vv string
			if err := rows.Scan(&kk, &vv); err == nil {
				cfg[kk] = vv
			}
		}
		return rows.Err()
	})
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal memuat konfigurasi"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]any{"config": cfg})
}

func (h *Handler) SimpanKonfigurasi(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	var req map[string]string
	if err := json.NewDecoder(io.LimitReader(r.Body, 131072)).Decode(&req); err != nil || len(req) == 0 {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "payload konfigurasi tidak valid"})
		return
	}
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		for kk, vv := range req {
			kk = strings.TrimSpace(kk)
			if kk == "" || len(kk) > 80 {
				continue
			}
			if _, err := tx.Exec(r.Context(), `
				INSERT INTO wedding_config (wedding_id, key, value) VALUES ($1::uuid, $2, $3)
				ON CONFLICT (wedding_id, key) DO UPDATE SET value = EXCLUDED.value
			`, k.WeddingID, kk, vv); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal menyimpan konfigurasi"})
		return
	}
	_ = h.audit.Catat(r.Context(), k.WeddingID, k.UserID, "konfigurasi_diperbarui", k.WeddingID, map[string]int{"jumlah_kunci": len(req)})
	tulisJSON(w, http.StatusOK, map[string]any{"status": "tersimpan", "jumlah": len(req)})
}

// --- Tamu (Ubah, Hapus, Batal Check-In) ---

func (h *Handler) UbahTamu(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	tamuID := r.PathValue("id")
	var req struct {
		Name      string `json:"name"`
		Phone     string `json:"phone"`
		Address   string `json:"address"`
		GroupName string `json:"group_name"`
		Quota     int    `json:"quota"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 8192)).Decode(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "nama tamu wajib diisi"})
		return
	}
	if req.Quota < 1 {
		req.Quota = 2
	}
	var updated int64
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		tag, err := tx.Exec(r.Context(), `
			UPDATE guests SET name = $1, phone = $2, address = $3, group_name = $4, quota = $5
			WHERE id = $6::uuid
		`, strings.TrimSpace(req.Name), strings.TrimSpace(req.Phone), strings.TrimSpace(req.Address), strings.TrimSpace(req.GroupName), req.Quota, tamuID)
		updated = tag.RowsAffected()
		return err
	})
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal memperbarui tamu"})
		return
	}
	if updated == 0 {
		tulisJSON(w, http.StatusNotFound, map[string]string{"error": "tamu tidak ditemukan"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]string{"status": "diperbarui"})
}

func (h *Handler) HapusTamu(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	tamuID := r.PathValue("id")
	var deleted int64
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		tag, err := tx.Exec(r.Context(), `DELETE FROM guests WHERE id = $1::uuid`, tamuID)
		deleted = tag.RowsAffected()
		return err
	})
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal menghapus tamu"})
		return
	}
	if deleted == 0 {
		tulisJSON(w, http.StatusNotFound, map[string]string{"error": "tamu tidak ditemukan"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]string{"status": "dihapus"})
}

func (h *Handler) BatalCheckinQR(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&req); err != nil || strings.TrimSpace(req.Code) == "" {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "kode QR wajib diisi"})
		return
	}
	var updated int64
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		tag, err := tx.Exec(r.Context(), `UPDATE guests SET checked_in = false, checked_in_at = NULL, checked_in_pax = 0 WHERE code = $1`, strings.TrimSpace(req.Code))
		updated = tag.RowsAffected()
		return err
	})
	if err != nil || updated == 0 {
		tulisJSON(w, http.StatusNotFound, map[string]string{"error": "kode tamu tidak ditemukan"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]string{"status": "dibatalkan"})
}

// --- RSVP & Ucapan Admin ---

func (h *Handler) DaftarRSVP(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	hasil := make([]map[string]any, 0)
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		rows, err := tx.Query(r.Context(), `
			SELECT id::text, guest_name, phone, attendance, guest_count, message, dibuat_pada
			FROM rsvps ORDER BY dibuat_pada DESC LIMIT 500
		`)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var id, nama, phone, att, msg string
			var cnt int
			var tgl time.Time
			if err := rows.Scan(&id, &nama, &phone, &att, &cnt, &msg, &tgl); err == nil {
				hasil = append(hasil, map[string]any{
					"id": id, "guest_name": nama, "phone": phone, "attendance": att,
					"guest_count": cnt, "message": msg, "created_at": tgl,
				})
			}
		}
		return rows.Err()
	})
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal memuat RSVP"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]any{"rsvps": hasil})
}

func (h *Handler) HapusRSVP(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	var deleted int64
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		tag, err := tx.Exec(r.Context(), `DELETE FROM rsvps WHERE id = $1::uuid`, r.PathValue("id"))
		deleted = tag.RowsAffected()
		return err
	})
	if err != nil || deleted == 0 {
		tulisJSON(w, http.StatusNotFound, map[string]string{"error": "RSVP tidak ditemukan"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]string{"status": "dihapus"})
}

func (h *Handler) DaftarUcapan(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	hasil := make([]map[string]any, 0)
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		rows, err := tx.Query(r.Context(), `SELECT id::text, name, message, dibuat_pada FROM wishes ORDER BY dibuat_pada DESC LIMIT 500`)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var id, nama, msg string
			var tgl time.Time
			if err := rows.Scan(&id, &nama, &msg, &tgl); err == nil {
				hasil = append(hasil, map[string]any{"id": id, "name": nama, "message": msg, "created_at": tgl})
			}
		}
		return rows.Err()
	})
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal memuat ucapan"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]any{"wishes": hasil})
}

func (h *Handler) HapusUcapan(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	var deleted int64
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		tag, err := tx.Exec(r.Context(), `DELETE FROM wishes WHERE id = $1::uuid`, r.PathValue("id"))
		deleted = tag.RowsAffected()
		return err
	})
	if err != nil || deleted == 0 {
		tulisJSON(w, http.StatusNotFound, map[string]string{"error": "ucapan tidak ditemukan"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]string{"status": "dihapus"})
}

// --- Wedding Planner (5 Modul Terisolasi RLS) ---

func (h *Handler) AmbilPlanner(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	todos := make([]map[string]any, 0)
	budget := make([]map[string]any, 0)
	savings := make([]map[string]any, 0)
	essentials := make([]map[string]any, 0)
	journal := make([]map[string]any, 0)

	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		if rows, err := tx.Query(r.Context(), `SELECT id::text, title, phase, category, due_date, pic, done, notes FROM planner_todos ORDER BY dibuat_pada DESC`); err == nil {
			for rows.Next() {
				var id, title, phase, cat, due, pic, notes string
				var done bool
				if rows.Scan(&id, &title, &phase, &cat, &due, &pic, &done, &notes) == nil {
					todos = append(todos, map[string]any{"id": id, "title": title, "phase": phase, "category": cat, "due_date": due, "pic": pic, "done": done, "notes": notes})
				}
			}
			rows.Close()
		}
		if rows, err := tx.Query(r.Context(), `SELECT id::text, name, category, estimated_cost, actual_cost, paid_amount, payment_status, notes FROM planner_budget ORDER BY dibuat_pada DESC`); err == nil {
			for rows.Next() {
				var id, name, cat, st, notes string
				var est, act, paid int
				if rows.Scan(&id, &name, &cat, &est, &act, &paid, &st, &notes) == nil {
					budget = append(budget, map[string]any{"id": id, "name": name, "category": cat, "estimated_cost": est, "actual_cost": act, "paid_amount": paid, "payment_status": st, "notes": notes})
				}
			}
			rows.Close()
		}
		if rows, err := tx.Query(r.Context(), `SELECT id::text, entry_date, contributor, entry_type, amount, note FROM planner_savings ORDER BY dibuat_pada DESC`); err == nil {
			for rows.Next() {
				var id, dt, cont, typ, note string
				var amt int
				if rows.Scan(&id, &dt, &cont, &typ, &amt, &note) == nil {
					savings = append(savings, map[string]any{"id": id, "entry_date": dt, "contributor": cont, "entry_type": typ, "amount": amt, "note": note})
				}
			}
			rows.Close()
		}
		if rows, err := tx.Query(r.Context(), `SELECT id::text, kind, title, price, status, owner, done_groom, done_bride, notes FROM planner_essentials ORDER BY dibuat_pada DESC`); err == nil {
			for rows.Next() {
				var id, kind, title, st, own, notes string
				var price int
				var dg, db bool
				if rows.Scan(&id, &kind, &title, &price, &st, &own, &dg, &db, &notes) == nil {
					essentials = append(essentials, map[string]any{"id": id, "kind": kind, "title": title, "price": price, "status": st, "owner": own, "done_groom": dg, "done_bride": db, "notes": notes})
				}
			}
			rows.Close()
		}
		if rows, err := tx.Query(r.Context(), `SELECT id::text, entry_date, author, mood, title, content FROM planner_journal ORDER BY dibuat_pada DESC`); err == nil {
			for rows.Next() {
				var id, dt, authStr, mood, title, content string
				if rows.Scan(&id, &dt, &authStr, &mood, &title, &content) == nil {
					journal = append(journal, map[string]any{"id": id, "entry_date": dt, "author": authStr, "mood": mood, "title": title, "content": content})
				}
			}
			rows.Close()
		}
		return nil
	})
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal memuat planner"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]any{
		"todos": todos, "budget": budget, "savings": savings, "essentials": essentials, "journal": journal,
	})
}

func (h *Handler) TambahPlannerItem(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	modul := r.PathValue("modul")
	raw, err := io.ReadAll(io.LimitReader(r.Body, 16384))
	if err != nil {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "payload tidak valid"})
		return
	}
	var id string
	err = db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		switch modul {
		case "todos":
			var req struct {
				Title    string `json:"title"`
				Phase    string `json:"phase"`
				Category string `json:"category"`
				DueDate  string `json:"due_date"`
				Pic      string `json:"pic"`
				Notes    string `json:"notes"`
			}
			if json.Unmarshal(raw, &req) != nil || strings.TrimSpace(req.Title) == "" {
				return errors.New("judul todo wajib diisi")
			}
			return tx.QueryRow(r.Context(), `INSERT INTO planner_todos (wedding_id, title, phase, category, due_date, pic, notes) VALUES ($1::uuid, $2, COALESCE(NULLIF($3,''),'H-3 Bulan'), COALESCE(NULLIF($4,''),'Umum'), $5, COALESCE(NULLIF($6,''),'Bersama'), $7) RETURNING id::text`,
				k.WeddingID, strings.TrimSpace(req.Title), req.Phase, req.Category, req.DueDate, req.Pic, req.Notes).Scan(&id)
		case "budget":
			var req struct {
				Name          string `json:"name"`
				Category      string `json:"category"`
				EstimatedCost int    `json:"estimated_cost"`
				ActualCost    int    `json:"actual_cost"`
				PaidAmount    int    `json:"paid_amount"`
				PaymentStatus string `json:"payment_status"`
				Notes         string `json:"notes"`
			}
			if json.Unmarshal(raw, &req) != nil || strings.TrimSpace(req.Name) == "" {
				return errors.New("nama anggaran wajib diisi")
			}
			return tx.QueryRow(r.Context(), `INSERT INTO planner_budget (wedding_id, name, category, estimated_cost, actual_cost, paid_amount, payment_status, notes) VALUES ($1::uuid, $2, COALESCE(NULLIF($3,''),'Lainnya'), $4, $5, $6, COALESCE(NULLIF($7,''),'belum'), $8) RETURNING id::text`,
				k.WeddingID, strings.TrimSpace(req.Name), req.Category, req.EstimatedCost, req.ActualCost, req.PaidAmount, req.PaymentStatus, req.Notes).Scan(&id)
		case "savings":
			var req struct {
				EntryDate   string `json:"entry_date"`
				Contributor string `json:"contributor"`
				EntryType   string `json:"entry_type"`
				Amount      int    `json:"amount"`
				Note        string `json:"note"`
			}
			if json.Unmarshal(raw, &req) != nil || req.Amount == 0 {
				return errors.New("nominal tabungan wajib diisi")
			}
			if req.EntryDate == "" {
				req.EntryDate = time.Now().Format("2006-01-02")
			}
			return tx.QueryRow(r.Context(), `INSERT INTO planner_savings (wedding_id, entry_date, contributor, entry_type, amount, note) VALUES ($1::uuid, $2, COALESCE(NULLIF($3,''),'Bersama'), COALESCE(NULLIF($4,''),'setor'), $5, $6) RETURNING id::text`,
				k.WeddingID, req.EntryDate, req.Contributor, req.EntryType, req.Amount, req.Note).Scan(&id)
		case "essentials":
			var req struct {
				Kind  string `json:"kind"`
				Title string `json:"title"`
				Price int    `json:"price"`
				Owner string `json:"owner"`
				Notes string `json:"notes"`
			}
			if json.Unmarshal(raw, &req) != nil || strings.TrimSpace(req.Title) == "" {
				return errors.New("judul item wajib diisi")
			}
			return tx.QueryRow(r.Context(), `INSERT INTO planner_essentials (wedding_id, kind, title, price, owner, notes) VALUES ($1::uuid, COALESCE(NULLIF($2,''),'seserahan'), $3, $4, COALESCE(NULLIF($5,''),'Bersama'), $6) RETURNING id::text`,
				k.WeddingID, req.Kind, strings.TrimSpace(req.Title), req.Price, req.Owner, req.Notes).Scan(&id)
		case "journal":
			var req struct {
				EntryDate string `json:"entry_date"`
				Author    string `json:"author"`
				Mood      string `json:"mood"`
				Title     string `json:"title"`
				Content   string `json:"content"`
			}
			if json.Unmarshal(raw, &req) != nil || strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Content) == "" {
				return errors.New("judul dan isi jurnal wajib diisi")
			}
			if req.EntryDate == "" {
				req.EntryDate = time.Now().Format("2006-01-02")
			}
			return tx.QueryRow(r.Context(), `INSERT INTO planner_journal (wedding_id, entry_date, author, mood, title, content) VALUES ($1::uuid, $2, COALESCE(NULLIF($3,''),'Bersama'), COALESCE(NULLIF($4,''),'bersyukur'), $5, $6) RETURNING id::text`,
				k.WeddingID, req.EntryDate, req.Author, req.Mood, strings.TrimSpace(req.Title), strings.TrimSpace(req.Content)).Scan(&id)
		default:
			return errors.New("modul planner tidak dikenal")
		}
	})
	if err != nil {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	tulisJSON(w, http.StatusCreated, map[string]any{"id": id, "modul": modul})
}

func (h *Handler) HapusPlannerItem(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	tabelMap := map[string]string{
		"todos": "planner_todos", "budget": "planner_budget", "savings": "planner_savings",
		"essentials": "planner_essentials", "journal": "planner_journal",
	}
	tbl, ok := tabelMap[r.PathValue("modul")]
	if !ok {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "modul planner tidak dikenal"})
		return
	}
	var deleted int64
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		tag, err := tx.Exec(r.Context(), `DELETE FROM `+tbl+` WHERE id = $1::uuid`, r.PathValue("id"))
		deleted = tag.RowsAffected()
		return err
	})
	if err != nil || deleted == 0 {
		tulisJSON(w, http.StatusNotFound, map[string]string{"error": "item planner tidak ditemukan"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]string{"status": "dihapus"})
}

// --- Tagihan Bukti, Tolak, Status Undangan, & Impersonasi Superadmin ---

func (h *Handler) KirimBuktiTagihan(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.WeddingID == "" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus tenant undangan"})
		return
	}
	var req struct {
		ProofURL    string `json:"proof_url"`
		PaymentNote string `json:"payment_note"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&req); err != nil || strings.TrimSpace(req.ProofURL) == "" {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "tautan bukti pembayaran wajib diisi"})
		return
	}
	var updated int64
	err := db.DenganTenantTx(r.Context(), h.pool, k.WeddingID, func(tx pgx.Tx) error {
		tag, err := tx.Exec(r.Context(), `
			UPDATE billing_orders SET proof_url = $1, payment_note = $2, status = 'review', versi = versi + 1, diperbarui_pada = now()
			WHERE id = $3::uuid AND status NOT IN ('paid','cancelled')
		`, strings.TrimSpace(req.ProofURL), strings.TrimSpace(req.PaymentNote), r.PathValue("id"))
		updated = tag.RowsAffected()
		return err
	})
	if err != nil || updated == 0 {
		tulisJSON(w, http.StatusConflict, map[string]string{"error": "tagihan tidak ditemukan atau sudah selesai"})
		return
	}
	tulisJSON(w, http.StatusOK, map[string]string{"status": "review"})
}

func (h *Handler) SuperadminTolakTagihan(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.Role != "superadmin" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus superadmin"})
		return
	}
	var req struct {
		VersiDasar int    `json:"versi_dasar"`
		AdminNote  string `json:"admin_note"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&req); err != nil || strings.TrimSpace(req.AdminNote) == "" {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "alasan penolakan (admin_note) wajib diisi"})
		return
	}
	if req.VersiDasar < 1 {
		req.VersiDasar = 1
	}
	var wid string
	err := h.pool.QueryRow(r.Context(), `
		UPDATE billing_orders SET status = 'rejected', admin_note = $1, verified_at = now(), versi = versi + 1, diperbarui_pada = now()
		WHERE id = $2::uuid AND versi = $3 AND status NOT IN ('paid','cancelled')
		RETURNING wedding_id::text
	`, strings.TrimSpace(req.AdminNote), r.PathValue("id"), req.VersiDasar).Scan(&wid)
	if errors.Is(err, pgx.ErrNoRows) {
		tulisJSON(w, http.StatusConflict, map[string]string{"error": "konflik versi atau tagihan sudah diproses"})
		return
	}
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal menolak tagihan"})
		return
	}
	_ = h.audit.Catat(r.Context(), wid, k.UserID, "tagihan_ditolak", r.PathValue("id"), map[string]string{"catatan": req.AdminNote})
	tulisJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
}

func (h *Handler) SuperadminUbahStatusUndangan(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.Role != "superadmin" {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus superadmin"})
		return
	}
	var statusBaru string
	err := h.pool.QueryRow(r.Context(), `
		UPDATE weddings
		SET status = CASE WHEN status = 'active' THEN 'suspended' ELSE 'active' END, diperbarui_pada = now()
		WHERE id = $1::uuid AND is_demo = false
		RETURNING status
	`, r.PathValue("id")).Scan(&statusBaru)
	if errors.Is(err, pgx.ErrNoRows) {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "undangan tidak ditemukan atau berstatus demo"})
		return
	}
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal mengubah status"})
		return
	}
	_ = h.audit.Catat(r.Context(), r.PathValue("id"), k.UserID, "ubah_status_undangan", r.PathValue("id"), map[string]string{"status": statusBaru})
	tulisJSON(w, http.StatusOK, map[string]string{"status": statusBaru})
}

func (h *Handler) SuperadminImpersonasi(w http.ResponseWriter, r *http.Request) {
	k := auth.KlaimDariContext(r.Context())
	if k == nil || k.Role != "superadmin" || k.Impersonating {
		tulisJSON(w, http.StatusForbidden, map[string]string{"error": "khusus superadmin aktif"})
		return
	}
	var req struct {
		WeddingID string `json:"wedding_id"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&req); err != nil || strings.TrimSpace(req.WeddingID) == "" {
		tulisJSON(w, http.StatusBadRequest, map[string]string{"error": "wedding_id wajib diisi"})
		return
	}
	var slug string
	if err := h.pool.QueryRow(r.Context(), `SELECT slug FROM weddings WHERE id = $1::uuid`, req.WeddingID).Scan(&slug); err != nil {
		tulisJSON(w, http.StatusNotFound, map[string]string{"error": "undangan tidak ditemukan"})
		return
	}
	tok, err := h.tokens.TerbitkanImpersonasi(k.UserID, k.Username, req.WeddingID)
	if err != nil {
		tulisJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal menerbitkan token impersonasi"})
		return
	}
	_ = h.audit.Catat(r.Context(), req.WeddingID, k.UserID, "superadmin_impersonasi", req.WeddingID, map[string]string{"slug": slug})
	tulisJSON(w, http.StatusOK, map[string]any{"token_akses": tok, "wedding_id": req.WeddingID, "slug": slug, "impersonating": true})
}
