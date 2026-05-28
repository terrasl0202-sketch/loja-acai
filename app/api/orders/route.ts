import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from "next/server"
import { type Order } from "@/lib/config-types"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "PK1040CAH"

// Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase nao configurado')
  return createClient(url, key)
}

// Evitar cache
export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
}

// ============ MAPPERS FRONTEND <-> DB ============

interface DbOrder {
  id: string
  order_code: string | null
  customer_name: string
  customer_phone: string
  customer_address: string | null
  customer_number: string | null
  customer_reference: string | null
  neighborhood: string | null
  delivery_type: string
  payment_method: string
  items: unknown
  items_text: string | null
  items_detailed: unknown
  subtotal: number
  delivery_fee: number
  discount: number
  total: number
  status: string
  payment_status: string
  is_pix_automatic: boolean
  manually_confirmed: boolean
  confirmed_automatically: boolean
  entregador_id: string | null
  entregador_nome: string | null
  entregador_whatsapp: string | null
  saiu_para_entrega_em: string | null
  entregue_em: string | null
  cancelado_em: string | null
  motivo_cancelamento: string | null
  historico_entrega: unknown
  customer_id: string | null
  confirmed_at: string | null
  paid_at: string | null
  observation: string | null
  asaas_payment_id: string | null
  asaas_pix_code: string | null
  asaas_qr_code_url: string | null
  notes: string | null
  pix_id: string | null
  pix_status: string | null
  created_at: string
  updated_at: string
}

function dbToFrontend(db: DbOrder): Order {
  return {
    id: db.id,
    orderCode: db.order_code || db.id, // Codigo publico
    customerName: db.customer_name,
    customerPhone: db.customer_phone,
    customerId: db.customer_id || undefined,
    items: db.items_text || JSON.stringify(db.items || []),
    itemsDetailed: Array.isArray(db.items_detailed) ? db.items_detailed as Order['itemsDetailed'] : [],
    total: Number(db.total),
    paymentMethod: db.payment_method,
    deliveryType: db.delivery_type,
    address: db.customer_address || undefined,
    neighborhood: db.neighborhood || undefined,
    reference: db.customer_reference || undefined,
    observation: db.observation || undefined,
    status: db.status as Order['status'],
    paymentStatus: (db.payment_status || 'pending') as Order['paymentStatus'],
    createdAt: db.created_at,
    confirmedAt: db.confirmed_at || undefined,
    paidAt: db.paid_at || undefined,
    asaasPaymentId: db.asaas_payment_id || undefined,
    asaasPixCode: db.asaas_pix_code || undefined,
    asaasQrCodeUrl: db.asaas_qr_code_url || undefined,
  isPixAutomatic: db.is_pix_automatic,
  manuallyConfirmed: db.manually_confirmed,
  confirmedAutomatically: db.confirmed_automatically,
  entregadorId: db.entregador_id || undefined,
    entregadorNome: db.entregador_nome || undefined,
    entregadorWhatsapp: db.entregador_whatsapp || undefined,
    saiuParaEntregaEm: db.saiu_para_entrega_em || undefined,
    entregueEm: db.entregue_em || undefined,
    canceladoEm: db.cancelado_em || undefined,
    motivoCancelamento: db.motivo_cancelamento || undefined,
    historicoEntrega: Array.isArray(db.historico_entrega) ? db.historico_entrega as Order['historicoEntrega'] : [],
  }
}

// ============ WHITELIST DE COLUNAS PERMITIDAS ============
// Apenas colunas que CERTAMENTE existem na tabela orders do Supabase
const ALLOWED_COLUMNS = [
  'id',
  'order_code',
  'customer_name',
  'customer_phone',
  'customer_address',
  'neighborhood',
  'delivery_type',
  'payment_method',
  'items_detailed',
  'total',
  'status',
  'payment_status',
  'observation',
  'notes',
  'created_at',
] as const

