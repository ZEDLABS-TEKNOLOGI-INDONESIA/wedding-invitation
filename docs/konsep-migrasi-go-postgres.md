# Konsep Migrasi Backend `wedding-invitation` ke Go + PostgreSQL 17

Dokumen ini merancang pemindahan backend `wedding-invitation` dari Astro API Routes + SQLite (`better-sqlite3`) ke arsitektur standar ZEDLABS (**Go `net/http` + `pgx/v5` + PostgreSQL 17 `FORCE ROW LEVEL SECURITY`**) pada branch `v2-go-postgres`, dengan frontend Astro 7 + React 19 tetap memakai sistem desain GitHub Primer + Lexend.

## 1. Tujuan & Pemisahan Biner

- `wedding-api`: layanan HTTP Go (`net/http`), resolusi `DomainInstansi` (`wedding.zedlabs.id` + domain kustom klien), autentikasi Argon2id + lazy rehash `scrypt$` lama + JWT EdDSA, pengelolaan tamu/RSVP/ucapan/QR check-in/planner/tagihan, outbox WhatsApp, dan `GET /statistik/publik` HMAC-SHA256 v2 (slug `wedding`).
- `wedding-migrasi`: CLI migrasi skema SQL bernomor urut dengan verifikasi checksum SHA-256 (peran pemilik terpisah dari peran aplikasi `NOSUPERUSER NOBYPASSRLS`).
- `wedding-impor`: alat ETL idempoten untuk menyalin seluruh data dari dump JSON SQLite `wedding.db` ke PostgreSQL 17 sambil mempertahankan slug, domain kustom, kuota tamu, hash sandi `scrypt$` (untuk lazy rehash otomatis ke Argon2id saat login pertama), dan seluruh catatan tamu/RSVP/ucapan/tagihan.

## 2. Isolasi Multi-Tenant (PostgreSQL 17 `FORCE RLS`)

Seluruh 11 tabel bertenant (`wedding_config`, `guests`, `rsvps`, `wishes`, `wa_invitations`, `billing_orders`, `planner_todos`, `planner_budget`, `planner_savings`, `planner_essentials`, `planner_journal`, `outbox_pesan`) dilindungi **`ENABLE` & `FORCE ROW LEVEL SECURITY`** dengan kebijakan `wedding_id::text = current_setting('app.wedding_id', true)` dan dieksekusi hanya lewat `DenganTenantTx`.

## 3. Keamanan & Kompatibilitas

- **Hash Sandi:** Verifikasi `scrypt$<salt>$<hash>` (Node.js) tetap didukung dan langsung di-rehash ke Argon2id saat pengguna login berhasil.
- **Isolasi Host Domain Kustom:** Akses login di domain kustom klien ditolak HTTP `403` apabila akun bukan pemilik undangan domain tersebut atau bukan Superadmin.
- **Statistik Ekosistem:** `GET /statistik/publik` mematuhi kontrak HMAC-SHA256 v2 dengan metrik `undangan_aktif`, `tamu_terdaftar`, `konfirmasi_hadir`, dan `ucapan_masuk`.
