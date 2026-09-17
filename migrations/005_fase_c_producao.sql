-- =====================================================================
-- Akanni Confecções — Fase C: Produção avançada
-- Adiciona campos de produção aos pedidos (Pipeline, Romaneio, Ficha Técnica).
-- Rode este script inteiro no editor de SQL do painel do Supabase.
-- Seguro rodar mais de uma vez.
-- =====================================================================

-- Etapa no Pipeline de produção (mais granular que o status do Kanban).
-- Valores: pedido_fechado | arte_designer | impressao | corte |
--          bordado_dtf | calandra | costura | acabamento | expedicao | entregue
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS production_stage TEXT DEFAULT 'pedido_fechado';

-- Rota de produção (ex: "Rota A — Estampa")
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS production_route TEXT;

-- Briefing preenchido pelo comercial ao fechar o pedido (vai para o Romaneio/Ficha)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS production_briefing TEXT;

-- Nome da costureira responsável (preenchimento da produção)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seamstress_name TEXT;

-- Observação específica de produção (Romaneio)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS production_notes TEXT;

-- Preenche a etapa inicial em pedidos antigos que ainda estão nulos
UPDATE public.orders SET production_stage = 'pedido_fechado' WHERE production_stage IS NULL;
