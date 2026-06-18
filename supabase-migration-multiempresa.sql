-- =====================================================================
-- MIGRACAO MULTIEMPRESA (store_id) - REVISAO PARA APROVACAO
-- =====================================================================
-- NAO EXECUTAR SEM CONFIRMACAO FINAL.
--
-- Objetivo: alinhar o banco ao codigo atual, que espera:
--   1) Uma tabela `stores` com a loja "main".
--   2) Coluna `store_id` em todas as tabelas de dados, apontando para stores(id).
--   3) Tabelas ausentes: `order_reviews`, `customer_levels` (e afins de gamificacao).
--
-- Estrategia: 100% IDEMPOTENTE e DEFENSIVA.
--   - Usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
--   - NAO apaga dados. NAO remove colunas. NAO altera valores existentes
--     (apenas faz backfill de store_id onde estiver NULL).
--   - Pode ser rodada mais de uma vez sem efeito colateral.
--
-- POLITICA DE FK: todas as foreign keys de store_id usam ON DELETE RESTRICT.
--   Isso IMPEDE que apagar uma loja exclua produtos, pedidos, clientes ou
--   historico em cascata. Para remover uma loja sera necessario tratar/mover
--   os registros dependentes antes, de forma explicita e controlada.
--
-- RECOMENDACAO: rodar dentro de uma transacao e, antes, fazer BACKUP/SNAPSHOT
--   do banco no painel Supabase (Database -> Backups).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- ETAPA 1 — Tabela stores e loja "main"
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stores (
  id            BIGSERIAL PRIMARY KEY,
  store_code    TEXT UNIQUE NOT NULL,
  slug          TEXT UNIQUE,
  store_name    TEXT NOT NULL DEFAULT 'Loja',
  status        TEXT NOT NULL DEFAULT 'active',  -- active | trial | suspended
  plan          TEXT NOT NULL DEFAULT 'free',
  custom_domain TEXT,
  subdomain     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garante a loja main com id = 1 (o codigo usa 1 como fallback).
-- Se ja existir uma loja main, nada e alterado.
INSERT INTO public.stores (id, store_code, slug, store_name, status, plan)
VALUES (1, 'main', 'pkgostosuras', 'P.K Gostosuras', 'active', 'pro')
ON CONFLICT (store_code) DO NOTHING;

-- Ajusta a sequence para nao colidir com o id=1 inserido manualmente.
SELECT setval(
  pg_get_serial_sequence('public.stores', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.stores), 1)
);

-- ---------------------------------------------------------------------
-- ETAPA 2 — Adicionar coluna store_id + backfill + FK + indice
-- ---------------------------------------------------------------------
-- Faz isso de forma segura para cada tabela QUE JA EXISTE.
-- Tabelas inexistentes sao ignoradas (NAO sao criadas aqui, exceto as da Etapa 3).

DO $$
DECLARE
  t TEXT;
  tabelas TEXT[] := ARRAY[
    'products',
    'product_categories',
    'customers',
    'orders',
    'coupons',
    'neighborhoods',
    'store_settings',
    'hero_banners',
    'delivery_drivers',
    'entregadores',
    'admin_settings',
    'cashback_settings',
    'loyalty_settings',
    'customer_points',
    'customer_cashback',
    'achievements',
    'customer_achievements',
    'missions',
    'customer_missions',
    'badges',
    'customer_badges',
    'customer_streaks',
    'monthly_ranking',
    'pix_keys'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    -- So mexe se a tabela existir no schema public
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      -- 2a) Adiciona a coluna se faltar
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS store_id BIGINT;', t
      );

      -- 2b) Backfill: registros sem loja vao para a loja main (id=1)
      EXECUTE format(
        'UPDATE public.%I SET store_id = 1 WHERE store_id IS NULL;', t
      );

      -- 2c) Indice para performance dos filtros por loja
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_store_id ON public.%I (store_id);', t, t
      );

      -- 2d) Foreign key para integridade (so cria se ainda nao existir)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = t
          AND constraint_name = 'fk_' || t || '_store'
      ) THEN
        EXECUTE format(
          'ALTER TABLE public.%I
             ADD CONSTRAINT %I FOREIGN KEY (store_id)
             REFERENCES public.stores(id) ON DELETE RESTRICT;',
          t, 'fk_' || t || '_store'
        );
      END IF;

      RAISE NOTICE 'OK: store_id garantido em %', t;
    ELSE
      RAISE NOTICE 'IGNORADO (tabela inexistente): %', t;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- ETAPA 3 — Tabelas AUSENTES detectadas em producao
-- ---------------------------------------------------------------------
-- O codigo referencia estas tabelas, mas o PostgREST acusou que NAO existem:
--   - public.order_reviews   (usada por /api/reviews, /api/gamification/missions)
--   - public.customer_levels (usada por /api/vip/*, /api/gamification/*)
-- Criadas com store_id ja embutido. Ajuste colunas conforme necessidade real.

CREATE TABLE IF NOT EXISTS public.order_reviews (
  id          BIGSERIAL PRIMARY KEY,
  store_id    BIGINT NOT NULL DEFAULT 1 REFERENCES public.stores(id) ON DELETE RESTRICT,
  order_id    BIGINT,
  customer_id BIGINT,
  rating      INT CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_reviews_store_id ON public.order_reviews (store_id);

CREATE TABLE IF NOT EXISTS public.customer_levels (
  id           BIGSERIAL PRIMARY KEY,
  store_id     BIGINT NOT NULL DEFAULT 1 REFERENCES public.stores(id) ON DELETE RESTRICT,
  name         TEXT NOT NULL,
  min_points   INT NOT NULL DEFAULT 0,
  sort_order   INT NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_levels_store_id ON public.customer_levels (store_id);

-- ---------------------------------------------------------------------
-- ETAPA 4 — VERIFICACAO (somente leitura) — rode e confira antes do COMMIT
-- ---------------------------------------------------------------------
-- Lista as tabelas que possuem store_id apos a migracao:
--   SELECT table_name FROM information_schema.columns
--   WHERE table_schema='public' AND column_name='store_id' ORDER BY table_name;
--
-- Conferir a loja main:
--   SELECT id, store_code, slug, status FROM public.stores;

COMMIT;

-- =====================================================================
-- FIM. Apos rodar, validar em producao:
--   GET /api/products        -> deve voltar 200 com a lista
--   GET /api/store-settings   -> sem erro 42703
--   GET /api/coupons          -> 200
--   GET /api/entregadores     -> 200
-- =====================================================================
