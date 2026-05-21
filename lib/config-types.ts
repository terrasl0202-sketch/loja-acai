export interface Product {
  id: number
  name: string
  price: number
  description: string
  active: boolean
  stock: number
}

export interface BannerConfig {
  mainText: string
  secondaryText: string
  imageUrl: string
  promoActive: boolean
}

export interface StoreHours {
  isOpen: boolean
  openTime: string
  closeTime: string
  closedMessage: string
}

export interface PaymentConfig {
  minValueForAsaas: number
  pixManualEnabled: boolean
  pixAsaasEnabled: boolean
}

export interface WhatsAppConfig {
  number: string
  defaultMessage: string
}

export interface PixManualConfig {
  key: string
  keyFull: string
  receiverName: string
}

export interface SiteConfig {
  products: Product[]
  banner: BannerConfig
  storeHours: StoreHours
  payment: PaymentConfig
  whatsapp: WhatsAppConfig
  pixManual: PixManualConfig
}

export const defaultConfig: SiteConfig = {
  products: [
    {
      id: 1,
      name: "Açaí Tradicional",
      price: 15,
      description: "Açaí puro e cremoso",
      active: true,
      stock: 100,
    },
    {
      id: 2,
      name: "Açaí Ovomaltine",
      price: 15,
      description: "Açaí cremoso com Ovomaltine crocante",
      active: true,
      stock: 100,
    },
    {
      id: 3,
      name: "Mousse Maracujá",
      price: 6,
      description: "Mousse cremoso de maracujá",
      active: true,
      stock: 100,
    },
    {
      id: 4,
      name: "Mousse Morango",
      price: 6,
      description: "Mousse cremoso de morango",
      active: true,
      stock: 100,
    },
  ],
  banner: {
    mainText: "Os melhores açaís de garrafa",
    secondaryText: "da região!",
    imageUrl: "/acai-bowl.jpg",
    promoActive: false,
  },
  storeHours: {
    isOpen: true,
    openTime: "08:00",
    closeTime: "22:00",
    closedMessage: "Estamos fechados no momento. Volte em breve!",
  },
  payment: {
    minValueForAsaas: 15,
    pixManualEnabled: true,
    pixAsaasEnabled: true,
  },
  whatsapp: {
    number: "5511918505799",
    defaultMessage: "Olá! Gostaria de fazer um pedido.",
  },
  pixManual: {
    key: "11918505799",
    keyFull: "+5511918505799",
    receiverName: "Carina Karen da Silva",
  },
}
