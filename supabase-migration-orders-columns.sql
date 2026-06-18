-- =====================================================================
-- MIGRACAO COMPLEMENTAR — colunas faltantes em public.orders
-- =====================================================================
-- NAO EXECUTAR SEM CONFIRMACAO FINAL.
--
-- Motivo: a validacao em producao do fluxo PIX retornou:
--   "Could not find the 'cashback_used' column of 'orders' in the schema cache"
-- Ou seja, a tabela orders nao possui todas as colunas que o codigo usa
-- (ALLOWED_COLUMNS em /api/orders e no helper de persistencia do PIX).
-- Era exatamente este erro (42703) que o catch silencioso engolia, fazendo
-- pedidos "desaparecerem".
--
-- Estrategia: 100% IDEMPOTENTE e DEFENSIVA.
--   - SEM DROP, SEM DELETE, SEM TRUNCATE, SEM ON DELETE CASCADE.
--   - Apenas ADICIONA colunas faltantes (ADD COLUMN IF NOT EXISTS).
--   - NAO altera valores existentes. NAO remove colunas.
--   - Pode ser rodada mais de uma vez sem efeito colateral.
--
-- RECOMENDACAO: ter snapshot do banco antes (Supabase -> Database -> Backups).
-- =====================================================================

BEGIN;

-- Pre-condicao: a tabela orders precisa existir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orders'
  ) THEN
    RAISE EXCEPTION 'Tabela public.orders nao existe. Abortado.';
  END IF;
END $$;

-- Colunas que o codigo usa e que podem estar ausentes.
-- (As que ja existirem sao ignoradas por ADD COLUMN IF NOT EXISTS.)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_code         TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status     TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS asaas_payment_id   TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cashback_used      NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_reward_used INTEGER DEFAULT 0;

-- Indices uteis para o fluxo (busca por codigo e por pagamento Asaas).
CREATE INDEX IF NOT EXISTS idx_orders_order_code       ON public.orders (order_code);
CREATE INDEX IF NOT EXISTS idx_orders_asaas_payment_id ON public.orders (asaas_payment_id);

-- ---------------------------------------------------------------------
-- VERIFICACAO (somente leitura) — confira antes do COMMIT
-- ---------------------------------------------------------------------
-- Listar colunas atuais de orders:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='orders' ORDER BY ordinal_position;

COMMIT;

-- =====================================================================
-- FIM. Apos rodar, o INSERT do pedido (create-pix e /api/orders) deve
-- funcionar e o fluxo PIX completo pode ser validado.
-- =====================================================================
