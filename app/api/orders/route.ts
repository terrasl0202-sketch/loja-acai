import { put, list, get, del } from "@vercel/blob"
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from "next/server"
import { type Order } from "@/lib/config-types"

const ORDERS_PREFIX = "pk-orders-"
const FINANCIAL_HISTORY_PREFIX = "pk-financial-history-"
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
  archived: boolean
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
    archived: db.archived,
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

function frontendToDb(order: Order): Partial<DbOrder> {
  return {
    id: order.id,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    customer_address: order.address || null,
    customer_reference: order.reference || null,
    neighborhood: order.neighborhood || null,
    delivery_type: order.deliveryType,
    payment_method: order.paymentMethod,
    items: order.itemsDetailed || [],
    items_text: order.items,
    items_detailed: order.itemsDetailed || [],
    total: order.total,
    status: order.status,
    payment_status: order.paymentStatus,
    is_pix_automatic: order.isPixAutomatic || false,
    manually_confirmed: order.manuallyConfirmed || false,
    confirmed_automatically: order.confirmedAutomatically || false,
    archived: order.archived || false,
    entregador_id: order.entregadorId || null,
    entregador_nome: order.entregadorNome || null,
    entregador_whatsapp: order.entregadorWhatsapp || null,
    saiu_para_entrega_em: order.saiuParaEntregaEm || null,
    entregue_em: order.entregueEm || null,
    cancelado_em: order.canceladoEm || null,
    motivo_cancelamento: order.motivoCancelamento || null,
    historico_entrega: order.historicoEntrega || [],
    customer_id: order.customerId || null,
    confirmed_at: order.confirmedAt || null,
    paid_at: order.paidAt || null,
    observation: order.observation || null,
    asaas_payment_id: order.asaasPaymentId || null,
    asaas_pix_code: order.asaasPixCode || null,
    asaas_qr_code_url: order.asaasQrCodeUrl || null,
  }
}

// ============ BLOB FALLBACK (legacy) ============

async function cleanupOldBlobs() {
  try {
    const { blobs } = await list({ prefix: ORDERS_PREFIX })
    if (blobs.length > 2) {
      const sorted = blobs.sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )
      const toDelete = sorted.slice(2)
      for (const blob of toDelete) {
        await del(blob.url)
      }
    }
  } catch (error) {
    console.error("[Cleanup] Erro ao limpar blobs antigos:", error)
  }
}

async function loadOrdersFromBlob(): Promise<Order[]> {
  try {
    const { blobs } = await list({ prefix: ORDERS_PREFIX })
    if (blobs.length === 0) return []
    
    const latestBlob = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0]
    const result = await get(latestBlob.pathname, { access: "private" })
    if (result && result.stream) {
      const text = await new Response(result.stream).text()
      return JSON.parse(text) as Order[]
    }
    return []
  } catch {
    return []
  }
}

async function saveOrdersToBlob(orders: Order[]) {
  const timestamp = Date.now()
  const filename = `${ORDERS_PREFIX}${timestamp}.json`
  await put(filename, JSON.stringify(orders, null, 2), {
    access: "private",
    contentType: "application/json",
  })
  await cleanupOldBlobs()
}

