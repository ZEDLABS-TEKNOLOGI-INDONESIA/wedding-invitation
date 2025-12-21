# Website Undangan Pernikahan Digital

Website undangan pernikahan yang elegan, modern, dan interaktif dibangun menggunakan Astro, React, Tailwind CSS, dan SQLite. Dilengkapi dengan sistem manajemen tamu yang komprehensif, pelacakan RSVP real-time, notifikasi otomatis, dan tools desain profesional.

![Banner](./public/thumbnail.png)

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
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

**Dynamic Configuration**

```javascript
// Semua data dari environment variables
// Parsing otomatis untuk tipe data kompleks
const parseJson = (jsonString, defaultValue) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return defaultValue;
  }
};
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

// Format pesan dengan HTML parsing
// Timeout 5 detik untuk koneksi lambat
// Silent fail agar tidak mengganggu user experience
```

### Panel Admin

**Autentikasi**

- Cookie-based authentication
- Password dari environment variable
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
- QR Code dengan logo premium (inisial mempelai)
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
│   │   │   └── AdminDashboard.tsx # Main admin interface
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
│   ├── layouts/
│   │   └── Layout.astro           # Base HTML structure
│   │
│   ├── lib/
│   │   ├── db.ts                  # SQLite setup + migrations
│   │   └── rateLimit.ts           # IP-based rate limiter
│   │
│   ├── pages/
│   │   ├── api/
│   │   │   ├── admin.ts           # Admin CRUD operations
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
│   │   └── dbService.ts           # Frontend API wrapper
│   │
│   ├── styles/
│   │   └── global.css             # Tailwind + custom styles
│   │
│   ├── utils/
│   │   ├── calendarUtils.ts       # Google Cal + ICS
│   │   └── telegram.ts            # Telegram notifications
│   │
│   ├── App.tsx                    # Main React app
│   ├── constants.tsx              # Config parser
│   └── types.ts                   # TypeScript definitions
│
├── .env                           # Configuration file (REQUIRED)
├── .env.example                   # Configuration template
├── .prettierrc.mjs               # Code formatting rules
├── astro.config.mjs              # Astro framework config
├── ecosystem.config.cjs          # PM2 process manager
├── eslint.config.mjs             # Linting rules
├── nginx.conf                    # Nginx reverse proxy example
├── package.json                  # Dependencies + scripts
├── README.md                     # This file
├── todo.md                       # Development notes
├── tsconfig.json                 # TypeScript config
└── LICENSE                       # MIT License
```

### Penjelasan Struktur Kunci

**Database Layer (`src/lib/db.ts`)**

```javascript
// Auto-migration dari root ke /database folder
// WAL mode untuk concurrent access
// Auto-create tables on first run
```

**API Layer (`src/pages/api/`)**

```javascript
// RESTful endpoints
// Rate limiting di semua POST endpoints
// Sanitasi input untuk XSS protection
// Cookie-based auth untuk admin
```

**Service Layer (`src/services/dbService.ts`)**

```javascript
// Client-side cache (30 detik)
// Fetch wrapper untuk API calls
// Type-safe responses
```

**Components**

```javascript
// React functional components dengan hooks
// TypeScript strict mode
// Client-side rendering dengan Astro directives
// Shared props via constants
```

---

## Konfigurasi

### File .env

Semua konfigurasi website dikelola melalui environment variables. Salin `.env.example` ke `.env` di root folder.

#### Server Configuration

```properties
# Host dan Port untuk development/production
HOST=0.0.0.0
PORT=4321

# Nama file database SQLite (auto-created di /database)
DB_NAME=wedding.db

# Password untuk akses admin panel
ADMIN_PASSWORD=P@ssw0rd_Anda_Disini
```

#### Notifikasi Telegram (Opsional)

```properties
# Untuk mendapatkan token dan chat_id:
# 1. Buat bot baru melalui @BotFather di Telegram
# 2. Dapatkan chat_id dengan cara kirim pesan ke bot
#    lalu akses: https://api.telegram.org/bot<TOKEN>/getUpdates

TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

#### Hero Section

```properties
# Gambar utama (support Unsplash, lokal, atau CDN)
PUBLIC_HERO_IMAGE=https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop

# Lokasi/kota untuk ditampilkan di hero
PUBLIC_HERO_CITY=Kab. Pandeglang, Banten
```

#### Background Music

```properties
# URL musik (MP3/OGG)
# Bisa menggunakan:
# - CDN seperti BenSound
# - Upload ke hosting sendiri
# - Google Drive (dengan link direct download)

PUBLIC_MUSIC_URL=https://www.bensound.com/bensound-music/bensound-forever.mp3
```

#### Data Mempelai Wanita

```properties
# Nama panggilan (untuk footer dan hero)
PUBLIC_BRIDE_NICKNAME=Fey

# Nama lengkap (untuk profile section)
PUBLIC_BRIDE_FULLNAME=Fera Oktapia

# Info orang tua
PUBLIC_BRIDE_PARENTS=Putri tercinta dari Bpk. [Nama Ayah] & Ibu [Nama Ibu]

# Instagram handle (tanpa @)
PUBLIC_BRIDE_INSTAGRAM=feraoktapia___

# URL foto portrait (landscape atau portrait, min 600x800px)
PUBLIC_BRIDE_IMAGE=https://placehold.co/600x800?text=Fey+Portrait
```

#### Data Mempelai Pria

```properties
PUBLIC_GROOM_NICKNAME=Yaya
PUBLIC_GROOM_FULLNAME=Yahya Zulfikri
PUBLIC_GROOM_PARENTS=Putra tercinta dari Bpk. [Nama Ayah] & Ibu [Nama Ibu]
PUBLIC_GROOM_INSTAGRAM=zulfikriyahya_
PUBLIC_GROOM_IMAGE=https://placehold.co/600x800?text=Yaya+Portrait
```

#### Informasi Venue

```properties
# Nama tempat acara
PUBLIC_VENUE_NAME=The Royal Azure Ballroom

# Alamat lengkap (untuk display dan PDF)
PUBLIC_VENUE_ADDRESS=Jl. Taman Makam Pahlawan No.1, Kab. Pandeglang, Banten

# Koordinat GPS (dapatkan dari Google Maps)
# Cara: Klik kanan di Google Maps → koordinat ada di popup
PUBLIC_VENUE_LAT=-6.2088
PUBLIC_VENUE_LNG=106.8456
```

#### Jadwal Akad Nikah

```properties
# Judul acara (bebas customize)
PUBLIC_AKAD_TITLE=Akad Nikah

# Nama hari (Senin - Minggu)
PUBLIC_AKAD_DAY=Minggu

# Tanggal dalam format Indonesia
PUBLIC_AKAD_DATE=11 Oktober 2025

# Waktu mulai dan selesai (format 24 jam)
PUBLIC_AKAD_START=08:00
PUBLIC_AKAD_END=10:00

# Format ISO-8601 dengan timezone (+07:00 untuk WIB)
# PENTING: Format ini digunakan untuk countdown timer dan calendar export
PUBLIC_AKAD_ISO_START=2025-10-11T08:00:00+07:00
PUBLIC_AKAD_ISO_END=2025-10-11T10:00:00+07:00
```

#### Jadwal Resepsi

```properties
PUBLIC_RESEPSI_TITLE=Resepsi Pernikahan
PUBLIC_RESEPSI_DAY=Minggu
PUBLIC_RESEPSI_DATE=11 Oktober 2025
PUBLIC_RESEPSI_START=11:00
PUBLIC_RESEPSI_END=14:00
PUBLIC_RESEPSI_ISO_START=2025-10-11T11:00:00+07:00
PUBLIC_RESEPSI_ISO_END=2025-10-11T14:00:00+07:00
```

