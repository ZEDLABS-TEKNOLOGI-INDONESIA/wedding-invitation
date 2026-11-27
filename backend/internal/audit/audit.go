package audit

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Logger struct {
	pool *pgxpool.Pool
	mu   sync.Mutex
}

func NewLogger(pool *pgxpool.Pool) *Logger { return &Logger{pool: pool} }

func (l *Logger) Catat(ctx context.Context, weddingID, userID, aksi, targetID string, ringkasan any) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	raw, err := json.Marshal(ringkasan)
	if err != nil {
		raw = []byte("{}")
	}
	var prev string
	_ = l.pool.QueryRow(ctx, `SELECT hash_ini FROM audit_log ORDER BY id DESC LIMIT 1`).Scan(&prev)
	if prev == "" {
		prev = "GENESIS"
	}
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s|%s|%s|%s|%s|%s", prev, weddingID, userID, aksi, targetID, string(raw))))
	hashIni := hex.EncodeToString(sum[:])

	var wArg, uArg any
	if weddingID != "" {
		wArg = weddingID
	}
	if userID != "" {
		uArg = userID
	}
	_, err = l.pool.Exec(ctx, `
		INSERT INTO audit_log (wedding_id, user_id, aksi, target_id, ringkasan_json, hash_sebelum, hash_ini)
		VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
	`, wArg, uArg, aksi, targetID, string(raw), prev, hashIni)
	return err
}
