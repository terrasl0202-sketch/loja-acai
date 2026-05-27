-- =====================================================
-- FIX: Corrigir coluna id de store_settings para TEXT
-- Projeto: xvzkczibscngsrrxzxko (producao)
-- =====================================================

-- 1. Remover a constraint de primary key existente
ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS store_settings_pkey;

-- 2. Alterar a coluna id de BIGINT para TEXT
ALTER TABLE public.store_settings ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 3. Definir valor default como 'main'
ALTER TABLE public.store_settings ALTER COLUMN id SET DEFAULT 'main';

-- 4. Recriar a primary key
ALTER TABLE public.store_settings ADD PRIMARY KEY (id);

-- 5. Atualizar registros existentes para usar id = 'main'
UPDATE public.store_settings SET id = 'main' WHERE id IS NOT NULL;

-- 6. Garantir que existe pelo menos um registro
INSERT INTO public.store_settings (id, store_name, store_open)
VALUES ('main', 'Minha Loja', true)
ON CONFLICT (id) DO NOTHING;

-- Verificar resultado
SELECT id, store_name, store_open FROM public.store_settings;
