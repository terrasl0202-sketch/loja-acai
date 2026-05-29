import type { TabType } from "../types"

// Status de pedidos
export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed", 
  PREPARING: "preparing",
  DELIVERING: "delivering",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const

// Status de pagamento
export const PAYMENT_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  FAILED: "failed",
} as const

// Formas de pagamento
export const PAYMENT_METHODS = {
  PIX_ASAAS: "PIX Asaas",
  PIX_MANUAL: "PIX Manual",
  PIX: "PIX",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartao",
} as const

// Abas do painel admin com configuracoes
export const ADMIN_TABS: Array<{
  id: TabType
  label: string
  icon: string
  category: "config" | "orders" | "reports"
}> = [
  // Configuracoes
  { id: "store", label: "Loja", icon: "Store", category: "config" },
  { id: "products", label: "Produtos", icon: "Package", category: "config" },
  { id: "banner", label: "Banner", icon: "ImageIcon", category: "config" },
  { id: "hours", label: "Horario", icon: "Clock", category: "config" },
  { id: "delivery", label: "Entrega", icon: "Truck", category: "config" },
  { id: "payment", label: "Pagamento", icon: "CreditCard", category: "config" },
  { id: "whatsapp", label: "WhatsApp", icon: "MessageCircle", category: "config" },
  { id: "coupons", label: "Cupons", icon: "Tag", category: "config" },
  { id: "entregadores", label: "Entregadores", icon: "Users2", category: "config" },
  { id: "customization", label: "Personalizacao", icon: "Palette", category: "config" },
  
  // Pedidos
  { id: "orders-pending", label: "Aguardando Pgto", icon: "Clock", category: "orders" },
  { id: "orders-paid", label: "Aguard. Preparo", icon: "CheckCircle2", category: "orders" },
  { id: "orders-preparing", label: "Preparando", icon: "ChefHat", category: "orders" },
  { id: "orders-delivering", label: "Em Entrega", icon: "Truck", category: "orders" },
  { id: "orders-completed", label: "Finalizados", icon: "PackageCheck", category: "orders" },
  { id: "orders-cancelled", label: "Cancelados", icon: "Ban", category: "orders" },
  { id: "orders-abandoned", label: "Abandonados", icon: "AlertCircle", category: "orders" },
  { id: "orders-archived", label: "Arquivados", icon: "FolderArchive", category: "orders" },
  
  // Relatorios
  { id: "reports", label: "Relatorios", icon: "BarChart3", category: "reports" },
]

// Tabs de configuracao
export const CONFIG_TABS = ADMIN_TABS.filter(t => t.category === "config")

// Tabs de pedidos
export const ORDER_TABS = ADMIN_TABS.filter(t => t.category === "orders")

// Filtros de data disponiveis
export const DATE_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
] as const

// Tempo padrao para considerar pedido abandonado (minutos)
export const DEFAULT_ABANDONED_MINUTES = 15

// Tempo padrao de expiracao do PIX (minutos)
export const DEFAULT_PIX_EXPIRATION_MINUTES = 15

// Valor minimo padrao para PIX Asaas
export const DEFAULT_MIN_VALUE_FOR_ASAAS = 15

// Intervalo de polling para novos pedidos (ms)
export const ORDERS_POLLING_INTERVAL = 30000

// Duracao da sessao admin (ms) - 1 hora
export const SESSION_DURATION = 60 * 60 * 1000

// Duracao do toast (ms)
export const TOAST_DURATION = 4000

// Frequencias do som de notificacao
export const NOTIFICATION_FREQUENCIES_STRONG = [523, 659, 784, 880, 784, 659, 784, 880, 1047]
export const NOTIFICATION_FREQUENCIES_WEAK = [700, 900]

// Padroes de vibracao
export const VIBRATION_PATTERN = [200, 100, 200, 100, 400, 100, 200, 100, 200]
