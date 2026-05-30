-- =====================================================
-- MIGRATION: Display Order para Produtos
-- Data: 2024
-- Descricao: Adiciona campo display_order para ordenacao manual
-- SEGURA: Usa IF NOT EXISTS, nao apaga dados
-- =====================================================

-- 1. Adicionar coluna display_order
ALTER TABLE products ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 2. Criar indice para ordenacao
CREATE INDEX IF NOT EXISTS idx_products_display_order ON products(display_order);

-- 3. Comentario para documentacao
COMMENT ON COLUMN products.display_order IS 'Ordem de exibicao manual (menor = primeiro). Se 0, usa ordem antiga.';

-- 4. Inicializar display_order com valores do sort_order existente (se houver)
-- Isso garante que produtos existentes mantenham sua ordem
UPDATE products 
SET display_order = COALESCE(sort_order, id) 
WHERE display_order = 0 OR display_order IS NULL;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
