export interface Product {
  id: number
  name: string
  price: number
  description: string
  active: boolean
  stock: number
  outOfStock?: boolean
  order?: number
}

export interface BannerConfig {
  mainText: string
  secondaryText: string
  imageUrl: string
  promoActive: boolean
  promoPrice?: number
  promoText?: string
}

export interface StoreHours {
  isOpen: boolean
  manualControl: boolean
  openTime: string
  closeTime: string
  closedMessage: string
  abandonedOrderMinutes?: number
  autoArchiveDays?: number // 0 = nunca, 7, 15, 30 = dias para arquivar automaticamente
}

export interface PaymentConfig {
  minValueForAsaas: number
  pixManualEnabled: boolean
  pixAsaasEnabled: boolean
  pixExpirationMinutes: number
}

export interface WhatsAppConfig {
  number: string
  defaultMessage: string
  receiptMessage: string
  supportEnabled: boolean
}

export type PixKeyType = "telefone" | "cpf" | "cnpj" | "email" | "aleatoria"

export interface PixManualConfig {
  keyType: PixKeyType
  key: string
  keyFull: string
  receiverName: string
  city?: string
  qrCodeUrl?: string
}

export interface DeliveryConfig {
  enabled: boolean
  defaultFee: number
  minimumOrder: number
  estimatedTime: string
  pickupEnabled: boolean
  neighborhoodFees: NeighborhoodFee[]
}

export interface NeighborhoodFee {
  name: string
  fee: number
  active?: boolean
}

export interface Coupon {
  id: string
  code: string
  type: "percentage" | "fixed"
  value: number
  active: boolean
  minimumOrder: number
}

export interface Entregador {
  id: string
  nome: string
  whatsapp: string
  status: "ativo" | "inativo"
  disponibilidade: "disponivel" | "indisponivel"
  horarioInicio: string
  horarioFim: string
  observacao: string
  pin?: string
  token?: string
}

export interface OrderItem {
  productId: number
  productName: string
  quantity: number
  price: number
  subtotal: number
}

export interface Order {
  id: string
  orderCode?: string // Codigo publico do pedido (ex: PK1234)
  customerName: string
  customerPhone: string
  items: string
  itemsDetailed?: OrderItem[]
  total: number
  paymentMethod: string
  deliveryType: string
  address?: string
  neighborhood?: string
  reference?: string
  observation?: string
  status: "pending" | "confirmed" | "preparing" | "delivering" | "completed" | "cancelled"
  paymentStatus: "pending" | "confirmed" | "failed"
  createdAt: string
  confirmedAt?: string
  paidAt?: string
  // Campos para PIX automatico
  asaasPaymentId?: string
  asaasPixCode?: string
  asaasQrCodeUrl?: string
  // Campos para controle
  isPixAutomatic?: boolean
  manuallyConfirmed?: boolean
  confirmedAutomatically?: boolean
  archived?: boolean
  // Campos para entregador
  entregadorId?: string
  entregadorNome?: string
  entregadorWhatsapp?: string
  saiuParaEntregaEm?: string
  entregueEm?: string
  canceladoEm?: string
  motivoCancelamento?: string
  historicoEntrega?: { data: string; evento: string; observacao?: string }[]
  // Identificacao do cliente
  customerId?: string
}

// Sistema de Conta do Cliente
export interface Customer {
  id: string
  name: string
  phone: string
  pin: string // PIN de 4 digitos
  createdAt: string
  lastOrderAt?: string
  totalOrders: number
  totalSpent: number
  isVip: boolean // Cliente VIP (5+ pedidos)
  favorites: number[] // IDs dos produtos favoritos
  savedAddress?: {
    endereco: string
    numero: string
    bairro: string
    referencia: string
  }
}

export interface SiteConfig {
  storeName: string
  products: Product[]
  banner: BannerConfig
  storeHours: StoreHours
  payment: PaymentConfig
  whatsapp: WhatsAppConfig
  pixManual: PixManualConfig
  delivery: DeliveryConfig
  coupons: Coupon[]
  entregadores: Entregador[]
}

export const defaultConfig: SiteConfig = {
  storeName: "",
  products: [],
  banner: {
    mainText: "",
    secondaryText: "",
    imageUrl: "",
    promoActive: false,
    promoPrice: 0,
    promoText: "",
  },
  storeHours: {
    isOpen: false,
    manualControl: false,
    openTime: "08:00",
    closeTime: "22:00",
    closedMessage: "Carregando...",
    abandonedOrderMinutes: 15,
    autoArchiveDays: 0,
  },
  payment: {
    minValueForAsaas: 15,
    pixManualEnabled: false,
    pixAsaasEnabled: false,
    pixExpirationMinutes: 15,
  },
  whatsapp: {
    number: "",
    defaultMessage: "",
    receiptMessage: "",
    supportEnabled: false,
  },
  pixManual: {
    keyType: "telefone",
    key: "",
    keyFull: "",
    receiverName: "",
    city: "",
    qrCodeUrl: "",
  },
  delivery: {
    enabled: false,
    defaultFee: 0,
    minimumOrder: 0,
    estimatedTime: "",
    pickupEnabled: false,
    neighborhoodFees: [],
  },
  coupons: [],
  entregadores: [],
}
