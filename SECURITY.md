# Keamanan — wedding-invitation

Dokumen ini merangkum kebijakan keamanan untuk repositori publik `wedding-invitation`.

## Kontrol Keamanan Aktif

- **Tanpa Fallback Sandi Default:** variabel lingkungan `ADMIN_PASSWORD` wajib ditetapkan secara eksplisit pada lingkungan runtime; aplikasi menolak menyala tanpa sandi yang valid.
- **Integrasi HMAC-SHA256 v2:** seluruh permintaan ke WhatsApp Gateway dan endpoint `GET /statistik/publik` menggunakan penandatanganan HMAC-SHA256 v2 (`X-API-Key`, `X-Signature`, `X-Timestamp`, `X-Nonce`, `X-Signature-Version: 2`, `X-Origin-Domain`, serta `User-Agent` khusus aplikasi).
- **Perlindungan Privasi Data:** endpoint `/statistik/publik` hanya mengembalikan angka agregat non-negatif tanpa data pribadi tamu (tanpa PII).

## Kebijakan Repositori Publik

- Berkas `.env*`, kunci API, basis data `.db`, cadangan, dan catatan konfigurasi internal diabaikan oleh `.gitignore` dan dilarang masuk ke commit.
- Jika menemukan celah keamanan, hubungi tim pengembang melalui `dev@zedlabs.id`.
