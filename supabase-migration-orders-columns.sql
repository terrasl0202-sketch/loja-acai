-- =====================================================================
-- MIGRACAO MINIMA — colunas faltantes em public.orders
-- =====================================================================
-- Objetivo: adicionar SOMENTE as duas colunas confirmadas como ausentes,
-- usadas pelo fluxo de criacao de pedido (create-pix / POST /api/orders):
--   - cashback_used        (valor de cashback usado no pedido)
--   - points_reward_used   (valor/qtd de pontos usados no pedido)
--
-- Colunas que JA EXISTEM (confirmado) e NAO serao tocadas:
--   asaas_payment_id, payment_status.
--
-- Seguranca:
--   - SEM DROP, SEM DELETE, SEM TRUNCATE, SEM ON DELETE CASCADE.
--   - NAO altera dados existentes. O DEFAULT 0 vale para preencher a nova
--     coluna nas linhas atuais e futuras, sem apagar/alterar nenhum outro dado.
--   - ADD COLUMN IF NOT EXISTS -> idempotente, pode rodar mais de uma vez.
--   - Tudo dentro de BEGIN/COMMIT.
-- =====================================================================

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cashback_used NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS points_reward_used NUMERIC NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------
-- VERIFICACAO (somente leitura) — confira antes/depois do COMMIT
-- ---------------------------------------------------------------------
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'orders'
--   AND column_name IN ('cashback_used', 'points_reward_used')
-- ORDER BY column_name;

COMMIT;

-- =====================================================================
-- FIM. Apos rodar, validar em producao:
--   POST /api/asaas/create-pix  -> deve persistir o pedido e retornar o PIX
--   GET  /api/orders            -> pedido aparece no admin
-- =====================================================================
