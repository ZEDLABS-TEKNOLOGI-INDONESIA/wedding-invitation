-- Skema PostgreSQL 17 Multi-Tenant Wedding Management ZEDLABS (FORCE ROW LEVEL SECURITY + Audit Hash-Chain).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS riwayat_migrasi (
    nama       TEXT PRIMARY KEY,
    checksum   TEXT NOT NULL,
    diterapkan TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS weddings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id         INTEGER UNIQUE,
    slug              TEXT NOT NULL UNIQUE,
    title             TEXT NOT NULL,
    custom_domain     TEXT,
    status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
    is_demo           BOOLEAN NOT NULL DEFAULT false,
    guest_quota_limit INTEGER NOT NULL DEFAULT 200 CHECK (guest_quota_limit >= 0),
    dibuat_pada       TIMESTAMPTZ NOT NULL DEFAULT now(),
    diperbarui_pada   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weddings_custom_domain_unik
    ON weddings (lower(custom_domain))
    WHERE custom_domain IS NOT NULL AND custom_domain <> '';

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id       INTEGER UNIQUE,
    wedding_id      UUID REFERENCES weddings(id) ON DELETE CASCADE,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'couple_owner' CHECK (role IN ('superadmin','couple_owner','couple_partner')),
    full_name       TEXT NOT NULL DEFAULT '',
    phone           TEXT NOT NULL DEFAULT '',
    avatar_url      TEXT NOT NULL DEFAULT '',
    phone_verified  BOOLEAN NOT NULL DEFAULT false,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
    gagal_login     INTEGER NOT NULL DEFAULT 0,
    terkunci_hingga TIMESTAMPTZ,
    dibuat_pada     TIMESTAMPTZ NOT NULL DEFAULT now(),
    diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT users_role_wedding_chk CHECK (role = 'superadmin' OR wedding_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS wedding_config (
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    key        TEXT NOT NULL,
    value      TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (wedding_id, key)
);

CREATE TABLE IF NOT EXISTS guests (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id     UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    code           TEXT NOT NULL,
    name           TEXT NOT NULL,
    phone          TEXT NOT NULL DEFAULT '',
    address        TEXT NOT NULL DEFAULT 'Di Tempat',
    group_name     TEXT NOT NULL DEFAULT '',
    quota          INTEGER NOT NULL DEFAULT 2 CHECK (quota >= 1),
    checked_in     BOOLEAN NOT NULL DEFAULT false,
    checked_in_at  TIMESTAMPTZ,
    checked_in_pax INTEGER NOT NULL DEFAULT 0,
    dibuat_pada    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (wedding_id, code)
);

CREATE INDEX IF NOT EXISTS idx_guests_wedding ON guests(wedding_id, dibuat_pada DESC);

CREATE TABLE IF NOT EXISTS rsvps (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id       UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    guest_name       TEXT NOT NULL,
    phone            TEXT NOT NULL DEFAULT '',
    attendance       TEXT NOT NULL DEFAULT 'hadir' CHECK (attendance IN ('hadir','tidak_hadir','ragu')),
    guest_count      INTEGER NOT NULL DEFAULT 1 CHECK (guest_count >= 0),
    message          TEXT NOT NULL DEFAULT '',
    reminder_sent_at TIMESTAMPTZ,
    dibuat_pada      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wishes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id  UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    message     TEXT NOT NULL,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wa_invitations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id     UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    guest_name     TEXT NOT NULL,
    phone          TEXT NOT NULL,
    address        TEXT NOT NULL DEFAULT 'Di Tempat',
    invitation_url TEXT NOT NULL,
    job_id         TEXT NOT NULL DEFAULT '',
    reference_id   TEXT NOT NULL DEFAULT '',
    status         TEXT NOT NULL DEFAULT 'queued',
    error_message  TEXT NOT NULL DEFAULT '',
    dibuat_pada    TIMESTAMPTZ NOT NULL DEFAULT now(),
    diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_orders (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id            UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    invoice_code          TEXT NOT NULL UNIQUE,
    current_quota         INTEGER NOT NULL DEFAULT 200,
    requested_total_quota INTEGER NOT NULL,
    added_guests          INTEGER NOT NULL,
    amount                INTEGER NOT NULL CHECK (amount >= 0),
    status                TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','pending','review','paid','rejected','cancelled')),
    payment_method        TEXT NOT NULL DEFAULT 'Transfer Bank / QRIS',
    payment_note          TEXT NOT NULL DEFAULT '',
    proof_url             TEXT NOT NULL DEFAULT '',
    admin_note            TEXT NOT NULL DEFAULT '',
    versi                 INTEGER NOT NULL DEFAULT 1,
    verified_at           TIMESTAMPTZ,
    dibuat_pada           TIMESTAMPTZ NOT NULL DEFAULT now(),
    diperbarui_pada       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner_todos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id  UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    phase       TEXT NOT NULL DEFAULT 'H-3 Bulan',
    category    TEXT NOT NULL DEFAULT 'Umum',
    due_date    TEXT NOT NULL DEFAULT '',
    pic         TEXT NOT NULL DEFAULT 'Bersama',
    done        BOOLEAN NOT NULL DEFAULT false,
    notes       TEXT NOT NULL DEFAULT '',
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner_budget (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id     UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    category       TEXT NOT NULL DEFAULT 'Lainnya',
    estimated_cost INTEGER NOT NULL DEFAULT 0,
    actual_cost    INTEGER NOT NULL DEFAULT 0,
    paid_amount    INTEGER NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'belum',
    vendor_phone   TEXT NOT NULL DEFAULT '',
    due_date       TEXT NOT NULL DEFAULT '',
    notes          TEXT NOT NULL DEFAULT '',
    dibuat_pada    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner_savings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id  UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    entry_date  TEXT NOT NULL,
    contributor TEXT NOT NULL DEFAULT 'Bersama',
    entry_type  TEXT NOT NULL DEFAULT 'setor',
    amount      INTEGER NOT NULL,
    note        TEXT NOT NULL DEFAULT '',
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner_essentials (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id  UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL DEFAULT 'seserahan',
    title       TEXT NOT NULL,
    price       INTEGER NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'rencana',
    owner       TEXT NOT NULL DEFAULT 'Bersama',
    done_groom  BOOLEAN NOT NULL DEFAULT false,
    done_bride  BOOLEAN NOT NULL DEFAULT false,
    notes       TEXT NOT NULL DEFAULT '',
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner_journal (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id  UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    entry_date  TEXT NOT NULL,
    author      TEXT NOT NULL DEFAULT 'Bersama',
    mood        TEXT NOT NULL DEFAULT 'bersyukur',
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outbox_pesan (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id   UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    tujuan       TEXT NOT NULL,
    jenis        TEXT NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status       TEXT NOT NULL DEFAULT 'antre' CHECK (status IN ('antre','terkirim','gagal')),
    percobaan    SMALLINT NOT NULL DEFAULT 0,
    dibuat_pada  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
    id             BIGSERIAL PRIMARY KEY,
    wedding_id     UUID REFERENCES weddings(id) ON DELETE SET NULL,
    user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    aksi           TEXT NOT NULL,
    target_id      TEXT NOT NULL DEFAULT '',
    ringkasan_json TEXT NOT NULL DEFAULT '{}',
    hash_sebelum   TEXT NOT NULL,
    hash_ini       TEXT NOT NULL,
    dibuat_pada    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ENABLE & FORCE ROW LEVEL SECURITY pada seluruh 12 tabel bertenant
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'wedding_config', 'guests', 'rsvps', 'wishes', 'wa_invitations',
        'billing_orders', 'planner_todos', 'planner_budget', 'planner_savings',
        'planner_essentials', 'planner_journal', 'outbox_pesan'
    ] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS isolasi_tenant ON %I', tbl);
        EXECUTE format(
            'CREATE POLICY isolasi_tenant ON %I USING (COALESCE(current_setting(''app.wedding_id'', true), '''') = '''' OR wedding_id::text = current_setting(''app.wedding_id'', true)) WITH CHECK (COALESCE(current_setting(''app.wedding_id'', true), '''') = '''' OR wedding_id::text = current_setting(''app.wedding_id'', true))',
            tbl
        );
    END LOOP;
END
$$;
