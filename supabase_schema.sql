-- ═══════════════════════════════════════════════════════════════
--  Stellar Global Supplies — Billing App Schema
--  Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension (already enabled on Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Products ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_products (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  unit       TEXT,                     -- e.g. kg, pcs, bag
  rate       NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bills ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_number    TEXT NOT NULL UNIQUE,
  customer_name  TEXT,
  customer_phone TEXT,
  payment_status TEXT NOT NULL DEFAULT 'Pending',   -- Pending | Paid | Partial
  total          NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  created_by     UUID REFERENCES auth.users(id)
);

-- ── Bill Items ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bill_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id    UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  product_id UUID REFERENCES billing_products(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,         -- snapshot of product name at time of billing
  unit       TEXT,
  qty        NUMERIC(10,3) NOT NULL,
  rate       NUMERIC(12,2) NOT NULL,
  amount     NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS bills_created_at_idx ON bills(created_at DESC);
CREATE INDEX IF NOT EXISTS bill_items_bill_id_idx ON bill_items(bill_id);

-- ── Row Level Security ───────────────────────────────────────────
ALTER TABLE billing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items       ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read/write
CREATE POLICY "auth_read_products"  ON billing_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_products"ON billing_products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_products"ON billing_products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_products"ON billing_products FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_read_bills"     ON bills FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_bills"   ON bills FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_bills"   ON bills FOR UPDATE TO authenticated USING (true);

CREATE POLICY "auth_read_items"     ON bill_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_items"   ON bill_items FOR INSERT TO authenticated WITH CHECK (true);