// ============ GET - Listar pedidos ============

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const password = url.searchParams.get("password")
  const includeHistory = url.searchParams.get("includeHistory") === "true"

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

    if (error) throw error

    const orders = (data || []).map(dbToFrontend)
    console.log(`[orders GET] ${orders.length} pedidos carregados do Supabase`)

    // Historico financeiro (ainda do blob por enquanto)
    let financialHistory: unknown[] = []
    if (includeHistory) {
      try {
        const { blobs: historyBlobs } = await list({ prefix: FINANCIAL_HISTORY_PREFIX })
        if (historyBlobs.length > 0) {
          const latestHistoryBlob = historyBlobs.sort(
            (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
          )[0]
          const historyResult = await get(latestHistoryBlob.pathname, { access: "private" })
          if (historyResult && historyResult.stream) {
            const historyText = await new Response(historyResult.stream).text()
            financialHistory = JSON.parse(historyText)
          }
        }
      } catch {
        // Sem historico
      }
    }

    return NextResponse.json({ success: true, orders, financialHistory, source: 'supabase' }, { headers: noCacheHeaders })

  } catch (error) {
    console.error("[orders GET] Erro Supabase, tentando Blob:", error)
    
    // Fallback para Blob
    const orders = await loadOrdersFromBlob()
    console.log(`[orders GET] ${orders.length} pedidos carregados do Blob (fallback)`)
    
    return NextResponse.json({ success: true, orders, financialHistory: [], source: 'blob' }, { headers: noCacheHeaders })
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

    console.log("[orders POST] Criando pedido:", publicOrderId)

    // Criar objeto do pedido
    const newOrder: Order = {
      id: publicOrderId,
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
      archived: false,
    }

    try {
      const supabase = getSupabase()
      
      // Verificar se ja existe
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('id', publicOrderId)
        .single()

      if (existing) {
        console.log("[orders POST] Pedido ja existe:", publicOrderId)
        return NextResponse.json({ success: true, order: newOrder, duplicate: true, source: 'supabase' })
      }

      // Inserir no Supabase
      const dbOrder = frontendToDb(newOrder)
      const { error } = await supabase.from('orders').insert(dbOrder)

      if (error) throw error

      console.log("[orders POST] Pedido criado no Supabase:", publicOrderId)
      return NextResponse.json({ success: true, order: newOrder, source: 'supabase' })

    } catch (error) {
      console.error("[orders POST] Erro Supabase, salvando no Blob:", error)
      
      // Fallback: salvar no Blob
      const orders = await loadOrdersFromBlob()
      const existingIndex = orders.findIndex(o => o.id === publicOrderId)
      
      if (existingIndex !== -1) {
        return NextResponse.json({ success: true, order: orders[existingIndex], duplicate: true, source: 'blob' })
      }

      orders.unshift(newOrder)
      await saveOrdersToBlob(orders)
      
      console.log("[orders POST] Pedido salvo no Blob (fallback):", publicOrderId)
      return NextResponse.json({ success: true, order: newOrder, source: 'blob' })
    }

  } catch (error) {
    console.error("[orders POST] Erro:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

// ============ PATCH - Atualizar pedido ============

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, orderId, status, paymentStatus, manuallyConfirmed, archived, entregadorId, entregadorNome, entregadorWhatsapp, historicoEntrega, limparEntregador } = body

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 })
    }

    console.log("[orders PATCH] Atualizando pedido:", orderId, { status, paymentStatus, manuallyConfirmed })

    try {
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

      if (archived !== undefined) {
        updates.archived = archived
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

      if (updateError) throw updateError

      const order = dbToFrontend(updated)
      console.log("[orders PATCH] Pedido atualizado no Supabase:", orderId)
      
      return NextResponse.json({ success: true, order, source: 'supabase' })

    } catch (error) {
      console.error("[orders PATCH] Erro Supabase, tentando Blob:", error)
      
      // Fallback para Blob
      const orders = await loadOrdersFromBlob()
      const orderIndex = orders.findIndex(o => o.id === orderId)
      
      if (orderIndex === -1) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }

      // Aplicar atualizacoes no Blob
      if (status !== undefined) {
        orders[orderIndex].status = status
        if (status === "delivering") {
          orders[orderIndex].saiuParaEntregaEm = new Date().toISOString()
        }
      }
      if (paymentStatus !== undefined) {
        if (!(orders[orderIndex].paymentStatus === "confirmed" && paymentStatus === "pending")) {
          orders[orderIndex].paymentStatus = paymentStatus
          if (paymentStatus === "confirmed") {
            orders[orderIndex].confirmedAt = new Date().toISOString()
          }
        }
      }
      if (manuallyConfirmed !== undefined) {
        orders[orderIndex].manuallyConfirmed = manuallyConfirmed
        if (manuallyConfirmed) {
          orders[orderIndex].paymentStatus = "confirmed"
          orders[orderIndex].status = "confirmed"
          orders[orderIndex].confirmedAt = new Date().toISOString()
          orders[orderIndex].paidAt = new Date().toISOString()
        }
      }
      if (archived !== undefined) orders[orderIndex].archived = archived
      if (entregadorId !== undefined) orders[orderIndex].entregadorId = entregadorId
      if (entregadorNome !== undefined) orders[orderIndex].entregadorNome = entregadorNome
      if (entregadorWhatsapp !== undefined) orders[orderIndex].entregadorWhatsapp = entregadorWhatsapp
      if (historicoEntrega !== undefined) orders[orderIndex].historicoEntrega = historicoEntrega
      if (limparEntregador === true) {
        orders[orderIndex].entregadorId = undefined
        orders[orderIndex].entregadorNome = undefined
        orders[orderIndex].entregadorWhatsapp = undefined
        orders[orderIndex].saiuParaEntregaEm = undefined
      }

      await saveOrdersToBlob(orders)
      console.log("[orders PATCH] Pedido atualizado no Blob (fallback):", orderId)
      
      return NextResponse.json({ success: true, order: orders[orderIndex], source: 'blob' })
    }

  } catch (error) {
    console.error("[orders PATCH] Erro:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
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
      try {
        const supabase = getSupabase()
        
        const { error } = await supabase
          .from('orders')
          .delete()
          .in('id', orderIds)

        if (error) throw error

        console.log(`[orders DELETE] ${orderIds.length} pedidos excluidos do Supabase`)
        return NextResponse.json({ success: true, deletedCount: orderIds.length, source: 'supabase' })

      } catch (error) {
        console.error("[orders DELETE] Erro Supabase, tentando Blob:", error)
        
        // Fallback para Blob
        let orders = await loadOrdersFromBlob()
        const originalCount = orders.length
        const idsToDelete = new Set(orderIds)
        orders = orders.filter(o => !idsToDelete.has(o.id))
        const deletedCount = originalCount - orders.length
        
        await saveOrdersToBlob(orders)
        console.log(`[orders DELETE] ${deletedCount} pedidos excluidos do Blob (fallback)`)
        
        return NextResponse.json({ success: true, deletedCount, source: 'blob' })
      }
    }

    // Arquivar todos (action = "archiveAll")
    if (action === "archiveAll") {
      try {
        const supabase = getSupabase()
        
        const { error } = await supabase
          .from('orders')
          .update({ archived: true, updated_at: new Date().toISOString() })
          .neq('archived', true)

        if (error) throw error

        console.log("[orders DELETE] Todos pedidos arquivados no Supabase")
        return NextResponse.json({ success: true, message: "Todos arquivados", source: 'supabase' })

      } catch (error) {
        console.error("[orders DELETE] Erro Supabase archiveAll:", error)
        return NextResponse.json({ error: "Failed to archive" }, { status: 500 })
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })

  } catch (error) {
    console.error("[orders DELETE] Erro:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
