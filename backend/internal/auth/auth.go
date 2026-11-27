package auth

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/scrypt"
)

const (
	argonMemory = 64 * 1024
	argonTime   = 3
	argonThread = 2
	argonKeyLen = 32
	maksSandi   = 128
)

type ctxKey string

const keyKlaim ctxKey = "wedding_klaim"

func KunciDariSeed(seed string) ed25519.PrivateKey {
	if raw, err := base64.StdEncoding.DecodeString(strings.TrimSpace(seed)); err == nil && len(raw) == ed25519.SeedSize {
		return ed25519.NewKeyFromSeed(raw)
	}
	sum := sha256.Sum256([]byte(seed))
	return ed25519.NewKeyFromSeed(sum[:])
}

func HashSandi(sandi string) (string, error) {
	if len(sandi) < 6 || len(sandi) > maksSandi {
		return "", errors.New("kata sandi harus 6-128 karakter")
	}
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	hash := argon2.IDKey([]byte(sandi), salt, argonTime, argonMemory, argonThread, argonKeyLen)
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, argonMemory, argonTime, argonThread,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(hash),
	), nil
}

// VerifikasiSandi mendukung Argon2id standar ZEDLABS sekaligus hash scrypt$ warisan Node.js
// (crypto.scryptSync default N=16384, r=8, p=1) untuk migrasi mulus tanpa paksa reset sandi.
func VerifikasiSandi(sandi, encoded string) bool {
	if len(sandi) == 0 || len(sandi) > maksSandi || encoded == "" {
		return false
	}
	if strings.HasPrefix(encoded, "scrypt$") {
		parts := strings.Split(encoded, "$")
		if len(parts) != 3 {
			return false
		}
		expected, err := hex.DecodeString(parts[2])
		if err != nil || len(expected) == 0 {
			return false
		}
		actual, err := scrypt.Key([]byte(sandi), []byte(parts[1]), 16384, 8, 1, len(expected))
		if err != nil {
			return false
		}
		return subtle.ConstantTimeCompare(expected, actual) == 1
	}
	bagian := strings.Split(encoded, "$")
	if len(bagian) != 6 || bagian[1] != "argon2id" {
		return false
	}
	var m, t uint32
	var p uint8
	if _, err := fmt.Sscanf(bagian[3], "m=%d,t=%d,p=%d", &m, &t, &p); err != nil {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(bagian[4])
	if err != nil {
		return false
	}
	asli, err := base64.RawStdEncoding.DecodeString(bagian[5])
	if err != nil {
		return false
	}
	hitung := argon2.IDKey([]byte(sandi), salt, t, m, p, uint32(len(asli)))
	return subtle.ConstantTimeCompare(asli, hitung) == 1
}

func PerluRehashArgon2id(encoded string) bool {
	return !strings.HasPrefix(encoded, "$argon2id$")
}

type Klaim struct {
	UserID         string `json:"sub"`
	WeddingID      string `json:"wedding_id,omitempty"`
	Role           string `json:"role"`
	Username       string `json:"username"`
	Impersonating  bool   `json:"impersonating,omitempty"`
	ImpersonatorID string `json:"impersonator_id,omitempty"`
	jwt.RegisteredClaims
}

type TokenService struct {
	priv ed25519.PrivateKey
	pub  ed25519.PublicKey
}

func NewTokenService(priv ed25519.PrivateKey) *TokenService {
	return &TokenService{priv: priv, pub: priv.Public().(ed25519.PublicKey)}
}

func (ts *TokenService) Terbitkan(userID, weddingID, role, username string) (string, error) {
	now := time.Now()
	k := Klaim{
		UserID:    userID,
		WeddingID: weddingID,
		Role:      role,
		Username:  username,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "wedding.zedlabs.id",
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodEdDSA, k).SignedString(ts.priv)
}

func (ts *TokenService) TerbitkanImpersonasi(superadminID, superadminUsername, targetWeddingID string) (string, error) {
	now := time.Now()
	k := Klaim{
		UserID:         superadminID,
		WeddingID:      targetWeddingID,
		Role:           "couple_owner",
		Username:       superadminUsername,
		Impersonating:  true,
		ImpersonatorID: superadminID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "wedding.zedlabs.id",
			Subject:   superadminID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(1 * time.Hour)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodEdDSA, k).SignedString(ts.priv)
}

func (ts *TokenService) Verifikasi(tokStr string) (*Klaim, error) {
	tok, err := jwt.ParseWithClaims(tokStr, &Klaim{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodEd25519); !ok {
			return nil, errors.New("algoritma token tidak valid")
		}
		return ts.pub, nil
	})
	if err != nil || !tok.Valid {
		return nil, errors.New("token tidak valid atau kedaluwarsa")
	}
	k, ok := tok.Claims.(*Klaim)
	if !ok {
		return nil, errors.New("klaim token tidak valid")
	}
	return k, nil
}

func (ts *TokenService) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authz := strings.TrimSpace(r.Header.Get("Authorization"))
		if !strings.HasPrefix(strings.ToLower(authz), "bearer ") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"autentikasi diperlukan"}`))
			return
		}
		k, err := ts.Verifikasi(strings.TrimSpace(authz[7:]))
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"sesi tidak valid atau kedaluwarsa"}`))
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), keyKlaim, k)))
	})
}

func KlaimDariContext(ctx context.Context) *Klaim {
	k, _ := ctx.Value(keyKlaim).(*Klaim)
	return k
}
