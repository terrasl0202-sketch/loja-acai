-- ============================================
-- MIGRATION: PERSISTENCIA COMPLETA DO ADMIN
-- Projeto: Loja Acai
-- Data: 2024
-- IMPORTANTE: Executar APOS as migrations anteriores
-- ============================================

-- ============================================
-- PARTE 1: ADICIONAR COLUNAS EM store_settings
-- ============================================

-- BANNER
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS banner_main_text TEXT DEFAULT 'Bem-vindo!';

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS banner_secondary_text TEXT DEFAULT '';

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS banner_promo_active BOOLEAN DEFAULT false;

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS banner_promo_price NUMERIC(10,2) DEFAULT 0;

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS banner_promo_text TEXT DEFAULT '';

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS banner_image_url TEXT DEFAULT '';

-- PAGAMENTO
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS payment_min_value_asaas NUMERIC(10,2) DEFAULT 0;

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS payment_pix_manual_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS payment_pix_asaas_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS payment_pix_expiration_minutes INTEGER DEFAULT 30;

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS pix_key TEXT DEFAULT '';

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS pix_key_type TEXT DEFAULT 'cpf';

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS pix_receiver_name TEXT DEFAULT '';

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS payment_card_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS payment_cash_enabled BOOLEAN DEFAULT true;

-- WHATSAPP
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS whatsapp_default_message TEXT DEFAULT 'Ola! Gostaria de fazer um pedido.';

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS whatsapp_receipt_message TEXT DEFAULT 'Obrigado pelo seu pedido!';

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS whatsapp_support_enabled BOOLEAN DEFAULT true;

-- HORARIO AVANCADO
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS abandoned_order_minutes INTEGER DEFAULT 30;

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS auto_archive_days INTEGER DEFAULT 7;

-- ENTREGA AVANCADO
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS delivery_default_fee NUMERIC(10,2) DEFAULT 5.00;

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS delivery_minimum_order NUMERIC(10,2) DEFAULT 0;

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS delivery_estimated_time TEXT DEFAULT '30-45 min';

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS delivery_pickup_enabled BOOLEAN DEFAULT true;

-- NOTIFICACOES (ADMIN)
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS notification_sound_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS notification_sound_volume NUMERIC(3,2) DEFAULT 0.5;

-- ============================================
-- PARTE 2: CRIAR TABELA coupons
-- ============================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percent', -- 'percent' ou 'fixed'
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_order_value NUMERIC(10,2) DEFAULT 0,
  max_uses INTEGER DEFAULT NULL, -- NULL = ilimitado
  current_uses INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ DEFAULT NULL, -- NULL = sem expiracao
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir SELECT para todos (cliente pode verificar cupom)
DROP POLICY IF EXISTS "Allow public read coupons" ON public.coupons;
CREATE POLICY "Allow public read coupons" ON public.coupons
  FOR SELECT USING (true);

-- Policy: Permitir tudo com service_role
DROP POLICY IF EXISTS "Allow service role full access coupons" ON public.coupons;
CREATE POLICY "Allow service role full access coupons" ON public.coupons
  FOR ALL USING (true) WITH CHECK (true);

-- Indice para busca por codigo
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (code);

-- ============================================
-- PARTE 3: CRIAR TABELA entregadores
-- ============================================

CREATE TABLE IF NOT EXISTS public.entregadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  vehicle TEXT DEFAULT '', -- 'moto', 'bike', 'carro', etc
  active BOOLEAN DEFAULT true,
  token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT, -- token para acesso ao painel
  current_orders INTEGER DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para entregadores
ALTER TABLE public.entregadores ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir SELECT para todos (admin e entregador podem ver)
DROP POLICY IF EXISTS "Allow public read entregadores" ON public.entregadores;
CREATE POLICY "Allow public read entregadores" ON public.entregadores
  FOR SELECT USING (true);

-- Policy: Permitir tudo com service_role
DROP POLICY IF EXISTS "Allow service role full access entregadores" ON public.entregadores;
CREATE POLICY "Allow service role full access entregadores" ON public.entregadores
  FOR ALL USING (true) WITH CHECK (true);

-- Indice para busca por token
CREATE INDEX IF NOT EXISTS idx_entregadores_token ON public.entregadores (token);

-- ============================================
-- PARTE 4: ATUALIZAR REGISTRO EXISTENTE
-- (somente se ja existe um registro com id = 'main')
-- ============================================

-- Garantir que o registro 'main' existe com valores default
INSERT INTO public.store_settings (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFICACAO FINAL
-- ============================================
-- Execute estas queries para verificar que tudo foi criado:

-- Verificar novas colunas em store_settings:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'store_settings' 
-- ORDER BY ordinal_position;

-- Verificar tabela coupons:
-- SELECT * FROM public.coupons LIMIT 5;

-- Verificar tabela entregadores:
-- SELECT * FROM public.entregadores LIMIT 5;

-- ============================================
-- FIM DA MIGRATION
-- ============================================
