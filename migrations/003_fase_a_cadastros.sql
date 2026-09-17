-- =====================================================================
-- Akanni Confecções — Fase A: Cadastros base
-- Rode este script inteiro no editor de SQL do painel do Supabase.
-- É seguro rodar mais de uma vez (usa IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------
-- 1. FORNECEDORES
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  contact TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------
-- 2. TRANSPORTADORAS
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.carriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------
-- 3. PRODUTOS & VARIANTES (listas de opções que alimentam os pedidos)
--    category: 'produto' | 'gola' | 'manga' | 'modelo_bandeira' |
--              'tamanho' | 'modelo_corte' | 'motivo_retrabalho'
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.variant_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS variant_options_cat_val_key
  ON public.variant_options (category, value);

-- ----------------------------------------------------------------------
-- 4. DESPESAS FIXAS (acesso restrito no app — mostra valores sensíveis)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fixed_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_day INTEGER,            -- dia do vencimento (1-31), opcional
  category TEXT,              -- ex: Aluguel, Salários, Energia...
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------
-- 5. TERCEIRIZAÇÃO (peças que saem para costura externa)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outsourcing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_ref TEXT,            -- nº do pedido (texto livre)
  description TEXT,          -- ex: 12 polos gola V, tamanho M
  seamstress TEXT,          -- costureira
  exit_date DATE,
  return_deadline DATE,
  notes TEXT,
  returned BOOLEAN DEFAULT FALSE,
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------
-- 6. RETRABALHO / DEFEITO
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rework (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_ref TEXT,
  stage TEXT,                -- etapa onde foi percebido
  responsible TEXT,          -- quem identificou/corrigiu
  event_date DATE,
  reason TEXT,               -- motivo (vem de variant_options motivo_retrabalho)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================================================
-- RLS + Policies (mesmo padrão das demais tabelas do sistema)
-- ======================================================================
ALTER TABLE public.suppliers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carriers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_expenses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outsourcing     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rework          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "akanni_all" ON public.suppliers;
DROP POLICY IF EXISTS "akanni_all" ON public.carriers;
DROP POLICY IF EXISTS "akanni_all" ON public.variant_options;
DROP POLICY IF EXISTS "akanni_all" ON public.fixed_expenses;
DROP POLICY IF EXISTS "akanni_all" ON public.outsourcing;
DROP POLICY IF EXISTS "akanni_all" ON public.rework;

CREATE POLICY "akanni_all" ON public.suppliers       FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "akanni_all" ON public.carriers        FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "akanni_all" ON public.variant_options FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "akanni_all" ON public.fixed_expenses  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "akanni_all" ON public.outsourcing     FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "akanni_all" ON public.rework          FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ======================================================================
-- (Opcional) Sementes de variantes — as mesmas que aparecem no app do
-- consultor. Pode apagar as linhas que não quiser.
-- ======================================================================
INSERT INTO public.variant_options (category, value) VALUES
  ('produto','Bandeira'), ('produto','Blusa'), ('produto','Camiseta'), ('produto','Kit'), ('produto','Polo'),
  ('tamanho','PP'), ('tamanho','P'), ('tamanho','M'), ('tamanho','G'), ('tamanho','GG'),
  ('tamanho','XG'), ('tamanho','2XL'), ('tamanho','3XL'), ('tamanho','4XL'),
  ('modelo_corte','Feminina Baby Look'), ('modelo_corte','Infantil'), ('modelo_corte','Masculina'), ('modelo_corte','Plus Size'),
  ('motivo_retrabalho','Bordado com falha'), ('motivo_retrabalho','Cor errada'), ('motivo_retrabalho','Costura solta'),
  ('motivo_retrabalho','Estampa borrada'), ('motivo_retrabalho','Medida errada'),
  ('motivo_retrabalho','Peça com defeito de tecido'), ('motivo_retrabalho','Personalização/nome errado')
ON CONFLICT (category, value) DO NOTHING;
