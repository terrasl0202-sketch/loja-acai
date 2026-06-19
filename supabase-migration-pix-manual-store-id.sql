-- ============================================================
-- HARDENING MULTI-TENANT: pix_manual_keys por loja
-- Corrige: (1) cadastro de PIX falhava por falta da coluna store_id;
--          (2) trigger global desativava a chave PIX de TODAS as lojas.
-- Idempotente. Sem DELETE / DROP TABLE / TRUNCATE. Faca SNAPSHOT antes.
-- ============================================================
BEGIN;

-- 1) Garantir a coluna store_id (a tabela foi criada sem ela; a migracao
--    multiempresa adicionou store_id por engano em pix_keys, tabela nao usada).
ALTER TABLE public.pix_manual_keys
  ADD COLUMN IF NOT EXISTS store_id BIGINT;

-- 2) Backfill: chaves antigas sem dono pertencem a loja principal (1).
UPDATE public.pix_manual_keys
   SET store_id = 1
 WHERE store_id IS NULL;

-- 3) Indice por loja
CREATE INDEX IF NOT EXISTS idx_pix_manual_keys_store_id
  ON public.pix_manual_keys (store_id);

-- 4) FK store_id -> stores(id) ON DELETE RESTRICT (so se nao existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
     WHERE table_schema='public'
       AND table_name='pix_manual_keys'
       AND constraint_name='fk_pix_manual_keys_store'
  ) THEN
    ALTER TABLE public.pix_manual_keys
      ADD CONSTRAINT fk_pix_manual_keys_store
      FOREIGN KEY (store_id) REFERENCES public.stores(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 5) Trigger por loja: ao ativar uma chave, desativar apenas as OUTRAS chaves
--    DA MESMA LOJA. Antes era global (desativava a PK ao ativar outra loja).
--    CREATE OR REPLACE atualiza a logica sem recriar o trigger existente.
CREATE OR REPLACE FUNCTION deactivate_other_pix_keys()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.pix_manual_keys
       SET is_active = false, updated_at = NOW()
     WHERE id <> NEW.id
       AND is_active = true
       AND store_id IS NOT DISTINCT FROM NEW.store_id;  -- somente a mesma loja
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- VERIFICACAO (rode antes do COMMIT):
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name='pix_manual_keys' AND column_name='store_id'; -- deve existir
--   SELECT store_id, COUNT(*) FROM public.pix_manual_keys GROUP BY store_id;

COMMIT;
