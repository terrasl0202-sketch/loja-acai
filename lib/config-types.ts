export interface Product {
  id: number
  name: string
  price: number
  description: string
  active: boolean
  stock: number
  outOfStock?: boolean
  order?: number
  displayOrder?: number
  categoryId?: number | null
  // Campos de badge
  badgeEnabled?: boolean
  badgeText?: string
  badgeType?: string
  badgeColor?: string
  // Campos de serving
  servingText?: string
  showServingText?: boolean
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

// Nova interface para chave PIX cadastrada na carteira
export interface PixManualKey {
  id: string
  alias: string // Apelido da chave: "Pix do Ailton", "Conta Mercado Pago"
  keyType: PixKeyType
  keyValue: string // Valor original da chave
  receiverName: string // Nome do recebedor desta chave
  city: string // Cidade desta chave
  isActive: boolean // Apenas uma pode estar ativa
  createdAt?: string
  updatedAt?: string
}

// Interface antiga mantida para compatibilidade (sera preenchida pela chave ativa)
export interface PixManualConfig {
  keyType: PixKeyType
  key: string
  keyFull: string
  receiverName: string
  city?: string
  qrCodeUrl?: string
  // Novos campos da carteira
  activeKey?: PixManualKey | null
  alias?: string
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

// ============================================
// PERSONALIZACAO PREMIUM (WHITE LABEL)
// ============================================

export type ThemeMode = "light" | "dark" | "auto"
export type LayoutType = "classic" | "modern" | "premium" | "minimal"
export type BannerHeight = "small" | "medium" | "large"

export interface CustomizationColors {
  primary: string
  secondary: string
  accent: string
  background: string
  foreground: string
  card: string
  muted: string
  border: string
}

export interface CustomizationIdentity {
  storeName: string
  subtitle: string
  slogan: string
  logoUrl: string
  faviconUrl: string
  coverImageUrl: string
}

export interface CustomizationTheme {
  mode: ThemeMode
  layoutType: LayoutType
  borderRadius: number
  cardsShadow: boolean
  bannerHeight: BannerHeight
  activeTemplateId?: string
}

export interface CustomizationElements {
  showBestsellerBadge: boolean
  showPromoBadge: boolean
  showNewBadge: boolean
  showReviews: boolean
  showCategories: boolean
  showDescriptions: boolean
  showPromoBanner: boolean
  showBestsellersSection: boolean
  showFeaturedSection: boolean
  promoMessage: string
}

export interface CustomizationSocial {
  instagram: string
  facebook: string
  tiktok: string
  whatsapp: string
  address: string
  deliveryPolicy: string
  footerText: string
  whatsappMessage?: string
}

export interface CustomizationGateways {
  mercadopagoEnabled: boolean
  pagbankEnabled: boolean
  stripeEnabled: boolean
}

export interface HeroBadge {
  text: string
  icon: string
  enabled: boolean
}

export interface CustomizationHero {
  title: string
  subtitle: string
  badge1: HeroBadge
  badge2: HeroBadge
  badge3: HeroBadge
}

export interface StoreCustomization {
  identity: CustomizationIdentity
  colors: CustomizationColors
  theme: CustomizationTheme
  elements: CustomizationElements
  social: CustomizationSocial
  gateways: CustomizationGateways
  hero?: CustomizationHero
}

export const defaultCustomization: StoreCustomization = {
  identity: {
    storeName: "",
    subtitle: "",
    slogan: "",
    logoUrl: "",
    faviconUrl: "",
    coverImageUrl: "",
  },
  colors: {
    primary: "#a855f7",
    secondary: "#6366f1",
    accent: "#f59e0b",
    background: "#0a0a0a",
    foreground: "#fafafa",
    card: "#171717",
    muted: "#737373",
    border: "#262626",
  },
  theme: {
    mode: "dark",
    layoutType: "premium",
    borderRadius: 16,
    cardsShadow: true,
    bannerHeight: "medium",
    activeTemplateId: undefined,
  },
  elements: {
    showBestsellerBadge: true,
    showPromoBadge: true,
    showNewBadge: true,
    showReviews: true,
    showCategories: true,
    showDescriptions: true,
    showPromoBanner: true,
    showBestsellersSection: true,
    showFeaturedSection: true,
    promoMessage: "",
  },
  social: {
    instagram: "",
    facebook: "",
    tiktok: "",
    whatsapp: "",
    address: "",
    deliveryPolicy: "",
    footerText: "",
    whatsappMessage: "",
  },
  gateways: {
    mercadopagoEnabled: false,
    pagbankEnabled: false,
    stripeEnabled: false,
  },
  hero: {
    title: "",
    subtitle: "",
    badge1: { text: "30-45 min", icon: "clock", enabled: true },
    badge2: { text: "Geladinho", icon: "snowflake", enabled: true },
    badge3: { text: "Premium", icon: "award", enabled: true },
  },
}

export interface Coupon {
  id: string
  code: string
  type: "percentage" | "fixed" | "free_shipping" | "shipping_discount"
  value: number
  active: boolean
  minimumOrder: number
  // Campos para desconto no frete
  shippingDiscountType?: "fixed" | "percentage"
  shippingDiscountValue?: number
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
  subtitle?: string
  slogan?: string
  instagram?: string
  address?: string
  products: Product[]
  banner: BannerConfig
  storeHours: StoreHours
  payment: PaymentConfig
  whatsapp: WhatsAppConfig
  pixManual: PixManualConfig
  delivery: DeliveryConfig
  coupons: Coupon[]
  entregadores: Entregador[]
  customization?: StoreCustomization
}

export const defaultConfig: SiteConfig = {
  storeName: "",
  subtitle: "",
  slogan: "",
  instagram: "",
  address: "",
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
  customization: defaultCustomization,
}