#### Konfigurasi RSVP

```properties
# Maksimal jumlah tamu yang bisa dibawa per undangan
# Bisa disesuaikan dengan kapasitas venue
PUBLIC_RSVP_MAX_GUESTS=20
```

#### Data Kompleks (Format JSON)

**PENTING:** Data berikut harus ditulis dalam **satu baris** tanpa line break.

**Bank Accounts:**

```json
PUBLIC_BANK_ACCOUNTS=[{"bank":"Bank BCA","number":"1234567890","name":"Fera Oktapia"},{"bank":"Bank Mandiri","number":"0987654321","name":"Yahya Zulfikri"}]
```

**Love Story Timeline:**

```json
PUBLIC_LOVE_STORY=[{"date":"2020","title":"Awal Pertemuan","desc":"Atas izin Allah, kami dipertemukan dalam suasana yang sederhana namun penuh makna."},{"date":"2022","title":"Menjalin Harapan","desc":"Dengan niat baik, kami memutuskan untuk saling mengenal dan membangun komitmen menuju ridho-Nya."},{"date":"2025","title":"Ikatan Suci","desc":"Insya Allah, kami memantapkan hati untuk menyempurnakan separuh agama dalam ikatan pernikahan."}]
```

**Gallery Images:**

```json
PUBLIC_GALLERY_IMAGES=["https://placehold.co/800x1200?text=Moment+1","https://placehold.co/1200x800?text=Moment+2","https://placehold.co/800x800?text=Moment+3","https://placehold.co/800x1200?text=Moment+4","https://placehold.co/1200x800?text=Moment+5","https://placehold.co/800x1200?text=Moment+6"]
```

### Tips Konfigurasi

1. **Validasi JSON:**

   ```bash
   # Gunakan tool online seperti jsonlint.com
   # untuk memvalidasi format JSON sebelum paste ke .env
   ```

2. **URL Gambar:**

   ```javascript
   // Rekomendasi sumber gambar:
   // - Unsplash (gratis, high-quality)
   // - ImgBB (free image hosting)
   // - Cloudinary (CDN profesional)
   // - Self-hosted di /public folder
   ```

3. **Koordinat GPS:**

   ```
   1. Buka Google Maps
   2. Klik kanan pada lokasi venue
   3. Klik koordinat yang muncul (format: -6.xxx, 106.xxx)
   4. Copy paste ke .env
   ```

4. **Format Tanggal ISO:**
   ```javascript
   // Format: YYYY-MM-DDTHH:mm:ss+07:00
   // YYYY: Tahun 4 digit
   // MM: Bulan 2 digit (01-12)
   // DD: Tanggal 2 digit (01-31)
   // T: Separator
   // HH:mm:ss: Jam 24-format
   // +07:00: Timezone (WIB)
   ```

---

## Instalasi & Development

### Prasyarat Sistem

**Software Required:**

- Node.js versi 18.x atau lebih tinggi
- Package manager: Yarn (recommended) atau NPM
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

#### 2. Setup Environment Variables

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
PORT=4321
DB_NAME=wedding.db
ADMIN_PASSWORD=admin123

PUBLIC_BRIDE_NICKNAME=Bride
PUBLIC_GROOM_NICKNAME=Groom
PUBLIC_VENUE_NAME=Test Venue
PUBLIC_AKAD_ISO_START=2025-12-31T10:00:00+07:00
PUBLIC_AKAD_ISO_END=2025-12-31T12:00:00+07:00
```

#### 3. Install Dependencies

```bash
# Menggunakan Yarn (recommended)
yarn install

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
yarn dev

# Output yang muncul:
# 🚀 astro v5.x.x started in XXXms
# ┃ Local    http://localhost:4321/
# ┃ Network  http://192.168.x.x:4321/
```

#### 5. Akses Website

Buka browser dan kunjungi:

- Local: `http://localhost:4321`
- Network: `http://192.168.x.x:4321` (bisa diakses dari device lain dalam jaringan yang sama)

