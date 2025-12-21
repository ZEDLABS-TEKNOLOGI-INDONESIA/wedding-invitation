#!/bin/bash

# 1. Konfigurasi
DB_FILE="wedding.db"
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# 2. Buat folder backup jika belum ada
mkdir -p $BACKUP_DIR

# 3. Copy database (Backup menggunakan perintah sqlite3 .backup lebih aman saat DB sedang aktif)
# Jika sqlite3 tidak terinstall di server, pakai 'cp' biasa juga oke untuk trafik rendah.
if command -v sqlite3 &> /dev/null; then
    sqlite3 $DB_FILE ".backup '$BACKUP_DIR/wedding_$TIMESTAMP.db'"
    echo "Backup sukses (via sqlite3): wedding_$TIMESTAMP.db"
else
    cp $DB_FILE "$BACKUP_DIR/wedding_$TIMESTAMP.db"
    echo "Backup sukses (via copy): wedding_$TIMESTAMP.db"
fi

# 4. Hapus backup yang lebih tua dari 7 hari (Agar disk server tidak penuh)
find $BACKUP_DIR -name "wedding_*.db" -type f -mtime +7 -delete