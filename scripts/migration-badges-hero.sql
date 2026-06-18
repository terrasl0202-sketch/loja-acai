-- Migration: Adicionar campos de badges, serving_text e hero customizavel
-- Data: 2024
-- Descricao: Permite ao lojista controlar badges, textos de porcao e banner principal

-- ===========================================
-- 1. PRODUTOS - Campos de Badge e Serving
-- ===========================================

-- Badge do produto
ALTER TABLE products ADD COLUMN IF NOT EXISTS badge_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS badge_text TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS badge_type TEXT DEFAULT 'mais_vendido';
ALTER TABLE products ADD COLUMN IF NOT EXISTS badge_color TEXT DEFAULT '';

-- Texto de porcao/tamanho
ALTER TABLE products ADD COLUMN IF NOT EXISTS serving_text TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS show_serving_text BOOLEAN DEFAULT false;

-- Comentarios
COMMENT ON COLUMN products.badge_enabled IS 'Se true, exibe badge no card do produto';
COMMENT ON COLUMN products.badge_text IS 'Texto da badge (ex: Mais vendido, Promocao, Novidade)';
COMMENT ON COLUMN products.badge_type IS 'Tipo da badge: mais_vendido, promocao, novidade, otimo_preco, destaque, personalizado';
COMMENT ON COLUMN products.badge_color IS 'Cor personalizada da badge (opcional)';
COMMENT ON COLUMN products.serving_text IS 'Texto de porcao (ex: Serve 1 pessoa, 500ml, 1 litro)';
COMMENT ON COLUMN products.show_serving_text IS 'Se true, exibe o texto de porcao no card';

-- ===========================================
-- 2. STORE_SETTINGS - Campos do Hero Banner
-- ===========================================

-- Titulo e subtitulo do banner
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_title TEXT DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_subtitle TEXT DEFAULT '';

-- Badge 1 do Hero
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_badge_1_text TEXT DEFAULT '30-45 min';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_badge_1_icon TEXT DEFAULT 'clock';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_badge_1_enabled BOOLEAN DEFAULT true;

-- Badge 2 do Hero
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_badge_2_text TEXT DEFAULT 'Geladinho';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_badge_2_icon TEXT DEFAULT 'snowflake';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_badge_2_enabled BOOLEAN DEFAULT true;

-- Badge 3 do Hero
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_badge_3_text TEXT DEFAULT 'Premium';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_badge_3_icon TEXT DEFAULT 'award';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_badge_3_enabled BOOLEAN DEFAULT true;

-- Comentarios
COMMENT ON COLUMN store_settings.hero_title IS 'Titulo principal do banner hero';
COMMENT ON COLUMN store_settings.hero_subtitle IS 'Subtitulo do banner hero';
COMMENT ON COLUMN store_settings.hero_badge_1_text IS 'Texto do badge 1 do hero';
COMMENT ON COLUMN store_settings.hero_badge_1_icon IS 'Icone do badge 1: clock, snowflake, award, star, truck, heart';
COMMENT ON COLUMN store_settings.hero_badge_1_enabled IS 'Se true, exibe o badge 1';
COMMENT ON COLUMN store_settings.hero_badge_2_text IS 'Texto do badge 2 do hero';
COMMENT ON COLUMN store_settings.hero_badge_2_icon IS 'Icone do badge 2';
COMMENT ON COLUMN store_settings.hero_badge_2_enabled IS 'Se true, exibe o badge 2';
COMMENT ON COLUMN store_settings.hero_badge_3_text IS 'Texto do badge 3 do hero';
COMMENT ON COLUMN store_settings.hero_badge_3_icon IS 'Icone do badge 3';
COMMENT ON COLUMN store_settings.hero_badge_3_enabled IS 'Se true, exibe o badge 3';

-- ===========================================
-- 3. INDICES (opcional, para performance)
-- ===========================================

-- Indice para buscar produtos com badge
CREATE INDEX IF NOT EXISTS idx_products_badge_enabled ON products(badge_enabled) WHERE badge_enabled = true;

-- ===========================================
-- FIM DA MIGRATION
-- ===========================================
