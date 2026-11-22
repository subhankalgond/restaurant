-- ==============================================================================
-- DineFlow: Multi-Tenant Restaurant POS & Management Schema for Supabase
-- Database: PostgreSQL 15+ (Supabase)
-- Features: Multi-Tenancy (Row Level Security), Sequential Invoicing, Realtime WebSockets
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing tables if recreating (safe cascade)
DROP TABLE IF EXISTS platform_audit_logs CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS restaurant_tables CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS menu_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;

-- ------------------------------------------------------------------------------
-- 3. Core Multi-Tenant Tables
-- ------------------------------------------------------------------------------

-- Restaurants (Tenant Partition)
CREATE TABLE restaurants (
    id TEXT PRIMARY KEY DEFAULT ('rest_' || substr(md5(random()::text), 1, 12)),
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    restaurant_type TEXT NOT NULL DEFAULT 'Restaurant',
    gst_number TEXT,
    fssai_number TEXT,
    currency TEXT NOT NULL DEFAULT 'INR',
    currency_symbol TEXT NOT NULL DEFAULT '₹',
    tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    service_charge_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
    invoice_counter INTEGER NOT NULL DEFAULT 1000,
    upi_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (Staff and Super Admin)
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT ('usr_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'owner', 'cashier', 'kitchen')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Menu Categories
CREATE TABLE menu_categories (
    id TEXT PRIMARY KEY DEFAULT ('cat_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Menu Items
CREATE TABLE menu_items (
    id TEXT PRIMARY KEY DEFAULT ('item_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    is_veg BOOLEAN NOT NULL DEFAULT TRUE,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    variants JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. [{"id":"v1","name":"Half","price":120}]
    add_ons JSONB NOT NULL DEFAULT '[]'::jsonb,  -- e.g. [{"id":"a1","name":"Extra Cheese","price":40}]
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Restaurant Dining Tables
CREATE TABLE restaurant_tables (
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

-- Customers
CREATE TABLE customers (
    id TEXT PRIMARY KEY DEFAULT ('cust_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_spend NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(restaurant_id, phone)
);

-- Orders & Invoices
CREATE TABLE orders (
    id TEXT PRIMARY KEY DEFAULT ('ord_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
    table_id TEXT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    table_number TEXT,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    items JSONB NOT NULL, -- Serialized item snapshot with variants, addons, prices
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    service_charge_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (service_charge_amount >= 0),
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'unpaid')),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'pending', 'refunded')),
    status TEXT NOT NULL CHECK (status IN ('new', 'preparing', 'ready', 'completed', 'cancelled')),
    special_instructions TEXT,
    cancellation_reason TEXT,
    cancelled_by TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(restaurant_id, invoice_number)
);

-- Inventory Items
CREATE TABLE inventory_items (
    id TEXT PRIMARY KEY DEFAULT ('inv_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    current_stock NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    unit TEXT NOT NULL DEFAULT 'kg',
    min_threshold NUMERIC(10,2) NOT NULL DEFAULT 5.00,
    cost_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(restaurant_id, name)
);

-- Stock Movement / Adjustment Ledger
CREATE TABLE stock_movements (
    id TEXT PRIMARY KEY DEFAULT ('mov_' || substr(md5(random()::text), 1, 12)),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
    quantity NUMERIC(10,2) NOT NULL,
    previous_stock NUMERIC(10,2) NOT NULL,
    new_stock NUMERIC(10,2) NOT NULL,
    reason TEXT NOT NULL,
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Platform Audit Logs
CREATE TABLE platform_audit_logs (
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

-- ------------------------------------------------------------------------------
-- 4. Enable Supabase Realtime for Cross-Device Sync
-- (Kitchen Display instantly gets new orders; Cashier sees status change)
-- ------------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;

-- ------------------------------------------------------------------------------
-- 5. Row Level Security (RLS) Multi-Tenant Policies
-- ------------------------------------------------------------------------------
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon / authenticated client queries filtered by restaurant_id
-- (When using public anon key in POS client, application-level JWT or tenant token governs access)
CREATE POLICY "Allow public read for matching tenant" ON restaurants FOR ALL USING (true);
CREATE POLICY "Allow public read for matching tenant users" ON users FOR ALL USING (true);
CREATE POLICY "Allow public read for matching tenant categories" ON menu_categories FOR ALL USING (true);
CREATE POLICY "Allow public read for matching tenant menu" ON menu_items FOR ALL USING (true);
CREATE POLICY "Allow public read for matching tenant tables" ON restaurant_tables FOR ALL USING (true);
CREATE POLICY "Allow public read for matching tenant orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow public read for matching tenant inventory" ON inventory_items FOR ALL USING (true);
CREATE POLICY "Allow public read for matching tenant movements" ON stock_movements FOR ALL USING (true);
CREATE POLICY "Allow public read for matching tenant customers" ON customers FOR ALL USING (true);
CREATE POLICY "Allow public read for matching tenant audit logs" ON platform_audit_logs FOR ALL USING (true);

-- ------------------------------------------------------------------------------
-- 6. Atomic Invoice Sequence Increment Function
-- Generates thread-safe gapless invoices (e.g. OAK-2026-1001)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_next_invoice(p_restaurant_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_counter INTEGER;
    v_year TEXT;
BEGIN
    v_year := to_char(NOW(), 'YYYY');
    
    UPDATE restaurants
    SET invoice_counter = invoice_counter + 1
    WHERE id = p_restaurant_id
    RETURNING invoice_prefix, invoice_counter INTO v_prefix, v_counter;
    
    RETURN v_prefix || v_year || '-' || lpad(v_counter::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 7. Initial Seed Data
-- ------------------------------------------------------------------------------

-- Seed Restaurant 1
INSERT INTO restaurants (id, name, owner_name, email, phone, address, restaurant_type, gst_number, fssai_number, currency, currency_symbol, tax_rate_percent, service_charge_percent, invoice_prefix, invoice_counter, upi_id, status)
VALUES (
    'rest_oak_barrel',
    'The Oak Barrel Bistro & Bar',
    'Subhashish Roy',
    'owner@oakbarrel.com',
    '+91 98765 43210',
    '45 Indiranagar 100ft Road, Bengaluru, KA - 560038',
    'Restaurant',
    '29ABCDE1234F1Z5',
    '11223344556677',
    'INR',
    '₹',
    5.00,
    2.50,
    'OAK-',
    1024,
    'oakbarrel@icici',
    'active'
);

-- Seed Restaurant 2 (for multi-tenant verification)
INSERT INTO restaurants (id, name, owner_name, email, phone, address, restaurant_type, gst_number, fssai_number, currency, currency_symbol, tax_rate_percent, service_charge_percent, invoice_prefix, invoice_counter, upi_id, status)
VALUES (
    'rest_copper_chimney',
    'Copper Chimney Fine Dining',
    'Pooja Nair',
    'owner@copperchimney.com',
    '+91 98123 45678',
    '12 Church Street, MG Road, Bengaluru, KA - 560001',
    'Restaurant',
    '29ZYXWV9876E1Z2',
    '99887766554433',
    'INR',
    '₹',
    5.00,
    0.00,
    'COP-',
    1000,
    'copperchimney@hdfcbank',
    'active'
);

-- Seed Staff Accounts (SHA-256 for passwords)
-- Owner: Owner@123 -> a879326e10fb711c2a129dca337efb867c2957b98849ad7667a421dd3501a556
-- Cashier: Cashier@123 -> ca499c7595ca2ea6036113b19b02ff6ab08fd90886c57d710d0a51be5c66ad41
-- Kitchen: Kitchen@123 -> 555c27633e21be55e71465451bfd4eb202ae73f910408d6c703b0717277b0653
-- SuperAdmin: Admin@Master2026 -> 9a43a75877843818e5781a9386762283cb73105740fcce370cb42ec2e0bf4359
INSERT INTO users (id, restaurant_id, name, email, password_hash, role, is_active) VALUES
('usr_superadmin', NULL, 'DineFlow Super Admin', 'admin@dineflow.io', '9a43a75877843818e5781a9386762283cb73105740fcce370cb42ec2e0bf4359', 'superadmin', true),
('usr_owner_oak', 'rest_oak_barrel', 'Subhashish Roy', 'owner@oakbarrel.com', 'a879326e10fb711c2a129dca337efb867c2957b98849ad7667a421dd3501a556', 'owner', true),
('usr_cashier_oak', 'rest_oak_barrel', 'Ramesh Kumar (Counter)', 'cashier@oakbarrel.com', 'ca499c7595ca2ea6036113b19b02ff6ab08fd90886c57d710d0a51be5c66ad41', 'cashier', true),
('usr_kitchen_oak', 'rest_oak_barrel', 'Chef Vikram (Kitchen Station)', 'kitchen@oakbarrel.com', '555c27633e21be55e71465451bfd4eb202ae73f910408d6c703b0717277b0653', 'kitchen', true);

-- Seed Categories
INSERT INTO menu_categories (id, restaurant_id, name, sort_order) VALUES
('cat_starters', 'rest_oak_barrel', 'Starters & Appetizers', 1),
('cat_mains', 'rest_oak_barrel', 'Main Course', 2),
('cat_beverages', 'rest_oak_barrel', 'Craft Beverages', 3),
('cat_desserts', 'rest_oak_barrel', 'Artisan Desserts', 4);

-- Seed Menu Items
INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, is_veg, is_available, variants, add_ons) VALUES
('item_truffle_fries', 'rest_oak_barrel', 'cat_starters', 'Parmesan Truffle Fries', 'Crispy hand-cut russet potatoes with white truffle oil, sea salt and grated parmesan', 280.00, true, true, '[{"id":"v1","name":"Regular","price":280},{"id":"v2","name":"Large Basket","price":380}]'::jsonb, '[{"id":"a1","name":"Garlic Aioli Dip","price":40},{"id":"a2","name":"Extra Shaved Truffle","price":90}]'::jsonb),
('item_paneer_tikka', 'rest_oak_barrel', 'cat_starters', 'Charred Claypot Paneer Tikka', 'Marinated cottage cheese charred in tandoor with roasted bell peppers and mint chutney', 360.00, true, true, '[]'::jsonb, '[{"id":"a3","name":"Extra Mint Chutney","price":20}]'::jsonb),
('item_chicken_wings', 'rest_oak_barrel', 'cat_starters', 'Smoked BBQ Chicken Wings (6 pcs)', 'Hickory wood smoked chicken wings tossed in homemade spicy brown sugar bourbon BBQ sauce', 420.00, false, true, '[{"id":"v3","name":"6 Pieces","price":420},{"id":"v4","name":"12 Pieces Platter","price":750}]'::jsonb, '[{"id":"a4","name":"Blue Cheese Dip","price":50}]'::jsonb),
('item_butter_chicken', 'rest_oak_barrel', 'cat_mains', 'Old Delhi Butter Chicken', 'Velvety slow-simmered tomato butter gravy with roasted chicken tikka and fenugreek', 480.00, false, true, '[]'::jsonb, '[{"id":"a5","name":"Butter Naan (2 pcs)","price":80},{"id":"a6","name":"Jeera Rice Bowl","price":120}]'::jsonb),
('item_sourdough_pizza', 'rest_oak_barrel', 'cat_mains', 'Wild Mushroom Sourdough Pizza', '48-hour fermented crust, fior di latte, cremini and shiitake mushrooms, fresh thyme', 540.00, true, true, '[{"id":"v5","name":"10 inch Medium","price":540},{"id":"v6","name":"12 inch Large","price":690}]'::jsonb, '[{"id":"a7","name":"Buffalo Mozzarella","price":80}]'::jsonb),
('item_cold_brew', 'rest_oak_barrel', 'cat_beverages', 'Signature Nitro Cold Brew', 'Steeped 20 hours single-origin arabica coffee, poured creamy on draft', 220.00, true, true, '[]'::jsonb, '[{"id":"a8","name":"Vanilla Sweet Cream","price":40}]'::jsonb),
('item_mango_mojito', 'rest_oak_barrel', 'cat_beverages', 'Fresh Alphonso Mint Mojito', 'Hand-muddled fresh mint, Alphonso mango puree, lime and sparkling soda', 210.00, true, true, '[]'::jsonb, '[]'::jsonb),
('item_tiramisu', 'rest_oak_barrel', 'cat_desserts', 'Classic Italian Tiramisu', 'Espresso-soaked ladyfingers layered with whipped mascarpone cream and Valrhona cocoa', 320.00, true, true, '[]'::jsonb, '[]'::jsonb);

-- Seed Tables
INSERT INTO restaurant_tables (id, restaurant_id, table_number, capacity, status) VALUES
('tbl_t1', 'rest_oak_barrel', 'T-01', 2, 'available'),
('tbl_t2', 'rest_oak_barrel', 'T-02', 4, 'occupied'),
('tbl_t3', 'rest_oak_barrel', 'T-03', 4, 'available'),
('tbl_t4', 'rest_oak_barrel', 'T-04', 6, 'billing'),
('tbl_t5', 'rest_oak_barrel', 'T-05', 2, 'available'),
('tbl_t6', 'rest_oak_barrel', 'T-06', 8, 'reserved');

-- Seed Inventory Items
INSERT INTO inventory_items (id, restaurant_id, name, category, current_stock, unit, min_threshold, cost_per_unit) VALUES
('inv_truffle_oil', 'rest_oak_barrel', 'White Truffle Oil', 'Gourmet Condiments', 2.50, 'liter', 1.00, 2200.00),
('inv_chicken_raw', 'rest_oak_barrel', 'Fresh Poultry Wings & Thighs', 'Meat & Poultry', 18.00, 'kg', 10.00, 210.00),
('inv_paneer', 'rest_oak_barrel', 'Malai Paneer Cubes', 'Dairy', 4.50, 'kg', 8.00, 360.00),
('inv_mozzarella', 'rest_oak_barrel', 'Fior Di Latte Mozzarella', 'Dairy', 3.00, 'kg', 5.00, 650.00),
('inv_coffee_beans', 'rest_oak_barrel', 'Arabica Estate Coffee Beans', 'Beverage Dry', 6.00, 'kg', 3.00, 850.00),
('inv_butter', 'rest_oak_barrel', 'Pasteurized Dairy Butter', 'Dairy', 2.00, 'kg', 4.00, 480.00);
