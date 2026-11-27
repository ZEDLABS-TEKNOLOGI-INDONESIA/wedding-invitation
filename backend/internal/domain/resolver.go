package domain

import (
	"context"
	"errors"
	"net"
	"net/http"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const DomainUtamaDefault = "wedding.zedlabs.id"

var reDomain = regexp.MustCompile(`^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$`)

type InfoUndangan struct {
	ID              string `json:"id"`
	Slug            string `json:"slug"`
	Title           string `json:"title"`
	CustomDomain    string `json:"custom_domain,omitempty"`
	Status          string `json:"status"`
	IsDemo          bool   `json:"is_demo"`
	GuestQuotaLimit int    `json:"guest_quota_limit"`
}

func NormalkanHost(raw string) string {
	s := strings.TrimSpace(strings.ToLower(raw))
	if s == "" {
		return ""
	}
	if i := strings.Index(s, ","); i >= 0 {
		s = strings.TrimSpace(s[:i])
	}
	s = strings.TrimPrefix(s, "https://")
	s = strings.TrimPrefix(s, "http://")
	if i := strings.IndexByte(s, '/'); i >= 0 {
		s = s[:i]
	}
	if h, _, err := net.SplitHostPort(s); err == nil {
		s = h
	} else if strings.Count(s, ":") == 1 {
		s = strings.SplitN(s, ":", 2)[0]
	}
	return strings.TrimRight(strings.TrimSpace(s), ".")
}

func HostPermintaan(r *http.Request) string {
	if xfh := NormalkanHost(r.Header.Get("X-Forwarded-Host")); xfh != "" {
		return xfh
	}
	return NormalkanHost(r.Host)
}

type Resolver struct {
	pool        *pgxpool.Pool
	domainUtama string
}

func NewResolver(pool *pgxpool.Pool, domainUtama string) *Resolver {
	u := NormalkanHost(domainUtama)
	if u == "" {
		u = DomainUtamaDefault
	}
	return &Resolver{pool: pool, domainUtama: u}
}

func (r *Resolver) DomainUtama() string { return r.domainUtama }

func (r *Resolver) ApakahHostUtama(host string) bool {
	h := NormalkanHost(host)
	return h == "" || h == r.domainUtama || h == "www."+r.domainUtama || h == "localhost" || net.ParseIP(h) != nil
}

func (r *Resolver) ValidasiDomainKustom(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", nil
	}
	h := NormalkanHost(trimmed)
	if len(h) < 4 || len(h) > 253 || !reDomain.MatchString(h) || net.ParseIP(h) != nil {
		return "", errors.New("format domain kustom tidak valid")
	}
	if r.ApakahHostUtama(h) || strings.HasSuffix(h, ".local") || strings.HasSuffix(h, ".localhost") {
		return "", errors.New("domain utama atau host lokal tidak boleh dipakai sebagai domain kustom")
	}
	return h, nil
}

func (r *Resolver) DariHost(ctx context.Context, host string) (*InfoUndangan, error) {
	h := NormalkanHost(host)
	if r.ApakahHostUtama(h) {
		return nil, nil
	}
	var info InfoUndangan
	err := r.pool.QueryRow(ctx, `
		SELECT id::text, slug, title, COALESCE(custom_domain,''), status, is_demo, guest_quota_limit
		FROM weddings WHERE lower(custom_domain) = $1 AND status = 'active' LIMIT 1
	`, h).Scan(&info.ID, &info.Slug, &info.Title, &info.CustomDomain, &info.Status, &info.IsDemo, &info.GuestQuotaLimit)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &info, nil
}

func (r *Resolver) DariSlug(ctx context.Context, slug string) (*InfoUndangan, error) {
	s := strings.TrimSpace(strings.ToLower(slug))
	if s == "" {
		return nil, nil
	}
	var info InfoUndangan
	err := r.pool.QueryRow(ctx, `
		SELECT id::text, slug, title, COALESCE(custom_domain,''), status, is_demo, guest_quota_limit
		FROM weddings WHERE slug = $1 AND status = 'active' LIMIT 1
	`, s).Scan(&info.ID, &info.Slug, &info.Title, &info.CustomDomain, &info.Status, &info.IsDemo, &info.GuestQuotaLimit)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &info, nil
}

func (r *Resolver) MengizinkanAkun(ctx context.Context, host, role, weddingID string) (bool, *InfoUndangan, error) {
	h := NormalkanHost(host)
	if r.ApakahHostUtama(h) {
		return true, nil, nil
	}
	info, err := r.DariHost(ctx, h)
	if err != nil {
		return false, nil, err
	}
	if info == nil {
		return role == "superadmin", nil, nil
	}
	if role == "superadmin" {
		return true, info, nil
	}
	return info.ID == weddingID, info, nil
}
