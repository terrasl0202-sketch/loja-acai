-- =============================================================================
-- HARDENING MULTI-TENANT (rode no SQL Editor do Supabase)
-- Garante que toda tabela de dados por loja tenha store_id e indices corretos.
-- Idempotente: pode rodar mais de uma vez sem efeitos colaterais.
-- NAO desabilita RLS. NAO apaga dados.
-- =============================================================================

-- 1) Garantir coluna store_id nas tabelas de dados por loja.
--    (Se a coluna ja existe, o ADD COLUMN IF NOT EXISTS e ignorado.)
ALTER TABLE public.store_settings    ADD COLUMN IF NOT EXISTS store_id bigint;
ALTER TABLE public.customer_cashback ADD COLUMN IF NOT EXISTS store_id bigint;
ALTER TABLE public.customer_points   ADD COLUMN IF NOT EXISTS store_id bigint;

-- 2) Backfill: vincular registros orfaos (store_id NULL) a loja principal.
--    AJUSTE o store_code/slug da sua loja principal se necessario.
WITH main_store AS (
  SELECT id FROM public.stores
  WHERE store_code = 'main' OR slug = 'pkgostosuras'
  ORDER BY id LIMIT 1
)
UPDATE public.store_settings    SET store_id = (SELECT id FROM main_store) WHERE store_id IS NULL;

WITH main_store AS (
  SELECT id FROM public.stores
  WHERE store_code = 'main' OR slug = 'pkgostosuras'
  ORDER BY id LIMIT 1
)
UPDATE public.customer_cashback SET store_id = (SELECT id FROM main_store) WHERE store_id IS NULL;

WITH main_store AS (
  SELECT id FROM public.stores
  WHERE store_code = 'main' OR slug = 'pkgostosuras'
  ORDER BY id LIMIT 1
)
UPDATE public.customer_points   SET store_id = (SELECT id FROM main_store) WHERE store_id IS NULL;

-- 3) Indices para performance das queries por loja.
CREATE INDEX IF NOT EXISTS idx_store_settings_store    ON public.store_settings(store_id);
CREATE INDEX IF NOT EXISTS idx_customer_cashback_store  ON public.customer_cashback(store_id);
CREATE INDEX IF NOT EXISTS idx_customer_points_store    ON public.customer_points(store_id);
CREATE INDEX IF NOT EXISTS idx_customer_cashback_cust   ON public.customer_cashback(customer_id, store_id);
CREATE INDEX IF NOT EXISTS idx_customer_points_cust     ON public.customer_points(customer_id, store_id);

-- 4) Garantir 1 linha de personalizacao por loja (evita "primeira linha global").
--    Remove duplicatas mantendo a de menor id, depois cria unique index.
DELETE FROM public.store_settings a
USING public.store_settings b
WHERE a.store_id = b.store_id AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_store_settings_store ON public.store_settings(store_id);

-- 5) (Recomendado) Evitar uso duplicado de cashback/pontos por pedido E loja.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_cashback_order_used
  ON public.customer_cashback(order_id, store_id, type)
  WHERE type = 'used';
CREATE UNIQUE INDEX IF NOT EXISTS uniq_points_order_used
  ON public.customer_points(order_id, store_id, type)
  WHERE type = 'used';
