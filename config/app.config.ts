/**
 * @module App Config
 * @description Configuracoes globais da aplicacao
 * 
 * @architecture
 * - Valores constantes da aplicacao
 * - NAO contem dados de loja especifica
 * - Dados de loja vem do Admin/StoreService
 * 
 * @example
 * import { APP_CONFIG } from '@/config/app.config'
 * 
 * // Verificar limite
 * if (order.total < APP_CONFIG.limits.minOrderValue) { ... }
 */

// =============================================================================
// APP METADATA
// =============================================================================

export const APP_CONFIG = {
  /**
   * Nome do sistema (NAO da loja)
   */
  name: 'StoreFront',
  version: '1.0.0',
  
  /**
   * Ambiente
   */
  env: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
  
  /**
   * URLs base
   */
  urls: {
    app: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    api: process.env.NEXT_PUBLIC_API_URL || '/api',
  },
  
  /**
   * Limites do sistema
   */
  limits: {
    // Pedidos
    maxOrderItems: 50,
    maxAddonsPerItem: 10,
    
    // Produtos
    maxProductNameLength: 100,
    maxProductDescriptionLength: 500,
    maxProductImages: 10,
    
    // Clientes
    maxAddressesPerCustomer: 5,
    
    // Bairros
    maxNeighborhoods: 100,
    
    // PIX
    pixExpirationMinutes: 30,
  },
  
  /**
   * Tempos (em ms)
   */
  timing: {
    // Polling intervals
    storeStatusPoll: 2000,      // 2s
    ordersPoll: 5000,           // 5s
    
    // Debounce
    searchDebounce: 300,
    saveDebounce: 500,
    
    // Toast duration
    toastDuration: 3000,
    
    // Session
    sessionTimeout: 24 * 60 * 60 * 1000, // 24h
  },
  
  /**
   * Formatos
   */
  formats: {
    currency: 'BRL',
    locale: 'pt-BR',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'dd/MM/yyyy HH:mm',
  },
  
  /**
   * Feature flags
   */
  features: {
    enablePix: true,
    enableCard: false,
    enableCash: true,
    enableDelivery: true,
    enablePickup: true,
    enableTracking: true,
    enableCustomerAuth: true,
    enableNotifications: true,
  },
} as const

// =============================================================================
// DEFAULTS (valores padrao quando nao configurado)
// =============================================================================

export const DEFAULTS = {
  /**
   * Horarios padrao
   */
  openTime: '14:00',
  closeTime: '22:00',
  
  /**
   * Taxas padrao
   */
  deliveryFee: 5.00,
  minOrderValue: 0,
  
  /**
   * Tempo de entrega padrao (minutos)
   */
  deliveryTimeMin: 30,
  deliveryTimeMax: 50,
  
  /**
   * PIX padrao
   */
  pixExpirationMinutes: 30,
  
  /**
   * Paginacao padrao
   */
  pageSize: 20,
  
  /**
   * Imagem placeholder
   */
  productImage: '/placeholder-product.jpg',
  storeImage: '/placeholder-store.jpg',
} as const

// =============================================================================
// ROUTES
// =============================================================================

export const ROUTES = {
  // Public
  home: '/',
  menu: '/cardapio',
  cart: '/carrinho',
  checkout: '/checkout',
  tracking: '/acompanhar',
  
  // Customer
  account: '/conta',
  orders: '/conta/pedidos',
  addresses: '/conta/enderecos',
  
  // Admin
  admin: '/admin',
  adminDashboard: '/admin/dashboard',
  adminOrders: '/admin/pedidos',
  adminProducts: '/admin/produtos',
  adminSettings: '/admin/configuracoes',
  adminCustomers: '/admin/clientes',
  adminDelivery: '/admin/entregas',
  adminReports: '/admin/relatorios',
  
  // Delivery
  delivery: '/entregador',
  deliveryLogin: '/entregador/login',
  
  // API
  api: {
    orders: '/api/orders',
    products: '/api/products',
    config: '/api/config',
    pix: '/api/pix',
    webhook: '/api/webhook',
  },
} as const

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type AppConfig = typeof APP_CONFIG
export type Defaults = typeof DEFAULTS
export type Routes = typeof ROUTES
