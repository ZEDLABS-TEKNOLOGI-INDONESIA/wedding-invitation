# Wedding Invitation Website

Sebuah website undangan pernikahan modern, elegan, dan interaktif yang dibangun menggunakan **Astro**, **React**, **Tailwind CSS**, dan **SQLite**. Website ini mendukung mode gelap (dark mode), animasi halus, musik latar otomatis, dan sistem manajemen tamu yang terintegrasi.

![Banner](https://via.placeholder.com/1200x600?text=Wedding+Invitation+Banner)

---

## Fitur Utama

### Pengalaman Pengguna (User Experience)

- **Amplop Digital**: Animasi pembuka undangan yang elegan dengan personalisasi nama tamu.
- **Tema Siang & Malam**: Dukungan Dark Mode yang menyesuaikan preferensi sistem atau pilihan pengguna.
- **Musik Latar**: Pemutar musik otomatis (dengan interaksi pengguna) untuk suasana romantis.
- **Animasi Halus**: Efek _reveal_ saat scroll, _floating petals_, dan transisi antar elemen.
- **Countdown Timer**: Hitung mundur waktu nyata menuju acara pernikahan.

### Fungsionalitas

- **Personalisasi Tamu**: Nama tamu dapat diambil otomatis dari parameter URL (`?to=Nama Tamu Bisa Pakai Spasi`).
- **RSVP Online**: Formulir konfirmasi kehadiran yang terhubung langsung ke database.
  - _Smart Update_: Jika tamu dengan nama yang sama mengisi ulang, data lama akan diperbarui (tidak duplikat).
  - _Dashboard_: Menampilkan statistik kehadiran secara _real-time_ di halaman form.
  - _Input Counter_: Input jumlah tamu dengan batasan maksimum yang bisa dikonfigurasi.
  - _Rate Limiting_: Proteksi spam sederhana berdasarkan IP.
- **Buku Tamu (Wishes)**: Fitur kirim ucapan dan doa dengan paginasi dan input yang terkunci jika diakses lewat link khusus.
- **Integrasi Peta & Kalender**: Tautan langsung ke Google Maps dan fitur "Add to Calendar" (Google/ICS).
- **Galeri Foto**: Penampil foto interaktif (lightbox) dengan navigasi keyboard.
- **Informasi Kado**: Fitur _copy-to-clipboard_ untuk nomor rekening dan alamat kirim kado.

### Teknis

- **Dynamic Configuration**: Mengubah data pengantin, lokasi, musik, dan acara cukup melalui file `.env` tanpa perlu build ulang.
- **Server-Side Rendering (SSR)**: Menggunakan Astro Node Adapter dalam mode `standalone` untuk performa optimal dan SEO.
- **Database SQLite**: Penyimpanan data tamu dan ucapan yang ringan, cepat, dan mandiri (menggunakan `better-sqlite3`).
- **Optimasi Deployment**: Konfigurasi siap pakai untuk deploy menggunakan PM2 dan Nginx Reverse Proxy.

---

## Struktur Proyek

```txt
.
├── src/
│   ├── components/         # Komponen UI (React: Hero, RSVP, Gallery, dll)
│   ├── layouts/            # Layout dasar halaman (Astro)
│   ├── lib/                # Konfigurasi Database (SQLite) & Rate Limiter
│   ├── pages/
│   │   ├── api/            # API Endpoints (RSVP, Wishes, Export)
│   │   └── index.astro     # Halaman utama
│   ├── services/           # Logic penghubung Frontend ke API
│   ├── styles/             # Global CSS & Tailwind Theme
│   ├── utils/              # Helper functions (Calendar, etc)
│   └── types.ts            # Definisi Tipe TypeScript
├── public/                 # Aset statis (Favicon, Images)
├── .env                    # Konfigurasi Data (PENTING)
├── astro.config.mjs        # Konfigurasi Astro
├── ecosystem.config.cjs    # Konfigurasi PM2 untuk Production
├── nginx.conf              # Contoh konfigurasi Nginx
└── package.json            # Daftar dependensi & Scripts
```

---

## Konfigurasi (.env)

Proyek ini menggunakan variabel lingkungan untuk menyimpan semua data teks dan pengaturan. Salin file `.env.example` menjadi `.env` di root folder dan isi sesuai kebutuhan.

**Penting:** Data kompleks seperti _Bank Accounts_, _Love Story_, dan _Gallery_ harus ditulis dalam format JSON satu baris.

```properties
# --- SERVER CONFIG ---
HOST=0.0.0.0
PORT=4321
DB_NAME=wedding.db

# --- RSVP CONFIG ---
PUBLIC_RSVP_MAX_GUESTS=5

# --- MUSIC ---
PUBLIC_MUSIC_URL=https://link-to-your-music.mp3

# --- COUPLE DETAILS ---
PUBLIC_BRIDE_NICKNAME=Fey
PUBLIC_BRIDE_FULLNAME=Fera Oktapia
PUBLIC_BRIDE_PARENTS=Putri ke ... dari Bapak ... & Ibu ...
PUBLIC_BRIDE_INSTAGRAM=feraoktapia___
PUBLIC_BRIDE_IMAGE=https://placehold.co/600x800?text=Fey+Portrait

PUBLIC_GROOM_NICKNAME=Yaya
PUBLIC_GROOM_FULLNAME=Yahya Zulfikri
PUBLIC_GROOM_PARENTS=Putra ke ... dari Bapak ... & Ibu ...
PUBLIC_GROOM_INSTAGRAM=zulfikriyahya_
PUBLIC_GROOM_IMAGE=https://placehold.co/600x800?text=Yaya+Portrait

# --- VENUE ---
PUBLIC_VENUE_NAME=The Royal Azure Ballroom
PUBLIC_VENUE_ADDRESS=Jl. Elok No. 77, Kab. Pandeglang, Banten
PUBLIC_VENUE_LAT=-6.2088
PUBLIC_VENUE_LNG=106.8456

# --- EVENTS (AKAD) ---
PUBLIC_AKAD_TITLE=Janji Suci
PUBLIC_AKAD_DAY=Minggu
PUBLIC_AKAD_DATE=11 Oktober 2025
PUBLIC_AKAD_START=08:00
PUBLIC_AKAD_END=10:00
# Format ISO Wajib: YYYY-MM-DDTHH:mm:ss+07:00
PUBLIC_AKAD_ISO_START=2025-10-11T08:00:00+07:00
PUBLIC_AKAD_ISO_END=2025-10-11T10:00:00+07:00

# --- EVENTS (RESEPSI) ---
PUBLIC_RESEPSI_TITLE=Perayaan Cinta
PUBLIC_RESEPSI_DAY=Minggu
PUBLIC_RESEPSI_DATE=11 Oktober 2025
PUBLIC_RESEPSI_START=11:00
PUBLIC_RESEPSI_END=14:00
PUBLIC_RESEPSI_ISO_START=2025-10-11T11:00:00+07:00
PUBLIC_RESEPSI_ISO_END=2025-10-11T14:00:00+07:00

# --- COMPLEX DATA (Format JSON Satu Baris) ---
PUBLIC_BANK_ACCOUNTS=[{"bank":"Bank BCA","number":"1234567890","name":"Fera Oktapia"},{"bank":"Bank Mandiri","number":"0987654321","name":"Yahya Zulfikri"}]

PUBLIC_LOVE_STORY=[{"date":"Musim Gugur, 2020","title":"Pertemuan Pertama","desc":"Berawal dari sebuah diskusi kecil..."},{"date":"Maret, 2022","title":"Sebuah Komitmen","desc":"Memutuskan untuk saling menguatkan..."}]

PUBLIC_GALLERY_IMAGES=["https://placehold.co/800x1200?text=Moment+1","https://placehold.co/1200x800?text=Moment+2"]
```

---

## Cara Instalasi & Menjalankan (Development)

Pastikan Anda sudah menginstal **Node.js** (v18+) dan **Yarn** atau **NPM**.

1.  **Clone Repository**

    ```bash
    git clone https://github.com/username/wedding-invitation.git
    cd wedding-invitation
    ```

2.  **Buat File .env**
    Salin contoh konfigurasi di atas ke dalam file baru bernama `.env`.

3.  **Install Dependencies**

    ```bash
    yarn install
    # atau
    npm install
    ```

4.  **Jalankan Server Development**
    ```bash
    yarn dev
    ```
    Website akan berjalan di `http://localhost:4321`. File database `wedding.db` akan otomatis dibuat saat pertama kali aplikasi dijalankan.

---

## Deployment ke Production (VPS / Dedicated Server)

Proyek ini menggunakan adapter **Node.js Standalone** dan database **SQLite**. Berikut langkah-langkah deploy ke server Ubuntu/CentOS/Debian:

### 1. Build Project

Di komputer lokal Anda, jalankan perintah build:

```bash
yarn build
```

Ini akan menghasilkan folder `dist/` dan `node_modules/` (opsional, tergantung config, tapi lebih baik install ulang di server).

### 2. Upload File ke Server

Upload file/folder berikut ke direktori server (misal: `/var/www/wedding.example.com`):

- Folder `dist/`
- File `.env` (**Penting**: Pastikan file ini ada di server)
- File `package.json`
- File `ecosystem.config.cjs`
- File `yarn.lock` atau `package-lock.json`

### 3. Install Production Dependencies di Server

Masuk ke terminal server dan jalankan:

```bash
cd /var/www/wedding.example.com
yarn install --production
```

_Langkah ini penting agar driver SQLite (`better-sqlite3`) terkompilasi sesuai sistem operasi server._

### 4. Jalankan dengan PM2

Gunakan PM2 untuk menjalankan aplikasi di background.

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 5. Konfigurasi Nginx (Reverse Proxy)

Buat file konfigurasi Nginx (biasanya di `/etc/nginx/sites-available/wedding`) menggunakan contoh dari file `nginx.conf` di repo ini.

```bash
# Link konfigurasi
sudo ln -s /etc/nginx/sites-available/wedding /etc/nginx/sites-enabled/

# Test & Restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

---

## Personalisasi Undangan

Untuk membuat link undangan spesifik untuk tamu tertentu, tambahkan parameter `?to=` di akhir URL. URL di-encode secara otomatis oleh browser untuk spasi.

**Contoh:**
`https://wedding.example.com/?to=Budi+Santoso`

**Efek:**

1. Nama "Budi Santoso" muncul di **Amplop Depan**.
2. Nama "Budi Santoso" muncul di **Hero Section**.
3. Input Nama di form **RSVP** otomatis terisi "Budi Santoso" dan **terkunci**.
4. Input Nama di form **Wishes** otomatis terisi "Budi Santoso" dan **terkunci**.

---

## Ekspor Data

Data tamu dan ucapan dapat diekspor ke format CSV melalui API endpoint berikut:

- **Data RSVP**: [https://wedding.example.com/api/export-rsvp](https://wedding.example.com/api/export-rsvp)
- **Data Wishes**: [https://wedding.example.com/api/export-wishes](https://wedding.example.com/api/export-wishes)

---

## Lisensi

[MIT License](LICENSE) - Dibuat dengan ❤️ oleh **Yahya Zulfikri**.
