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

// Interface minima para leitura do banco (id é BIGINT)
interface DbOrder {
  id: number // BIGINT no Supabase
  order_code: string | null
  customer_name: string
  customer_phone: string | null
  address: string | null
  neighborhood: string | null
  payment_method: string | null
  items: unknown
  total: number
  subtotal?: number
  discount?: number
  delivery_fee?: number
  status: string
  order_status?: string // Campo legado
  payment_status?: string // Status do pagamento
  created_at: string
  // Campos de entregador
  entregador_id?: string | null
  entregador_nome?: string | null
  entregador_whatsapp?: string | null
  // Campos de confirmacao
  manually_confirmed?: boolean
  confirmed_automatically?: boolean
  paid_at?: string | null
  // Campos de PIX
  asaas_payment_id?: string | null
  pix_code?: string | null
  pix_qrcode?: string | null
}

function dbToFrontend(db: DbOrder): Order {
  // Normaliza o status - prioriza payment_status, depois order_status, depois status
  const rawPaymentStatus = db.payment_status || db.order_status || db.status || 'pending'
  // Mapeia valores do banco para valores do frontend
  let paymentStatus: Order['paymentStatus'] = 'pending'
  if (rawPaymentStatus === 'confirmed' || rawPaymentStatus === 'paid' || rawPaymentStatus === 'pago') {
    paymentStatus = 'confirmed'
  } else if (rawPaymentStatus === 'failed' || rawPaymentStatus === 'falhou') {
    paymentStatus = 'failed'
  }
  
  // Normaliza o status do pedido
  const rawStatus = db.status || db.order_status || 'pending'
  let status: Order['status'] = 'pending'
  if (rawStatus === 'confirmed' || rawStatus === 'aguardando_preparo') {
    status = 'confirmed'
  } else if (rawStatus === 'preparing' || rawStatus === 'em_preparacao') {
    status = 'preparing'
  } else if (rawStatus === 'delivering' || rawStatus === 'saiu_para_entrega') {
    status = 'delivering'
  } else if (rawStatus === 'completed' || rawStatus === 'finalizado' || rawStatus === 'entregue') {
    status = 'completed'
  } else if (rawStatus === 'cancelled' || rawStatus === 'cancelado') {
    status = 'cancelled'
  }
  
  // Se o pagamento foi confirmado manualmente ou automaticamente, ajustar paymentStatus
  if (db.manually_confirmed || db.confirmed_automatically || db.paid_at) {
    paymentStatus = 'confirmed'
  }
  
  // Se o status e confirmed/preparing/delivering/completed, assumir pagamento confirmado
  if (['confirmed', 'preparing', 'delivering', 'completed'].includes(status)) {
    paymentStatus = 'confirmed'
  }

  return {
    id: String(db.id), // Converter BIGINT para string
    orderCode: db.order_code || String(db.id),
    customerName: db.customer_name,
    customerPhone: db.customer_phone || '',
    items: JSON.stringify(db.items || []),
    itemsDetailed: Array.isArray(db.items) ? db.items as Order['itemsDetailed'] : [],
    total: Number(db.total) || 0,
    paymentMethod: db.payment_method || 'Dinheiro',
    deliveryType: 'delivery',
    address: db.address || undefined,
    neighborhood: db.neighborhood || undefined,
    status: status,
    paymentStatus: paymentStatus,
    createdAt: db.created_at,
    paidAt: db.paid_at || undefined,
    manuallyConfirmed: db.manually_confirmed || false,
    confirmedAutomatically: db.confirmed_automatically || false,
    asaasPaymentId: db.asaas_payment_id || undefined,
    asaasPixCode: db.pix_code || undefined,
    asaasQrCodeUrl: db.pix_qrcode || undefined,
    // Campos de entregador
    entregadorId: db.entregador_id || undefined,
    entregadorNome: db.entregador_nome || undefined,
    entregadorWhatsapp: db.entregador_whatsapp || undefined,
  }
}

