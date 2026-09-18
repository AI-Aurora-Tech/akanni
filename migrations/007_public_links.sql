-- =====================================================================
-- Akanni Confecções — Links públicos (autocadastro de cliente + pedido por link)
-- Rode este script inteiro no editor de SQL do painel do Supabase.
-- Seguro rodar mais de uma vez.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Token único por cliente. O dono da empresa compartilha um link de pedido
-- exclusivo por cliente (…/#/pedido/<public_token>); assim todo pedido feito
-- por aquele link já entra vinculado ao cliente certo.
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT uuid_generate_v4();

-- Gera token para clientes antigos que ainda estão sem.
UPDATE public.clients SET public_token = uuid_generate_v4() WHERE public_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_public_token_key ON public.clients (public_token);