function frontendToDb(order: Order): Record<string, unknown> {
  // Montar objeto APENAS com campos da whitelist
  // NAO usar spread, NAO adicionar campos dinamicos
  const dbOrder: Record<string, unknown> = {
    id: order.id,
    order_code: order.orderCode || order.id,
    customer_name: order.customerName || 'Cliente',
    customer_phone: order.customerPhone || '',
    customer_address: order.address || null,
    neighborhood: order.neighborhood || null,
    delivery_type: order.deliveryType || 'delivery',
    payment_method: order.paymentMethod || 'Dinheiro',
    items_detailed: order.itemsDetailed || [],
    total: order.total || 0,
    status: order.status || 'pending',
    payment_status: order.paymentStatus || 'pending',
    observation: order.observation || null,
    notes: null,
    created_at: new Date().toISOString(),
  }
  
  // Remover campos undefined (Supabase nao aceita undefined)
  const cleanOrder: Record<string, unknown> = {}
  for (const key of ALLOWED_COLUMNS) {
    if (dbOrder[key] !== undefined) {
      cleanOrder[key] = dbOrder[key]
    }
  }
  
  console.log("[orders] Campos enviados:", Object.keys(cleanOrder).join(', '))
  
  return cleanOrder
}

// ============ GET - Listar pedidos ============

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const password = url.searchParams.get("password")

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders })
  }

  console.log("[orders GET] Carregando pedidos...")

  try {
    const supabase = getSupabase()
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error("[orders GET] Erro Supabase:", error.message, error.details)
      return NextResponse.json({ error: `Erro ao carregar pedidos: ${error.message}`, success: false }, { status: 500, headers: noCacheHeaders })
    }

    const orders = (data || []).map(dbToFrontend)
    console.log(`[orders GET] ${orders.length} pedidos carregados do Supabase`)

    return NextResponse.json({ success: true, orders, financialHistory: [], source: 'supabase' }, { headers: noCacheHeaders })

  } catch (error) {
    console.error("[orders GET] Erro:", error)
    return NextResponse.json({ error: `Erro interno: ${String(error)}`, success: false }, { status: 500, headers: noCacheHeaders })
  }
}

// ============ POST - Criar pedido ============

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order } = body

    if (!order) {
      return NextResponse.json({ error: "Order is required" }, { status: 400 })
    }

    const isPixAutomatic = order.paymentMethod === "PIX Asaas" || order.isPixAutomatic
    const publicOrderId = order.orderId || order.id || `ORD-${Date.now()}`
    // Gerar UUID real para o banco
    const dbId = crypto.randomUUID()

    console.log("[orders POST] Criando pedido:", publicOrderId, "UUID:", dbId)

    // Criar objeto do pedido
    const newOrder: Order = {
      id: dbId, // UUID real para o banco
      orderCode: publicOrderId, // Codigo publico do pedido (ex: PK1234)
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerId: order.customerId,
      items: order.items,
      itemsDetailed: order.itemsDetailed || [],
      total: order.total,
      paymentMethod: order.paymentMethod,
      deliveryType: order.deliveryType,
      address: order.address,
      neighborhood: order.neighborhood,
      reference: order.reference,
      observation: order.observation,
      status: "pending",
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
      isPixAutomatic,
      asaasPaymentId: order.asaasPaymentId,
      asaasPixCode: order.asaasPixCode,
      asaasQrCodeUrl: order.asaasQrCodeUrl,
      manuallyConfirmed: false,
    }

    const supabase = getSupabase()
      
      // Verificar se ja existe pelo order_code (codigo publico)
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('order_code', publicOrderId)
        .single()

      if (existing) {
        console.log("[orders POST] Pedido ja existe:", publicOrderId)
        return NextResponse.json({ success: true, order: newOrder, duplicate: true, source: 'supabase' })
      }

      // Inserir no Supabase
      const dbOrder = frontendToDb(newOrder)
      console.log("[orders POST] Inserindo no Supabase:", JSON.stringify(dbOrder, null, 2).slice(0, 500))
      
      const { data: insertedOrder, error } = await supabase
        .from('orders')
        .insert(dbOrder)
        .select()
        .single()

      if (error) {
        console.error("[orders POST] ERRO INSERT:", error.message, error.details, error.hint)
        throw error
      }

      console.log("[orders POST] Pedido criado no Supabase com sucesso! ID:", insertedOrder?.id, "OrderCode:", insertedOrder?.order_code)
      return NextResponse.json({ success: true, order: newOrder, orderId: insertedOrder?.id, source: 'supabase' })

  } catch (error) {
    console.error("[orders POST] Erro:", error)
    return NextResponse.json({ error: "Failed to create order", details: String(error) }, { status: 500 })
  }
}