// ============ WHITELIST DE COLUNAS REAIS ============
// A tabela orders PRECISA ser criada no Supabase com este SQL:
/*
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  address TEXT,
  neighborhood TEXT,
  payment_method TEXT,
  items JSONB DEFAULT '[]',
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_order_code ON orders(order_code);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
*/

// Apenas estas colunas sao enviadas no insert (SEM id - é BIGINT auto)
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
  'payment_status', // Status do pagamento (pending, confirmed, failed)
  'created_at',
  'asaas_payment_id', // ID do pagamento Asaas para confirmacao automatica
] as const

function frontendToDb(order: Order & { asaasPaymentId?: string }): Record<string, unknown> {
  // NAO enviar 'id' - é BIGINT auto-gerado pelo Supabase
  const dbOrder: Record<string, unknown> = {
    order_code: order.orderCode || order.id || `ORD-${Date.now()}`,
    customer_name: order.customerName || 'Cliente',
    customer_phone: order.customerPhone || '',
    address: order.address || null,
    neighborhood: order.neighborhood || null,
    payment_method: order.paymentMethod || 'Dinheiro',
    items: order.itemsDetailed || [],
    total: order.total || 0,
    status: order.status || 'pending',
    payment_status: order.paymentStatus || 'pending', // Status do pagamento
    created_at: new Date().toISOString(),
    asaas_payment_id: order.asaasPaymentId || null, // ID do pagamento Asaas
  }
  
  // Filtrar apenas colunas permitidas
  const cleanOrder: Record<string, unknown> = {}
  for (const key of ALLOWED_COLUMNS) {
    if (dbOrder[key] !== undefined) {
      cleanOrder[key] = dbOrder[key]
    }
  }
  
  console.log("[orders] INSERT colunas:", Object.keys(cleanOrder).join(', '))
  
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

    const publicOrderId = order.orderId || order.id || `ORD-${Date.now()}`

    console.log("[orders POST] Criando pedido com order_code:", publicOrderId)

    // REGRA OFICIAL DE STATUS INICIAL:
    // TODOS os pedidos comecam como PENDING (Aguardando Pagamento)
    // - Pix Asaas: aguarda confirmacao automatica via webhook/check-payment
    // - Pix Manual: aguarda confirmacao manual do lojista
    // - Dinheiro: aguarda confirmacao manual do lojista
    // - Cartao: aguarda confirmacao manual do lojista
    // 
    // NENHUM pedido vai direto para "confirmed" na criacao!
    const initialStatus = "pending"
    const initialPaymentStatus = "pending"

    // Criar objeto do pedido (id sera gerado pelo Supabase)
    const newOrder: Order & { asaasPaymentId?: string } = {
      id: '', // Sera preenchido apos insert
      orderCode: publicOrderId,
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
      status: initialStatus,
      paymentStatus: initialPaymentStatus,
      createdAt: new Date().toISOString(),
      asaasPaymentId: order.asaasPaymentId || null, // ID do pagamento Asaas
    }

    console.log("[orders POST] asaasPaymentId:", order.asaasPaymentId || "nao informado")

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

      console.log("[orders POST] Pedido criado! ID:", insertedOrder?.id, "OrderCode:", publicOrderId)
      
      // Atualizar newOrder com o ID gerado
      newOrder.id = String(insertedOrder?.id || '')
      
      return NextResponse.json({ success: true, order: newOrder, orderId: publicOrderId, source: 'supabase' })

  } catch (error) {
    console.error("[orders POST] Erro:", error)
    return NextResponse.json({ error: "Failed to create order", details: String(error) }, { status: 500 })
  }
}

