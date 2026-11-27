package main

import (
	"context"
	"encoding/json"
	"flag"
	"io"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5"

	"wedding-zedlabs/internal/db"
)

type DumpSQLite struct {
	PlatformConfig []struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	} `json:"platform_config"`
	Weddings []struct {
		ID              int    `json:"id"`
		Slug            string `json:"slug"`
		Title           string `json:"title"`
		CustomDomain    string `json:"custom_domain"`
		Status          string `json:"status"`
		IsDemo          int    `json:"is_demo"`
		GuestQuotaLimit int    `json:"guest_quota_limit"`
	} `json:"weddings"`
	Users []struct {
		ID            int    `json:"id"`
		WeddingID     *int   `json:"wedding_id"`
		Username      string `json:"username"`
		PasswordHash  string `json:"password_hash"`
		Role          string `json:"role"`
		FullName      string `json:"full_name"`
		Phone         string `json:"phone"`
		PhoneVerified int    `json:"phone_verified"`
		Status        string `json:"status"`
	} `json:"users"`
	WeddingConfig []struct {
		WeddingID int    `json:"wedding_id"`
		Key       string `json:"key"`
		Value     string `json:"value"`
	} `json:"wedding_config"`
	Guests []struct {
		WeddingID    int    `json:"wedding_id"`
		Code         string `json:"code"`
		Name         string `json:"name"`
		Phone        string `json:"phone"`
		Address      string `json:"address"`
		GroupName    string `json:"group_name"`
		Quota        int    `json:"quota"`
		CheckedIn    int    `json:"checked_in"`
		CheckedInPax int    `json:"checked_in_pax"`
	} `json:"guests"`
	RSVPs []struct {
		WeddingID  int    `json:"wedding_id"`
		GuestName  string `json:"guest_name"`
		Phone      string `json:"phone"`
		Attendance string `json:"attendance"`
		GuestCount int    `json:"guest_count"`
		Message    string `json:"message"`
	} `json:"rsvps"`
	Wishes []struct {
		WeddingID int    `json:"wedding_id"`
		Name      string `json:"name"`
		Message   string `json:"message"`
	} `json:"wishes"`
	BillingOrders []struct {
		WeddingID           int    `json:"wedding_id"`
		InvoiceCode         string `json:"invoice_code"`
		CurrentQuota        int    `json:"current_quota"`
		RequestedTotalQuota int    `json:"requested_total_quota"`
		AddedGuests         int    `json:"added_guests"`
		Amount              int    `json:"amount"`
		Status              string `json:"status"`
		PaymentMethod       string `json:"payment_method"`
		PaymentNote         string `json:"payment_note"`
		ProofURL            string `json:"proof_url"`
		AdminNote           string `json:"admin_note"`
	} `json:"billing_orders"`
}

