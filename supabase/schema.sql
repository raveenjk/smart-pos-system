-- =========================================================
-- POS System - Supabase Cloud Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    local_id BIGINT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    local_id BIGINT,
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(12, 2) DEFAULT 0.00,
    stock INTEGER DEFAULT 0,
    low_stock_alert INTEGER DEFAULT 10,
    unit TEXT DEFAULT 'pcs',
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    local_id BIGINT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    loyalty_points INTEGER DEFAULT 0,
    credit_limit NUMERIC(12, 2) DEFAULT 0.00,
    outstanding_credit NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 4. Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    local_id BIGINT,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    tax NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT DEFAULT 'cash',
    status TEXT DEFAULT 'completed',
    items JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5. Central Shop Licenses & Hardware Monitoring Table
CREATE TABLE IF NOT EXISTS public.shop_licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id TEXT NOT NULL UNIQUE,
    shop_name TEXT NOT NULL DEFAULT 'My POS Shop',
    owner_name TEXT,
    owner_phone TEXT,
    city TEXT,
    license_tier TEXT NOT NULL DEFAULT 'TRIAL', -- 'TRIAL', 'MONTHLY', 'ANNUAL', 'LIFETIME', 'UNREGISTERED'
    license_status TEXT NOT NULL DEFAULT 'TRIAL_ACTIVE', -- 'ACTIVE', 'TRIAL_ACTIVE', 'TRIAL_EXPIRED', 'LOCKED'
    license_key TEXT,
    expires_at TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    maintenance_mode BOOLEAN NOT NULL DEFAULT false,
    maintenance_message TEXT DEFAULT 'System maintenance in progress. Please contact software vendor (070 522 4007).',
    last_heartbeat_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    client_app_version TEXT DEFAULT '1.0.0',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Row Level Security (RLS) policies
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_licenses ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated and anon API keys
CREATE POLICY "Allow all operations for anon" ON public.categories FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON public.products FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON public.customers FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON public.sales FOR ALL USING (true);
CREATE POLICY "Allow all operations on shop_licenses" ON public.shop_licenses FOR ALL USING (true);

-- Enable Realtime for sales, products, and remote licenses (instant live unlock!)
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_licenses;
