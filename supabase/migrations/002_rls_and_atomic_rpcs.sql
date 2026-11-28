-- ==============================================================================
-- Migration 002: Multi-Tenant Row Level Security (RLS) & Atomic RPCs
-- Database: PostgreSQL 15+ (Supabase)
-- Safety: Replaces unrestricted USING (true) policies with auth.uid() checks.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Security Helper Functions (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_my_restaurant_id()
RETURNS TEXT AS $$
    SELECT restaurant_id
    FROM public.users
    WHERE auth_user_id = auth.uid() AND is_active = TRUE
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
    SELECT role
    FROM public.users
    WHERE auth_user_id = auth.uid() AND is_active = TRUE
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE auth_user_id = auth.uid()
          AND is_active = TRUE
          AND role = 'superadmin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Prevent non-superadmin users from escalating their own role or switching tenant
CREATE OR REPLACE FUNCTION prevent_user_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT is_superadmin() THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Security Violation: Users cannot modify their own or another user role.';
        END IF;
        IF NEW.restaurant_id IS DISTINCT FROM OLD.restaurant_id THEN
            RAISE EXCEPTION 'Security Violation: Users cannot change restaurant tenant assignment.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_user_escalation ON public.users;
CREATE TRIGGER trg_prevent_user_escalation
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_user_privilege_escalation();

-- ------------------------------------------------------------------------------
-- 2. Enable RLS & Drop Legacy Permissive Policies
-- ------------------------------------------------------------------------------

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies from initial prototype
DROP POLICY IF EXISTS "Allow public read for matching tenant" ON restaurants;
DROP POLICY IF EXISTS "Allow public read for matching tenant users" ON users;
DROP POLICY IF EXISTS "Allow public read for matching tenant categories" ON menu_categories;
DROP POLICY IF EXISTS "Allow public read for matching tenant menu" ON menu_items;
DROP POLICY IF EXISTS "Allow public read for matching tenant tables" ON restaurant_tables;
DROP POLICY IF EXISTS "Allow public read for matching tenant orders" ON orders;
DROP POLICY IF EXISTS "Allow public read for matching tenant inventory" ON inventory_items;
DROP POLICY IF EXISTS "Allow public read for matching tenant movements" ON stock_movements;
DROP POLICY IF EXISTS "Allow public read for matching tenant customers" ON customers;
DROP POLICY IF EXISTS "Allow public read for matching tenant audit logs" ON platform_audit_logs;

-- ------------------------------------------------------------------------------
-- 3. Strict Multi-Tenant RLS Policies
-- ------------------------------------------------------------------------------

-- RESTAURANTS
DROP POLICY IF EXISTS "restaurants_select_policy" ON restaurants;
CREATE POLICY "restaurants_select_policy" ON restaurants
    FOR SELECT TO authenticated
    USING (id = get_my_restaurant_id() OR is_superadmin());

DROP POLICY IF EXISTS "restaurants_update_policy" ON restaurants;
CREATE POLICY "restaurants_update_policy" ON restaurants
    FOR UPDATE TO authenticated
    USING (
        (id = get_my_restaurant_id() AND get_my_role() = 'owner')
        OR is_superadmin()
    )
    WITH CHECK (
        (id = get_my_restaurant_id() AND get_my_role() = 'owner')
        OR is_superadmin()
    );

-- USERS
DROP POLICY IF EXISTS "users_select_policy" ON users;
CREATE POLICY "users_select_policy" ON users
    FOR SELECT TO authenticated
    USING (
        auth_user_id = auth.uid()
        OR (restaurant_id = get_my_restaurant_id() AND get_my_role() = 'owner')
        OR is_superadmin()
    );

DROP POLICY IF EXISTS "users_insert_policy" ON users;
CREATE POLICY "users_insert_policy" ON users
    FOR INSERT TO authenticated
    WITH CHECK (
        (restaurant_id = get_my_restaurant_id() AND get_my_role() = 'owner' AND role IN ('cashier', 'kitchen'))
        OR is_superadmin()
    );

DROP POLICY IF EXISTS "users_update_policy" ON users;
CREATE POLICY "users_update_policy" ON users
    FOR UPDATE TO authenticated
    USING (
        (restaurant_id = get_my_restaurant_id() AND get_my_role() = 'owner')
        OR is_superadmin()
    )
    WITH CHECK (
        (restaurant_id = get_my_restaurant_id() AND get_my_role() = 'owner')
        OR is_superadmin()
    );

-- MENU CATEGORIES
DROP POLICY IF EXISTS "categories_select_policy" ON menu_categories;
CREATE POLICY "categories_select_policy" ON menu_categories
    FOR SELECT TO authenticated
    USING (restaurant_id = get_my_restaurant_id() OR is_superadmin());

DROP POLICY IF EXISTS "categories_write_policy" ON menu_categories;
CREATE POLICY "categories_write_policy" ON menu_categories
    FOR ALL TO authenticated
    USING (
        (restaurant_id = get_my_restaurant_id() AND get_my_role() = 'owner')
        OR is_superadmin()
    )
    WITH CHECK (
        (restaurant_id = get_my_restaurant_id() AND get_my_role() = 'owner')
        OR is_superadmin()
    );

-- MENU ITEMS
DROP POLICY IF EXISTS "menu_items_select_policy" ON menu_items;
CREATE POLICY "menu_items_select_policy" ON menu_items
    FOR SELECT TO authenticated
    USING (restaurant_id = get_my_restaurant_id() OR is_superadmin());

DROP POLICY IF EXISTS "menu_items_write_policy" ON menu_items;
CREATE POLICY "menu_items_write_policy" ON menu_items
    FOR ALL TO authenticated
    USING (
        (restaurant_id = get_my_restaurant_id() AND get_my_role() = 'owner')
        OR is_superadmin()
    )
    WITH CHECK (
        (restaurant_id = get_my_restaurant_id() AND get_my_role() = 'owner')
        OR is_superadmin()
    );

-- RESTAURANT TABLES
DROP POLICY IF EXISTS "tables_select_policy" ON restaurant_tables;
CREATE POLICY "tables_select_policy" ON restaurant_tables
    FOR SELECT TO authenticated
    USING (restaurant_id = get_my_restaurant_id() OR is_superadmin());

DROP POLICY IF EXISTS "tables_write_policy" ON restaurant_tables;
CREATE POLICY "tables_write_policy" ON restaurant_tables
    FOR ALL TO authenticated
    USING (
        (restaurant_id = get_my_restaurant_id() AND get_my_role() IN ('owner', 'cashier'))
        OR is_superadmin()
    )
    WITH CHECK (
        (restaurant_id = get_my_restaurant_id() AND get_my_role() IN ('owner', 'cashier'))
        OR is_superadmin()
    );

-- ORDERS
DROP POLICY IF EXISTS "orders_select_policy" ON orders;
CREATE POLICY "orders_select_policy" ON orders
    FOR SELECT TO authenticated
    USING (restaurant_id = get_my_restaurant_id() OR is_superadmin());

DROP POLICY IF EXISTS "orders_insert_policy" ON orders;
CREATE POLICY "orders_insert_policy" ON orders
    FOR INSERT TO authenticated
    WITH CHECK (
        restaurant_id = get_my_restaurant_id()
        AND get_my_role() IN ('owner', 'cashier')
    );

DROP POLICY IF EXISTS "orders_update_policy" ON orders;
CREATE POLICY "orders_update_policy" ON orders
    FOR UPDATE TO authenticated
    USING (
        restaurant_id = get_my_restaurant_id()
        AND get_my_role() IN ('owner', 'cashier', 'kitchen')
    )
    WITH CHECK (
        restaurant_id = get_my_restaurant_id()
        AND get_my_role() IN ('owner', 'cashier', 'kitchen')
    );

-- PAYMENT TRANSACTIONS
DROP POLICY IF EXISTS "payment_tx_select_policy" ON payment_transactions;
CREATE POLICY "payment_tx_select_policy" ON payment_transactions
    FOR SELECT TO authenticated
    USING (restaurant_id = get_my_restaurant_id() OR is_superadmin());

DROP POLICY IF EXISTS "payment_tx_insert_policy" ON payment_transactions;
CREATE POLICY "payment_tx_insert_policy" ON payment_transactions
    FOR INSERT TO authenticated
    WITH CHECK (
        restaurant_id = get_my_restaurant_id()
        AND get_my_role() IN ('owner', 'cashier')
    );

-- INVENTORY ITEMS
DROP POLICY IF EXISTS "inventory_select_policy" ON inventory_items;
CREATE POLICY "inventory_select_policy" ON inventory_items
    FOR SELECT TO authenticated
    USING (restaurant_id = get_my_restaurant_id() OR is_superadmin());

DROP POLICY IF EXISTS "inventory_write_policy" ON inventory_items;
CREATE POLICY "inventory_write_policy" ON inventory_items
    FOR ALL TO authenticated
    USING (
        (restaurant_id = get_my_restaurant_id() AND get_my_role() = 'owner')
        OR is_superadmin()
    )
    WITH CHECK (
        (restaurant_id = get_my_restaurant_id() AND get_my_role() = 'owner')
        OR is_superadmin()
    );

-- STOCK MOVEMENTS (Append-only ledger)
DROP POLICY IF EXISTS "stock_movements_select_policy" ON stock_movements;
CREATE POLICY "stock_movements_select_policy" ON stock_movements
    FOR SELECT TO authenticated
    USING (restaurant_id = get_my_restaurant_id() OR is_superadmin());

DROP POLICY IF EXISTS "stock_movements_insert_policy" ON stock_movements;
CREATE POLICY "stock_movements_insert_policy" ON stock_movements
    FOR INSERT TO authenticated
    WITH CHECK (
        (restaurant_id = get_my_restaurant_id() AND get_my_role() = 'owner')
        OR is_superadmin()
    );

-- CUSTOMERS
DROP POLICY IF EXISTS "customers_select_policy" ON customers;
CREATE POLICY "customers_select_policy" ON customers
    FOR SELECT TO authenticated
    USING (restaurant_id = get_my_restaurant_id() OR is_superadmin());

DROP POLICY IF EXISTS "customers_write_policy" ON customers;
CREATE POLICY "customers_write_policy" ON customers
    FOR ALL TO authenticated
    USING (
        (restaurant_id = get_my_restaurant_id() AND get_my_role() IN ('owner', 'cashier'))
        OR is_superadmin()
    )
    WITH CHECK (
        (restaurant_id = get_my_restaurant_id() AND get_my_role() IN ('owner', 'cashier'))
        OR is_superadmin()
    );

-- PLATFORM AUDIT LOGS
DROP POLICY IF EXISTS "audit_logs_select_policy" ON platform_audit_logs;
CREATE POLICY "audit_logs_select_policy" ON platform_audit_logs
    FOR SELECT TO authenticated
    USING (
        is_superadmin()
        OR (restaurant_id = get_my_restaurant_id() AND get_my_role() = 'owner')
    );

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON platform_audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON platform_audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        is_superadmin()
        OR restaurant_id = get_my_restaurant_id()
    );

