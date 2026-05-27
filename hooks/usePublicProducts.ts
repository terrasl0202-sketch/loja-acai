/**
 * @module usePublicProducts Hook
 * @description Hook para carregar produtos na loja pública
 * 
 * @architecture
 * - Usa storage adapter internamente
 * - Filtra produtos ativos e disponíveis
 * - Sincroniza automaticamente com localStorage
 * - Compatível com formato legado
 * 
 * @example
 * const { products, isLoading, refresh } = usePublicProducts()
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { storage } from '@/lib/storage'
import { STORAGE_KEYS } from '@/config/storage.keys'

// =============================================================================
// TYPES - Compatível com formato atual
// =============================================================================

export interface PublicProduct {
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

const DEFAULT_PRODUCTS: PublicProduct[] = [
  { id: 1, name: "Acai 500ml", price: 15.00, description: "Acai puro 500ml", active: true, stock: 100, order: 1 },
  { id: 2, name: "Acai 1L", price: 25.00, description: "Acai puro 1 litro", active: true, stock: 100, order: 2 },
  { id: 3, name: "Acai 2L", price: 45.00, description: "Acai puro 2 litros", active: true, stock: 100, order: 3 },
]

// =============================================================================
// HOOK
// =============================================================================

export interface UsePublicProductsReturn {
  products: PublicProduct[]
  allProducts: PublicProduct[]  // Inclui inativos/esgotados (para referencia)
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function usePublicProducts(): UsePublicProductsReturn {
  const [allProducts, setAllProducts] = useState<PublicProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // -------------------------------------------------------------------------
  // LOAD
  // -------------------------------------------------------------------------
  
  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Tenta carregar de pk-products primeiro (novo formato)
      const savedProducts = await storage.get<PublicProduct[]>(STORAGE_KEYS.PRODUCTS)
      
      if (savedProducts && savedProducts.length > 0) {
        setAllProducts(savedProducts)
        setError(null)
        return
      }
      
      // Fallback: tenta carregar de pk-admin-config (formato antigo)
      const configData = await storage.get<{ products?: PublicProduct[] }>('pk-admin-config')
      
      if (configData?.products && configData.products.length > 0) {
        setAllProducts(configData.products)
        setError(null)
        return
      }
      
      // Fallback final: usa produtos default
      setAllProducts(DEFAULT_PRODUCTS)
      
    } catch (err) {
      console.error('[usePublicProducts] Erro ao carregar:', err)
      setError('Erro ao carregar produtos')
      setAllProducts(DEFAULT_PRODUCTS)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Carrega inicial
  useEffect(() => {
    loadProducts()
  }, [loadProducts])
  
  // Auto-refresh a cada 5 segundos para pegar atualizações do admin
  useEffect(() => {
    const interval = setInterval(loadProducts, 5000)
    return () => clearInterval(interval)
  }, [loadProducts])
  
  // -------------------------------------------------------------------------
  // DERIVED DATA
  // -------------------------------------------------------------------------
  
  // Filtra produtos: ativos, não esgotados, ordenados
  const products = allProducts
    .filter(p => p.active !== false)
    .filter(p => !p.outOfStock)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
  
  return {
    products,
    allProducts,
    isLoading,
    error,
    refresh: loadProducts,
  }
}
