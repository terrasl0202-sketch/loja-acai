/**
 * @module useAdminProducts Hook
 * @description Hook para gerenciar produtos no Admin
 * 
 * @architecture
 * - Mantém compatibilidade com formato antigo (id: number, active: boolean)
 * - Usa storage adapter internamente
 * - Sincroniza automaticamente com localStorage
 * - Preparado para migração futura para Supabase
 * 
 * @example
 * const { products, addProduct, updateProduct, removeProduct, moveProduct } = useAdminProducts()
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { storage } from '@/lib/storage'
import { STORAGE_KEYS } from '@/config/storage.keys'

// =============================================================================
// TYPES - Compatível com formato atual
// =============================================================================

export interface LegacyProduct {
  id: number
  name: string
  price: number
  description: string
  active: boolean
  stock: number
  outOfStock?: boolean
  order?: number
  image?: string
  category?: string
}

// =============================================================================
// DEFAULT PRODUCTS (fallback se nao houver dados salvos)
// =============================================================================

const DEFAULT_PRODUCTS: LegacyProduct[] = [
  { id: 1, name: "Acai 500ml", price: 15.00, description: "Acai puro 500ml", active: true, stock: 100, order: 1 },
  { id: 2, name: "Acai 1L", price: 25.00, description: "Acai puro 1 litro", active: true, stock: 100, order: 2 },
  { id: 3, name: "Acai 2L", price: 45.00, description: "Acai puro 2 litros", active: true, stock: 100, order: 3 },
]

// =============================================================================
// HOOK
// =============================================================================

export interface UseAdminProductsReturn {
  products: LegacyProduct[]
  isLoading: boolean
  error: string | null
  
  // CRUD
  addProduct: () => LegacyProduct
  updateProduct: (id: number, field: keyof LegacyProduct, value: string | number | boolean) => void
  removeProduct: (id: number) => void
  moveProduct: (id: number, direction: 'up' | 'down') => void
  
  // Bulk
  saveAll: () => Promise<void>
  refresh: () => Promise<void>
}

export function useAdminProducts(): UseAdminProductsReturn {
  const [products, setProducts] = useState<LegacyProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // -------------------------------------------------------------------------
  // LOAD
  // -------------------------------------------------------------------------
  
  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Tenta carregar de pk-products primeiro (novo formato)
      const savedProducts = await storage.get<LegacyProduct[]>(STORAGE_KEYS.PRODUCTS)
      
      if (savedProducts && savedProducts.length > 0) {
        setProducts(savedProducts)
        setError(null)
        return
      }
      
      // Fallback: tenta carregar de pk-admin-config (formato antigo)
      const configData = await storage.get<{ products?: LegacyProduct[] }>('pk-admin-config')
      
      if (configData?.products && configData.products.length > 0) {
        setProducts(configData.products)
        // Migra para novo storage
        await storage.set(STORAGE_KEYS.PRODUCTS, configData.products)
        setError(null)
        return
      }
      
      // Fallback final: usa produtos default
      setProducts(DEFAULT_PRODUCTS)
      
    } catch (err) {
      console.error('[useAdminProducts] Erro ao carregar:', err)
      setError('Erro ao carregar produtos')
      setProducts(DEFAULT_PRODUCTS)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Carrega inicial
  useEffect(() => {
    loadProducts()
  }, [loadProducts])
  
  // -------------------------------------------------------------------------
  // SAVE (auto-save quando products mudam)
  // -------------------------------------------------------------------------
  
  const saveProducts = useCallback(async (newProducts: LegacyProduct[]) => {
    try {
      // Salva no novo storage
      await storage.set(STORAGE_KEYS.PRODUCTS, newProducts)
      
      // Também atualiza pk-admin-config para compatibilidade
      const configData = await storage.get<Record<string, unknown>>('pk-admin-config') || {}
      configData.products = newProducts
      await storage.set('pk-admin-config', configData)
      
    } catch (err) {
      console.error('[useAdminProducts] Erro ao salvar:', err)
      setError('Erro ao salvar produtos')
    }
  }, [])
  
  // -------------------------------------------------------------------------
  // CRUD OPERATIONS
  // -------------------------------------------------------------------------
  
  const addProduct = useCallback((): LegacyProduct => {
    const newId = Math.max(...products.map(p => p.id), 0) + 1
    const newOrder = Math.max(...products.map(p => p.order || 0), 0) + 1
    
    const newProduct: LegacyProduct = {
      id: newId,
      name: "Novo Produto",
      price: 10,
      description: "Descricao do produto",
      active: true,
      stock: 100,
      outOfStock: false,
      order: newOrder
    }
    
    const updated = [...products, newProduct]
    setProducts(updated)
    saveProducts(updated)
    
    return newProduct
  }, [products, saveProducts])
  
  const updateProduct = useCallback((
    id: number, 
    field: keyof LegacyProduct, 
    value: string | number | boolean
  ) => {
    const updated = products.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    )
    setProducts(updated)
    saveProducts(updated)
  }, [products, saveProducts])
  
  const removeProduct = useCallback((id: number) => {
    const updated = products.filter(p => p.id !== id)
    setProducts(updated)
    saveProducts(updated)
  }, [products, saveProducts])
  
  const moveProduct = useCallback((id: number, direction: 'up' | 'down') => {
    const sorted = [...products].sort((a, b) => (a.order || 0) - (b.order || 0))
    const index = sorted.findIndex(p => p.id === id)
    
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === sorted.length - 1)
    ) {
      return
    }
    
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    // Swap orders
    const tempOrder = sorted[index].order
    sorted[index].order = sorted[newIndex].order
    sorted[newIndex].order = tempOrder
    
    setProducts(sorted)
    saveProducts(sorted)
  }, [products, saveProducts])
  
  // -------------------------------------------------------------------------
  // BULK
  // -------------------------------------------------------------------------
  
  const saveAll = useCallback(async () => {
    await saveProducts(products)
  }, [products, saveProducts])
  
  return {
    products,
    isLoading,
    error,
    addProduct,
    updateProduct,
    removeProduct,
    moveProduct,
    saveAll,
    refresh: loadProducts,
  }
}
