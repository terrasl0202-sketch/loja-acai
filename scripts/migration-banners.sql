-- =====================================================
-- MIGRATION: Banner Carousel
-- Data: 2024
-- Descricao: Cria tabela para banners do carousel
-- SEGURA: Usa IF NOT EXISTS, nao apaga dados
-- =====================================================

-- 1. Criar tabela hero_banners
CREATE TABLE IF NOT EXISTS hero_banners (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  title VARCHAR(200),
  subtitle VARCHAR(300),
  link_url TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Criar indice para ordenacao
CREATE INDEX IF NOT EXISTS idx_hero_banners_sort_order ON hero_banners(sort_order);
CREATE INDEX IF NOT EXISTS idx_hero_banners_active ON hero_banners(active);

-- 3. Comentarios para documentacao
COMMENT ON TABLE hero_banners IS 'Banners do carousel do hero da loja';
COMMENT ON COLUMN hero_banners.image_url IS 'URL da imagem do banner';
COMMENT ON COLUMN hero_banners.title IS 'Titulo exibido sobre a imagem';
COMMENT ON COLUMN hero_banners.subtitle IS 'Subtitulo/descricao';
COMMENT ON COLUMN hero_banners.link_url IS 'Link opcional ao clicar no banner';
COMMENT ON COLUMN hero_banners.sort_order IS 'Ordem de exibicao no carousel';
COMMENT ON COLUMN hero_banners.active IS 'Banner ativo ou inativo';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
