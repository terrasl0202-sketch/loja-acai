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

export interface PixManualConfig {
  key: string
  keyFull: string
  receiverName: string
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

export interface Order {
  id: string
  customerName: string
  customerPhone: string
  items: string
  total: number
  paymentMethod: string
  deliveryType: string
  address?: string
  status: "received" | "preparing" | "delivering" | "completed" | "cancelled"
  createdAt: string
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
}

export const defaultConfig: SiteConfig = {
  storeName: "P.K Gostosuras",
  products: [
    {
      id: 1,
      name: "Açaí Tradicional",
      price: 15,
      description: "Açaí puro e cremoso",
      active: true,
      stock: 100,
      outOfStock: false,
      order: 1,
    },
    {
      id: 2,
      name: "Açaí Ovomaltine",
      price: 15,
      description: "Açaí cremoso com Ovomaltine crocante",
      active: true,
      stock: 100,
      outOfStock: false,
      order: 2,
    },
    {
      id: 3,
      name: "Mousse Maracujá",
      price: 6,
      description: "Mousse cremoso de maracujá",
      active: true,
      stock: 100,
      outOfStock: false,
      order: 3,
    },
    {
      id: 4,
      name: "Mousse Morango",
      price: 6,
      description: "Mousse cremoso de morango",
      active: true,
      stock: 100,
      outOfStock: false,
      order: 4,
    },
  ],
  banner: {
    mainText: "Os melhores açaís de garrafa",
    secondaryText: "da região!",
    imageUrl: "/acai-bowl.jpg",
    promoActive: false,
    promoPrice: 0,
    promoText: "",
  },
  storeHours: {
    isOpen: true,
    manualControl: false,
    openTime: "08:00",
    closeTime: "22:00",
    closedMessage: "Estamos fechados no momento. Volte em breve!",
  },
  payment: {
    minValueForAsaas: 15,
    pixManualEnabled: true,
    pixAsaasEnabled: true,
    pixExpirationMinutes: 15,
  },
  whatsapp: {
    number: "5511918505799",
    defaultMessage: "Olá! Gostaria de fazer um pedido.",
    receiptMessage: "Envie o comprovante do PIX por aqui.",
    supportEnabled: true,
  },
  pixManual: {
    key: "11918505799",
    keyFull: "+5511918505799",
    receiverName: "Carina Karen da Silva",
    qrCodeUrl: "",
  },
  delivery: {
    enabled: true,
    defaultFee: 5,
    minimumOrder: 10,
    estimatedTime: "30-45 min",
    pickupEnabled: true,
    neighborhoodFees: [],
  },
  coupons: [],
}
