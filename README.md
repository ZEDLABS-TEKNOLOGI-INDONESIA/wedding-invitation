# Website Undangan Pernikahan Digital

Website undangan pernikahan yang elegan, modern, dan interaktif dibangun menggunakan Astro, React, Tailwind CSS, dan SQLite. Dilengkapi dengan sistem manajemen tamu yang komprehensif, pelacakan RSVP real-time, notifikasi otomatis, tools desain profesional, dan panel admin untuk mengelola seluruh konten undangan tanpa perlu edit file atau redeploy.

![Banner](./public/thumbnail.png)

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Arsitektur Konfigurasi](#arsitektur-konfigurasi)
- [Struktur Proyek](#struktur-proyek)
- [Konfigurasi](#konfigurasi)
- [Instalasi & Development](#instalasi--development)
- [Deployment Production](#deployment-production)
- [Panduan Penggunaan](#panduan-penggunaan)
- [Stack Teknologi](#stack-teknologi)
- [Troubleshooting](#troubleshooting)
- [Lisensi](#lisensi)

---

## Fitur Utama

### Pengalaman Pengguna

**Amplop Digital**

- Animasi pembuka undangan yang elegan
- Personalisasi otomatis nama tamu
- Transisi smooth dengan backdrop blur
- Floating petals animation

**Mode Tema**

- Light Mode dan Dark Mode
- Auto-detect preferensi sistem
- Smooth transition antar tema
- Persistent state menggunakan localStorage

**Pemutar Musik**

- Background music otomatis
- Kontrol play/pause terintegrasi
- Preload untuk performa optimal
- Format audio HTML5 native

**Animasi & Efek Visual**

- Scroll-triggered reveal animations
- Floating petals menggunakan CSS keyframes
- Subtle zoom pada hero image
- Intersection Observer untuk performa optimal

**Countdown Timer**

- Hitung mundur real-time ke hari H
- Format: Hari, Jam, Menit, Detik
- Auto-update setiap detik
- Styling responsive dengan frosted glass effect

### Fungsionalitas Inti

**Personalisasi Tamu**

```
URL Format: /?to=Nama+Tamu
Efek:
- Nama muncul di amplop pembuka
- Nama muncul di hero section
- Form RSVP terisi otomatis (locked)
- Form wishes terisi otomatis (locked)
```

**Sistem RSVP**

- **Smart Update System**:
  - Cek nama tamu sebelum insert
  - Update data jika nama sudah ada
  - Mencegah duplikasi data
  - Timestamp otomatis di-update

- **Form Features**:
  - Input nama, nomor HP/WA, dan pesan
  - Radio button untuk status kehadiran (Hadir/Tidak Hadir/Ragu)
  - Counter jumlah tamu dengan min/max validation
  - Rate limiting berbasis IP (5 request per menit)

- **Dashboard Real-time**:
  - Total responden
  - Jumlah yang hadir dengan total pax
  - Jumlah yang ragu
  - Jumlah yang tidak hadir
  - List tamu terbaru dengan scroll area

**Buku Tamu (Wishes)**

- Input nama dan pesan ucapan
- Paginasi dengan navigasi elegan
- Desain card editorial style
- Smart update berdasarkan nama pengirim
- Rate limiting untuk spam protection

**Integrasi Lokasi**

- Embed Google Maps dengan custom styling
- Copy alamat ke clipboard
- Link langsung ke Google Maps navigation
- Koordinat lat/long yang akurat

**Integrasi Kalender**

- Add to Google Calendar
- Download file .ics (Apple Calendar, Outlook)
- Dropdown selector dengan animasi
- Include reminder 1 jam sebelum acara

**Galeri Foto**

- Masonry layout responsive (1-3 kolom)
- Lightbox fullscreen dengan backdrop blur
- Navigasi keyboard (Arrow Left/Right, Escape)
- Lazy loading untuk performa optimal
- Smooth zoom effect on hover

**Informasi Kado**

- Display nomor rekening multiple bank
- Copy to clipboard dengan konfirmasi visual
- Card desain dengan gradient effect
- Informasi alamat kirim kado fisik

### Sistem Teknis

**Dynamic Configuration (Database-Driven)**

Seluruh konten undangan (nama mempelai, jadwal, venue, galeri, teks, dsb) disimpan di tabel `config` pada database SQLite dan dikelola sepenuhnya melalui Admin Dashboard, tidak perlu edit file atau redeploy untuk mengubah isi undangan.

```javascript
// src/utils/configParser.ts
// Parsing otomatis untuk tipe data kompleks (JSON array/object)
const parseJson = <T,>(str: string, fallback: T): T => {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
};
```

```javascript
// src/hooks/useConfig.ts
// React hook untuk fetch config dari /api/config, dengan in-memory cache
const { config, loading } = useConfig();
```

**Server-Side Rendering**

- Astro Node Adapter mode standalone
- Pre-render static content
- Dynamic route untuk parameter tamu
- Optimal SEO dengan meta tags lengkap

**Database SQLite**

```sql
-- Tabel RSVP
CREATE TABLE rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_name TEXT NOT NULL,
  phone TEXT,
  attendance TEXT,
  guest_count INTEGER,
  message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Wishes
CREATE TABLE wishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Config (Dynamic Settings)
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

**PWA Support**

- Service Worker untuk offline capability
- Manifest.json untuk installable app
- Cache strategy untuk gambar dan assets
- Install prompt untuk Android/iOS

**Notifikasi Telegram**

```javascript
// Kirim notifikasi otomatis saat:
// 1. RSVP baru masuk
// 2. Update data RSVP
// 3. Ucapan baru dari buku tamu

// Token & Chat ID disimpan di tabel config (diatur via Admin > Pengaturan)
// Format pesan dengan HTML parsing
// Timeout 5 detik untuk koneksi lambat
// Silent fail agar tidak mengganggu user experience
```

### Panel Admin

**Autentikasi**

- Cookie-based authentication
- Password dari environment variable (`ADMIN_PASSWORD`)
- Session management dengan expire time
- Logout dengan clear cookie

**Dashboard Statistik**

```
┌─────────────────────────────────────┐
│ Total Respon    │ Hadir (+ Pax)     │
│ Ragu            │ Tidak Hadir       │
└─────────────────────────────────────┘
```

**Manajemen Data RSVP**

- View: Tabel dengan sorting dan filtering
- Edit: Modal form untuk update data
- Delete: Single dan bulk delete dengan konfirmasi
- Search: Real-time filtering
- Pagination: Adjustable rows per page
- Export: Download CSV lengkap

**Manajemen Ucapan**

- View: Card layout dengan timestamp
- Edit: Modal form untuk moderasi
- Delete: Single dan bulk delete
- Search: Filter berdasarkan nama/pesan
- Pagination: Smooth navigation
- Export: Download CSV lengkap

**Generator QR Code**

_Mode Single:_

```
Input: Nama Tamu
Output:
- QR Code dengan logo premium (inisial mempelai, diambil dari config)
- Preview real-time
- Download PNG high-quality
- Copy link ke clipboard
```

_Mode Bulk:_

```
Input: CSV File (Kolom 1: Nama Tamu)
Proses:
1. Upload CSV
2. Preview data (max 50 tampil, sisanya hidden)
3. Generate QR batch dengan progress bar
4. Download ZIP file

Features:
- Template CSV download
- Progress indicator dengan status
- Chunk processing (50 QR per batch)
- Premium logo integration
- File naming: {index}_{nama_tamu}.png
```

**Designer Undangan PDF**

_Template Floral (4 Halaman A5):_

```
Halaman 1: Cover
- Nama mempelai dengan font serif elegant
- Border ornamen bunga (vektor)
- Tanggal pernikahan
- Box personalisasi nama tamu

Halaman 2: Detail Mempelai
- Salam pembuka (Assalamualaikum)
- Quote Ar-Rum:21
- Nama lengkap + orang tua
- Instagram handle

Halaman 3: Jadwal Acara
- Akad Nikah (hari, tanggal, jam)
- Resepsi (hari, tanggal, jam)
- Lokasi dengan QR Code Google Maps
- Border dekoratif

Halaman 4: E-Invitation
- QR Code besar (personalized URL)
- Pesan penutup
- Wassalamualaikum
- Signature mempelai
```

Semua teks dan data pada PDF diambil langsung dari tabel `config` melalui endpoint `/api/config`, sehingga otomatis sinkron dengan perubahan yang dilakukan di Admin > Pengaturan.

_Theme Options:_

1. **Sage Green** (Original)
   - Background: #FFFFFF
   - Primary: #556B2F
   - Secondary: #BDD1A6

2. **Classic Maroon**
   - Background: #FFFCFC
   - Primary: #800020
   - Secondary: #E6B4BE

3. **Royal Gold**
   - Background: #FFFFFC
   - Primary: #B8860B
   - Secondary: #F0E68C

4. **Dusty Blue**
   - Background: #FAFAFF
   - Primary: #465A78
   - Secondary: #BED2E6

_Mode Operasi:_

**Single PDF:**

```javascript
Input:
- Nama tamu
- Alamat/kota (opsional)

Output:
- Preview real-time
- Download single PDF
- Nama file: Inv_{nama_tamu}_{theme}.pdf
```

**Bulk PDF:**

```javascript
Input: CSV (Kolom 1: Nama, Kolom 2: Alamat)

Process:
1. Upload & parse CSV
2. Preview data tamu
3. Generate PDF batch dengan progress
4. Compress ke ZIP
5. Download ZIP

Features:
- Template CSV download
- Progress indicator detail
- Chunk processing (10 PDF per batch)
- File naming: {index}_{nama_tamu}.pdf
- ZIP naming: Undangan-{theme}-{date}.zip
```

**Pengaturan (Settings)**

Tab khusus di Admin Dashboard untuk mengelola seluruh konten undangan secara dinamis tanpa perlu akses server atau redeploy:

```
Kategori yang dapat diatur:
- Mempelai Wanita & Pria (nama, orang tua, Instagram, foto)
- Venue (nama, alamat, koordinat GPS)
- Jadwal Akad Nikah & Resepsi
- Hero & Media (gambar hero, kota, URL musik, max tamu RSVP)
- Teks & Konten (salam, quote, kalimat undangan, penutup)
- Rekening Bank (JSON array)
- Kisah Cinta / Love Story (JSON array)
- Galeri Foto (JSON array URL)
- Notifikasi Telegram (Bot Token, Chat ID)
```

Setiap perubahan disimpan ke tabel `config` melalui `POST /api/config` dan langsung diterapkan ke seluruh halaman setelah cache di-invalidate.

---

## Arsitektur Konfigurasi

Konfigurasi proyek menggunakan pendekatan **hybrid**, dipisah berdasarkan sensitivitas dan kebutuhan akses:

| Jenis Config | Lokasi | Diatur Via | Contoh |
|---|---|---|---|
| Critical / Infrastruktur | `.env` | Edit file manual + restart server | `HOST`, `PORT`, `DB_NAME`, `ADMIN_PASSWORD` |
| Konten Undangan | Database (tabel `config`) | Admin Dashboard > Pengaturan | Nama mempelai, venue, jadwal, galeri, teks, dsb |

**Alasan pemisahan ini:**

- `.env` menyimpan nilai yang berkaitan dengan keamanan dan infrastruktur server (port, password admin, nama file database), yang secara wajar tidak boleh diubah dari UI publik/admin dan butuh restart untuk berlaku.
- Tabel `config` menyimpan seluruh konten yang sifatnya editorial (nama, tanggal, galeri, teks), agar bisa diubah kapan saja tanpa perlu akses SSH/server, langsung dari Admin Dashboard.

**Alur data dari Admin ke Frontend:**

```
Admin mengisi form di tab "Pengaturan"
        │
        ▼
POST /api/config (auth: cookie wedding_admin_auth)
        │
        ▼
setConfig() menulis ke tabel config (SQLite)
        │
        ▼
invalidateConfigCache() menghapus cache di client
        │
        ▼
useConfig() hook fetch ulang GET /api/config
        │
        ▼
parseConfig() mengubah raw key-value menjadi AppConfig
        │
        ▼
Seluruh komponen React (App.tsx, Hero, CoupleProfile, dst)
menerima config sebagai props dan re-render
```

**Catatan keamanan:**

- `GET /api/config` bersifat publik tapi tidak pernah mengembalikan `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID`.
- `GET /api/config/full` (termasuk Telegram credentials) dan `POST /api/config` hanya bisa diakses dengan cookie admin yang valid.

---

## Struktur Proyek

```
wedding-invitation/
│
├── .vscode/                        # VSCode settings
│   └── settings.json              # Format on save, Prettier config
│
├── database/                       # SQLite database location
│   └── wedding.db                 # Auto-created on first run
│
├── public/                         # Static assets
│   ├── favicon.svg                # Site icon
│   ├── pwa-192x192.png           # PWA icon small
│   ├── pwa-512x512.png           # PWA icon large
│   └── thumbnail.png              # OG image preview
│
├── src/
│   ├── components/                # React components
│   │   ├── Admin/
│   │   │   └── AdminDashboard.tsx # Main admin interface (incl. tab Pengaturan)
│   │   ├── CoupleProfile.tsx      # Mempelai section
│   │   ├── Envelope.tsx           # Opening animation
│   │   ├── EventDetails.tsx       # Jadwal acara
│   │   ├── FloatingPetals.tsx     # Decorative animation
│   │   ├── Gallery.tsx            # Photo gallery + lightbox
│   │   ├── GiftInfo.tsx           # Bank accounts + address
│   │   ├── Hero.tsx               # Landing section + countdown
│   │   ├── InstallPrompt.tsx      # PWA install banner
│   │   ├── InvitationManager.tsx  # PDF designer component
│   │   ├── LoveStory.tsx          # Timeline kisah cinta
│   │   ├── MusicPlayer.tsx        # Background audio
│   │   ├── Navbar.tsx             # Bottom navigation
│   │   ├── QRCodeGenerator.tsx    # Single QR generator
│   │   ├── QRCodeManager.tsx      # Bulk QR generator
│   │   ├── RSVPForm.tsx           # RSVP form + dashboard
│   │   └── Wishes.tsx             # Guest book + pagination
│   │
│   ├── hooks/
│   │   └── useConfig.ts           # React hook: fetch + cache config dari API
│   │
│   ├── layouts/
│   │   └── Layout.astro           # Base HTML structure
│   │
│   ├── lib/
│   │   ├── db.ts                  # SQLite setup + migrations + default config
│   │   └── rateLimit.ts           # IP-based rate limiter
│   │
│   ├── pages/
│   │   ├── api/
│   │   │   ├── config/
│   │   │   │   └── full.ts        # GET config lengkap (admin only, incl. Telegram)
│   │   │   ├── admin.ts           # Admin CRUD operations (RSVP & Wishes)
│   │   │   ├── config.ts          # GET (public) / POST (admin) config
│   │   │   ├── export-rsvp.ts     # RSVP CSV export
│   │   │   ├── export-wishes.ts   # Wishes CSV export
│   │   │   ├── rsvp.ts            # RSVP GET/POST
│   │   │   └── wishes.ts          # Wishes GET/POST
│   │   ├── 404.astro              # Custom error page
│   │   ├── admin.astro            # Admin panel
│   │   ├── index.astro            # Main invitation page
│   │   └── qrcode.astro           # QR generator page
│   │
│   ├── services/
│   │   └── dbService.ts           # Frontend API wrapper (RSVP & Wishes)
│   │
│   ├── styles/
│   │   └── global.css             # Tailwind + custom styles
│   │
│   ├── utils/
│   │   ├── calendarUtils.ts       # Google Cal + ICS
│   │   ├── configParser.ts        # Parser raw config (DB) → AppConfig
│   │   └── telegram.ts            # Telegram notifications
│   │
│   ├── App.tsx                    # Main React app (consume useConfig)
│   └── types.ts                   # TypeScript definitions (AppConfig, RSVP, Wish)
│
├── .env                           # Critical configuration file (REQUIRED)
├── .env.example                   # Configuration template
├── .prettierrc.mjs               # Code formatting rules
├── astro.config.mjs              # Astro framework config
├── ecosystem.config.cjs          # PM2 process manager
├── eslint.config.mjs             # Linting rules
├── nginx.conf                    # Nginx reverse proxy example
├── package.json                  # Dependencies + scripts
├── README.md                     # This file
├── tsconfig.json                 # TypeScript config
└── LICENSE                       # MIT License
```

### Penjelasan Struktur Kunci

**Database Layer (`src/lib/db.ts`)**

```javascript
// Auto-migration dari root ke /database folder
// WAL mode untuk concurrent access
// Auto-create tables on first run (rsvps, wishes, config)
// Seed default config jika tabel config kosong
```

**Config Layer (`src/utils/configParser.ts` + `src/hooks/useConfig.ts`)**

```javascript
// parseConfig(): raw key-value (Record<string, string>) dari DB
// menjadi struktur AppConfig yang strongly-typed
// useConfig(): fetch /api/config sekali, cache in-memory,
// invalidateConfigCache() dipanggil setelah admin menyimpan perubahan
```

**API Layer (`src/pages/api/`)**

```javascript
// RESTful endpoints
// Rate limiting di semua POST endpoints publik (rsvp, wishes)
// Sanitasi input untuk XSS protection
// Cookie-based auth untuk admin (admin.ts, config POST, config/full GET)
```

**Service Layer (`src/services/dbService.ts`)**

```javascript
// Client-side cache (30 detik) khusus RSVP & Wishes
// Fetch wrapper untuk API calls
// Type-safe responses
```

**Components**

```javascript
// React functional components dengan hooks
// TypeScript strict mode
// Client-side rendering dengan Astro directives
// Semua komponen menerima `config: AppConfig` sebagai props dari App.tsx
```

---

## Konfigurasi

### File .env (Critical Config)

File `.env` hanya menyimpan konfigurasi infrastruktur yang sensitif atau wajib tersedia sebelum server menyala. Salin `.env.example` ke `.env` di root folder.

```properties
# Host dan Port untuk development/production
HOST=0.0.0.0
PORT=5432

# Nama file database SQLite (auto-created di /database)
DB_NAME=wedding.db

# Password untuk akses admin panel
ADMIN_PASSWORD=P@ssw0rd_Anda_Disini
```

**Penting:**

- Jangan commit `.env` ke repository. Pastikan ada di `.gitignore`.
- Ganti `ADMIN_PASSWORD` dengan password yang kuat sebelum deploy ke production. Nilai di `.env.example` hanya placeholder.
- Setelah mengubah `.env`, server development perlu di-restart manual (`Ctrl+C` lalu `pnpm dev` lagi).

### Konten Undangan (Database, via Admin Dashboard)

Seluruh konten berikut **tidak lagi diatur melalui `.env`**, melainkan melalui tab **Pengaturan** di Admin Dashboard (`/admin`). Saat pertama kali dijalankan, database akan otomatis terisi dengan nilai default (contoh data Fera & Yahya) yang bisa langsung diedit dari sana.

#### Mempelai Wanita

| Field | Keterangan |
|---|---|
| Nama Panggilan | Untuk footer dan hero section |
| Nama Lengkap | Untuk profile section |
| Nama Orang Tua | Teks bebas, contoh: "Putri tercinta dari Bpk. ... & Ibu ..." |
| Instagram | Tanpa tanda @ |
| URL Foto | Disarankan rasio portrait, minimal 600x800px |

#### Mempelai Pria

Field identik dengan Mempelai Wanita.

#### Venue

| Field | Keterangan |
|---|---|
| Nama Gedung | Nama tempat acara |
| Alamat Lengkap | Untuk display dan PDF |
| Latitude / Longitude | Koordinat GPS, didapat dari Google Maps (klik kanan pada lokasi) |

#### Akad Nikah & Resepsi

| Field | Keterangan |
|---|---|
| Judul | Bebas customize, contoh "Akad Nikah" |
| Hari | Contoh: Minggu |
| Tanggal | Format Indonesia, contoh: "11 Oktober 2025" |
| Jam Mulai / Selesai | Format 24 jam, contoh: "08:00" |
| ISO Start / ISO End | Format ISO-8601 dengan timezone, **wajib akurat** karena dipakai countdown timer dan export kalender |

```
Format ISO: YYYY-MM-DDTHH:mm:ss+07:00
Contoh: 2025-10-11T08:00:00+07:00
```

#### Hero & Media

| Field | Keterangan |
|---|---|
| URL Gambar Hero | Mendukung Unsplash, CDN, atau upload lokal |
| Kota | Ditampilkan di bawah judul hero |
| URL Musik (MP3) | Background music, gunakan link direct (CDN/hosting sendiri) |
| Maks Tamu per RSVP | Default 20, sesuaikan kapasitas venue |

#### Teks & Konten

Mencakup salam pembuka, quote Ar-Rum, kalimat undangan, teks penutup, salam penutup, tanda tangan, nama keluarga, judul dan deskripsi hadiah. Semua berupa teks bebas (textarea) yang diedit langsung dari form.

#### Rekening Bank (JSON Array)

```json
[{"bank":"Bank BCA","number":"1234567890","name":"Fera Oktapia"},{"bank":"Bank Mandiri","number":"0987655432","name":"Yahya Zulfikri"}]
```

#### Kisah Cinta / Love Story (JSON Array)

```json
[{"date":"2020","title":"Awal Pertemuan","desc":"Atas izin Allah, kami dipertemukan dalam suasana yang sederhana namun penuh makna."},{"date":"2022","title":"Menjalin Harapan","desc":"Dengan niat baik, kami memutuskan untuk saling mengenal dan membangun komitmen menuju ridho-Nya."},{"date":"2025","title":"Ikatan Suci","desc":"Insya Allah, kami memantapkan hati untuk menyempurnakan separuh agama dalam ikatan pernikahan."}]
```

#### Galeri Foto (JSON Array URL)

```json
["https://placehold.co/800x1200?text=Moment+1","https://placehold.co/1200x800?text=Moment+2","https://placehold.co/800x800?text=Moment+3"]
```

#### Notifikasi Telegram

| Field | Keterangan |
|---|---|
| Bot Token | Didapat dari @BotFather di Telegram |
| Chat ID | Didapat dengan kirim pesan ke bot lalu akses `https://api.telegram.org/bot<TOKEN>/getUpdates` |

Field ini hanya terlihat dan tersimpan melalui `GET /api/config/full` dan `POST /api/config`, sehingga tidak pernah terekspos ke endpoint publik.

### Tips Pengisian Konten

1. **Validasi JSON**: Untuk field Rekening Bank, Kisah Cinta, dan Galeri Foto, gunakan tool seperti jsonlint.com untuk memastikan format valid sebelum disimpan. Form di Admin Dashboard akan menampilkan error "JSON tidak valid" jika format salah.

2. **URL Gambar**: Rekomendasi sumber gambar:
   - Unsplash (gratis, high-quality)
   - ImgBB (free image hosting)
   - Cloudinary (CDN profesional)
   - Self-hosted di `/public` folder

3. **Koordinat GPS**:
   ```
   1. Buka Google Maps
   2. Klik kanan pada lokasi venue
   3. Klik koordinat yang muncul (format: -6.xxx, 106.xxx)
   4. Paste ke field Latitude / Longitude di Admin > Pengaturan
   ```

4. **Format Tanggal ISO**:
   ```
   Format: YYYY-MM-DDTHH:mm:ss+07:00
   YYYY: Tahun 4 digit
   MM: Bulan 2 digit (01-12)
   DD: Tanggal 2 digit (01-31)
   T: Separator
   HH:mm:ss: Jam 24-format
   +07:00: Timezone (WIB)
   ```

---

## Instalasi & Development

### Prasyarat Sistem

**Software Required:**

- Node.js versi 18.x atau lebih tinggi
- Package manager: pnpm (recommended) atau NPM
- Git untuk version control
- Text editor: VSCode (recommended)

**Browser Support:**

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**OS Tested:**

- Windows 10/11
- macOS 11+
- Ubuntu 20.04/22.04

### Langkah Instalasi

#### 1. Clone Repository

```bash
# Via HTTPS
git clone https://github.com/zulfikriyahya/wedding-invitation.git

# Via SSH (jika sudah setup SSH key)
git clone git@github.com:zulfikriyahya/wedding-invitation.git

# Masuk ke folder project
cd wedding-invitation
```

#### 2. Setup Environment Variables (Critical Config Saja)

```bash
# Copy template konfigurasi
cp .env.example .env

# Edit file .env dengan text editor favorit
nano .env
# atau
code .env  # jika menggunakan VSCode
```

**Minimal Configuration untuk Testing:**

```properties
HOST=0.0.0.0
PORT=5432
DB_NAME=wedding.db
ADMIN_PASSWORD=P@ssw0rd
```

Konten undangan (nama mempelai, jadwal, dsb) **tidak perlu diisi di sini**. Cukup jalankan server, database akan terisi data default secara otomatis, lalu sesuaikan melalui `/admin` > tab **Pengaturan**.

#### 3. Install Dependencies

```bash
# Menggunakan pnpm (recommended)
pnpm install

# Atau menggunakan NPM
npm install

# Proses ini akan:
# - Download semua package yang dibutuhkan
# - Compile native modules (better-sqlite3)
# - Setup development tools (ESLint, Prettier)
# Durasi: 2-5 menit tergantung koneksi internet
```

#### 4. Jalankan Development Server

```bash
# Start server
pnpm dev

# Output yang muncul:
# 🚀 astro v5.x.x started in XXXms
# ┃ Local    http://localhost:5432/
# ┃ Network  http://192.168.x.x:5432/
```

#### 5. Akses Website

Buka browser dan kunjungi:

- Local: `http://localhost:5432`
- Network: `http://192.168.x.x:5432` (bisa diakses dari device lain dalam jaringan yang sama)
- Admin: `http://localhost:5432/admin` (login dengan `ADMIN_PASSWORD` dari `.env`)

#### 6. Isi Konten Undangan

```
1. Login ke /admin
2. Buka tab "Pengaturan"
3. Isi/edit seluruh field sesuai kebutuhan
4. Klik "Simpan Semua"
5. Perubahan langsung terlihat di halaman utama tanpa restart server
```

### Development Workflow

#### Hot Reload

```bash
# File yang di-watch untuk auto-reload:
# - src/**/*.astro
# - src/**/*.tsx
# - src/**/*.ts
# - src/**/*.css
# - .env (perlu restart manual)

# Perubahan konten via Admin > Pengaturan TIDAK perlu restart,
# cukup invalidate cache otomatis dan reload halaman.
```

#### File .env Changes

```bash
# Setelah edit .env, restart server:
Ctrl + C  # Stop server
pnpm dev  # Start ulang
```

#### Database Location

```bash
# Database otomatis dibuat di:
./database/wedding.db

# Untuk reset database (termasuk reset semua config ke default):
rm -rf database/
pnpm dev  # Database baru akan dibuat otomatis
```

#### Debugging

**VSCode Launch Configuration:**

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Astro Dev Server",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

**Browser DevTools:**

```javascript
// Enable React DevTools
// Chrome Extension: React Developer Tools

// Enable Astro DevTools
// Built-in di browser console
```

### Testing Features

#### Test RSVP System

```bash
1. Buka http://localhost:5432/?to=Test+User
2. Scroll ke section RSVP
3. Isi form dan submit
4. Cek data di admin panel: http://localhost:5432/admin
```

#### Test Admin Panel

```bash
1. Akses http://localhost:5432/admin
2. Login dengan password dari .env (ADMIN_PASSWORD)
3. Eksplorasi semua fitur:
   - Lihat data RSVP
   - Edit/delete data
   - Export CSV
   - Generate QR Code
   - Buat PDF undangan
   - Edit konten undangan di tab Pengaturan
```

#### Test QR Code Generator

```bash
1. Login ke admin panel
2. Buka tab "QR Generator"
3. Mode Single:
   - Input nama tamu
   - Preview QR code
   - Download PNG
4. Mode Bulk:
   - Download template CSV
   - Edit dengan Excel/Google Sheets
   - Upload kembali
   - Download ZIP
```

#### Test PDF Designer

```bash
1. Login ke admin panel
2. Buka tab "Design PDF"
3. Pilih theme warna
4. Mode Single:
   - Input nama dan alamat
   - Preview PDF
   - Download
5. Mode Bulk:
   - Download template CSV
   - Upload file
   - Generate batch
```

#### Test Pengaturan (Settings)

```bash
1. Login ke admin panel
2. Buka tab "Pengaturan"
3. Edit salah satu field, misal Nama Panggilan mempelai
4. Klik "Simpan Semua"
5. Buka tab baru ke halaman utama (/)
6. Verifikasi perubahan sudah tampil
```

### Troubleshooting Development

**Port Already in Use:**

```bash
# Ganti port di .env
PORT=3000

# Atau kill process yang menggunakan port 5432
# Windows:
netstat -ano | findstr :5432
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5432 | xargs kill -9
```

**Database Lock Error:**

```bash
# Matikan semua instance dev server yang running
# Hapus file lock
rm database/wedding.db-journal
```

**Module Not Found:**

```bash
# Clear cache dan reinstall
rm -rf node_modules
rm pnpm-lock.yaml  # atau package-lock.json
pnpm install
```

**Better-sqlite3 Compile Error:**

```bash
# Rebuild native module
pnpm add better-sqlite3 --force
```

---

## Deployment Production

### Persiapan Server

**Minimum Requirements:**

- OS: Ubuntu 20.04 LTS atau lebih tinggi
- RAM: 512 MB (1 GB recommended)
- Storage: 2 GB free space
- CPU: 1 vCore

**Software Stack:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
sudo npm install -g pnpm

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install certbot (untuk SSL/HTTPS)
sudo apt install -y certbot python3-certbot-nginx
```

### Build Process

#### 1. Build di Local Machine

```bash
# Pastikan semua perubahan sudah di-commit
git status

# Build production
pnpm build

# Output akan ada di folder dist/
# Struktur:
# dist/
# ├── client/          # Static assets
# ├── server/          # Server entry point
# └── manifest.json    # Build manifest
```

#### 2. File yang Perlu Di-upload

```bash
# Compress untuk upload
tar -czf production.tar.gz \
  dist/ \
  package.json \
  pnpm-lock.yaml \
  ecosystem.config.cjs \
  .env

# File yang TIDAK perlu di-upload:
# - node_modules/ (install ulang di server)
# - src/ (sudah ter-bundle di dist/)
# - .git/ (opsional, tergantung deployment strategy)
# - database/ (kecuali ingin migrasi data lama, lihat bagian Backup)
```

#### 3. Upload ke Server

**Via SCP:**

```bash
# Upload compressed file
scp production.tar.gz user@your-server.com:/var/www/

# SSH ke server
ssh user@your-server.com

# Extract
cd /var/www
tar -xzf production.tar.gz
rm production.tar.gz
```

**Via Git (Recommended):**

```bash
# Di server, clone repository
cd /var/www
git clone https://github.com/zulfikriyahya/wedding-invitation.git
cd wedding-invitation

# Build di server
pnpm install --production
pnpm build
```

### Setup Production Environment

#### 1. Install Dependencies

```bash
cd /var/www/wedding-invitation

# Install hanya production dependencies
pnpm install --production

# Verify better-sqlite3 compiled correctly
node -e "require('better-sqlite3')"
```

#### 2. Configure Environment

```bash
# Copy .env dari backup atau edit langsung
nano .env

# PENTING: Ganti nilai-nilai berikut untuk production:
ADMIN_PASSWORD=<strong-password-here>
HOST=0.0.0.0
PORT=5432
```

#### 3. Test Manual Run

```bash
# Test jalankan server manual dulu
node dist/server/entry.mjs

# Jika berhasil, Ctrl+C untuk stop
```

#### 4. Setup PM2

```bash
# Start dengan PM2
pm2 start ecosystem.config.cjs

# Verify running
pm2 list
# Output:
# ┌─────┬──────────────────────┬─────────┬─────────┐
# │ id  │ name                 │ status  │ cpu     │
# ├─────┼──────────────────────┼─────────┼─────────┤
# │ 0   │ wedding.zedlabs.id   │ online  │ 0%      │
# └─────┴──────────────────────┴─────────┴─────────┘

# Auto-start on server reboot
pm2 save
pm2 startup
# Follow instructions dari output command
```

#### 5. PM2 Management Commands

```bash
# Lihat logs real-time
pm2 logs wedding.zedlabs.id

# Restart aplikasi
pm2 restart wedding.zedlabs.id

# Stop aplikasi
pm2 stop wedding.zedlabs.id

# Hapus dari PM2
pm2 delete wedding.zedlabs.id

# Monitor resource usage
pm2 monit
```

#### 6. Isi Konten Undangan Production

```bash
1. Akses https://your-domain.com/admin
2. Login dengan ADMIN_PASSWORD dari .env production
3. Buka tab "Pengaturan"
4. Isi seluruh data sesuai kebutuhan acara
5. Simpan
```

### Setup Nginx Reverse Proxy

#### 1. Buat Konfigurasi Nginx

```bash
# Buat file config
sudo nano /etc/nginx/sites-available/wedding
```

#### 2. Konfigurasi Lengkap

```nginx
# Basic Rate Limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

# Upstream
upstream wedding_backend {
    server 127.0.0.1:5432;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name wedding.zedlabs.id www.wedding.zedlabs.id;

    # Redirect HTTP to HTTPS (setelah SSL setup)
    # return 301 https://$server_name$request_uri;

    # Root directory (untuk static files jika diperlukan)
    root /var/www/wedding-invitation/dist/client;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/xml+rss
               application/json image/svg+xml;

    # Cache untuk Static Assets (_astro/...)
    location /_astro/ {
        proxy_pass http://wedding_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Cache selama 1 tahun (immutable)
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # Cache untuk Gambar & Font
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp|woff|woff2|ttf|eot)$ {
        proxy_pass http://wedding_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        # Cache 30 hari
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }

    # No Cache untuk Config API (selalu fresh)
    location /api/config {
        proxy_pass http://wedding_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Rate Limit untuk API Endpoints
    location ~ ^/api/(rsvp|wishes) {
        limit_req zone=api burst=5 nodelay;

        proxy_pass http://wedding_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # No Cache untuk API
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Admin Panel (Protected)
    location /admin {
        limit_req zone=api burst=3 nodelay;

        proxy_pass http://wedding_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        # No Cache
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Main Application (dengan rate limit lebih longgar)
    location / {
        limit_req zone=general burst=10 nodelay;

        proxy_pass http://wedding_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Cache pendek untuk halaman utama (5 menit)
        # Bisa di-adjust sesuai kebutuhan
        add_header Cache-Control "public, max-age=300";
    }
}
```

#### 3. Enable Site

```bash
# Link ke sites-enabled
sudo ln -s /etc/nginx/sites-available/wedding /etc/nginx/sites-enabled/

# Test konfigurasi
sudo nginx -t

# Jika OK, reload Nginx
sudo systemctl reload nginx
```

#### 4. Setup SSL dengan Let's Encrypt

```bash
# Generate SSL certificate
sudo certbot --nginx -d wedding.zedlabs.id -d www.wedding.zedlabs.id

# Follow prompts:
# - Email untuk renewal notifications
# - Agree to terms of service
# - Redirect HTTP to HTTPS: Yes (recommended)

# Verify auto-renewal
sudo certbot renew --dry-run

# Auto-renewal sudah di-setup via systemd timer
sudo systemctl status certbot.timer
```

### Setup Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP & HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status

# Output:
# Status: active
# To                         Action      From
# --                         ------      ----
# 22/tcp                     ALLOW       Anywhere
# 80/tcp                     ALLOW       Anywhere
# 443/tcp                    ALLOW       Anywhere
```

### Database Backup Strategy

Database sekarang menyimpan tiga jenis data penting: RSVP, Wishes, dan seluruh konten undangan (tabel `config`). Backup database sama dengan backup seluruh konten undangan.

#### 1. Manual Backup

```bash
# Backup database
cp /var/www/wedding-invitation/database/wedding.db \
   /var/www/wedding-invitation/database/backup-$(date +%Y%m%d).db

# Backup dengan compress
tar -czf wedding-backup-$(date +%Y%m%d).tar.gz \
  database/ \
  .env
```

#### 2. Automated Backup (Cron Job)

```bash
# Edit crontab
crontab -e

# Tambahkan line berikut (backup setiap hari jam 2 pagi)
0 2 * * * cd /var/www/wedding-invitation && tar -czf ~/backups/wedding-$(date +\%Y\%m\%d).tar.gz database/ .env

# Buat folder backup
mkdir -p ~/backups

# Cleanup old backups (keep 30 days)
# Tambahkan ke cron
0 3 * * * find ~/backups -name "wedding-*.tar.gz" -mtime +30 -delete
```

### Monitoring & Logs

#### 1. PM2 Logs

```bash
# Real-time logs
pm2 logs wedding.zedlabs.id --lines 100

# Error logs only
pm2 logs wedding.zedlabs.id --err

# Save logs to file
pm2 logs wedding.zedlabs.id > app.log
```

#### 2. Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log

# Analyze logs dengan goaccess (optional)
sudo apt install goaccess
sudo goaccess /var/log/nginx/access.log --log-format=COMBINED
```

#### 3. System Resources

```bash
# PM2 monitoring
pm2 monit

# System resources
htop

# Disk usage
df -h

# Database size
du -sh database/wedding.db
```

### Update Deployment

```bash
# 1. Pull latest code
cd /var/www/wedding-invitation
git pull origin main

# 2. Install dependencies (jika ada perubahan package.json)
pnpm install --production

# 3. Build
pnpm build

# 4. Restart PM2
pm2 restart wedding.zedlabs.id

# 5. Verify
pm2 status

# Catatan: konten undangan (tabel config) tidak terpengaruh oleh
# update kode, karena tersimpan persisten di database/wedding.db
```

---

## Panduan Penggunaan

### Untuk Pengguna Akhir

#### Mengakses Undangan

**URL Umum:**

```
https://wedding.zedlabs.id
```

**URL Personal (dengan nama tamu):**

```
https://wedding.zedlabs.id/?to=Ahmad+Syarief+Ramadhan
```

**Efek Personalisasi:**

1. Nama muncul di amplop pembuka
2. Nama muncul di hero section setelah countdown
3. Form RSVP otomatis terisi nama (terkunci, tidak bisa diubah)
4. Form buku tamu otomatis terisi nama (terkunci)

#### Mengisi RSVP

1. Scroll ke section "Reservasi"
2. Nama sudah terisi otomatis (jika akses via link personal)
3. Isi nomor HP/WhatsApp (opsional)
4. Pilih status kehadiran:
   - **Hadir**: Akan datang ke acara
   - **Tidak Hadir**: Tidak bisa hadir
   - **Ragu**: Belum yakin/tentative
5. Jika pilih "Hadir", tentukan jumlah tamu yang dibawa (max sesuai pengaturan admin, default 20 orang)
6. Isi pesan untuk mempelai (opsional)
7. Klik tombol "Send RSVP"

**Catatan Penting:**

- Jika submit dengan nama yang sama, data lama akan di-update (tidak duplikat)
- Rate limit: Maksimal 5 submit per menit per IP

#### Mengirim Ucapan

1. Scroll ke section "Prayers & Wishes"
2. Isi nama lengkap (terisi otomatis jika via link personal)
3. Tulis ucapan dan doa untuk mempelai
4. Klik "Send Message"
5. Ucapan akan muncul di galeri ucapan dengan paginasi

#### Menyimpan Jadwal ke Kalender

1. Lihat section "Waktu & Tempat"
2. Pilih acara: Akad Nikah atau Resepsi
3. Klik tombol "Save The Date"
4. Pilih:
   - **Google Calendar**: Langsung buka Google Calendar
   - **Apple / Outlook**: Download file .ics

#### Melihat Lokasi

1. Scroll ke section venue/lokasi
2. Opsi navigasi:
   - **Copy Address**: Salin alamat ke clipboard
   - **Open In Maps**: Buka di Google Maps native app
   - **Embedded Map**: Lihat langsung di website

#### Mengirim Kado

**Via Transfer Bank:**

1. Scroll ke section "Tanda Kasih"
2. Pilih salah satu bank
3. Klik "Salin Nomor" untuk copy nomor rekening
4. Lakukan transfer via mobile banking
5. Konfirmasi via WhatsApp mempelai (opsional)

**Via Kirim Fisik:**

1. Klik "Salin Alamat" pada card alamat kirim
2. Paste alamat saat input di kurir/pos
3. Kirim paket ke alamat tersebut

### Untuk Admin

#### Login ke Dashboard

```
URL: https://wedding.zedlabs.id/admin
Password: Sesuai dengan ADMIN_PASSWORD di .env
```

#### Melihat Statistik

Dashboard utama menampilkan:

- Total respon RSVP
- Jumlah yang hadir + total pax
- Jumlah yang masih ragu
- Jumlah yang tidak hadir

#### Mengelola Data RSVP

**Fitur Tersedia:**

1. **View Data**
   - Tabel lengkap dengan semua kolom
   - Search real-time
   - Filter dan sorting
   - Pagination (5/10/25/50 per halaman)

2. **Edit Data**
   - Klik icon pensil pada baris data
   - Edit nama, status, jumlah tamu, atau pesan
   - Klik "Simpan"

3. **Delete Data**
   - Single delete: Klik icon trash pada baris
   - Bulk delete:
     - Checklist data yang ingin dihapus
     - Klik tombol "Hapus (X)" di atas tabel
   - Konfirmasi sebelum hapus permanen

4. **Export Data**
   - Klik tombol "Export CSV" di kanan atas
   - File CSV akan otomatis terdownload
   - Bisa dibuka dengan Excel/Google Sheets

**Format Export CSV:**

```csv
Nama Tamu,No HP,Kehadiran,Jumlah,Pesan,Waktu Input
"Ahmad Syarief",'081234567890',hadir,3,"Selamat menempuh hidup baru",2025-01-15 10:30:00
```

#### Mengelola Ucapan & Doa

**Fitur Identik dengan RSVP:**

- View, edit, delete (single & bulk)
- Search dan filter
- Export CSV

**Use Case:**

- Moderasi pesan tidak pantas
- Hapus spam
- Edit typo pada nama pengirim

#### Generate QR Code

**Mode Single (Satuan):**

1. Buka tab "QR Generator"
2. Pilih "Manual (Satuan)"
3. Input nama tamu
4. Preview QR code akan muncul real-time
5. Opsi:
   - **Copy Link**: Salin URL undangan personal
   - **Download PNG**: Download QR code sebagai gambar

**QR Code Design:**

- Size: 250x250 px
- Level: High error correction
- Logo: Inisial mempelai dalam circle dengan border gold (diambil dari Pengaturan)
- Format: PNG transparent background

**Mode Bulk (Banyak):**

1. Pilih tab "Import CSV (Banyak)"
2. Download template CSV:
   - Klik "Download Template CSV"
   - Buka dengan Excel/Google Sheets
   - Isi kolom "Nama Tamu" (satu nama per baris)
   - Save as CSV

3. Upload CSV:
   - Klik "Pilih File CSV"
   - Select file yang sudah diisi
   - Data akan ter-preview (max 50 tampil)

4. Generate:
   - Klik "Download ZIP"
   - Progress bar akan muncul
   - Proses: 50 QR per chunk
   - Output: ZIP file berisi semua QR code

**Struktur File ZIP:**

```
QR-Codes-2025-01-15.zip
├── 1_Ahmad_Syarief.png
├── 2_Muhammad_Ikbal.png
├── 3_Keluarga_Bapak_Jokowi.png
└── ...
```

**Tips:**

- QR code bisa langsung di-print untuk amplop fisik
- Size 250x250px cukup untuk scan jarak 30cm
- Format PNG support transparency untuk design overlay

#### Generate PDF Undangan

**Mode Single (Satuan):**

1. Buka tab "Design PDF"
2. Pilih theme warna (4 opsi):
   - Sage Green (hijau original)
   - Classic Maroon (merah maroon)
   - Royal Gold (emas)
   - Dusty Blue (biru lembut)

3. Input data:
   - Nama tamu (wajib)
   - Alamat/kota (opsional, default: "Di Tempat")

4. Preview:
   - Klik "Preview"
   - PDF akan tampil di sebelah kanan
   - Scroll untuk lihat 4 halaman

5. Download:
   - Klik "Download PDF"
   - File: `Inv_{nama_tamu}_{theme}.pdf`

**Mode Bulk (Banyak):**

1. Download template CSV
2. Isi data tamu:

   ```csv
   Nama Tamu,Alamat (Opsional)
   Bapak Jokowi & Ibu Iriana,Jakarta
   Teman-teman Alumni SMA 1,Di Tempat
   Keluarga Besar H. Syarif,Bandung
   ```

3. Upload CSV:
   - Sistem parse dan preview data
   - Jumlah tamu terdeteksi akan ditampilkan

4. Generate batch:
   - Klik "Download ZIP"
   - Progress indicator muncul dengan status detail
   - Processing: 10 PDF per chunk
   - Output: ZIP file

**Struktur ZIP:**

```
Undangan-sage-2025-01-15.zip
├── 1_Bapak_Jokowi.pdf
├── 2_Teman_teman_Alumni_SMA_1.pdf
├── 3_Keluarga_Besar_H_Syarif.pdf
└── ...
```

**Detail Template PDF:**

Seluruh teks dan data berikut ditarik otomatis dari tabel `config` (sama dengan yang diatur di tab Pengaturan), bukan hardcoded.

**Halaman 1 - Cover:**

- Border ornamen bunga (vektor, bukan gambar)
- Judul: "THE WEDDING OF"
- Nama mempelai dalam font serif italic besar
- Tanggal pernikahan
- Box personalisasi:
  - "Kepada Yth. Bapak/Ibu/Saudara/i:"
  - Nama tamu (bold italic)
  - Alamat/kota

**Halaman 2 - Detail Mempelai:**

- Salam pembuka: "Assalamu'alaikum..."
- Quote QS. Ar-Rum:21 (italic)
- Kalimat pengantar sopan
- Detail mempelai wanita:
  - Nama lengkap
  - Info orang tua
- Detail mempelai pria:
  - Nama lengkap
  - Info orang tua

**Halaman 3 - Jadwal Acara:**

- Judul: "Insya Allah acara akan dilaksanakan pada:"
- Akad Nikah:
  - Hari, tanggal
  - Jam (WIB)
- Resepsi:
  - Hari, tanggal
  - Jam (WIB)
- Lokasi:
  - Nama venue
  - Alamat lengkap
- QR Code Google Maps (size: 22mm)

**Halaman 4 - E-Invitation:**

- Judul: "E-INVITATION"
- QR Code besar (40mm) dengan:
  - URL personal tamu
  - Border gradient
  - Logo premium di tengah
- Instruksi: "Scan untuk buka undangan digital..."
- Pesan penutup sopan
- "Wassalamu'alaikum..."
- Signature mempelai dengan nama lengkap

**Design Features:**

- Paper size: A5 (148 x 210 mm)
- Orientation: Portrait
- Border: Triple line dengan gradient
- Ornaments: Corner florals (mawar + daun)
- Fonts:
  - Times New Roman untuk body text
  - Serif italic untuk judul
- Colors: Sesuai theme yang dipilih
- QR Codes: High error correction level
- File size: ~150-200KB per PDF

**Use Case:**

- Print untuk amplop fisik undangan
- Email attachment
- Share via WhatsApp
- Upload ke website sebagai downloadable

**Tips Printing:**

- Print di kertas A5 (148x210mm) atau half-A4
- Recommended: Art Paper 260gsm
- Margin: None (full bleed)
- Color mode: CMYK untuk hasil optimal
- Print setting: Best quality

#### Mengatur Konten Undangan (Tab Pengaturan)

1. Login ke admin panel
2. Buka tab "Pengaturan"
3. Form ditampilkan per kategori: Mempelai Wanita, Mempelai Pria, Venue, Akad Nikah, Resepsi, Hero & Media, Teks & Konten, Rekening Bank, Kisah Cinta, Galeri, Notifikasi Telegram
4. Untuk field bertipe JSON (Rekening Bank, Kisah Cinta, Galeri), pastikan format array valid sebelum menyimpan
5. Klik "Simpan Semua" di bagian atas atau bawah form
6. Tombol akan berubah menjadi "Tersimpan!" sebagai konfirmasi
7. Buka halaman utama di tab baru untuk verifikasi perubahan

**Catatan:**

- Perubahan langsung aktif tanpa perlu restart server atau rebuild
- Jika ada error JSON, field terkait akan ditandai merah dengan pesan error, dan penyimpanan dibatalkan sampai diperbaiki

#### Logout

Klik tombol "LOGOUT" di kanan atas dashboard.

---

## Stack Teknologi

### Frontend

**Framework & Library:**

- **Astro 7.x**: Static Site Generator dengan SSR support
  - Island Architecture untuk optimal bundle size
  - Partial hydration
  - Built-in optimization
- **React 19.x**: UI Component Library
  - Functional components dengan hooks
  - TypeScript strict mode

- **Tailwind CSS 4.x**: Utility-first CSS Framework
  - Custom theme configuration
  - Dark mode support
  - Responsive design
  - JIT compiler

**UI Components:**

- **Lucide React**: Icon library (tree-shakeable)
- **@icons-pack/react-simple-icons**: Icon brand (Instagram, dsb)
- Custom components dengan editorial design

**QR Code & PDF:**

- **qrcode.react**: QR code generator component
- **qrcode**: Server-side/PDF QR generation
- **jsPDF**: PDF generation library
- **Canvas API**: untuk render QR dan vector graphics

**File Processing:**

- **PapaParse**: CSV parser
- **JSZip**: ZIP file generator
- **FileSaver**: Client-side file download

**PWA:**

- **vite-plugin-pwa**: PWA integration
- **Workbox**: Service Worker strategies

### Backend

**Runtime & Server:**

- **Node.js 18+**: JavaScript runtime
- **Astro Node Adapter**: SSR dengan standalone mode

**Database:**

- **better-sqlite3**: Synchronous SQLite3 binding
  - WAL mode untuk concurrent access
  - Prepared statements
  - Transaction support
  - Tabel `config` untuk seluruh konten dinamis

**API Layer:**

- RESTful API dengan Astro API routes
- Type-safe dengan TypeScript
- Input sanitization
- Cookie-based auth untuk endpoint admin

### Development Tools

**Code Quality:**

- **TypeScript**: Type-safe JavaScript
- **ESLint**: Linting
  - React plugin
  - Astro plugin
  - TypeScript plugin
  - jsx-a11y plugin
- **Prettier**: Code formatter
  - Astro plugin
  - Tailwind plugin

**Build Tools:**

- **Vite**: Build tool dan dev server
  - HMR (Hot Module Replacement)
  - Code splitting
  - Asset optimization

### DevOps

**Process Management:**

- **PM2**: Production process manager
  - Auto-restart on crash
  - Log management
  - Cluster mode support

**Web Server:**

- **Nginx**: Reverse proxy
  - Static file serving
  - Gzip compression
  - Rate limiting
  - SSL termination

**SSL:**

- **Let's Encrypt**: Free SSL certificates
- **Certbot**: Auto-renewal

**Monitoring:**

- PM2 built-in monitoring
- Nginx access/error logs
- Custom logging

### External Services (Optional)

**Notifications:**

- **Telegram Bot API**: Real-time notifications
  - New RSVP alerts
  - New wishes alerts
  - Update notifications
  - Credentials diatur via Admin > Pengaturan, bukan `.env`

**CDN & Hosting:**

- **Unsplash**: Free high-quality images
- **Google Fonts**: Web fonts
- **Cloudflare** (optional): CDN dan DDoS protection

**Analytics (Optional):**

- Google Analytics
- Plausible Analytics (privacy-friendly)

### Dependencies Tree

```
wedding-invitation
├── @astrojs/node (SSR adapter)
├── @astrojs/react (React integration)
├── @astrojs/sitemap (SEO)
├── better-sqlite3 (Database)
├── react (UI framework)
├── lucide-react (Icons)
├── qrcode.react (QR generator)
├── jspdf (PDF generator)
├── papaparse (CSV parser)
└── jszip (ZIP generator)
```

**Total Bundle Size:**

- Client bundle: ~150KB (gzipped)
- Server bundle: ~500KB
- Database: ~100KB (kosong, sebelum data terisi)

**Performance Metrics:**

- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Lighthouse Score: 95+

---

## Troubleshooting

### Development Issues

#### Port Sudah Digunakan

**Problem:**

```
Error: listen EADDRINUSE: address already in use :::5432
```

**Solution:**

```bash
# Opsi 1: Ganti port di .env
PORT=3000

# Opsi 2: Kill process yang menggunakan port
# Windows
netstat -ano | findstr :5432
taskkill /PID <PID_NUMBER> /F

# Linux/Mac
lsof -ti:5432 | xargs kill -9
```

#### Database Lock

**Problem:**

```
SqliteError: database is locked
```

**Solution:**

```bash
# 1. Stop semua instance dev server
pkill -f "astro dev"

# 2. Hapus journal file
rm database/wedding.db-journal

# 3. Restart dev server
pnpm dev
```

#### Module Not Found

**Problem:**

```
Cannot find module 'better-sqlite3'
```

**Solution:**

```bash
# Clear cache dan reinstall
rm -rf node_modules
rm pnpm-lock.yaml  # atau package-lock.json
pnpm install
```

#### Better-sqlite3 Compile Error

**Problem:**

```
Error: The module was compiled against a different Node.js version
```

**Solution:**

```bash
# Rebuild native module
pnpm add better-sqlite3 --force

# Atau dengan node-gyp
npm rebuild better-sqlite3
```

#### Halaman Utama Error Setelah Update Kode

**Problem:**

```
Cannot read properties of undefined (reading 'couple')
```

**Diagnosis:**
Error ini terjadi jika ada komponen atau file (misalnya `Layout.astro`) yang masih mengimpor config statis dari `constants.tsx`, padahal sistem sudah migrasi penuh ke database. `constants.tsx` sengaja dikosongkan setelah migrasi.

**Solution:**

```bash
# Pastikan tidak ada import WEDDING_CONFIG atau WEDDING_TEXT
grep -r "WEDDING_CONFIG\|WEDDING_TEXT" src/

# Jika ditemukan, ganti dengan data dari useConfig() hook
# atau hapus referensinya jika tidak relevan lagi
```

### Production Issues

#### 502 Bad Gateway (Nginx)

**Problem:**
Server tidak bisa connect ke backend.

**Diagnosis:**

```bash
# Cek PM2 status
pm2 status

# Lihat logs
pm2 logs wedding.zedlabs.id --err

# Test manual run
cd /var/www/wedding-invitation
node dist/server/entry.mjs
```

**Common Causes:**

1. PM2 belum running
2. Port conflict
3. Permission issues
4. Missing dependencies

**Solution:**

```bash
# Restart PM2
pm2 restart wedding.zedlabs.id

# Jika masih error, delete dan start ulang
pm2 delete wedding.zedlabs.id
pm2 start ecosystem.config.cjs
pm2 save
```

#### Database Permission Error

**Problem:**

```
SqliteError: unable to open database file
```

**Solution:**

```bash
# Set proper permissions
sudo chown -R www-data:www-data /var/www/wedding-invitation/database
sudo chmod -R 755 /var/www/wedding-invitation/database
```

#### SSL Certificate Error

**Problem:**
Certbot gagal generate certificate.

**Diagnosis:**

```bash
# Test certbot
sudo certbot certonly --dry-run -d wedding.zedlabs.id

# Cek DNS
nslookup wedding.zedlabs.id

# Test HTTP access
curl -I http://wedding.zedlabs.id
```

**Common Causes:**

1. DNS belum propagate
2. Port 80 blocked
3. Nginx config salah
4. Domain tidak pointing ke server

**Solution:**

```bash
# Pastikan domain pointing ke IP server
# Tunggu DNS propagate (max 24 jam)

# Test dengan HTTP challenge
sudo certbot --nginx -d wedding.zedlabs.id --preferred-challenges http
```

#### Out of Memory

**Problem:**

```
pm2 logs: JavaScript heap out of memory
```

**Solution:**

```bash
# Edit ecosystem.config.cjs
# Tambahkan max_memory_restart
module.exports = {
  apps: [{
    max_memory_restart: '500M', // atau '1G'
  }]
}

# Restart PM2
pm2 restart wedding.zedlabs.id
```

### Database Issues

#### Database Corrupt

**Problem:**

```
SqliteError: database disk image is malformed
```

**Solution:**

```bash
# Backup database corrupt
cp database/wedding.db database/wedding.db.corrupt

# Restore dari backup
cp database/backup-YYYYMMDD.db database/wedding.db

# Atau export/import manual
sqlite3 wedding.db.corrupt ".dump" | sqlite3 wedding.db.new
```

#### Slow Queries

**Problem:**
Query database lambat (>1s).

**Diagnosis:**

```bash
# Open database dengan sqlite3
sqlite3 database/wedding.db

# Check indexes
.schema

# Analyze query plan
EXPLAIN QUERY PLAN SELECT * FROM rsvps;
```

**Solution:**

```sql
-- Tambah index jika perlu
CREATE INDEX idx_rsvps_created_at ON rsvps(created_at DESC);
CREATE INDEX idx_wishes_created_at ON wishes(created_at DESC);

-- Vacuum database
VACUUM;

-- Analyze database
ANALYZE;
```

#### Config Tidak Tersimpan / Tidak Muncul

**Problem:**
Sudah klik "Simpan Semua" di tab Pengaturan, tapi perubahan tidak terlihat di halaman utama.

**Diagnosis:**

```bash
# Cek isi tabel config langsung
sqlite3 database/wedding.db "SELECT key, value FROM config WHERE key='BRIDE_NICKNAME';"

# Cek response API
curl http://localhost:5432/api/config
```

**Common Causes:**

1. Cookie admin sudah expired saat submit (request POST gagal dengan 401)
2. Cache di browser belum di-invalidate (jarang terjadi karena `invalidateConfigCache()` otomatis dipanggil)

**Solution:**

```bash
# Login ulang ke /admin
# Coba simpan kembali
# Hard refresh browser (Ctrl+Shift+R) di halaman utama
```

### API Issues

#### Rate Limit Hit

**Problem:**
User tidak bisa submit form.

**Diagnosis:**

```javascript
// Cek logs
pm2 logs | grep "rate limit"
```

**Solution:**

```javascript
// Edit src/lib/rateLimit.ts
// Adjust limits
export const checkRateLimit = (
  ip: string,
  limit: number = 10,  // naikan dari 5
  windowMs: number = 60000
)
```

#### CORS Error

**Problem:**

```
Access to fetch blocked by CORS policy
```

**Solution:**

```javascript
// Jika perlu custom CORS
// Edit astro.config.mjs

export default defineConfig({
  vite: {
    server: {
      cors: true,
    },
  },
});
```

#### Unauthorized saat Simpan Pengaturan

**Problem:**

```
{"error":"Unauthorized"}
```

**Solution:**

```bash
# Cookie wedding_admin_auth sudah expired (maxAge 24 jam)
# Login ulang di /admin sebelum mencoba simpan kembali
```

### Frontend Issues

#### White Screen / Blank Page

**Problem:**
Page load tapi kosong.

**Diagnosis:**

```javascript
// Open browser console (F12)
// Lihat error di console
// Cek network tab untuk failed requests, khususnya /api/config
```

**Common Causes:**

1. JavaScript error
2. React hydration mismatch
3. `/api/config` gagal fetch (server down atau database error)
4. Bundle error

**Solution:**

```bash
# Rebuild dengan clean cache
rm -rf .astro dist
pnpm build

# Cek response /api/config langsung
curl http://localhost:5432/api/config
```

#### Dark Mode Tidak Berfungsi

**Problem:**
Toggle dark mode tidak work.

**Diagnosis:**

```javascript
// Check localStorage
console.log(localStorage.getItem("theme"));

// Check class di HTML element
console.log(document.documentElement.classList);
```

**Solution:**

```javascript
// Clear localStorage
localStorage.clear();

// Reload page
location.reload();
```

#### Countdown Salah

**Problem:**
Countdown timer menghitung ke tanggal yang salah.

**Diagnosis:**

```bash
# Cek nilai AKAD_ISO_START di database
sqlite3 database/wedding.db "SELECT value FROM config WHERE key='AKAD_ISO_START';"
```

**Solution:**

```
# Buka Admin > Pengaturan > Akad Nikah
# Perbaiki field "ISO Start" dengan format yang benar:
2025-10-11T08:00:00+07:00
# YYYY-MM-DDTHH:mm:ss+TZ
# Simpan kembali
```

### QR Code & PDF Issues

#### QR Code Tidak Generate

**Problem:**
Blank canvas atau error saat generate.

**Diagnosis:**

```javascript
// Check console error
// Verify response /api/config berisi BRIDE_NICKNAME dan GROOM_NICKNAME
```

**Solution:**

```bash
# Pastikan field Nama Panggilan mempelai sudah diisi
# di Admin > Pengaturan > Mempelai Wanita/Pria
```

#### PDF Generation Failed

**Problem:**

```
Error generating PDF
```

**Diagnosis:**

```bash
# Check browser console
# Verify /api/config merespons dengan benar
```

**Solution:**

```bash
# Restart browser
# Clear cache
# Try different browser

# Server-side: Check memory
pm2 monit
```

#### Bulk Process Timeout

**Problem:**
Generate bulk QR/PDF terlalu lama.

**Solution:**

```javascript
// Reduce CHUNK_SIZE
// Di QRCodeManager.tsx atau InvitationManager.tsx

const CHUNK_SIZE = 25; // turunkan dari 50
```

### Telegram Integration Issues

#### Notifikasi Tidak Masuk

**Problem:**
Submit RSVP/Wishes tapi tidak ada notif Telegram.

**Diagnosis:**

```bash
# Cek isi config Telegram (perlu login admin)
curl -b "wedding_admin_auth=true" http://localhost:5432/api/config/full | grep TELEGRAM

# Test manual
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -d "chat_id=<CHAT_ID>" \
  -d "text=Test"
```

**Solution:**

```bash
# Verify token dan chat_id di Admin > Pengaturan > Notifikasi Telegram
# Check bot belum di-block
# Check internet connection dari server

# Test dari server
curl https://api.telegram.org

# Jika ISP block Telegram:
# - Gunakan VPN/proxy
# - Atau biarkan kosong untuk disable notifikasi (silent fail by design)
```

#### Timeout Error

**Problem:**

```
Gagal koneksi ke Telegram: timeout
```

**Solution:**

```javascript
// Edit src/utils/telegram.ts
// Increase timeout dari 5 detik

const timeoutId = setTimeout(() => controller.abort(), 10000);
```

### Performance Issues

#### Slow Loading

**Problem:**
Page load > 5 detik.

**Diagnosis:**

```bash
# Check Lighthouse score
# Chrome DevTools > Lighthouse > Generate Report

# Check Network tab
# Identify large/slow resources, termasuk waktu response /api/config
```

**Solution:**

```bash
# 1. Enable Gzip (sudah ada di nginx.conf)
# 2. Optimize images
# - Compress dengan tinypng.com
# - Use WebP format
# - Lazy load di gallery

# 3. Check CDN
# Pastikan external resources fast (fonts, music)
```

#### High Memory Usage

**Problem:**
PM2 restart karena memory limit.

**Diagnosis:**

```bash
pm2 monit
htop
```

**Solution:**

```bash
# Increase memory limit di ecosystem.config.cjs
max_memory_restart: '1G'

# Atau upgrade VPS RAM
```

### Deployment Issues

#### Build Failed

**Problem:**

```
pnpm build
ERROR: Build failed
```

**Diagnosis:**

```bash
# Run dengan verbose
pnpm build --verbose

# Check specific error
```

**Common Causes:**

1. TypeScript error
2. Missing dependencies
3. File masih mengimpor `WEDDING_CONFIG`/`WEDDING_TEXT` dari `constants.tsx` yang sudah kosong

**Solution:**

```bash
# Fix TypeScript errors
pnpm tsc --noEmit

# Install dependencies
pnpm install

# Pastikan tidak ada import config statis yang tersisa
grep -r "WEDDING_CONFIG\|WEDDING_TEXT" src/
```

#### Cannot Connect to Server

**Problem:**
SSH connection refused atau timeout.

**Solution:**

```bash
# Check server running
ping your-server.com

# Check SSH port
nmap -p 22 your-server.com

# Check firewall
sudo ufw status

# Allow SSH if blocked
sudo ufw allow 22/tcp
```

---

## FAQ

**Q: Apakah database SQLite aman untuk production?**

A: Ya, untuk website undangan dengan traffic moderate (< 100 concurrent users), SQLite sangat cocok. Keuntungan: simple, zero-config, backup mudah (tinggal copy file). Sekarang database juga menyimpan seluruh konten undangan, jadi backup database sama dengan backup konten + data tamu.

**Q: Bagaimana cara mengganti data mempelai?**

A: Login ke `/admin`, buka tab "Pengaturan", edit field Mempelai Wanita/Pria, lalu klik "Simpan Semua". Tidak perlu edit `.env` atau restart server.

**Q: Apakah masih perlu mengisi `.env` untuk data mempelai/jadwal/galeri?**

A: Tidak. Sejak migrasi ke sistem config dinamis, `.env` hanya berisi `HOST`, `PORT`, `DB_NAME`, dan `ADMIN_PASSWORD`. Semua konten lain diatur dari Admin Dashboard.

**Q: Apakah bisa menambah bahasa?**

A: Ya, tambahkan field locale terpisah di tabel `config` (misal `TEXT_SALAM_OPENING_EN`) dan buat logic switch language di komponen terkait. Framework sudah support struktur ini.

**Q: Berapa batas maksimal tamu?**

A: Tidak ada batas hard limit. Database SQLite bisa handle jutaan records. Yang perlu diperhatikan adalah performa query jika data > 10,000 rows (tambah index).

**Q: Apakah mobile-friendly?**

A: Ya, fully responsive dengan Tailwind CSS. Tested di berbagai device dan screen size, termasuk form Pengaturan di Admin Dashboard.

**Q: Bisa deploy di shared hosting?**

A: Tidak, karena butuh Node.js runtime. Minimal pakai VPS. Alternative: Deploy di platform seperti Vercel/Netlify (butuh adapter lain, dan perlu solusi database terpisah karena SQLite file-based tidak cocok untuk serverless).

**Q: Database backup otomatis?**

A: Gunakan cron job seperti di section "Database Backup Strategy". Karena konten undangan sekarang ikut tersimpan di database, pastikan backup ini berjalan rutin terutama menjelang hari H.

**Q: SSL certificate gratis selamanya?**

A: Ya, Let's Encrypt gratis dan auto-renew setiap 90 hari via certbot.

**Q: Apa yang terjadi jika tabel `config` kosong atau database baru?**

A: `src/lib/db.ts` otomatis melakukan seed data default (contoh data Fera & Yahya) saat pertama kali database dibuat, menggunakan `INSERT OR IGNORE`. Admin tinggal menimpa nilai default tersebut dari tab Pengaturan.

---

## Kontribusi

Kontribusi sangat welcome! Silakan:

1. Fork repository
2. Buat branch baru (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

**Guidelines:**

- Follow existing code style (Prettier + ESLint)
- Write meaningful commit messages
- Test thoroughly before submit
- Update documentation jika perlu, terutama jika menambah field baru di tabel `config`

---

## Lisensi

Proyek ini dilisensikan di bawah **MIT License**.

[MIT License](LICENSE)


---

## Kontak & Support

**Developer:** Yahya Zulfikri

**Email:** zulfikriyahya18@gmail.com

**Website:** [https://wedding.zedlabs.id](https://wedding.zedlabs.id)

**Repository:** [https://github.com/zulfikriyahya/wedding-invitation](https://github.com/zulfikriyahya/wedding-invitation)
```
