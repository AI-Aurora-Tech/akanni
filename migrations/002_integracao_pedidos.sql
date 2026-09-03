-- Migração para a integração de ENTRADA (parceiro -> sistema).
-- Rode no SQL Editor do Supabase antes de usar POST /api/integracao/pedidos.

-- Referência do pedido no sistema do parceiro (idempotência) e observações.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS external_ref TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Garante que a mesma referência externa não crie pedidos duplicados.
CREATE UNIQUE INDEX IF NOT EXISTS orders_external_ref_key
  ON public.orders (external_ref)
  WHERE external_ref IS NOT NULL;
