-- =====================================================================
-- MIGRACAO COMPLEMENTAR — order_reviews (modulo de avaliacoes)
-- =====================================================================
-- NAO EXECUTAR SEM CONFIRMACAO FINAL.
--
-- Contexto: a tabela public.order_reviews foi criada na migracao multiempresa
-- com um conjunto MINIMO de colunas. O codigo de /api/reviews espera:
--   - colunas: order_id, customer_id, store_id, rating, product_rating,
--     delivery_rating, service_rating, comment, visible, created_at
--   - um relacionamento (FK) order_reviews.order_id -> orders.id, usado no
--     embedded join do PostgREST: select(*, orders(...))
--   - unicidade por (store_id, order_id): o POST trata o erro 23505
--     ("Este pedido ja foi avaliado").
--
-- Estrategia: 100% IDEMPOTENTE e DEFENSIVA.
--   - SEM DROP, SEM DELETE, SEM TRUNCATE, SEM ON DELETE CASCADE.
--   - FK usa ON DELETE RESTRICT (nao apaga avaliacoes ao remover pedido/loja).
--   - Apenas ADICIONA colunas faltantes (ADD COLUMN IF NOT EXISTS).
--   - NAO altera valores existentes. NAO quebra linhas com order_id NULL
--     (a FK aceita NULL; linhas sem pedido continuam validas).
--   - Pode ser rodada mais de uma vez sem efeito colateral.
--
-- RECOMENDACAO: rodar dentro da transacao abaixo e, antes, ter o snapshot
--   do banco (Supabase -> Database -> Backups).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- ETAPA 0 — Pre-condicoes (apenas validam; nao alteram nada)
-- ---------------------------------------------------------------------
-- Garante que as tabelas necessarias existem antes de prosseguir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'order_reviews'
  ) THEN
    RAISE EXCEPTION 'Tabela public.order_reviews nao existe. Rode antes a migracao multiempresa.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orders'
  ) THEN
    RAISE EXCEPTION 'Tabela public.orders nao existe. Abortado.';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- ETAPA 1 — Adicionar colunas faltantes (somente as que faltarem)
-- ---------------------------------------------------------------------
ALTER TABLE public.order_reviews ADD COLUMN IF NOT EXISTS order_id        BIGINT;
ALTER TABLE public.order_reviews ADD COLUMN IF NOT EXISTS customer_id     BIGINT;
ALTER TABLE public.order_reviews ADD COLUMN IF NOT EXISTS rating          INT;
ALTER TABLE public.order_reviews ADD COLUMN IF NOT EXISTS product_rating  INT;
ALTER TABLE public.order_reviews ADD COLUMN IF NOT EXISTS delivery_rating INT;
ALTER TABLE public.order_reviews ADD COLUMN IF NOT EXISTS service_rating  INT;
ALTER TABLE public.order_reviews ADD COLUMN IF NOT EXISTS comment         TEXT;
ALTER TABLE public.order_reviews ADD COLUMN IF NOT EXISTS visible         BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.order_reviews ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT now();

-- ---------------------------------------------------------------------
-- ETAPA 2 — Foreign key order_reviews.order_id -> orders.id
-- ---------------------------------------------------------------------
-- Criada SOMENTE se ainda nao existir. ON DELETE RESTRICT: remover um pedido
-- fica bloqueado enquanto houver avaliacao vinculada (nao apaga avaliacoes).
-- A FK aceita order_id NULL, entao registros antigos sem pedido nao quebram.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'order_reviews'
      AND constraint_name = 'fk_order_reviews_order'
  ) THEN
    ALTER TABLE public.order_reviews
      ADD CONSTRAINT fk_order_reviews_order
      FOREIGN KEY (order_id)
      REFERENCES public.orders(id)
      ON DELETE RESTRICT;
    RAISE NOTICE 'FK fk_order_reviews_order criada.';
  ELSE
    RAISE NOTICE 'FK fk_order_reviews_order ja existe. Nada a fazer.';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- ETAPA 3 — Indices
-- ---------------------------------------------------------------------
-- 3a) Indice de busca por pedido.
CREATE INDEX IF NOT EXISTS idx_order_reviews_order_id ON public.order_reviews (order_id);

-- 3b) Unicidade por (store_id, order_id): garante "1 avaliacao por pedido por loja".
--     UNIQUE INDEX trata order_id NULL como distinto (varias linhas com NULL sao
--     permitidas), entao nao quebra registros antigos sem pedido.
--     IF NOT EXISTS torna idempotente. Como a tabela esta vazia/nova, nao ha
--     risco de violacao por duplicidade existente.
CREATE UNIQUE INDEX IF NOT EXISTS uq_order_reviews_store_order
  ON public.order_reviews (store_id, order_id);

-- ---------------------------------------------------------------------
-- ETAPA 4 — VERIFICACAO (somente leitura) — confira antes do COMMIT
-- ---------------------------------------------------------------------
-- Colunas de order_reviews:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='order_reviews' ORDER BY ordinal_position;
--
-- FKs de order_reviews:
--   SELECT constraint_name FROM information_schema.table_constraints
--   WHERE table_schema='public' AND table_name='order_reviews' AND constraint_type='FOREIGN KEY';

COMMIT;

-- =====================================================================
-- FIM. Apos rodar, validar em producao:
--   GET /api/reviews?productId=...  -> deve voltar 200 (sem erro de relationship)
-- =====================================================================
