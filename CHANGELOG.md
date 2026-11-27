# Changelog — wedding-invitation

Riwayat perubahan penting pada proyek `wedding-invitation`.

## [Belum dirilis]

### Ditambahkan
- Penambahan dokumentasi standar `CHANGELOG.md` dan `SECURITY.md`.

## [2026-11-27]

### Ditambahkan
- Endpoint `GET /statistik/publik` ber-HMAC-SHA256 v2 untuk agregasi statistik publik (hanya angka agregat non-negatif tanpa PII).

## [2026-11-25]

### Ditambahkan & Diubah
- Integrasi penuh WhatsApp Gateway (HMAC-SHA256 v2) untuk notifikasi RSVP, undangan satuan/massal CSV + QR, dan konfirmasi otomatis tamu (integrasi Telegram dihapus).
- Penyelarasan lebar kontainer halaman publik/auth dan skala dasar tampilan.
- Penambahan slider pasangan aktif pada halaman depan dan pembaruan aset ikon/OG image.
- Penambahan target `Makefile` untuk otomatisasi build dan deploy.
