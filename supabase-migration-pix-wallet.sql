-- ============================================
-- MIGRATION: CARTEIRA PIX MANUAL
-- Projeto: Loja Acai
-- Data: 2024
-- Descricao: Criar tabela para multiplas chaves PIX manuais
-- ============================================

-- ============================================
-- PARTE 1: CRIAR TABELA pix_manual_keys
-- ============================================

CREATE TABLE IF NOT EXISTS public.pix_manual_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificacao da chave
  alias TEXT NOT NULL DEFAULT 'Chave principal', -- Apelido/nome da chave
  
  -- Tipo e valor da chave
  key_type TEXT NOT NULL DEFAULT 'telefone', -- 'telefone', 'cpf', 'cnpj', 'email', 'aleatoria'
  key_value TEXT NOT NULL DEFAULT '', -- Valor da chave (sem normalizacao)
  
  -- Dados do recebedor (cada chave tem seu proprio recebedor)
  receiver_name TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT 'SAO PAULO',
  
  -- Status
  is_active BOOLEAN DEFAULT false, -- Apenas UMA chave pode estar ativa por vez
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para pix_manual_keys
ALTER TABLE public.pix_manual_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir SELECT para todos (checkout precisa ler a chave ativa)
DROP POLICY IF EXISTS "Allow public read pix_manual_keys" ON public.pix_manual_keys;
CREATE POLICY "Allow public read pix_manual_keys" ON public.pix_manual_keys
  FOR SELECT USING (true);

-- Policy: Permitir tudo com service_role (admin)
DROP POLICY IF EXISTS "Allow service role full access pix_manual_keys" ON public.pix_manual_keys;
CREATE POLICY "Allow service role full access pix_manual_keys" ON public.pix_manual_keys
  FOR ALL USING (true) WITH CHECK (true);

-- Indices
CREATE INDEX IF NOT EXISTS idx_pix_manual_keys_is_active ON public.pix_manual_keys (is_active);
CREATE INDEX IF NOT EXISTS idx_pix_manual_keys_key_type ON public.pix_manual_keys (key_type);

-- ============================================
-- PARTE 2: FUNCAO PARA GARANTIR APENAS UMA CHAVE ATIVA
-- ============================================

-- Trigger para desativar outras chaves quando uma e ativada
CREATE OR REPLACE FUNCTION deactivate_other_pix_keys()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a nova chave esta sendo ativada
  IF NEW.is_active = true THEN
    -- Desativa todas as outras chaves
    UPDATE public.pix_manual_keys
    SET is_active = false, updated_at = NOW()
    WHERE id != NEW.id AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_deactivate_other_pix_keys ON public.pix_manual_keys;
CREATE TRIGGER trigger_deactivate_other_pix_keys
  BEFORE INSERT OR UPDATE ON public.pix_manual_keys
  FOR EACH ROW
  EXECUTE FUNCTION deactivate_other_pix_keys();

-- ============================================
-- PARTE 3: MIGRAR DADOS ANTIGOS (se existirem)
-- ============================================

-- Se existir uma chave PIX antiga em store_settings, migrar para a nova tabela
DO $$
DECLARE
  old_key TEXT;
  old_key_type TEXT;
  old_receiver TEXT;
  existing_count INTEGER;
BEGIN
  -- Buscar dados antigos
  SELECT pix_key, pix_key_type, pix_receiver_name
  INTO old_key, old_key_type, old_receiver
  FROM public.store_settings
  WHERE id = 'main'
  LIMIT 1;
  
  -- Verificar se ja existem chaves na nova tabela
  SELECT COUNT(*) INTO existing_count FROM public.pix_manual_keys;
  
  -- Se tem dados antigos e nao existem chaves na nova tabela, migrar
  IF old_key IS NOT NULL AND old_key != '' AND existing_count = 0 THEN
    INSERT INTO public.pix_manual_keys (
      alias,
      key_type,
      key_value,
      receiver_name,
      city,
      is_active
    ) VALUES (
      'Chave principal (migrada)',
      COALESCE(old_key_type, 'telefone'),
      old_key,
      COALESCE(old_receiver, ''),
      'SAO PAULO',
      true -- Ativar a chave migrada
    );
    
    RAISE NOTICE 'Chave PIX antiga migrada com sucesso!';
  END IF;
END $$;

-- ============================================
-- VERIFICACAO FINAL
-- ============================================

-- Verificar tabela criada:
-- SELECT * FROM public.pix_manual_keys;

-- Verificar trigger:
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.pix_manual_keys'::regclass;

-- ============================================
-- FIM DA MIGRATION
-- ============================================
