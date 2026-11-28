-- ==============================================================================
-- Migration 001: DineFlow Safe Idempotent Schema
-- Database: PostgreSQL 15+ (Supabase)
-- Safety: No DROP TABLE statements. Safe to run on existing databases.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Restaurants (Tenant Partition)
CREATE TABLE IF NOT EXISTS restaurants (
    id TEXT PRIMARY KEY DEFAULT ('rest_' || substr(md5(random()::text), 1, 12)),
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    restaurant_type TEXT NOT NULL DEFAULT 'Restaurant',
    logo_url TEXT,
    gst_number TEXT,
    fssai_number TEXT,
    currency TEXT NOT NULL DEFAULT 'INR',
    currency_symbol TEXT NOT NULL DEFAULT '₹',
    tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (tax_rate_percent >= 0 AND tax_rate_percent <= 100),
    service_charge_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (service_charge_percent >= 0 AND service_charge_percent <= 100),
    invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
    invoice_counter INTEGER NOT NULL DEFAULT 1000 CHECK (invoice_counter >= 0),
    upi_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_approval')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Normalize legacy status value if migrating from older schema
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM restaurants WHERE status = 'pending') THEN
        UPDATE restaurants SET status = 'pending_approval' WHERE status = 'pending';
    END IF;
END $$;

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_status_check;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_status_check CHECK (status IN ('active', 'suspended', 'pending_approval'));

-- 2. Users (Linked to Supabase auth.users via auth_user_id)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'owner', 'cashier', 'kitchen')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
-- Remove legacy password_hash column if it existed in an older dev schema
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- 3. Menu Categories
CREATE TABLE IF NOT EXISTS menu_categories (
    id TEXT PRIMARY KEY DEFAULT ('cat_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS slug TEXT NOT NULL DEFAULT '';
ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- 4. Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY DEFAULT ('item_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    item_type TEXT NOT NULL DEFAULT 'veg' CHECK (item_type IN ('veg', 'non_veg', 'egg', 'vegan')),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    tax_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (tax_percent >= 0 AND tax_percent <= 100),
    prep_time_minutes INTEGER DEFAULT 10 CHECK (prep_time_minutes >= 0),
    variants JSONB NOT NULL DEFAULT '[]'::jsonb,
    add_ons JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'veg';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER DEFAULT 10;

-- 5. Restaurant Dining Tables
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id TEXT PRIMARY KEY DEFAULT ('tbl_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity > 0),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'billing', 'reserved')),
    current_order_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(restaurant_id, table_number)
);

-- 6. Customers
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY DEFAULT ('cust_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    total_visits INTEGER NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
    total_spent NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_spent >= 0),
    last_visit TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(restaurant_id, phone)
);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_visits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_visit TEXT;

-- 7. Orders & Invoices
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY DEFAULT ('ord_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL DEFAULT '',
    invoice_number TEXT NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
    table_id TEXT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    table_number TEXT,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    items JSONB NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (tax_rate_percent >= 0),
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    service_charge_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (service_charge_percent >= 0),
    service_charge_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (service_charge_amount >= 0),
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    payment_method TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_method IN ('cash', 'card', 'upi', 'other', 'unpaid')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready', 'completed', 'cancelled')),
    special_instructions TEXT,
    cancellation_reason TEXT,
    cancelled_by TEXT,
    cashier_id TEXT,
    created_by TEXT NOT NULL,
    client_operation_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(restaurant_id, invoice_number)
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_charge_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_operation_id TEXT UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cash', 'card', 'upi', 'other', 'unpaid'));
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded'));

-- 8. Payment Transactions Ledger
CREATE TABLE IF NOT EXISTS payment_transactions (
    id TEXT PRIMARY KEY DEFAULT ('pay_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'other')),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
    reference_number TEXT,
    confirmed_by TEXT NOT NULL,
    notes TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY DEFAULT ('inv_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    current_stock NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (current_stock >= 0),
    unit TEXT NOT NULL DEFAULT 'kg',
    min_threshold NUMERIC(10,2) NOT NULL DEFAULT 5.00 CHECK (min_threshold >= 0),
    cost_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (cost_per_unit >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(restaurant_id, name)
);

-- 10. Stock Movement Ledger
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY DEFAULT ('mov_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity >= 0),
    previous_stock NUMERIC(10,2) NOT NULL CHECK (previous_stock >= 0),
    new_stock NUMERIC(10,2) NOT NULL CHECK (new_stock >= 0),
    reason TEXT NOT NULL,
    recorded_by TEXT NOT NULL,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- 11. Platform Audit Logs
CREATE TABLE IF NOT EXISTS platform_audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('log_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE SET NULL,
    restaurant_name TEXT,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_rest ON menu_categories(restaurant_id, display_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_rest_cat ON menu_items(restaurant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_tables_rest ON restaurant_tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_rest_created ON orders(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_rest_status ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_rest ON payment_transactions(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_rest ON inventory_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_rest ON stock_movements(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_rest_phone ON customers(restaurant_id, phone);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON platform_audit_logs(created_at DESC);

-- 13. Realtime Publication (idempotent)
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['orders', 'restaurant_tables', 'menu_items', 'menu_categories', 'inventory_items', 'stock_movements', 'payment_transactions']
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
        END IF;
    END LOOP;
END $$;

-- ==============================================================================
-- ROLLBACK INSTRUCTIONS (Manual Only - Do not run unless reverting 001):
-- Only drop newly added tables if no production data exists:
-- DROP TABLE IF EXISTS payment_transactions;
-- ==============================================================================
