// Types da area do cliente/loja
import { type Coupon, type Customer } from "@/lib/config-types"

export type PaymentStatus = "idle" | "loading" | "awaiting" | "confirmed" | "error" | "manual"
export type DeliveryType = "entrega" | "retirada"

export interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

export interface FormData {
  nome: string
  telefone: string
  endereco: string
  numero: string
  referencia: string
  pagamento: string
  observacao: string
  localizacao: string
  bairro: string
}

export interface OrderSnapshot {
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  couponCode: string | null
  bairro: string
  deliveryType: DeliveryType
  customerName: string
  customerPhone: string
  address: string
  reference: string
  orderId: string
  createdAt: string
  expiresAt: string
}

export interface PixData {
  paymentId: string
  pixQrCode: string
  pixCopyPaste: string
  value: number
  expiresAt?: string
}

export interface CustomerOrder {
  id: string
  items: string
  itemsDetailed?: {
    productId: number
    productName: string
    quantity: number
    price: number
  }[]
  total: number
  status: string
  paymentStatus: string
  paymentMethod?: string
  createdAt: string
  deliveryType: string
  address?: string
  neighborhood?: string
}

export interface SavedOrder {
  quantities: Record<string, number>
  formData: FormData
  deliveryType: DeliveryType
  showCheckout: boolean
  paymentStatus: PaymentStatus
  pixData: PixData | null
  orderSnapshot: OrderSnapshot | null
  orderId: string
  pixTimeLeft: number
  pixExpired: boolean
  pixCooldownEnd: number | null
  appliedCoupon: Coupon | null
  couponCode: string
  savedAt: number
}

// Re-export types from config
export type { Coupon, Customer }
