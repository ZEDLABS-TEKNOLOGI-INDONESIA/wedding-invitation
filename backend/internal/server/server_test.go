package server_test

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/scrypt"

	"wedding-zedlabs/internal/admin"
	"wedding-zedlabs/internal/audit"
	"wedding-zedlabs/internal/auth"
	"wedding-zedlabs/internal/db"
	"wedding-zedlabs/internal/domain"
	"wedding-zedlabs/internal/publik"
	"wedding-zedlabs/internal/server"
	sqlfs "wedding-zedlabs/sql"
)

func TestOpenAPIWeddingV2Valid(t *testing.T) {
	doc, err := openapi3.NewLoader().LoadFromFile("../../api/openapi.yaml")
	if err != nil {
		t.Fatalf("gagal muat OpenAPI: %v", err)
	}
	if doc.OpenAPI != "3.1.0" || doc.Paths.Len() < 10 {
		t.Fatalf("dokumen OpenAPI tidak lengkap: %d paths", doc.Paths.Len())
	}
}

func TestWeddingV2_DomainKustom_ScryptRehash_Kuota_OptimisticLock_DanForceRLS(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL tidak disetel")
	}
	ctx := context.Background()
	rootPool, err := db.Buka(ctx, dsn)
	if err != nil {
		t.Fatalf("buka DB: %v", err)
	}
	defer rootPool.Close()

	skema := fmt.Sprintf("uji_wedding_%d", time.Now().UnixNano())
	if _, err := rootPool.Exec(ctx, "CREATE SCHEMA "+skema); err != nil {
		t.Fatalf("buat skema: %v", err)
	}
	defer func() { _, _ = rootPool.Exec(context.Background(), "DROP SCHEMA IF EXISTS "+skema+" CASCADE") }()

	cfg, _ := pgxpool.ParseConfig(dsn)
	cfg.ConnConfig.RuntimeParams["search_path"] = skema + ",public"
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatalf("pool skema: %v", err)
	}
	defer pool.Close()

	sub, _ := fs.Sub(sqlfs.MigrasiFS, "migrasi")
	if err := db.Migrasi(ctx, pool, sub); err != nil {
		t.Fatalf("migrasi: %v", err)
	}

	// Seed 2 undangan: pasangan A (kuota ketat 1 tamu untuk uji batas kuota & upgrade) dan pasangan B
	var wedA, wedB string
	_ = pool.QueryRow(ctx, `INSERT INTO weddings (slug, title, custom_domain, guest_quota_limit) VALUES ('ani-budi', 'Ani & Budi', 'ani-budi.pasangan.id', 1) RETURNING id::text`).Scan(&wedA)
	_ = pool.QueryRow(ctx, `INSERT INTO weddings (slug, title, custom_domain, guest_quota_limit) VALUES ('citra-doni', 'Citra & Doni', 'citra-doni.pasangan.id', 200) RETURNING id::text`).Scan(&wedB)

	// Seed user pasangan A memakai hash scrypt$ warisan Node.js untuk menguji lazy rehash ke Argon2id!
	saltHex := "0123456789abcdef0123456789abcdef"
	derived, _ := scrypt.Key([]byte("SandiPasangan123!"), []byte(saltHex), 16384, 8, 1, 64)
	legacyScrypt := fmt.Sprintf("scrypt$%s$%s", saltHex, hex.EncodeToString(derived))
	_, _ = pool.Exec(ctx, `INSERT INTO users (wedding_id, username, password_hash, role, full_name) VALUES ($1::uuid, 'anibudi', $2, 'couple_owner', 'Ani & Budi')`, wedA, legacyScrypt)

	superHash, _ := auth.HashSandi("SuperSandi123!")
	_, _ = pool.Exec(ctx, `INSERT INTO users (wedding_id, username, password_hash, role, full_name) VALUES (NULL, 'superadmin', $1, 'superadmin', 'Superadmin')`, superHash)

	res := domain.NewResolver(pool, "wedding.zedlabs.id")
	auditLog := audit.NewLogger(pool)
	tokens := auth.NewTokenService(auth.KunciDariSeed("seed-uji-wedding-v2"))
	pub := publik.NewHandler(pool, res, "k-wed", "rahasia-wedding-hmac-minimal-32-kar")
	adm := admin.NewHandler(pool, res, tokens, auditLog)
	srv := server.Rakit(pub, adm, tokens)

	kirim := func(method, path, host, bearer string, body any) *httptest.ResponseRecorder {
		var buf bytes.Buffer
		if body != nil {
			_ = json.NewEncoder(&buf).Encode(body)
		}
		req := httptest.NewRequest(method, path, &buf)
		req.Header.Set("Content-Type", "application/json")
		if host != "" {
			req.Header.Set("X-Forwarded-Host", host)
		}
		if bearer != "" {
			req.Header.Set("Authorization", "Bearer "+bearer)
		}
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)
		return rec
	}

	// 1. Resolusi Domain Kustom Publik
	if rec := kirim(http.MethodGet, "/api/v1/publik/domain", "ani-budi.pasangan.id", "", nil); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"ani-budi"`) {
		t.Fatalf("resolusi domain kustom gagal: %d %s", rec.Code, rec.Body.String())
	}

	// 2. Isolasi Login Domain Kustom (403) + Lazy Rehash scrypt$ -> Argon2id
	if rec := kirim(http.MethodPost, "/api/v1/auth/masuk", "citra-doni.pasangan.id", "", map[string]string{
		"username": "anibudi", "password": "SandiPasangan123!",
	}); rec.Code != http.StatusForbidden {
		t.Fatalf("login lintas domain klien wajib 403, dapat %d", rec.Code)
	}
	recLogin := kirim(http.MethodPost, "/api/v1/auth/masuk", "ani-budi.pasangan.id", "", map[string]string{
		"username": "anibudi", "password": "SandiPasangan123!",
	})
	if recLogin.Code != http.StatusOK {
		t.Fatalf("login pasangan A gagal: %d %s", recLogin.Code, recLogin.Body.String())
	}
	var tokA struct {
		TokenAkses string `json:"token_akses"`
	}
	_ = json.Unmarshal(recLogin.Body.Bytes(), &tokA)
	var hashSekarang string
	_ = pool.QueryRow(ctx, `SELECT password_hash FROM users WHERE username='anibudi'`).Scan(&hashSekarang)
	if auth.PerluRehashArgon2id(hashSekarang) {
		t.Fatalf("lazy rehash scrypt->Argon2id gagal")
	}

	// 3. RSVP + Outbox WA & Uji Batas Kuota (402) -> Tagihan -> Optimistic Locking Superadmin (409) -> Setujui -> Tamu ke-2 berhasil
	if rec := kirim(http.MethodPost, "/api/v1/publik/undangan/ani-budi/rsvp", "ani-budi.pasangan.id", "", map[string]any{
		"guest_name": "Budi Santoso", "attendance": "hadir", "guest_count": 2,
	}); rec.Code != http.StatusCreated {
		t.Fatalf("RSVP gagal: %d", rec.Code)
	}
	if rec := kirim(http.MethodPost, "/api/v1/admin/tamu", "ani-budi.pasangan.id", tokA.TokenAkses, map[string]any{"name": "Tamu 1"}); rec.Code != http.StatusCreated {
		t.Fatalf("tamu 1 gagal: %d", rec.Code)
	}
	if rec := kirim(http.MethodPost, "/api/v1/admin/tamu", "ani-budi.pasangan.id", tokA.TokenAkses, map[string]any{"name": "Tamu 2"}); rec.Code != http.StatusPaymentRequired {
		t.Fatalf("melebihi kuota wajib 402, dapat %d", rec.Code)
	}

	recInv := kirim(http.MethodPost, "/api/v1/admin/tagihan", "ani-budi.pasangan.id", tokA.TokenAkses, map[string]any{"requested_total_quota": 300})
	if recInv.Code != http.StatusCreated {
		t.Fatalf("buat tagihan gagal: %d %s", recInv.Code, recInv.Body.String())
	}
	var invResp struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(recInv.Body.Bytes(), &invResp)

	recSup := kirim(http.MethodPost, "/api/v1/auth/masuk", "wedding.zedlabs.id", "", map[string]string{
		"username": "superadmin", "password": "SuperSandi123!",
	})
	var tokSup struct {
		TokenAkses string `json:"token_akses"`
	}
	_ = json.Unmarshal(recSup.Body.Bytes(), &tokSup)

	// Versi salah -> 409 Conflict
	if rec := kirim(http.MethodPost, "/api/v1/superadmin/tagihan/"+invResp.ID+"/setujui", "wedding.zedlabs.id", tokSup.TokenAkses, map[string]any{"versi_dasar": 99}); rec.Code != http.StatusConflict {
		t.Fatalf("optimistic locking versi salah wajib 409, dapat %d", rec.Code)
	}
	// Versi sah -> 200 & kuota naik jadi 300
	if rec := kirim(http.MethodPost, "/api/v1/superadmin/tagihan/"+invResp.ID+"/setujui", "wedding.zedlabs.id", tokSup.TokenAkses, map[string]any{"versi_dasar": 1}); rec.Code != http.StatusOK {
		t.Fatalf("setujui tagihan gagal: %d %s", rec.Code, rec.Body.String())
	}
	if rec := kirim(http.MethodPost, "/api/v1/admin/tamu", "ani-budi.pasangan.id", tokA.TokenAkses, map[string]any{"name": "Tamu 2"}); rec.Code != http.StatusCreated {
		t.Fatalf("tamu 2 pasca upgrade kuota gagal: %d", rec.Code)
	}

	// 3b. Uji Konfigurasi, Planner (todos/budget), & Superadmin Impersonasi
	if rec := kirim(http.MethodPut, "/api/v1/admin/konfigurasi", "ani-budi.pasangan.id", tokA.TokenAkses, map[string]string{
		"BRIDE_NICKNAME": "Ani", "GROOM_NICKNAME": "Budi",
	}); rec.Code != http.StatusOK {
		t.Fatalf("simpan konfigurasi gagal: %d %s", rec.Code, rec.Body.String())
	}
	if rec := kirim(http.MethodPost, "/api/v1/admin/planner/todos", "ani-budi.pasangan.id", tokA.TokenAkses, map[string]string{
		"title": "Booking KUA", "phase": "H-3 Bulan",
	}); rec.Code != http.StatusCreated {
		t.Fatalf("tambah planner todo gagal: %d %s", rec.Code, rec.Body.String())
	}
	if rec := kirim(http.MethodGet, "/api/v1/admin/planner", "ani-budi.pasangan.id", tokA.TokenAkses, nil); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "Booking KUA") {
		t.Fatalf("ambil planner gagal: %d %s", rec.Code, rec.Body.String())
	}
	recImp := kirim(http.MethodPost, "/api/v1/superadmin/impersonate", "wedding.zedlabs.id", tokSup.TokenAkses, map[string]string{"wedding_id": wedA})
	if recImp.Code != http.StatusOK || !strings.Contains(recImp.Body.String(), `"impersonating":true`) {
		t.Fatalf("impersonasi superadmin gagal: %d %s", recImp.Code, recImp.Body.String())
	}
	var impTok struct {
		TokenAkses string `json:"token_akses"`
	}
	_ = json.Unmarshal(recImp.Body.Bytes(), &impTok)
	if rec := kirim(http.MethodGet, "/api/v1/admin/tamu", "wedding.zedlabs.id", impTok.TokenAkses, nil); rec.Code != http.StatusOK {
		t.Fatalf("akses tamu via token impersonasi gagal: %d", rec.Code)
	}
	// Token impersonasi tidak boleh memicu impersonasi lagi (403)
	if rec := kirim(http.MethodPost, "/api/v1/superadmin/impersonate", "wedding.zedlabs.id", impTok.TokenAkses, map[string]string{"wedding_id": wedB}); rec.Code != http.StatusForbidden {
		t.Fatalf("impersonasi berantai wajib 403, dapat %d", rec.Code)
	}

	// 4. HMAC-SHA256 v2 GET /statistik/publik (header standar ZEDLABS X-API-Key/X-Signature)
	ts := fmt.Sprintf("%d", time.Now().Unix())
	nonce := "nonce-wedding-v2-12345678"
	emptySum := sha256.Sum256(nil)
	canonical := fmt.Sprintf("GET\n/statistik/publik\n%s\n%s\n%s", ts, nonce, hex.EncodeToString(emptySum[:]))
	mac := hmac.New(sha256.New, []byte("rahasia-wedding-hmac-minimal-32-kar"))
	mac.Write([]byte(canonical))
	reqStat := httptest.NewRequest(http.MethodGet, "/statistik/publik", nil)
	reqStat.Header.Set("X-Signature-Version", "2")
	reqStat.Header.Set("X-API-Key", "k-wed")
	reqStat.Header.Set("X-Timestamp", ts)
	reqStat.Header.Set("X-Nonce", nonce)
	reqStat.Header.Set("X-Signature", hex.EncodeToString(mac.Sum(nil)))
	recStat := httptest.NewRecorder()
	srv.ServeHTTP(recStat, reqStat)
	if recStat.Code != http.StatusOK || !strings.Contains(recStat.Body.String(), `"produk":"wedding"`) {
		t.Fatalf("statistik HMAC gagal: %d %s", recStat.Code, recStat.Body.String())
	}

	// 5. FORCE RLS Non-Superuser (NOSUPERUSER NOBYPASSRLS)
	_, _ = pool.Exec(ctx, `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='wedding_uji_app') THEN CREATE ROLE wedding_uji_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOLOGIN; END IF; END $$;`)
	_, _ = pool.Exec(ctx, fmt.Sprintf(`GRANT USAGE ON SCHEMA %s TO wedding_uji_app; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %s TO wedding_uji_app;`, skema, skema))
	if err := db.DenganTenantTx(ctx, pool, wedB, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SET LOCAL ROLE wedding_uji_app`); err != nil {
			return err
		}
		var nGuests, nRsvps, nOrders int
		_ = tx.QueryRow(ctx, `SELECT COUNT(*) FROM guests`).Scan(&nGuests)
		_ = tx.QueryRow(ctx, `SELECT COUNT(*) FROM rsvps`).Scan(&nRsvps)
		_ = tx.QueryRow(ctx, `SELECT COUNT(*) FROM billing_orders`).Scan(&nOrders)
		if nGuests != 0 || nRsvps != 0 || nOrders != 0 {
			return fmt.Errorf("KEBOCORAN RLS: wedB membaca guests=%d rsvps=%d orders=%d", nGuests, nRsvps, nOrders)
		}
		return nil
	}); err != nil {
		t.Fatalf("uji RLS SELECT non-superuser wedding: %v", err)
	}
	errLintas := db.DenganTenantTx(ctx, pool, wedB, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SET LOCAL ROLE wedding_uji_app`); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `INSERT INTO wishes (wedding_id, name, message) VALUES ($1::uuid, 'Bocor', 'Ilegal')`, wedA)
		return err
	})
	if errLintas == nil {
		t.Fatalf("RLS WITH CHECK gagal menolak insert lintas tenant")
	}
}