func main() {
	berkas := flag.String("berkas", "-", "Jalur berkas JSON ekspor SQLite ('-' untuk stdin)")
	flag.Parse()
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL wajib diisi")
	}

	var r io.Reader = os.Stdin
	if *berkas != "-" {
		f, err := os.Open(*berkas)
		if err != nil {
			log.Fatalf("buka berkas: %v", err)
		}
		defer func() { _ = f.Close() }()
		r = f
	}
	var dump DumpSQLite
	if err := json.NewDecoder(r).Decode(&dump); err != nil {
		log.Fatalf("dekode JSON: %v", err)
	}

	ctx, batal := context.WithTimeout(context.Background(), 2*time.Minute)
	defer batal()
	pool, err := db.Buka(ctx, dsn)
	if err != nil {
		log.Fatalf("buka PG: %v", err)
	}
	defer pool.Close()

	for _, pc := range dump.PlatformConfig {
		_, _ = pool.Exec(ctx, `INSERT INTO platform_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, pc.Key, pc.Value)
	}

	idMap := make(map[int]string)
	for _, w := range dump.Weddings {
		q := w.GuestQuotaLimit
		if q <= 0 {
			q = 200
		}
		st := w.Status
		if st != "suspended" {
			st = "active"
		}
		var uuid string
		err := pool.QueryRow(ctx, `
			INSERT INTO weddings (legacy_id, slug, title, custom_domain, status, is_demo, guest_quota_limit)
			VALUES ($1, $2, $3, NULLIF($4,''), $5, $6, $7)
			ON CONFLICT (slug) DO UPDATE SET
				title = EXCLUDED.title,
				custom_domain = COALESCE(EXCLUDED.custom_domain, weddings.custom_domain),
				guest_quota_limit = GREATEST(weddings.guest_quota_limit, EXCLUDED.guest_quota_limit),
				diperbarui_pada = now()
			RETURNING id::text
		`, w.ID, w.Slug, w.Title, w.CustomDomain, st, w.IsDemo == 1, q).Scan(&uuid)
		if err != nil {
			log.Fatalf("impor wedding %s: %v", w.Slug, err)
		}
		idMap[w.ID] = uuid
	}

	for _, u := range dump.Users {
		var wArg any
		if u.WeddingID != nil {
			if wid, ok := idMap[*u.WeddingID]; ok {
				wArg = wid
			}
		}
		if u.Role != "superadmin" && wArg == nil {
			continue
		}
		_, err := pool.Exec(ctx, `
			INSERT INTO users (legacy_id, wedding_id, username, password_hash, role, full_name, phone, phone_verified, status)
			VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (username) DO NOTHING
		`, u.ID, wArg, u.Username, u.PasswordHash, u.Role, u.FullName, u.Phone, u.PhoneVerified == 1, u.Status)
		if err != nil {
			log.Fatalf("impor user %s: %v", u.Username, err)
		}
	}

	for oldID, uuid := range idMap {
		if err := db.DenganTenantTx(ctx, pool, uuid, func(tx pgx.Tx) error {
			for _, c := range dump.WeddingConfig {
				if c.WeddingID != oldID {
					continue
				}
				if _, err := tx.Exec(ctx, `INSERT INTO wedding_config (wedding_id, key, value) VALUES ($1::uuid, $2, $3) ON CONFLICT (wedding_id, key) DO UPDATE SET value = EXCLUDED.value`, uuid, c.Key, c.Value); err != nil {
					return err
				}
			}
			for _, g := range dump.Guests {
				if g.WeddingID != oldID {
					continue
				}
				q := g.Quota
				if q < 1 {
					q = 2
				}
				if _, err := tx.Exec(ctx, `INSERT INTO guests (wedding_id, code, name, phone, address, group_name, quota, checked_in, checked_in_pax) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (wedding_id, code) DO NOTHING`, uuid, g.Code, g.Name, g.Phone, g.Address, g.GroupName, q, g.CheckedIn == 1, g.CheckedInPax); err != nil {
					return err
				}
			}
			for _, rv := range dump.RSVPs {
				if rv.WeddingID != oldID {
					continue
				}
				att := rv.Attendance
				if att != "hadir" && att != "tidak_hadir" && att != "ragu" {
					att = "hadir"
				}
				if _, err := tx.Exec(ctx, `INSERT INTO rsvps (wedding_id, guest_name, phone, attendance, guest_count, message) VALUES ($1::uuid, $2, $3, $4, $5, $6)`, uuid, rv.GuestName, rv.Phone, att, rv.GuestCount, rv.Message); err != nil {
					return err
				}
			}
			for _, ws := range dump.Wishes {
				if ws.WeddingID != oldID {
					continue
				}
				if _, err := tx.Exec(ctx, `INSERT INTO wishes (wedding_id, name, message) VALUES ($1::uuid, $2, $3)`, uuid, ws.Name, ws.Message); err != nil {
					return err
				}
			}
			for _, bo := range dump.BillingOrders {
				if bo.WeddingID != oldID || bo.InvoiceCode == "" {
					continue
				}
				st := bo.Status
				switch st {
				case "unpaid", "pending", "review", "paid", "rejected", "cancelled":
				default:
					st = "unpaid"
				}
				if _, err := tx.Exec(ctx, `
					INSERT INTO billing_orders (wedding_id, invoice_code, current_quota, requested_total_quota, added_guests, amount, status, payment_method, payment_note, proof_url, admin_note)
					VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
					ON CONFLICT (invoice_code) DO NOTHING
				`, uuid, bo.InvoiceCode, bo.CurrentQuota, bo.RequestedTotalQuota, bo.AddedGuests, bo.Amount, st, bo.PaymentMethod, bo.PaymentNote, bo.ProofURL, bo.AdminNote); err != nil {
					return err
				}
			}
			return nil
		}); err != nil {
			log.Fatalf("impor tenant %d: %v", oldID, err)
		}
	}
	log.Printf("impor SQLite -> PostgreSQL 17 selesai: %d undangan, %d pengguna, %d tamu, %d RSVP, %d ucapan, %d tagihan",
		len(dump.Weddings), len(dump.Users), len(dump.Guests), len(dump.RSVPs), len(dump.Wishes), len(dump.BillingOrders))
}
