/**
 * @module Product Types
 * @description Tipos relacionados a produtos e categorias
 * 
 * @architecture
 * - Product: Produto do cardapio
 * - Category: Categoria de produtos
 * - ProductVariant: Variantes (tamanhos, etc)
 * - Addon: Complementos/adicionais
 */

import type { BaseEntity } from './common'

// =============================================================================
// PRODUCT
// =============================================================================

export interface Product extends Partial<BaseEntity> {
  id: string
  storeId?: string
  
  // Identificacao
  name: string
  description?: string
  shortDescription?: string
  
  // Categoria
  categoryId?: string
  category?: string
  
  // Preco
  price: number
  originalPrice?: number        // Preco original (para desconto)
  costPrice?: number            // Preco de custo
  
  // Imagem
  image?: string
  images?: string[]
  
  // Status
  isAvailable: boolean
  isPopular?: boolean
  isFeatured?: boolean
  isNew?: boolean
  
  // Estoque
  stockEnabled?: boolean
  stockQuantity?: number
  
  // Variantes
  hasVariants?: boolean
  variants?: ProductVariant[]
  
  // Adicionais
  hasAddons?: boolean
  addons?: ProductAddon[]
  addonGroups?: AddonGroup[]
  
  // Ordem de exibicao
  sortOrder?: number
  
  // SEO
  slug?: string
  
  // Nutricional
  nutritionalInfo?: NutritionalInfo
  
  // Tags
  tags?: string[]
}

// =============================================================================
// CATEGORY
// =============================================================================

export interface Category extends Partial<BaseEntity> {
  id: string
  storeId?: string
  
  name: string
  description?: string
  image?: string
  icon?: string
  color?: string
  
  isActive: boolean
  sortOrder: number
  
  // Hierarquia
  parentId?: string
  
  // Contagem de produtos
  productCount?: number
}

// =============================================================================
// VARIANTS
// =============================================================================

export interface ProductVariant {
  id: string
  name: string                   // Ex: "300ml", "500ml", "1L"
  price: number
  originalPrice?: number
  isDefault?: boolean
  isAvailable: boolean
  sortOrder?: number
}

// =============================================================================
// ADDONS
// =============================================================================

export interface ProductAddon {
  id: string
  name: string
  price: number
  isAvailable: boolean
  maxQuantity?: number
  sortOrder?: number
  groupId?: string              // ID do grupo de adicionais
}

export interface AddonGroup {
  id: string
  name: string                   // Ex: "Frutas", "Complementos"
  description?: string
  required: boolean
  minSelect: number
  maxSelect: number
  addons: ProductAddon[]
  sortOrder?: number
}

// =============================================================================
// NUTRITIONAL INFO
// =============================================================================

export interface NutritionalInfo {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  sodium?: number
  servingSize?: string           // Ex: "100g", "1 unidade"
}

// =============================================================================
// CART ITEM
// =============================================================================

export interface CartItem {
  id: string
  productId: string
  product: Product
  
  quantity: number
  unitPrice: number
  totalPrice: number
  
  // Variante selecionada
  variant?: ProductVariant
  selectedVariant?: string
  
  // Adicionais selecionados
  addons: CartItemAddon[]
  selectedAddons?: string[]
  
  // Observacoes
  notes?: string
  
  // Meta
  addedAt: string
}

export interface CartItemAddon {
  id: string
  name: string
  price: number
  quantity: number
}

// =============================================================================
// CART
// =============================================================================

export interface Cart {
  id?: string
  storeId?: string
  customerId?: string
  
  items: CartItem[]
  
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  
  couponCode?: string
  
  createdAt: string
  updatedAt: string
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Calcula preco total de um item do carrinho
 */
export function calculateCartItemTotal(item: CartItem): number {
  const basePrice = item.variant?.price || item.product.price
  const addonsTotal = item.addons.reduce((sum, addon) => 
    sum + (addon.price * addon.quantity), 0
  )
  return (basePrice + addonsTotal) * item.quantity
}

/**
 * Calcula subtotal do carrinho
 */
export function calculateCartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.totalPrice, 0)
}

/**
 * Filtra produtos disponiveis
 */
export function filterAvailableProducts(products: Product[]): Product[] {
  return products.filter(p => p.isAvailable)
}

/**
 * Agrupa produtos por categoria
 */
export function groupProductsByCategory(products: Product[]): Map<string, Product[]> {
  const groups = new Map<string, Product[]>()
  
  products.forEach(product => {
    const category = product.category || 'Outros'
    const existing = groups.get(category) || []
    groups.set(category, [...existing, product])
  })
  
  return groups
}
