-- ============================================================
-- MIGRACAO OPCIONAL — Senha de admin POR LOJA (multi-lojas / SaaS)
-- ============================================================
--
-- O codigo do admin /admin/[slug] ja funciona SEM esta coluna,
-- usando a ADMIN_PASSWORD global como fallback transitorio.
--
-- Rode este script no Supabase (SQL Editor) quando quiser que cada
-- loja tenha a PROPRIA senha de admin. Apos rodar, o login de cada
-- loja passa a validar contra stores.admin_password automaticamente.
--
-- NAO apaga dados. NAO desabilita RLS. NAO cria policy publica.
-- A coluna so e lida server-side (service role).
-- ============================================================

-- 1) Adiciona a coluna (idempotente)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS admin_password TEXT;

-- 2) (Opcional) Defina senhas por loja. Troque pelos valores reais.
--    Enquanto admin_password ficar NULL/vazio, a loja usa a senha global.
--
-- UPDATE public.stores SET admin_password = 'senha-da-loja-teste' WHERE slug = 'lojateste';
-- UPDATE public.stores SET admin_password = 'senha-da-pk'        WHERE store_code = 'main';

-- 3) Conferir
-- SELECT id, store_code, slug, status,
--        CASE WHEN admin_password IS NULL OR admin_password = '' THEN 'usa senha global'
--             ELSE 'senha propria' END AS auth
-- FROM public.stores ORDER BY id;