-- ------------------------------------------------------------------------------
-- 4. Atomic Invoice & Business RPC Functions
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
    SET invoice_counter = invoice_counter + 1,
        updated_at = NOW()
    WHERE id = p_restaurant_id
    RETURNING invoice_prefix, invoice_counter INTO v_prefix, v_counter;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Restaurant % not found', p_restaurant_id;
    END IF;

    RETURN v_prefix || v_year || '-' || lpad(v_counter::text, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atomic Onboarding: Creates restaurant, owner user profile, default categories and tables
CREATE OR REPLACE FUNCTION register_restaurant_workspace(
    p_restaurant_name TEXT,
    p_owner_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_address TEXT,
    p_restaurant_type TEXT DEFAULT 'Restaurant',
    p_gst_number TEXT DEFAULT NULL,
    p_fssai_number TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_auth_uid UUID;
    v_restaurant_id TEXT;
    v_prefix TEXT;
    v_rest restaurants%ROWTYPE;
    v_user users%ROWTYPE;
BEGIN
    v_auth_uid := auth.uid();
    IF v_auth_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required to register a restaurant workspace.';
    END IF;

    IF EXISTS (SELECT 1 FROM users WHERE auth_user_id = v_auth_uid) THEN
        RAISE EXCEPTION 'This authenticated user already belongs to a restaurant workspace.';
    END IF;

    v_restaurant_id := 'rest_' || substr(md5(v_auth_uid::text || clock_timestamp()::text), 1, 12);
    v_prefix := upper(regexp_replace(p_restaurant_name, '[^a-zA-Z]', '', 'g'));
    IF length(v_prefix) < 2 THEN
        v_prefix := 'INV';
    END IF;
    v_prefix := substr(v_prefix, 1, 3) || '-';

    INSERT INTO restaurants (
        id, name, owner_name, email, phone, address, restaurant_type,
        gst_number, fssai_number, invoice_prefix, status
    )
    VALUES (
        v_restaurant_id, trim(p_restaurant_name), trim(p_owner_name), lower(trim(p_email)),
        trim(p_phone), trim(p_address), COALESCE(NULLIF(trim(p_restaurant_type), ''), 'Restaurant'),
        NULLIF(trim(p_gst_number), ''), NULLIF(trim(p_fssai_number), ''), v_prefix, 'active'
    )
    RETURNING * INTO v_rest;

    INSERT INTO users (
        id, auth_user_id, restaurant_id, name, email, phone, role, is_active
    )
    VALUES (
        v_auth_uid::text, v_auth_uid, v_restaurant_id, trim(p_owner_name),
        lower(trim(p_email)), trim(p_phone), 'owner', TRUE
    )
    RETURNING * INTO v_user;

    INSERT INTO menu_categories (id, restaurant_id, name, slug, display_order, is_active) VALUES
        ('cat_' || substr(md5(v_restaurant_id || '_1'), 1, 10), v_restaurant_id, 'Main Courses', 'mains', 1, TRUE),
        ('cat_' || substr(md5(v_restaurant_id || '_2'), 1, 10), v_restaurant_id, 'Beverages', 'beverages', 2, TRUE);

    INSERT INTO restaurant_tables (id, restaurant_id, table_number, capacity, status) VALUES
        ('tbl_' || substr(md5(v_restaurant_id || '_1'), 1, 10), v_restaurant_id, 'T-01', 2, 'available'),
        ('tbl_' || substr(md5(v_restaurant_id || '_2'), 1, 10), v_restaurant_id, 'T-02', 4, 'available'),
        ('tbl_' || substr(md5(v_restaurant_id || '_3'), 1, 10), v_restaurant_id, 'T-03', 4, 'available');

    RETURN jsonb_build_object(
        'restaurant', to_jsonb(v_rest),
        'user', to_jsonb(v_user)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atomic Order Creation with Idempotency, Invoice Sequencing, Payment Ledger, Table & Customer Updates
CREATE OR REPLACE FUNCTION create_order_atomic(
    p_restaurant_id TEXT,
    p_order_type TEXT,
    p_table_id TEXT,
    p_table_number TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_items JSONB,
    p_subtotal NUMERIC,
    p_discount_amount NUMERIC,
    p_tax_rate_percent NUMERIC,
    p_tax_amount NUMERIC,
    p_service_charge_percent NUMERIC,
    p_service_charge_amount NUMERIC,
    p_total_amount NUMERIC,
    p_payment_method TEXT,
    p_payment_status TEXT,
    p_special_instructions TEXT,
    p_payment_reference TEXT DEFAULT NULL,
    p_client_operation_id TEXT DEFAULT NULL
)
RETURNS orders AS $$
DECLARE
    v_my_rest TEXT;
    v_my_role TEXT;
    v_my_name TEXT;
    v_my_uid TEXT;
    v_existing orders%ROWTYPE;
    v_invoice_number TEXT;
    v_order_number TEXT;
    v_order_id TEXT;
    v_customer_id TEXT;
    v_inserted orders%ROWTYPE;
BEGIN
    v_my_rest := get_my_restaurant_id();
    v_my_role := get_my_role();

    IF v_my_rest IS NULL OR v_my_rest <> p_restaurant_id THEN
        RAISE EXCEPTION 'Security Violation: Cross-tenant order creation denied.';
    END IF;
    IF v_my_role NOT IN ('owner', 'cashier') THEN
        RAISE EXCEPTION 'Unauthorized: Only owners or cashiers can create orders.';
    END IF;

    SELECT id, name INTO v_my_uid, v_my_name FROM users WHERE auth_user_id = auth.uid() LIMIT 1;

    -- Idempotency guard against duplicate submissions / offline retries
    IF p_client_operation_id IS NOT NULL THEN
        SELECT * INTO v_existing FROM orders WHERE client_operation_id = p_client_operation_id LIMIT 1;
        IF FOUND THEN
            RETURN v_existing;
        END IF;
    END IF;

    IF p_subtotal < 0 OR p_discount_amount < 0 OR p_total_amount < 0 THEN
        RAISE EXCEPTION 'Invalid negative billing amounts.';
    END IF;

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item.';
    END IF;

    v_invoice_number := generate_next_invoice(p_restaurant_id);
    v_order_number := 'ORD-' || right(v_invoice_number, 4);
    v_order_id := 'ord_' || substr(md5(p_restaurant_id || v_invoice_number || clock_timestamp()::text), 1, 12);

    -- Upsert customer if phone is provided
    IF p_customer_phone IS NOT NULL AND length(trim(p_customer_phone)) > 0 THEN
        INSERT INTO customers (restaurant_id, name, phone, total_visits, total_spent, last_visit)
        VALUES (
            p_restaurant_id,
            COALESCE(NULLIF(trim(p_customer_name), ''), 'Guest Customer'),
            trim(p_customer_phone),
            1,
            CASE WHEN p_payment_status = 'paid' THEN p_total_amount ELSE 0 END,
            to_char(NOW(), 'YYYY-MM-DD')
        )
        ON CONFLICT (restaurant_id, phone) DO UPDATE SET
            name = COALESCE(NULLIF(trim(p_customer_name), ''), customers.name),
            total_visits = customers.total_visits + 1,
            total_spent = customers.total_spent + CASE WHEN p_payment_status = 'paid' THEN p_total_amount ELSE 0 END,
            last_visit = to_char(NOW(), 'YYYY-MM-DD')
        RETURNING id INTO v_customer_id;
    END IF;

    INSERT INTO orders (
        id, restaurant_id, order_number, invoice_number, order_type,
        table_id, table_number, customer_id, customer_name, customer_phone,
        items, subtotal, discount_amount, tax_rate_percent, tax_amount,
        service_charge_percent, service_charge_amount, total_amount,
        payment_method, payment_status, status, special_instructions,
        cashier_id, created_by, client_operation_id
    )
    VALUES (
        v_order_id, p_restaurant_id, v_order_number, v_invoice_number, p_order_type,
        NULLIF(p_table_id, ''), NULLIF(p_table_number, ''), v_customer_id,
        NULLIF(trim(p_customer_name), ''), NULLIF(trim(p_customer_phone), ''),
        p_items, p_subtotal, p_discount_amount, p_tax_rate_percent, p_tax_amount,
        p_service_charge_percent, p_service_charge_amount, p_total_amount,
        p_payment_method, p_payment_status, 'new', NULLIF(trim(p_special_instructions), ''),
        v_my_uid, v_my_name, p_client_operation_id
    )
    RETURNING * INTO v_inserted;

    -- Record payment transaction ledger entry
    IF p_payment_method <> 'unpaid' THEN
        INSERT INTO payment_transactions (
            restaurant_id, order_id, amount, payment_method, payment_status,
            reference_number, confirmed_by, idempotency_key
        )
        VALUES (
            p_restaurant_id, v_order_id, p_total_amount, p_payment_method, p_payment_status,
            NULLIF(trim(p_payment_reference), ''), v_my_name,
            CASE WHEN p_client_operation_id IS NOT NULL THEN 'pay_' || p_client_operation_id ELSE NULL END
        )
        ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;

    -- Update dining table status atomically
    IF p_table_id IS NOT NULL AND length(p_table_id) > 0 THEN
        UPDATE restaurant_tables
        SET status = CASE WHEN p_payment_status = 'paid' THEN 'available' ELSE 'occupied' END,
            current_order_id = CASE WHEN p_payment_status = 'paid' THEN NULL ELSE v_order_id END,
            updated_at = NOW()
        WHERE id = p_table_id AND restaurant_id = p_restaurant_id;
    END IF;

    RETURN v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atomic Stock Adjustment
CREATE OR REPLACE FUNCTION adjust_inventory_stock_atomic(
    p_restaurant_id TEXT,
    p_item_id TEXT,
    p_movement_type TEXT,
    p_quantity NUMERIC,
    p_reason TEXT,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS stock_movements AS $$
DECLARE
    v_my_rest TEXT;
    v_my_role TEXT;
    v_my_name TEXT;
    v_existing stock_movements%ROWTYPE;
    v_prev NUMERIC;
    v_next NUMERIC;
    v_item_name TEXT;
    v_movement stock_movements%ROWTYPE;
BEGIN
    v_my_rest := get_my_restaurant_id();
    v_my_role := get_my_role();

    IF v_my_rest IS NULL OR v_my_rest <> p_restaurant_id THEN
        RAISE EXCEPTION 'Security Violation: Cross-tenant inventory adjustment denied.';
    END IF;
    IF v_my_role <> 'owner' THEN
        RAISE EXCEPTION 'Unauthorized: Only owners can adjust inventory stock.';
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing FROM stock_movements WHERE idempotency_key = p_idempotency_key LIMIT 1;
        IF FOUND THEN
            RETURN v_existing;
        END IF;
    END IF;

    IF p_quantity < 0 THEN
        RAISE EXCEPTION 'Quantity cannot be negative.';
    END IF;

    SELECT name, current_stock INTO v_item_name, v_prev
    FROM inventory_items
    WHERE id = p_item_id AND restaurant_id = p_restaurant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item not found.';
    END IF;

    IF p_movement_type = 'in' THEN
        v_next := v_prev + p_quantity;
    ELSIF p_movement_type = 'out' THEN
        v_next := GREATEST(0, v_prev - p_quantity);
    ELSIF p_movement_type = 'adjustment' THEN
        v_next := p_quantity;
    ELSE
        RAISE EXCEPTION 'Invalid movement type %', p_movement_type;
    END IF;

    SELECT name INTO v_my_name FROM users WHERE auth_user_id = auth.uid() LIMIT 1;

    UPDATE inventory_items
    SET current_stock = v_next, updated_at = NOW()
    WHERE id = p_item_id AND restaurant_id = p_restaurant_id;

    INSERT INTO stock_movements (
        restaurant_id, inventory_item_id, item_name, movement_type,
        quantity, previous_stock, new_stock, reason, recorded_by, idempotency_key
    )
    VALUES (
        p_restaurant_id, p_item_id, v_item_name, p_movement_type,
        p_quantity, v_prev, v_next, p_reason, COALESCE(v_my_name, 'Owner'), p_idempotency_key
    )
    RETURNING * INTO v_movement;

    RETURN v_movement;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- ROLLBACK INSTRUCTIONS:
-- Drop RPCs and triggers if reverting:
-- DROP TRIGGER IF EXISTS trg_prevent_user_escalation ON public.users;
-- DROP FUNCTION IF EXISTS adjust_inventory_stock_atomic, create_order_atomic, register_restaurant_workspace, prevent_user_privilege_escalation, is_superadmin, get_my_role, get_my_restaurant_id;
-- ==============================================================================
