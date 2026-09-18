-- =====================================================================
-- Akanni Confecções — Fase D: Pedido rico, Pendências, Calculadora,
-- Precificação/DFC, Marketing e Ajustes do Sistema.
-- Rode este script inteiro no editor de SQL do painel do Supabase.
-- Seguro rodar mais de uma vez.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------
-- 1. Campos comerciais e de pagamento nos PEDIDOS
-- ----------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_kind TEXT DEFAULT 'pedido';   -- 'orcamento' | 'pedido'
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS consultant TEXT;                     -- consultor/vendedor
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS event TEXT;                          -- ex: Formatura, SIPAT
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS channel TEXT;                        -- canal de aquisição
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS segment TEXT;                        -- segmento/ramo
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS instagram TEXT;                      -- @ do cliente
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_date DATE;                    -- cliente pediu retorno em
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_value NUMERIC DEFAULT 0;       -- valor total do pedido
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;       -- total já pago
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_terms TEXT;                  -- ex: "50% na contratação"
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0;      -- valor de entrega
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS extra_cost NUMERIC DEFAULT 0;        -- custo adicional
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS negotiation_notes TEXT;              -- observação da negociação

-- ----------------------------------------------------------------------
-- 2. AJUSTES DO SISTEMA (chave/valor flexível: perfil, toggles, cor, DFC)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------
-- 3. VÍDEOS (Marketing & Treinamentos)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.training_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  duration TEXT,
  youtube_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------
-- 4. CUSTOS DE PRODUÇÃO por modelo (alimenta Calculadora e Precificação)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.production_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model TEXT NOT NULL,
  material_cost NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  other_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS production_costs_model_key ON public.production_costs (model);

-- ----------------------------------------------------------------------
-- 5. DFC SEMANAL (fluxo de caixa previsto x realizado, 5 semanas por mês)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dfc_weeks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month TEXT NOT NULL,               -- 'YYYY-MM'
  week_number INTEGER NOT NULL,      -- 1..5
  prev_in NUMERIC DEFAULT 0,
  real_in NUMERIC DEFAULT 0,
  prev_out NUMERIC DEFAULT 0,
  real_out NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS dfc_weeks_month_week_key ON public.dfc_weeks (month, week_number);

-- ======================================================================
-- RLS + Policies
-- ======================================================================
ALTER TABLE public.app_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_videos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dfc_weeks        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "akanni_all" ON public.app_settings;
DROP POLICY IF EXISTS "akanni_all" ON public.training_videos;
DROP POLICY IF EXISTS "akanni_all" ON public.production_costs;
DROP POLICY IF EXISTS "akanni_all" ON public.dfc_weeks;

CREATE POLICY "akanni_all" ON public.app_settings     FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "akanni_all" ON public.training_videos  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "akanni_all" ON public.production_costs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "akanni_all" ON public.dfc_weeks        FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
