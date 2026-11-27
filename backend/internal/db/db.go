package db

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io/fs"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Buka(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, err
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}

func DenganTenantTx(ctx context.Context, pool *pgxpool.Pool, weddingID string, fn func(pgx.Tx) error) error {
	if strings.TrimSpace(weddingID) == "" {
		return errors.New("wedding_id wajib diisi")
	}
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, `SELECT set_config('app.wedding_id', $1, true)`, weddingID); err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func Migrasi(ctx context.Context, pool *pgxpool.Pool, sumberFS fs.FS) error {
	entri, err := fs.ReadDir(sumberFS, ".")
	if err != nil {
		return err
	}
	var berkas []string
	for _, e := range entri {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			berkas = append(berkas, e.Name())
		}
	}
	sort.Strings(berkas)
	if _, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS riwayat_migrasi (
			nama TEXT PRIMARY KEY, checksum TEXT NOT NULL, diterapkan TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`); err != nil {
		return err
	}
	for _, nama := range berkas {
		isi, err := fs.ReadFile(sumberFS, nama)
		if err != nil {
			return err
		}
		sum := sha256.Sum256(isi)
		checksum := hex.EncodeToString(sum[:])
		var ada string
		err = pool.QueryRow(ctx, `SELECT checksum FROM riwayat_migrasi WHERE nama = $1`, nama).Scan(&ada)
		if err == nil {
			if ada != checksum {
				return fmt.Errorf("checksum %s berubah", nama)
			}
			continue
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		tx, err := pool.Begin(ctx)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, string(isi)); err != nil {
			_ = tx.Rollback(ctx)
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO riwayat_migrasi (nama, checksum) VALUES ($1, $2)`, nama, checksum); err != nil {
			_ = tx.Rollback(ctx)
			return err
		}
		if err := tx.Commit(ctx); err != nil {
			return err
		}
	}
	return nil
}
