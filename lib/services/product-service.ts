/**
 * @module Product Service
 * @description Service para gerenciar produtos e categorias
 * 
 * @architecture
 * - Usa StorageAdapter para persistencia
 * - CRUD de produtos e categorias
 * - Gerenciamento de disponibilidade
 * 
 * @example
 * import { productService } from '@/lib/services'
 * 
 * // Listar produtos
 * const products = await productService.getAll()
 * 
 * // Buscar por categoria
 * const acai = await productService.getByCategory('acai')
 * 
 * // Atualizar disponibilidade
 * await productService.setAvailability(productId, false)
 */

import { storage } from '@/lib/storage'
import type { Product, Category } from '@/types'
import { STORAGE_KEYS } from '@/config/storage.keys'

// =============================================================================
// TYPES
// =============================================================================

type ProductListener = (products: Product[]) => void

// =============================================================================
// PRODUCT SERVICE
// =============================================================================

class ProductService {
  private listeners: Set<ProductListener> = new Set()
  private cachedProducts: Product[] | null = null
  
  // ---------------------------------------------------------------------------
  // PRODUCT CRUD
  // ---------------------------------------------------------------------------
  
  /**
   * Lista todos os produtos
   */
  async getAll(): Promise<Product[]> {
    try {
      const products = await storage.get<Product[]>(STORAGE_KEYS.PRODUCTS) || []
      this.cachedProducts = products
      return products
    } catch (error) {
      console.error('[ProductService] Erro ao listar produtos:', error)
      return []
    }
  }
  
  /**
   * Lista produtos disponiveis
   */
  async getAvailable(): Promise<Product[]> {
    const products = await this.getAll()
    return products.filter(p => p.isAvailable)
  }
  
  /**
   * Busca produto por ID
   */
  async getById(id: string): Promise<Product | null> {
    const products = await this.getAll()
    return products.find(p => p.id === id) || null
  }
  
  /**
   * Busca produtos por categoria
   */
  async getByCategory(category: string): Promise<Product[]> {
    const products = await this.getAll()
    return products.filter(p => 
      p.category?.toLowerCase() === category.toLowerCase() ||
      p.categoryId === category
    )
  }
  
  /**
   * Busca produtos populares
   */
  async getPopular(): Promise<Product[]> {
    const products = await this.getAll()
    return products.filter(p => p.isPopular && p.isAvailable)
  }
  
  /**
   * Busca produtos em destaque
   */
  async getFeatured(): Promise<Product[]> {
    const products = await this.getAll()
    return products.filter(p => p.isFeatured && p.isAvailable)
  }
  
  /**
   * Cria produto
   */
  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    try {
      const products = await this.getAll()
      
      const newProduct: Product = {
        ...data,
        id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const updated = [...products, newProduct]
      await storage.set(STORAGE_KEYS.PRODUCTS, updated)
      
      this.cachedProducts = updated
      this.notifyListeners(updated)
      
      return newProduct
    } catch (error) {
      console.error('[ProductService] Erro ao criar produto:', error)
      throw error
    }
  }
  
  /**
   * Atualiza produto
   */
  async update(id: string, data: Partial<Product>): Promise<Product | null> {
    try {
      const products = await this.getAll()
      const index = products.findIndex(p => p.id === id)
      
      if (index === -1) return null
      
      const updated: Product = {
        ...products[index],
        ...data,
        updatedAt: new Date().toISOString()
      }
      
      products[index] = updated
      await storage.set(STORAGE_KEYS.PRODUCTS, products)
      
      this.cachedProducts = products
      this.notifyListeners(products)
      
      return updated
    } catch (error) {
      console.error('[ProductService] Erro ao atualizar produto:', error)
      throw error
    }
  }
  
  /**
   * Remove produto
   */
  async delete(id: string): Promise<boolean> {
    try {
      const products = await this.getAll()
      const filtered = products.filter(p => p.id !== id)
      
      if (filtered.length === products.length) return false
      
      await storage.set(STORAGE_KEYS.PRODUCTS, filtered)
      
      this.cachedProducts = filtered
      this.notifyListeners(filtered)
      
      return true
    } catch (error) {
      console.error('[ProductService] Erro ao deletar produto:', error)
      return false
    }
  }
  
  // ---------------------------------------------------------------------------
  // AVAILABILITY
  // ---------------------------------------------------------------------------
  
  /**
   * Define disponibilidade do produto
   */
  async setAvailability(id: string, isAvailable: boolean): Promise<Product | null> {
    return this.update(id, { isAvailable })
  }
  
  /**
   * Marca produto como popular
   */
  async setPopular(id: string, isPopular: boolean): Promise<Product | null> {
    return this.update(id, { isPopular })
  }
  
  // ---------------------------------------------------------------------------
  // BULK OPERATIONS
  // ---------------------------------------------------------------------------
  
  /**
   * Salva todos os produtos (bulk update)
   */
  async saveAll(products: Product[]): Promise<void> {
    await storage.set(STORAGE_KEYS.PRODUCTS, products)
    this.cachedProducts = products
    this.notifyListeners(products)
  }
  
  /**
   * Importa produtos (merge)
   */
  async import(newProducts: Product[], replace = false): Promise<void> {
    if (replace) {
      await this.saveAll(newProducts)
      return
    }
    
    const existing = await this.getAll()
    const merged = [...existing]
    
    for (const product of newProducts) {
      const index = merged.findIndex(p => p.id === product.id)
      if (index >= 0) {
        merged[index] = { ...merged[index], ...product }
      } else {
        merged.push(product)
      }
    }
    
    await this.saveAll(merged)
  }
  
  // ---------------------------------------------------------------------------
  // CATEGORIES
  // ---------------------------------------------------------------------------
  
  /**
   * Lista categorias unicas dos produtos
   */
  async getCategories(): Promise<string[]> {
    const products = await this.getAll()
    const categories = new Set(
      products
        .map(p => p.category)
        .filter((c): c is string => !!c)
    )
    return Array.from(categories)
  }
  
  /**
   * Lista categorias com contagem
   */
  async getCategoriesWithCount(): Promise<Array<{ name: string; count: number }>> {
    const products = await this.getAll()
    const counts = new Map<string, number>()
    
    products.forEach(p => {
      const cat = p.category || 'Outros'
      counts.set(cat, (counts.get(cat) || 0) + 1)
    })
    
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }
  
  // ---------------------------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------------------------
  
  /**
   * Busca produtos por termo
   */
  async search(query: string): Promise<Product[]> {
    const products = await this.getAll()
    const term = query.toLowerCase()
    
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term) ||
      p.tags?.some(t => t.toLowerCase().includes(term))
    )
  }
  
  // ---------------------------------------------------------------------------
  // SUBSCRIPTIONS
  // ---------------------------------------------------------------------------
  
  subscribe(listener: ProductListener): () => void {
    this.listeners.add(listener)
    
    if (this.cachedProducts) {
      listener(this.cachedProducts)
    } else {
      this.getAll().then(products => listener(products))
    }
    
    return () => this.listeners.delete(listener)
  }
  
  private notifyListeners(products: Product[]): void {
    this.listeners.forEach(listener => {
      try {
        listener(products)
      } catch (error) {
        console.error('[ProductService] Erro em listener:', error)
      }
    })
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const productService = new ProductService()
