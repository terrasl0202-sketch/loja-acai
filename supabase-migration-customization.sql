-- ============================================
-- MIGRATION: CENTRAL DE PERSONALIZACAO PREMIUM
-- Projeto: Loja Acai
-- Objetivo: Adicionar colunas de customizacao em store_settings
-- ============================================

-- ============================================
-- PARTE 1: IDENTIDADE VISUAL
-- ============================================

ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT DEFAULT '';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT '';

-- ============================================
-- PARTE 2: CORES
-- ============================================

ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS color_primary TEXT DEFAULT '#a855f7';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS color_secondary TEXT DEFAULT '#6366f1';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS color_accent TEXT DEFAULT '#f59e0b';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS color_background TEXT DEFAULT '#0a0a0a';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS color_foreground TEXT DEFAULT '#fafafa';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS color_card TEXT DEFAULT '#171717';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS color_muted TEXT DEFAULT '#737373';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS color_border TEXT DEFAULT '#262626';

-- ============================================
-- PARTE 3: TEMA E LAYOUT
-- ============================================

ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'dark';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS layout_type TEXT DEFAULT 'premium';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS border_radius INTEGER DEFAULT 16;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS cards_shadow BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS banner_height TEXT DEFAULT 'medium';

-- ============================================
-- PARTE 4: ELEMENTOS VISUAIS
-- ============================================

ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS show_bestseller_badge BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS show_promo_badge BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS show_new_badge BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS show_reviews BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS show_categories BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS show_descriptions BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS show_promo_banner BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS show_bestsellers_section BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS show_featured_section BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS promo_message TEXT DEFAULT '';

-- ============================================
-- PARTE 5: REDES SOCIAIS E INFORMACOES
-- ============================================

ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS facebook TEXT DEFAULT '';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS tiktok TEXT DEFAULT '';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS delivery_policy TEXT DEFAULT '';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS footer_text TEXT DEFAULT '';

-- ============================================
-- PARTE 6: GATEWAYS DE PAGAMENTO (preparacao)
-- ============================================

ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS gateway_mercadopago_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS gateway_pagbank_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS gateway_stripe_enabled BOOLEAN DEFAULT false;

-- ============================================
-- VERIFICACAO
-- ============================================

SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'store_settings'
AND table_schema = 'public'
AND column_name IN (
  'logo_url', 'favicon_url', 'cover_image_url',
  'color_primary', 'color_secondary', 'color_accent',
  'theme_mode', 'layout_type', 'border_radius',
  'show_bestseller_badge', 'show_promo_badge', 'show_new_badge',
  'facebook', 'tiktok', 'delivery_policy'
)
ORDER BY column_name;
