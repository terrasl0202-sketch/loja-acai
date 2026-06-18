-- =======================================================
-- MIGRATION SEGURA: Adicionar colunas faltantes em store_settings
-- Data: 2026-06-04
-- NAO recria tabela, NAO apaga dados, NAO altera outras tabelas
-- =======================================================

-- Identidade e Social
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slogan TEXT DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS whatsapp TEXT DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS facebook TEXT DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS tiktok TEXT DEFAULT '';

-- Cores (nomes usados pela API)
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS color_primary TEXT DEFAULT '#7C3AED';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS color_secondary TEXT DEFAULT '#A855F7';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS color_accent TEXT DEFAULT '#F59E0B';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS color_background TEXT DEFAULT '#FFFFFF';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS color_foreground TEXT DEFAULT '#1F2937';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS color_card TEXT DEFAULT '#FFFFFF';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS color_muted TEXT DEFAULT '#6B7280';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS color_border TEXT DEFAULT '#E5E7EB';

-- Tema e Layout
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'light';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS layout_type TEXT DEFAULT 'modern';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS border_radius TEXT DEFAULT 'rounded';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS cards_shadow TEXT DEFAULT 'medium';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS banner_height TEXT DEFAULT 'medium';

-- Flags de exibicao
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_bestseller_badge BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_promo_badge BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_new_badge BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_reviews BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_categories BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_descriptions BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_promo_banner BOOLEAN DEFAULT false;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_bestsellers_section BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_featured_section BOOLEAN DEFAULT true;

-- Textos adicionais
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS promo_message TEXT DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS delivery_policy TEXT DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS footer_text TEXT DEFAULT '';

-- Gateways de pagamento
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS gateway_mercadopago_enabled BOOLEAN DEFAULT false;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS gateway_pagbank_enabled BOOLEAN DEFAULT false;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS gateway_stripe_enabled BOOLEAN DEFAULT false;

-- =======================================================
-- Copiar valores das colunas antigas para as novas (se novas vazias)
-- =======================================================
UPDATE store_settings SET
  address = COALESCE(NULLIF(address, ''), store_address),
  logo_url = COALESCE(NULLIF(logo_url, ''), store_logo),
  cover_image_url = COALESCE(NULLIF(cover_image_url, ''), store_cover),
  color_primary = COALESCE(NULLIF(color_primary, ''), primary_color, '#7C3AED'),
  color_secondary = COALESCE(NULLIF(color_secondary, ''), secondary_color, '#A855F7'),
  color_accent = COALESCE(NULLIF(color_accent, ''), accent_color, '#F59E0B'),
  color_background = COALESCE(NULLIF(color_background, ''), background_color, '#FFFFFF'),
  color_foreground = COALESCE(NULLIF(color_foreground, ''), text_color, '#1F2937')
WHERE id = 1;

-- =======================================================
-- FIM DA MIGRATION
-- =======================================================