### Development Workflow

#### Hot Reload

```bash
# File yang di-watch untuk auto-reload:
# - src/**/*.astro
# - src/**/*.tsx
# - src/**/*.ts
# - src/**/*.css
# - .env (perlu restart manual)
```

#### File .env Changes

```bash
# Setelah edit .env, restart server:
Ctrl + C  # Stop server
yarn dev  # Start ulang
```

#### Database Location

```bash
# Database otomatis dibuat di:
./database/wedding.db

# Untuk reset database:
rm -rf database/
yarn dev  # Database baru akan dibuat otomatis
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
      "runtimeExecutable": "yarn",
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
1. Buka http://localhost:4321/?to=Test+User
2. Scroll ke section RSVP
3. Isi form dan submit
4. Cek data di admin panel: http://localhost:4321/admin
```

#### Test Admin Panel

```bash
1. Akses http://localhost:4321/admin
2. Login dengan password dari .env (ADMIN_PASSWORD)
3. Eksplorasi semua fitur:
   - Lihat data RSVP
   - Edit/delete data
   - Export CSV
   - Generate QR Code
   - Buat PDF undangan
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

### Troubleshooting Development

**Port Already in Use:**

```bash
# Ganti port di .env
PORT=3000

# Atau kill process yang menggunakan port 4321
# Windows:
netstat -ano | findstr :4321
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:4321 | xargs kill -9
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
rm yarn.lock  # atau package-lock.json
yarn install
```

**Better-sqlite3 Compile Error:**

```bash
# Rebuild native module
yarn add better-sqlite3 --force
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

# Install Yarn
sudo npm install -g yarn

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
yarn build

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
  yarn.lock \
  ecosystem.config.cjs \
  .env

# File yang TIDAK perlu di-upload:
# - node_modules/ (install ulang di server)
# - src/ (sudah ter-bundle di dist/)
# - .git/ (opsional, tergantung deployment strategy)
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
yarn install --production
yarn build
```

### Setup Production Environment

#### 1. Install Dependencies

```bash
cd /var/www/wedding-invitation

# Install hanya production dependencies
yarn install --production

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
PORT=4321
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
# │ 0   │ wedding.feyaya.com   │ online  │ 0%      │
# └─────┴──────────────────────┴─────────┴─────────┘

# Auto-start on server reboot
pm2 save
pm2 startup
# Follow instructions dari output command
```

#### 5. PM2 Management Commands

```bash
# Lihat logs real-time
pm2 logs wedding.feyaya.com

# Restart aplikasi
pm2 restart wedding.feyaya.com

# Stop aplikasi
pm2 stop wedding.feyaya.com

# Hapus dari PM2
pm2 delete wedding.feyaya.com

# Monitor resource usage
pm2 monit
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
    server 127.0.0.1:4321;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name wedding.feyaya.com www.wedding.feyaya.com;

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
sudo certbot --nginx -d wedding.feyaya.com -d www.wedding.feyaya.com

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
pm2 logs wedding.feyaya.com --lines 100

# Error logs only
pm2 logs wedding.feyaya.com --err

# Save logs to file
pm2 logs wedding.feyaya.com > app.log
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
yarn install --production

# 3. Build
yarn build

# 4. Restart PM2
pm2 restart wedding.feyaya.com

# 5. Verify
pm2 status
```

---

## Panduan Penggunaan

### Untuk Pengguna Akhir

#### Mengakses Undangan

**URL Umum:**

```
https://wedding.feyaya.com
```

**URL Personal (dengan nama tamu):**

```
https://wedding.feyaya.com/?to=Ahmad+Syarief+Ramadhan
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
5. Jika pilih "Hadir", tentukan jumlah tamu yang dibawa (max 20 orang default)
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
URL: https://wedding.feyaya.com/admin
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
- Logo: Inisial mempelai dalam circle dengan border gold
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

#### Logout

