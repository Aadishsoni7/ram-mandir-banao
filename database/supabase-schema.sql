-- Fresh launch schema only Existing unrelated Supabase tables are untouched
CREATE SCHEMA IF NOT EXISTS ram_mandir;
CREATE TABLE IF NOT EXISTS ram_mandir.temple_orders (
 id text PRIMARY KEY, recovery_hash text NOT NULL, edition text NOT NULL,
 kind text NOT NULL, product text NOT NULL, unit_id text, name text NOT NULL DEFAULT '',
 anonymous integer NOT NULL DEFAULT 0, amount_minor bigint NOT NULL,
 currency text NOT NULL DEFAULT 'INR', state text NOT NULL DEFAULT 'reserved',
 payment_mode text NOT NULL DEFAULT 'demo', created_at bigint NOT NULL, updated_at bigint NOT NULL,
 presented_at bigint, starts_at bigint, ends_at bigint, duration_seconds integer, position integer
);
CREATE TABLE IF NOT EXISTS ram_mandir.temple_allocations (
 unit_id text PRIMARY KEY, order_id text NOT NULL UNIQUE, expires_at bigint NOT NULL,
 confirmed_at bigint NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS orders_recovery ON ram_mandir.temple_orders(recovery_hash);
CREATE INDEX IF NOT EXISTS orders_edition_state ON ram_mandir.temple_orders(edition,state);
ALTER TABLE ram_mandir.temple_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ram_mandir.temple_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA ram_mandir FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA ram_mandir FROM PUBLIC, anon, authenticated;
-- No anon policies No public SQL execution endpoint All writes go through the Vercel server
