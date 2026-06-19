-- ============================================================
-- Senha de admin POR LOJA (apenas HASH, nunca texto puro)
-- Rode no SQL Editor do Supabase ANTES de publicar/usar.
-- ============================================================

-- 1) Coluna de hash (SHA-256) da senha de admin de cada loja.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS admin_password_hash text;

-- 2) Remover a coluna antiga de texto puro, caso tenha sido criada
--    em testes anteriores. (Seguro: nao falha se nao existir.)
ALTER TABLE public.stores
  DROP COLUMN IF EXISTS admin_password;

-- 3) Conferir
-- SELECT id, store_code, slug, status,
--        CASE WHEN admin_password_hash IS NULL OR admin_password_hash = ''
--             THEN 'sem senha (usa global se for a loja principal)'
--             ELSE 'senha propria definida' END AS auth
-- FROM public.stores ORDER BY id;

-- ============================================================
-- Observacoes:
-- - O hash e gerado pela aplicacao: sha256("pkgostosuras::store-admin::v1:" || senha).
--   NUNCA insira senha em texto puro aqui. Defina a senha pelo painel /platform
--   (Editar loja -> "Senha do Admin da Loja"), que grava somente o hash.
-- - Enquanto a loja PRINCIPAL (store_code = 'main') nao tiver hash, ela ainda
--   aceita a ADMIN_PASSWORD global (bootstrap anti-lockout). Assim que voce
--   definir a senha da PK no /platform, a senha global para de funcionar.
-- - Lojas secundarias SEM hash nao conseguem logar ate ter uma senha definida.
-- - RLS permanece ativo; o hash so e lido/escrito via service role no servidor
--   e NUNCA e exposto ao frontend.
-- ============================================================
