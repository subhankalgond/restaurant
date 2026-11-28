# DineFlow / CHILI POS — Multi-Tenant Restaurant POS & Billing SaaS

Multi-tenant Restaurant POS, Kitchen Display System (KDS), Table Management, Menu Management, Inventory Ledger, Staff Access Control, and Reporting application built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

---

## Architecture & Security

- **Authentication**: Supabase Auth (`supabase.auth`) with persistent JWT sessions (`persistSession: true`, `autoRefreshToken: true`). No browser-side SHA-256 password hashing or hardcoded demo credentials.
- **Multi-Tenant Isolation**: PostgreSQL Row Level Security (RLS) on all tables scoped via `auth.uid()` (`get_my_restaurant_id()`, `get_my_role()`, `is_superadmin()`). Triggers prevent non-superadmin users from modifying their own `role` or `restaurant_id`.
- **Atomic Billing & Concurrency-Safe Invoicing**: Orders are created via the `create_order_atomic` RPC, which generates gapless sequential invoice numbers (`generate_next_invoice`), enforces `client_operation_id` idempotency, logs to `payment_transactions`, updates dining table status, and upserts customer stats atomically.
- **Realtime Sync**: Subscribes to Supabase `postgres_changes` on `orders`, `restaurant_tables`, `menu_items`, `menu_categories`, `inventory_items`, `stock_movements`, and `payment_transactions`.
- **Offline Queue**: Genuine network outages queue supported mutations (`create_order`, `update_order_status`, `cancel_order`, `adjust_stock`) in `localStorage` (`dineflow_offline_queue_v1`) with unique idempotency keys and replay automatically when connectivity returns.

---

## 1. Prerequisites

- Node.js 18+ and npm
- A Supabase project (PostgreSQL 15+ with Auth & Realtime enabled)

---

## 2. Database Setup & Migrations

Run the versioned, idempotent SQL migrations in order inside your **Supabase SQL Editor** (or via Supabase CLI):

1. `supabase/migrations/001_initial_schema.sql` — Creates/upgrades all tables (`restaurants`, `users`, `menu_categories`, `menu_items`, `restaurant_tables`, `customers`, `orders`, `payment_transactions`, `inventory_items`, `stock_movements`, `platform_audit_logs`), constraints, indexes, and Realtime publication without destructive `DROP TABLE` statements.
2. `supabase/migrations/002_rls_and_atomic_rpcs.sql` — Removes any legacy `USING (true)` policies, enables strict `auth.uid()` RLS policies, adds privilege-escalation triggers, and creates atomic RPCs (`register_restaurant_workspace`, `create_order_atomic`, `adjust_inventory_stock_atomic`, `generate_next_invoice`).

### Rollback Instructions

Each migration file includes manual rollback SQL comments at the bottom. Because production tables hold tenant data, rollback scripts only drop newly added functions/triggers/auxiliary tables and never drop existing core tables automatically.

---

## 3. Environment Configuration

Copy `.env.example` to `.env` and fill in your Supabase public project URL and anon key:

```bash
cp .env.example .env
```

Variables:
- `VITE_SUPABASE_URL` — Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Your Supabase project public `anon` key

> **Security Note**: Never place `service_role` keys or payment gateway secrets in `.env` or any `VITE_*` variable.

---

## 4. Local Development & Production Build

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript type check
npx tsc --noEmit

# Build production bundle
npm run build

# Preview production build
npm run preview
```

---

## 5. Creating a Platform Superadmin

1. Create a user in **Supabase Dashboard -> Authentication -> Users**.
2. Insert their profile into `public.users` via SQL Editor:

```sql
INSERT INTO public.users (id, auth_user_id, restaurant_id, name, email, role, is_active)
VALUES ('<auth-user-uuid>', '<auth-user-uuid>', NULL, 'Platform Admin', 'admin@yourdomain.com', 'superadmin', TRUE);
```
