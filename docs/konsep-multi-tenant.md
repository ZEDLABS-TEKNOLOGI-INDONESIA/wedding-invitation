# Konsep Transformasi Multi-Tenant `wedding-invitation` (`wedding.zedlabs.id` + Domain Klien + Gaya ZEDLABS)

Dokumen ini disusun mengikuti Aturan Mutlak A3 (konsep dahulu, kode kemudian) dan keputusan pemilik 2026-11-27 untuk menaikkan `wedding-invitation` menjadi platform SaaS multi-tenant dengan domain utama **`wedding.zedlabs.id`**, dukungan **domain custom klien/pasangan**, dan panel admin seragam **gaya ZEDLABS** (GitHub Primer + Lexend + PWA).

---

## 1. Kondisi Saat Ini

- **Stack:** Astro 7 SSR (`@astrojs/node`), React 19, Tailwind CSS v4, SQLite (`better-sqlite3`), integrasi penuh WhatsApp Gateway (`whatsapp.zedlabs.id`, HMAC-SHA256 v2), serta endpoint `GET /statistik/publik` yang sudah terhubung ke `zedlabs.id`.
- **Batasan saat ini:** Masih berpola satu undangan per instans dengan satu `ADMIN_PASSWORD` di `.env` dan basis data SQLite tunggal.

---

## 2. Arsitektur Target Multi-Tenant (`wedding.zedlabs.id`)

### 2.1 Pola Domain Utama vs Domain Klien (`DomainInstansi`)

1. **Domain Utama (`wedding.zedlabs.id`):**
   - Menampilkan **landing page katalog & fitur Undangan Digital ZEDLABS** bergaya GitHub Primer + Lexend (Hero `100svh`, pratinjau tema undangan, paket harga, FAQ, dokumentasi, tombol Masuk Panel & Daftar Klien).
   - Undangan klien tanpa domain custom tetap dapat diakses melalui slug (`wedding.zedlabs.id/u/<slug-mempelai>`).
   - Halaman masuk terbuka bagi **Superadmin** dan seluruh akun **Klien / EO / Mempelai**.
2. **Domain Custom Klien (mis. `nama-pasangan.id` atau `undangan.namaklien.com`):**
   - Resolusi host otomatis mengikat permintaan ke `klien_id` / `undangan_id` pemilik domain (tabel `undangan.domain` unik, cache 5 menit + invalidasi saat diubah).
   - Beranda (`/`) pada domain klien langsung menampilkan **halaman undangan digital mempelai tersebut**, sementara `/panel` dan halaman masuk hanya mengizinkan pemilik undangan tersebut dan Superadmin global (penolakan `403` lintas klien).

### 2.2 Backend & Database (Standar ZEDLABS)

- **Database PostgreSQL 17 terpusat (`wedding`):**
  - Migrasi dari SQLite ke PostgreSQL dengan peran pemilik vs runtime (`NOSUPERUSER NOBYPASSRLS`) dan **`FORCE ROW LEVEL SECURITY`** pada seluruh tabel milik klien (`undangan`, `tamu`, `rsvp`, `ucapan`, `galeri`, `log_wa`, `tagihan`).
  - Mempertahankan integrasi HMAC-SHA256 v2 ke `whatsapp.zedlabs.id` (kirim undangan personal/CSV + QR, notifikasi RSVP) dan `GET /statistik/publik` (slug `wedding`).
- **Autentikasi:**
  - Mengganti `ADMIN_PASSWORD` statis dengan tabel `pengguna` (Argon2id, JWT EdDSA, cookie `__Host-`, MFA TOTP opsional, reset sandi OTP WhatsApp, impersonasi Superadmin).
- **Panel Admin Gaya ZEDLABS:**
  - Shell dashboard seragam `whatsapp-service` (sidebar kiri, topbar breadcrumbs, mode terang/gelap Primer, Lexend, tombol standar `btn-utama`/`btn-hijau`/`btn-bahaya`, PWA penuh) untuk pengelolaan tamu, impor CSV, pengiriman WA massal, pantau RSVP/ucapan, pengaturan tema undangan, serta manajemen domain custom klien oleh Superadmin.

---

## 3. Tahapan Pelaksanaan

1. **Tahap 1 — Skema PG 17 + `FORCE RLS` + Auth:** Migrasi skema multi-tenant, ETL data SQLite eksisting ke klien perdana tanpa kehilangan data RSVP/tamu.
2. **Tahap 2 — Resolusi `DomainInstansi` & Slug:** Layanan resolusi host (`wedding.zedlabs.id` vs domain custom klien) + anti-CSRF Origin multi-domain.
3. **Tahap 3 — Panel Admin & Landing Gaya ZEDLABS:** Pembaruan UI panel admin & landing `wedding.zedlabs.id` mengikuti GitHub Primer + Lexend + uji Playwright 360/1024/1280 + Lighthouse >= 95.
4. **Tahap 4 — Cutover & Verifikasi:** Deploy layanan baru, pastikan `GET /statistik/publik` tetap HTTP 200 ke `zedlabs.id`, arsipkan berkas SQLite lama dengan aman.
