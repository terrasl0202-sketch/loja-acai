// Re-exportar tipos do config-types para centralizacao
export type { 
  SiteConfig, 
  Product, 
  Coupon, 
  Order, 
  NeighborhoodFee, 
  Entregador 
} from "@/lib/config-types"

// Tipos especificos do Admin
// NOTA: "reports" foi removido - Dashboard é a unica fonte de metricas
export type TabType = 
  | "dashboard"
  | "store" 
  | "products" 
  | "categories"
  | "banner" 
  | "hours" 
  | "payment" 
  | "whatsapp" 
  | "delivery" 
  | "coupons" 
  | "entregadores" 
  | "customization"
  | "backup"
  | "premium"
  | "orders-pending" 
  | "orders-paid" 
  | "orders-preparing" 
  | "orders-delivering" 
  | "orders-completed" 
  | "orders-cancelled" 
  | "orders-abandoned" 
  | "orders-archived"

export type DateFilterType = "today" | "yesterday" | "week" | "month" | "all"

export interface ReportStats {
  totalOrders: number
  totalRevenue: number
  confirmedOrders: Order[]
  pixAutomatic: Order[]
  pixManual: Order[]
  dinheiro: Order[]
  cartao: Order[]
  historicalPixAuto: number
  historicalPixManual: number
  historicalDinheiro: number
  historicalCartao: number
  historicalRevenue: number
  historicalCount: number
  confirmedRevenue: number
  pendingRevenue: number
}

export interface FinancialHistoryItem {
  id: string
  total: number
  paymentMethod: string
  createdAt: string
  confirmedAt?: string
  deletedAt: string
}

export interface TopProduct {
  name: string
  quantity: number
  revenue: number
}

export interface TopCustomer {
  name: string
  phone: string
  orders: number
  revenue: number
  lastOrder: string
}

// Import Order type for ReportStats interface
import type { Order } from "@/lib/config-types"
