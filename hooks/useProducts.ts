/**
 * @module useProducts Hook
 * @description Hook para gerenciar produtos
 * 
 * @architecture
 * - Usa productService internamente
 * - Gerencia lista e categorias
 * - Auto-atualiza quando produtos mudam
 * 
 * @example
 * const { products, categories, getByCategory, search } = useProducts()
 * 
 * // Filtrar por categoria
 * const acaiProducts = getByCategory('Acai')
 * 
 * // Buscar
 * const results = search('creme')
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { productService } from '@/lib/services'
import type { Product } from '@/types'

// =============================================================================
// HOOK
// =============================================================================

export interface UseProductsOptions {
  onlyAvailable?: boolean
}

export interface UseProductsReturn {
  products: Product[]
  available: Product[]
  popular: Product[]
  featured: Product[]
  categories: string[]
  isLoading: boolean
  error: string | null
  
  // Actions
  getByCategory: (category: string) => Product[]
  search: (query: string) => Product[]
  setAvailability: (id: string, available: boolean) => Promise<void>
  refresh: () => Promise<void>
  
  // Helpers
  getById: (id: string) => Product | undefined
  getCategoriesWithCount: () => Array<{ name: string; count: number }>
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const { onlyAvailable = false } = options
  
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Carrega produtos
  const loadProducts = useCallback(async () => {
    try {
      const data = onlyAvailable 
        ? await productService.getAvailable()
        : await productService.getAll()
      setProducts(data)
      setError(null)
    } catch (err) {
      setError('Erro ao carregar produtos')
    } finally {
      setIsLoading(false)
    }
  }, [onlyAvailable])
  
  // Carrega inicial e subscribe
  useEffect(() => {
    let mounted = true
    
    loadProducts()
    
    const unsubscribe = productService.subscribe((newProducts) => {
      if (mounted) {
        if (onlyAvailable) {
          setProducts(newProducts.filter(p => p.isAvailable))
        } else {
          setProducts(newProducts)
        }
      }
    })
    
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [onlyAvailable, loadProducts])
  
  // Listas derivadas
  const available = useMemo(() => 
    products.filter(p => p.isAvailable), [products])
  
  const popular = useMemo(() => 
    products.filter(p => p.isPopular && p.isAvailable), [products])
  
  const featured = useMemo(() => 
    products.filter(p => p.isFeatured && p.isAvailable), [products])
  
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean))
    return Array.from(cats) as string[]
  }, [products])
  
  // Actions
  const getByCategory = useCallback((category: string) => {
    return products.filter(p => 
      p.category?.toLowerCase() === category.toLowerCase()
    )
  }, [products])
  
  const search = useCallback((query: string) => {
    const term = query.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    )
  }, [products])
  
  const setAvailability = useCallback(async (id: string, available: boolean) => {
    try {
      await productService.setAvailability(id, available)
    } catch (err) {
      setError('Erro ao atualizar disponibilidade')
      throw err
    }
  }, [])
  
  const getById = useCallback((id: string) => {
    return products.find(p => p.id === id)
  }, [products])
  
  const getCategoriesWithCount = useCallback(() => {
    const counts = new Map<string, number>()
    
    products.forEach(p => {
      const cat = p.category || 'Outros'
      counts.set(cat, (counts.get(cat) || 0) + 1)
    })
    
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [products])
  
  return {
    products,
    available,
    popular,
    featured,
    categories,
    isLoading,
    error,
    getByCategory,
    search,
    setAvailability,
    refresh: loadProducts,
    getById,
    getCategoriesWithCount,
  }
}
