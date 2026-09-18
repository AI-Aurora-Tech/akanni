-- =====================================================================
-- Akanni Confecções — Fase B: Financeiro & Metas
-- Rode este script inteiro no editor de SQL do painel do Supabase.
-- Seguro rodar mais de uma vez.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------
-- 1. VENDAS (registro financeiro de vendas realizadas)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  value NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER DEFAULT 1,        -- nº de peças vendidas (para métricas)
  segment TEXT,                      -- ramo/segmento do cliente
  channel TEXT,                      -- canal de aquisição (de onde veio)
  client_note TEXT,                  -- nome do cliente ou nº do pedido
  order_ref TEXT,                    -- pedido relacionado (opcional)
  is_bonus BOOLEAN DEFAULT FALSE,    -- bonificação (não entra no total geral)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sales_sale_date_idx ON public.sales (sale_date);

-- ----------------------------------------------------------------------
-- 2. METAS mensais (em peças)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month TEXT NOT NULL,               -- 'YYYY-MM'
  target_pieces INTEGER NOT NULL DEFAULT 0,
  target_revenue NUMERIC DEFAULT 0,  -- meta de faturamento (opcional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS goals_month_key ON public.goals (month);

-- ----------------------------------------------------------------------
-- 3. INVESTIMENTO EM TRÁFEGO (para cálculo de ROI por canal/mês)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.traffic_spend (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month TEXT NOT NULL,               -- 'YYYY-MM'
  channel TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS traffic_spend_month_channel_key ON public.traffic_spend (month, channel);

-- ======================================================================
-- RLS + Policies
-- ======================================================================
ALTER TABLE public.sales         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_spend ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "akanni_all" ON public.sales;
DROP POLICY IF EXISTS "akanni_all" ON public.goals;
DROP POLICY IF EXISTS "akanni_all" ON public.traffic_spend;

CREATE POLICY "akanni_all" ON public.sales         FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "akanni_all" ON public.goals         FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "akanni_all" ON public.traffic_spend FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
