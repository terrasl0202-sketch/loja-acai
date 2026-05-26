/**
 * @module Payment Types
 * @description Tipos relacionados a pagamentos e PIX
 * 
 * @architecture
 * - PaymentConfig: Configuracoes de pagamento
 * - PixConfig: Configuracoes do PIX
 * - Transaction: Transacao de pagamento
 */

// =============================================================================
// PAYMENT CONFIG
// =============================================================================

export interface PaymentConfig {
  // Metodos habilitados
  pixEnabled: boolean
  cardEnabled: boolean
  cashEnabled: boolean
  
  // PIX
  pix?: PixConfig
  
  // Cartao (gateway)
  card?: CardConfig
  
  // Dinheiro
  cash?: CashConfig
}

// =============================================================================
// PIX CONFIG
// =============================================================================

export interface PixConfig {
  // Tipo de chave
  keyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
  key: string
  
  // Beneficiario
  beneficiaryName: string
  beneficiaryCity?: string
  
  // Gateway (Asaas, etc)
  useGateway: boolean
  gatewayProvider?: 'asaas' | 'mercadopago' | 'pagarme'
  gatewayApiKey?: string
  gatewayWebhookSecret?: string
  
  // QR Code
  qrCodeEnabled: boolean
  
  // Mensagem
  defaultMessage?: string
}

// =============================================================================
// CARD CONFIG
// =============================================================================

export interface CardConfig {
  provider: 'stripe' | 'mercadopago' | 'pagarme'
  publicKey: string
  // secretKey nunca no frontend
  
  // Bandeiras aceitas
  acceptedBrands: string[]
  
  // Parcelamento
  installmentsEnabled: boolean
  maxInstallments: number
  minInstallmentValue: number
}

// =============================================================================
// CASH CONFIG
// =============================================================================

export interface CashConfig {
  enabled: boolean
  requireChangeAmount: boolean    // Exigir informar troco?
  maxChangeAmount?: number        // Troco maximo aceito
}

// =============================================================================
// TRANSACTION
// =============================================================================

export interface Transaction {
  id: string
  orderId: string
  storeId?: string
  
  // Valores
  amount: number
  currency: string
  
  // Metodo
  method: 'pix' | 'card' | 'cash'
  
  // Status
  status: TransactionStatus
  
  // Gateway
  gatewayId?: string
  gatewayStatus?: string
  gatewayResponse?: Record<string, unknown>
  
  // PIX especifico
  pixKey?: string
  pixQrCode?: string
  pixCopyPaste?: string
  pixExpiresAt?: string
  
  // Cartao especifico
  cardLastFour?: string
  cardBrand?: string
  installments?: number
  
  // Timestamps
  createdAt: string
  paidAt?: string
  failedAt?: string
  refundedAt?: string
  
  // Erros
  errorCode?: string
  errorMessage?: string
}

export type TransactionStatus = 
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'expired'

// =============================================================================
// PIX PAYMENT
// =============================================================================

export interface PixPayment {
  orderId: string
  amount: number
  
  // Dados para pagamento
  qrCode: string
  qrCodeBase64?: string
  copyPaste: string
  
  // Validade
  expiresAt: string
  isExpired: boolean
  
  // Status
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
  paidAt?: string
  
  // Gateway
  transactionId?: string
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Formata valor para moeda brasileira
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Verifica se PIX expirou
 */
export function isPixExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

/**
 * Calcula tempo restante para expiracao
 */
export function getPixTimeRemaining(expiresAt: string): {
  minutes: number
  seconds: number
  isExpired: boolean
} {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  
  if (diff <= 0) {
    return { minutes: 0, seconds: 0, isExpired: true }
  }
  
  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  
  return { minutes, seconds, isExpired: false }
}

/**
 * Mascara chave PIX para exibicao
 */
export function maskPixKey(key: string, type: PixConfig['keyType']): string {
  switch (type) {
    case 'cpf':
      return key.replace(/(\d{3})\d{6}(\d{2})/, '$1.***.***-$2')
    case 'email':
      const [user, domain] = key.split('@')
      return `${user.slice(0, 2)}***@${domain}`
    case 'phone':
      return key.replace(/(\d{2})\d{5}(\d{4})/, '($1) *****-$2')
    default:
      return key.slice(0, 8) + '...'
  }
}
