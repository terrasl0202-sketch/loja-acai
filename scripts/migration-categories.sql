-- Migration: Criar sistema de categorias de produtos
-- Data: 2024
-- Descricao: Permite ao lojista organizar produtos em categorias

-- ===========================================
-- 1. TABELA DE CATEGORIAS
-- ===========================================

CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'utensils',
  image_url TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentarios
COMMENT ON TABLE product_categories IS 'Categorias de produtos da loja';
COMMENT ON COLUMN product_categories.name IS 'Nome da categoria (ex: Acais, Sorvetes, Bebidas)';
COMMENT ON COLUMN product_categories.description IS 'Descricao opcional da categoria';
COMMENT ON COLUMN product_categories.icon IS 'Nome do icone Lucide (ex: ice-cream, coffee, pizza)';
COMMENT ON COLUMN product_categories.image_url IS 'URL da imagem da categoria (opcional)';
COMMENT ON COLUMN product_categories.sort_order IS 'Ordem de exibicao (menor = primeiro)';
COMMENT ON COLUMN product_categories.active IS 'Se true, categoria visivel na loja';

-- ===========================================
-- 2. VINCULAR PRODUTOS A CATEGORIAS
-- ===========================================

-- Adicionar coluna category_id na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL;

-- Indice para buscar produtos por categoria
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Comentario
COMMENT ON COLUMN products.category_id IS 'ID da categoria do produto (FK para product_categories)';

-- ===========================================
-- 3. CATEGORIAS PADRAO (SEEDS)
-- ===========================================

-- Inserir categorias padrao se a tabela estiver vazia
INSERT INTO product_categories (name, icon, sort_order, active)
SELECT 'Acais', 'ice-cream', 1, true
WHERE NOT EXISTS (SELECT 1 FROM product_categories LIMIT 1);

INSERT INTO product_categories (name, icon, sort_order, active)
SELECT 'Sorvetes', 'ice-cream-cone', 2, true
WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE name = 'Sorvetes');

INSERT INTO product_categories (name, icon, sort_order, active)
SELECT 'Bebidas', 'cup-soda', 3, true
WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE name = 'Bebidas');

INSERT INTO product_categories (name, icon, sort_order, active)
SELECT 'Sobremesas', 'cake', 4, true
WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE name = 'Sobremesas');

-- ===========================================
-- 4. INDICES PARA PERFORMANCE
-- ===========================================

-- Indice para ordenacao de categorias
CREATE INDEX IF NOT EXISTS idx_product_categories_sort_order ON product_categories(sort_order);

-- Indice para categorias ativas
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(active) WHERE active = true;

-- ===========================================
-- FIM DA MIGRATION
-- ===========================================
