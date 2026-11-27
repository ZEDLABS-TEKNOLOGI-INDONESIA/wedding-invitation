package server

import (
	"net/http"

	"wedding-zedlabs/internal/admin"
	"wedding-zedlabs/internal/auth"
	"wedding-zedlabs/internal/publik"
)

func Rakit(pub *publik.Handler, adm *admin.Handler, tokens *auth.TokenService) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", pub.Health)
	mux.HandleFunc("GET /statistik/publik", pub.StatistikPublik)
	mux.HandleFunc("GET /api/v1/publik/domain", pub.DomainPublik)
	mux.HandleFunc("GET /api/v1/publik/undangan/{slug}", pub.DetailUndangan)
	mux.HandleFunc("POST /api/v1/publik/undangan/{slug}/rsvp", pub.KirimRSVP)
	mux.HandleFunc("POST /api/v1/publik/undangan/{slug}/ucapan", pub.KirimUcapan)

	mux.HandleFunc("POST /api/v1/auth/masuk", adm.Masuk)

	privat := http.NewServeMux()
	privat.HandleFunc("GET /api/v1/auth/saya", adm.Saya)
	privat.HandleFunc("GET /api/v1/admin/konfigurasi", adm.AmbilKonfigurasi)
	privat.HandleFunc("PUT /api/v1/admin/konfigurasi", adm.SimpanKonfigurasi)
	privat.HandleFunc("GET /api/v1/admin/tamu", adm.DaftarTamu)
	privat.HandleFunc("POST /api/v1/admin/tamu", adm.TambahTamu)
	privat.HandleFunc("PUT /api/v1/admin/tamu/{id}", adm.UbahTamu)
	privat.HandleFunc("DELETE /api/v1/admin/tamu/{id}", adm.HapusTamu)
	privat.HandleFunc("POST /api/v1/admin/checkin", adm.CheckinQR)
	privat.HandleFunc("POST /api/v1/admin/checkin/batal", adm.BatalCheckinQR)
	privat.HandleFunc("GET /api/v1/admin/rsvp", adm.DaftarRSVP)
	privat.HandleFunc("DELETE /api/v1/admin/rsvp/{id}", adm.HapusRSVP)
	privat.HandleFunc("GET /api/v1/admin/ucapan", adm.DaftarUcapan)
	privat.HandleFunc("DELETE /api/v1/admin/ucapan/{id}", adm.HapusUcapan)
	privat.HandleFunc("GET /api/v1/admin/planner", adm.AmbilPlanner)
	privat.HandleFunc("POST /api/v1/admin/planner/{modul}", adm.TambahPlannerItem)
	privat.HandleFunc("DELETE /api/v1/admin/planner/{modul}/{id}", adm.HapusPlannerItem)
	privat.HandleFunc("GET /api/v1/admin/tagihan", adm.DaftarTagihan)
	privat.HandleFunc("POST /api/v1/admin/tagihan", adm.BuatTagihan)
	privat.HandleFunc("POST /api/v1/admin/tagihan/{id}/bukti", adm.KirimBuktiTagihan)
	privat.HandleFunc("GET /api/v1/superadmin/undangan", adm.SuperadminDaftarUndangan)
	privat.HandleFunc("PUT /api/v1/superadmin/undangan/{id}/domain", adm.SuperadminUbahDomain)
	privat.HandleFunc("POST /api/v1/superadmin/undangan/{id}/status", adm.SuperadminUbahStatusUndangan)
	privat.HandleFunc("POST /api/v1/superadmin/impersonate", adm.SuperadminImpersonasi)
	privat.HandleFunc("POST /api/v1/superadmin/tagihan/{id}/setujui", adm.SuperadminSetujuiTagihan)
	privat.HandleFunc("POST /api/v1/superadmin/tagihan/{id}/tolak", adm.SuperadminTolakTagihan)

	mux.Handle("/api/v1/auth/saya", tokens.Middleware(privat))
	mux.Handle("/api/v1/admin/", tokens.Middleware(privat))
	mux.Handle("/api/v1/superadmin/", tokens.Middleware(privat))
	return mux
}