// ============ PATCH - Atualizar pedido ============

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, orderId, status, paymentStatus, manuallyConfirmed, entregadorId, entregadorNome, entregadorWhatsapp, historicoEntrega, limparEntregador } = body

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 })
    }

    console.log("[orders PATCH] Atualizando pedido:", orderId, { status, paymentStatus, manuallyConfirmed })

    const supabase = getSupabase()
      
    // Buscar pedido atual
    const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (fetchError || !currentOrder) {
        console.error("[orders PATCH] Pedido nao encontrado no Supabase:", orderId)
        throw new Error('Pedido nao encontrado')
      }

      // Preparar atualizacoes
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

      if (status !== undefined) {
        updates.status = status
        if (status === "delivering") {
          updates.saiu_para_entrega_em = new Date().toISOString()
        }
      }

      if (paymentStatus !== undefined) {
        // Nunca regredir de confirmed para pending
        if (currentOrder.payment_status === "confirmed" && paymentStatus === "pending") {
          console.log("[orders PATCH] Impedida regressao de payment_status")
        } else {
          updates.payment_status = paymentStatus
          if (paymentStatus === "confirmed") {
            updates.confirmed_at = new Date().toISOString()
          }
        }
      }

      if (manuallyConfirmed !== undefined) {
        updates.manually_confirmed = manuallyConfirmed
        if (manuallyConfirmed) {
          updates.payment_status = "confirmed"
          updates.status = "confirmed"
          updates.confirmed_at = new Date().toISOString()
          updates.paid_at = new Date().toISOString()
      }
    }

    if (entregadorId !== undefined) updates.entregador_id = entregadorId
      if (entregadorNome !== undefined) updates.entregador_nome = entregadorNome
      if (entregadorWhatsapp !== undefined) updates.entregador_whatsapp = entregadorWhatsapp
      if (historicoEntrega !== undefined) updates.historico_entrega = historicoEntrega

      if (limparEntregador === true) {
        updates.entregador_id = null
        updates.entregador_nome = null
        updates.entregador_whatsapp = null
        updates.saiu_para_entrega_em = null
      }

      // Atualizar no Supabase
      const { data: updated, error: updateError } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single()

    if (updateError) {
      console.error("[orders PATCH] Erro update:", updateError.message)
      return NextResponse.json({ error: `Erro ao atualizar: ${updateError.message}`, success: false }, { status: 500 })
    }

    const order = dbToFrontend(updated)
    console.log("[orders PATCH] Pedido atualizado no Supabase:", orderId)
      
    return NextResponse.json({ success: true, order, source: 'supabase' })

  } catch (error) {
    console.error("[orders PATCH] Erro:", error)
    return NextResponse.json({ error: "Failed to update order", details: String(error) }, { status: 500 })
  }
}

// ============ DELETE - Excluir pedidos ============

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, action, orderIds } = body

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[orders DELETE] Acao:", action, "IDs:", orderIds)

    // Excluir pedidos especificos
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      const supabase = getSupabase()
        
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds)

      if (error) {
        console.error("[orders DELETE] Erro:", error.message)
        return NextResponse.json({ error: `Erro ao excluir: ${error.message}`, success: false }, { status: 500 })
      }

      console.log(`[orders DELETE] ${orderIds.length} pedidos excluidos do Supabase`)
      return NextResponse.json({ success: true, deletedCount: orderIds.length, source: 'supabase' })
    }

    // Excluir todos completados (action = "archiveAll" ou "deleteCompleted")
    if (action === "archiveAll" || action === "deleteCompleted") {
      const supabase = getSupabase()
        
      // Deleta pedidos completados ou cancelados
      const { error, count } = await supabase
        .from('orders')
        .delete()
        .in('status', ['completed', 'cancelled'])

      if (error) {
        console.error("[orders DELETE] Erro archiveAll:", error.message)
        return NextResponse.json({ error: `Erro ao excluir: ${error.message}`, success: false }, { status: 500 })
      }

      console.log(`[orders DELETE] ${count || 0} pedidos completados/cancelados excluidos`)
      return NextResponse.json({ success: true, message: "Pedidos completados excluidos", deletedCount: count || 0, source: 'supabase' })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })

  } catch (error) {
    console.error("[orders DELETE] Erro:", error)
    return NextResponse.json({ error: "Failed to delete", details: String(error) }, { status: 500 })
  }
}
