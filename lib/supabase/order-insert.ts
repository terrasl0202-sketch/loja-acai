/**
 * Helper SERVER-SIDE para persistir pedidos no Supabase.
 *
 * Usado pelo fluxo de pagamento PIX (create-pix) para garantir que o pedido
 * seja salvo no banco ANTES de o QR Code ser exibido ao cliente.
 *
 * Usa a service role key (mesmo cliente do /api/orders) e respeita a mesma
 * whitelist de colunas reais da tabela orders, sempre gravando store_id.
 *
 * NAO altera regras de preco/cupom/entrega: apenas persiste os valores ja
 * calculados e recebidos do checkout.
 */

import { createClient } from '@supabase/supabase-js'

// Mesma whitelist de colunas reais usada no POST /api/orders
const ALLOWED_COLUMNS = [
  'order_code',
  'customer_name',
  'customer_phone',
  'address',
  'neighborhood',
  'payment_method',
  'items',
  'total',
  'status',
  'payment_status',
  'created_at',
  'asaas_payment_id',
  'cashback_used',
  'points_reward_used',
  'store_id',
] as const

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase nao configurado (URL ou SERVICE_ROLE_KEY ausente)')
  }
  return createClient(url, key)
}

export interface OrderInsertInput {
  orderCode: string
  customerName: string
  customerPhone: string
  address?: string | null
  neighborhood?: string | null
  paymentMethod?: string
  itemsDetailed?: unknown[]
  total: number
  status?: string
  paymentStatus?: string
  asaasPaymentId?: string | null
  cashbackUsed?: number
  pointsRewardUsed?: number
  storeId: number
}

export interface OrderInsertResult {
  id: number | string
  duplicate: boolean
}

/**
 * Insere o pedido no Supabase se ainda nao existir (idempotente por order_code).
 * Lanca erro se o INSERT falhar (para o chamador abortar o fluxo de PIX).
 */
export async function insertOrderIfNotExists(
  input: OrderInsertInput
): Promise<OrderInsertResult> {
  const supabase = getServiceClient()

  // Idempotencia: se ja existe um pedido com este order_code, reutiliza.
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('order_code', input.orderCode)
    .maybeSingle()

  if (existing) {
    return { id: existing.id, duplicate: true }
  }

  const dbOrder: Record<string, unknown> = {
    order_code: input.orderCode,
    customer_name: input.customerName || 'Cliente',
    customer_phone: input.customerPhone || '',
    address: input.address ?? null,
    neighborhood: input.neighborhood ?? null,
    payment_method: input.paymentMethod || 'PIX Asaas',
    items: input.itemsDetailed || [],
    total: input.total || 0,
    status: input.status || 'pending',
    payment_status: input.paymentStatus || 'pending',
    created_at: new Date().toISOString(),
    asaas_payment_id: input.asaasPaymentId ?? null,
    cashback_used: input.cashbackUsed || 0,
    points_reward_used: input.pointsRewardUsed || 0,
    store_id: input.storeId,
  }

  // Filtrar apenas colunas permitidas
  const cleanOrder: Record<string, unknown> = {}
  for (const key of ALLOWED_COLUMNS) {
    if (dbOrder[key] !== undefined) {
      cleanOrder[key] = dbOrder[key]
    }
  }

  const { data, error } = await supabase
    .from('orders')
    .insert(cleanOrder)
    .select('id')
    .single()

  if (error) {
    throw new Error(`Falha ao salvar pedido no banco: ${error.message}`)
  }

  return { id: data.id, duplicate: false }
}
