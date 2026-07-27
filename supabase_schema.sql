-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY, -- Use email or uid as ID for simpler migration
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'funcionario_padrao',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  temp_password TEXT,
  uid TEXT
);

-- Fabric Templates Table
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  fabric_consumption NUMERIC NOT NULL DEFAULT 0,
  button_consumption NUMERIC DEFAULT 0,
  collar_consumption NUMERIC DEFAULT 0,
  category TEXT DEFAULT 'camisa', -- 'camisa', 'gola', 'botao'
  size TEXT,
  style TEXT,
  fabric_type TEXT,
  collar_type TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Table
CREATE TABLE IF NOT EXISTS public.stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- fabric, buttons, thread, label, others
  color TEXT,
  size TEXT,
  material_format TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL, -- meters, units, kg
  min_quantity NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_tax_id TEXT,
  customer_address TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending',
  status_started_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_date TIMESTAMPTZ,
  design_images JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  is_delayed BOOLEAN DEFAULT FALSE,
  nfe_issued BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tax_id TEXT,
  email TEXT,
  phone TEXT,
  address_cep TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for Initial Setup)
CREATE POLICY "Allow all to open public" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to open public" ON public.templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to open public" ON public.stock FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to open public" ON public.orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to open public" ON public.clients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Functions for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_stock_updated_at ON public.stock;
CREATE TRIGGER update_stock_updated_at BEFORE UPDATE ON public.stock FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- NF-e Table
CREATE TABLE IF NOT EXISTS public.notas_fiscais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  ref TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'processando',
  ambiente TEXT,
  chave_acesso TEXT,
  numero TEXT,
  serie TEXT,
  protocolo TEXT,
  url_xml TEXT,
  url_danfe TEXT,
  mensagem_erro TEXT,
  payload_enviado JSONB,
  tentativas INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fix RLS Policies for all tables (restricting to authenticated users only)
-- Drop existing open policies
DROP POLICY IF EXISTS "Allow all to open public" ON public.users;
DROP POLICY IF EXISTS "Allow all to open public" ON public.templates;
DROP POLICY IF EXISTS "Allow all to open public" ON public.stock;
DROP POLICY IF EXISTS "Allow all to open public" ON public.orders;
DROP POLICY IF EXISTS "Allow all to open public" ON public.clients;

-- Create authenticated only policies
CREATE POLICY "Allow authenticated users full access to users" ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access to templates" ON public.templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access to stock" ON public.stock FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access to orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access to clients" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users full access to notas_fiscais" ON public.notas_fiscais FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_notas_fiscais_updated_at ON public.notas_fiscais;
CREATE TRIGGER update_notas_fiscais_updated_at BEFORE UPDATE ON public.notas_fiscais FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