// ============ PATCH - Atualizar pedido ============

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, orderId, status, paymentStatus, manuallyConfirmed, entregadorId, entregadorNome, entregadorWhatsapp, limparEntregador } = body

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 })
    }

    console.log("[orders PATCH] Atualizando pedido:", orderId, { status, paymentStatus, manuallyConfirmed, entregadorId, limparEntregador })

    const supabase = getSupabase()
      
    // Montar objeto de atualizacao apenas com campos fornecidos
    const updates: Record<string, unknown> = {}
    
    if (status !== undefined) {
      updates.status = status
    }

    // Confirmacao manual de pagamento
    if (manuallyConfirmed === true) {
      updates.status = 'confirmed'
      console.log("[orders PATCH] Confirmacao manual - status atualizado para confirmed")
    }

    // Atribuir entregador
    if (entregadorId !== undefined) {
      updates.entregador_id = entregadorId
      updates.entregador_nome = entregadorNome || null
      updates.entregador_whatsapp = entregadorWhatsapp || null
      console.log("[orders PATCH] Entregador atribuido:", entregadorNome)
    }

    // Limpar entregador
    if (limparEntregador === true) {
      updates.entregador_id = null
      updates.entregador_nome = null
      updates.entregador_whatsapp = null
      console.log("[orders PATCH] Entregador removido")
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 })
    }

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
    console.log("[orders PATCH] Pedido atualizado:", orderId, "novo status:", order.status)
      
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

    // Limpar pedidos duplicados (mesmo cliente + total + horario proximo)
    if (action === "cleanup_duplicates") {
      const supabase = getSupabase()
      
      // Buscar todos os pedidos
      const { data: allOrders, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: true })
      
      if (fetchError) {
        console.error("[orders DELETE] Erro ao buscar pedidos:", fetchError.message)
        return NextResponse.json({ error: `Erro ao buscar: ${fetchError.message}`, success: false }, { status: 500 })
      }

      if (!allOrders || allOrders.length === 0) {
        return NextResponse.json({ success: true, message: "Nenhum pedido encontrado", removedCount: 0 })
      }

      // Identificar duplicatas
      // Criterio: mesmo customer_phone + mesmo total + criados em intervalo de 5 minutos
      const duplicateIds: number[] = []
      const seen = new Map<string, { id: number; createdAt: Date }>()

      for (const order of allOrders) {
        const key = `${order.customer_phone || 'sem-tel'}-${order.total}`
        const orderDate = new Date(order.created_at)
        
        if (seen.has(key)) {
          const existing = seen.get(key)!
          const timeDiff = Math.abs(orderDate.getTime() - existing.createdAt.getTime())
          
          // Se criados dentro de 5 minutos (300000ms), e um duplicado
          if (timeDiff < 300000) {
            duplicateIds.push(order.id)
            console.log(`[cleanup] Duplicata encontrada: #${order.id} (original: #${existing.id})`)
          } else {
            // Atualizar o visto com o pedido mais recente
            seen.set(key, { id: order.id, createdAt: orderDate })
          }
        } else {
          seen.set(key, { id: order.id, createdAt: orderDate })
        }
      }

      if (duplicateIds.length === 0) {
        console.log("[cleanup] Nenhuma duplicata encontrada")
        return NextResponse.json({ success: true, message: "Nenhuma duplicata encontrada", removedCount: 0 })
      }

      // Remover duplicatas
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .in('id', duplicateIds)

      if (deleteError) {
        console.error("[orders DELETE] Erro ao remover duplicatas:", deleteError.message)
        return NextResponse.json({ error: `Erro ao remover: ${deleteError.message}`, success: false }, { status: 500 })
      }

      console.log(`[orders DELETE] ${duplicateIds.length} duplicata(s) removida(s)`)
      return NextResponse.json({ success: true, message: `${duplicateIds.length} duplicata(s) removida(s)`, removedCount: duplicateIds.length, source: 'supabase' })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })

  } catch (error) {
    console.error("[orders DELETE] Erro:", error)
    return NextResponse.json({ error: "Failed to delete", details: String(error) }, { status: 500 })
  }
}
