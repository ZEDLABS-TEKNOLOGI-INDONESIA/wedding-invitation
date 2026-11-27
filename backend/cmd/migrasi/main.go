package main

import (
	"context"
	"io/fs"
	"log"
	"os"
	"time"

	"wedding-zedlabs/internal/db"
	sqlfs "wedding-zedlabs/sql"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL wajib diisi")
	}
	ctx, batal := context.WithTimeout(context.Background(), 2*time.Minute)
	defer batal()

	pool, err := db.Buka(ctx, dsn)
	if err != nil {
		log.Fatalf("buka PG gagal: %v", err)
	}
	defer pool.Close()

	sub, err := fs.Sub(sqlfs.MigrasiFS, "migrasi")
	if err != nil {
		log.Fatalf("embed migrasi: %v", err)
	}
	if err := db.Migrasi(ctx, pool, sub); err != nil {
		log.Fatalf("migrasi gagal: %v", err)
	}
	log.Println("seluruh migrasi SQL wedding-v2 berhasil diterapkan dan checksum terverifikasi")
}