Klik tombol "LOGOUT" di kanan atas dashboard.

---

## Stack Teknologi

### Frontend

**Framework & Library:**

- **Astro 5.16.6**: Static Site Generator dengan SSR support
  - Island Architecture untuk optimal bundle size
  - Partial hydration
  - Built-in optimization
- **React 19.2.3**: UI Component Library
  - Functional components dengan hooks
  - TypeScript strict mode
  - Server Components ready

- **Tailwind CSS 4.1.18**: Utility-first CSS Framework
  - Custom theme configuration
  - Dark mode support
  - Responsive design
  - JIT compiler

**UI Components:**

- **Lucide React**: Icon library (tree-shakeable)
- Custom components dengan editorial design

**QR Code & PDF:**

- **qrcode.react 4.2.0**: QR code generator component
- **qrcode 1.5.4**: Server-side QR generation
- **jsPDF 3.0.4**: PDF generation library
- **Canvas API**: untuk render QR dan vector graphics

**File Processing:**

- **PapaParse 5.5.3**: CSV parser
- **JSZip 3.10.1**: ZIP file generator
- **FileSaver 2.0.5**: Client-side file download

**PWA:**

- **vite-plugin-pwa 1.2.0**: PWA integration
- **Workbox**: Service Worker strategies

### Backend

**Runtime & Server:**

- **Node.js 18+**: JavaScript runtime
- **Astro Node Adapter 9.5.1**: SSR dengan standalone mode
- **Express** (via Astro): HTTP server

**Database:**

- **better-sqlite3 12.5.0**: Synchronous SQLite3 binding
  - WAL mode untuk concurrent access
  - Prepared statements
  - Transaction support

**API Layer:**

- RESTful API dengan Astro API routes
- Type-safe dengan TypeScript
- Input sanitization

### Development Tools

**Code Quality:**

- **TypeScript 5.9.3**: Type-safe JavaScript
- **ESLint 9.39.2**: Linting
  - React plugin
  - Astro plugin
  - TypeScript plugin
- **Prettier 3.7.4**: Code formatter
  - Astro plugin
  - Tailwind plugin

**Build Tools:**

- **Vite 7.3.0**: Build tool dan dev server
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
- Database: ~100KB (empty)

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
Error: listen EADDRINUSE: address already in use :::4321
```

**Solution:**

```bash
# Opsi 1: Ganti port di .env
PORT=3000

# Opsi 2: Kill process yang menggunakan port
# Windows
netstat -ano | findstr :4321
taskkill /PID <PID_NUMBER> /F

# Linux/Mac
lsof -ti:4321 | xargs kill -9
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
yarn dev
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
rm yarn.lock  # atau package-lock.json
yarn install
```

#### Better-sqlite3 Compile Error

**Problem:**

```
Error: The module was compiled against a different Node.js version
```

**Solution:**

```bash
# Rebuild native module
yarn add better-sqlite3 --force

# Atau dengan node-gyp
npm rebuild better-sqlite3
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
pm2 logs wedding.feyaya.com --err

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
pm2 restart wedding.feyaya.com

# Jika masih error, delete dan start ulang
pm2 delete wedding.feyaya.com
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
sudo certbot certonly --dry-run -d wedding.feyaya.com

# Cek DNS
nslookup wedding.feyaya.com

# Test HTTP access
curl -I http://wedding.feyaya.com
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
sudo certbot --nginx -d wedding.feyaya.com --preferred-challenges http
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
pm2 restart wedding.feyaya.com
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

### Frontend Issues

#### White Screen / Blank Page

**Problem:**
Page load tapi kosong.

**Diagnosis:**

```javascript
// Open browser console (F12)
// Lihat error di console
// Cek network tab untuk failed requests
```

**Common Causes:**

1. JavaScript error
2. React hydration mismatch
3. Missing environment variables
4. Bundle error

**Solution:**

