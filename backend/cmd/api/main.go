package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"wedding-zedlabs/internal/admin"
	"wedding-zedlabs/internal/audit"
	"wedding-zedlabs/internal/auth"
	"wedding-zedlabs/internal/db"
	"wedding-zedlabs/internal/domain"
	"wedding-zedlabs/internal/publik"
	"wedding-zedlabs/internal/server"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL wajib diisi")
	}
	jwtSeed := strings.TrimSpace(os.Getenv("JWT_PRIVATE_KEY"))
	if jwtSeed == "" {
		log.Fatal("JWT_PRIVATE_KEY wajib diisi")
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8095"
	}

	ctx, batal := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer batal()

	pool, err := db.Buka(ctx, dsn)
	if err != nil {
		log.Fatalf("koneksi PG gagal: %v", err)
	}
	defer pool.Close()

	res := domain.NewResolver(pool, os.Getenv("PUBLIC_DOMAIN"))
	auditLog := audit.NewLogger(pool)
	tokens := auth.NewTokenService(auth.KunciDariSeed(jwtSeed))
	pub := publik.NewHandler(pool, res, os.Getenv("STATISTIK_PUBLIK_KEY_ID"), os.Getenv("STATISTIK_PUBLIK_SECRET"))
	adm := admin.NewHandler(pool, res, tokens, auditLog)

	srv := &http.Server{
		Addr:              "127.0.0.1:" + port,
		Handler:           server.Rakit(pub, adm, tokens),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
	}
	go func() {
		<-ctx.Done()
		c, s := context.WithTimeout(context.Background(), 10*time.Second)
		defer s()
		_ = srv.Shutdown(c)
	}()
	log.Printf("wedding-v2-api berjalan di http://%s", srv.Addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server berhenti: %v", err)
	}
}
