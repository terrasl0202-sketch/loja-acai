// Constants da area do cliente/loja

export const CUSTOMER_SESSION_KEY = "pk-customer-session"
export const ORDER_STORAGE_KEY = "pk-order-in-progress"

export const PAYMENT_METHODS = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartao",
} as const

export const DELIVERY_TYPES = {
  entrega: "Entrega",
  retirada: "Retirada no local",
} as const

export const DEFAULT_FORM_DATA = {
  nome: "",
  telefone: "",
  endereco: "",
  numero: "",
  referencia: "",
  pagamento: "pix",
  observacao: "",
  localizacao: "",
  bairro: "",
} as const

export const PIX_CHECK_INTERVAL = 3000 // 3 segundos
export const PIX_COOLDOWN_DURATION = 5 * 60 * 1000 // 5 minutos
export const PIX_EXPIRATION_MINUTES = 15
export const TOAST_DURATION = 4000 // 4 segundos
export const ADD_TOAST_DURATION = 2000 // 2 segundos

export const ORDER_STATUS_LABELS = {
  pending: "Aguardando Pagamento",
  confirmed: "Pago",
  preparing: "Em Preparo",
  ready: "Pronto",
  delivering: "Saiu para Entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
} as const

export const ORDER_STATUS_COLORS = {
  pending: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-green-500/20 text-green-400",
  preparing: "bg-blue-500/20 text-blue-400",
  ready: "bg-purple-500/20 text-purple-400",
  delivering: "bg-orange-500/20 text-orange-400",
  delivered: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
} as const