```bash
# Rebuild dengan clean cache
rm -rf .astro dist
yarn build

# Check .env
cat .env | grep PUBLIC_
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
# Check .env
cat .env | grep PUBLIC_AKAD_ISO_START
```

**Solution:**

```properties
# Format harus exact ISO-8601 dengan timezone
PUBLIC_AKAD_ISO_START=2025-10-11T08:00:00+07:00
                     # ^^^^-^^-^^T^^:^^:^^+^^:^^
                     # YYYY-MM-DDTHH:mm:ss+TZ
```

### QR Code & PDF Issues

#### QR Code Tidak Generate

**Problem:**
Blank canvas atau error saat generate.

**Diagnosis:**

```javascript
// Check console error
// Verify logo image loaded
```

**Solution:**

```javascript
// Verify constants.tsx
// Check WEDDING_CONFIG.couple.bride.name
// Check WEDDING_CONFIG.couple.groom.name
```

#### PDF Generation Failed

**Problem:**

```
Error generating PDF
```

**Diagnosis:**

```bash
# Check browser console
# Verify all env variables loaded
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
# Check .env
cat .env | grep TELEGRAM_

# Test manual
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -d "chat_id=<CHAT_ID>" \
  -d "text=Test"
```

**Solution:**

```bash
# Verify token dan chat_id benar
# Check bot belum di-block
# Check internet connection dari server

# Test dari server
curl https://api.telegram.org

# Jika ISP block Telegram:
# - Gunakan VPN/proxy
# - Atau disable notifikasi Telegram
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
# Identify large/slow resources
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
yarn build
ERROR: Build failed
```

**Diagnosis:**

```bash
# Run dengan verbose
yarn build --verbose

# Check specific error
```

**Common Causes:**

1. TypeScript error
2. Missing dependencies
3. Environment variables tidak load

**Solution:**

```bash
# Fix TypeScript errors
yarn tsc --noEmit

# Install dependencies
yarn install

# Check .env exists
ls -la .env
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

A: Ya, untuk website undangan dengan traffic moderate (< 100 concurrent users), SQLite sangat cocok. Keuntungan: simple, zero-config, backup mudah (tinggal copy file).

**Q: Bagaimana cara mengganti data mempelai?**

A: Edit file `.env`, ubah nilai `PUBLIC_BRIDE_*` dan `PUBLIC_GROOM_*`, lalu restart server (development) atau rebuild + restart PM2 (production).

**Q: Apakah bisa menambah bahasa?**

A: Ya, tambahkan translation di `src/constants.tsx` dan buat logic untuk switch language. Framework sudah support i18n.

**Q: Berapa batas maksimal tamu?**

A: Tidak ada batas hard limit. Database SQLite bisa handle jutaan records. Yang perlu diperhatikan adalah performa query jika data > 10,000 rows (tambah index).

**Q: Apakah mobile-friendly?**

A: Ya, fully responsive dengan Tailwind CSS. Tested di berbagai device dan screen size.

**Q: Bisa deploy di shared hosting?**

A: Tidak, karena butuh Node.js runtime. Minimal pakai VPS. Alternative: Deploy di platform seperti Vercel/Netlify (butuh adapter lain).

**Q: Database backup otomatis?**

A: Gunakan cron job seperti di section "Database Backup Strategy".

**Q: SSL certificate gratis selamanya?**

A: Ya, Let's Encrypt gratis dan auto-renew setiap 90 hari via certbot.

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
- Update documentation jika perlu

---

## Lisensi

Proyek ini dilisensikan di bawah **MIT License**.

```
MIT License

Copyright (c) 2025 Yahya Zulfikri

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Kontak & Support

**Developer:** Yahya Zulfikri

**Email:** zulfikriyahya18@gmail.com

**Website:** [https://wedding.feyaya.com](https://wedding.feyaya.com)

**Repository:** [https://github.com/zulfikriyahya/wedding-invitation](https://github.com/zulfikriyahya/wedding-invitation)
