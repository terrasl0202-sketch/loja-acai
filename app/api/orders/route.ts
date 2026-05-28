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
  status: string
  created_at: string
}

function dbToFrontend(db: DbOrder): Order {
  return {
    id: String(db.id), // Converter BIGINT para string
    orderCode: db.order_code || String(db.id),
    customerName: db.customer_name,
    customerPhone: db.customer_phone || '',
    items: JSON.stringify(db.items || []),
    itemsDetailed: Array.isArray(db.items) ? db.items as Order['itemsDetailed'] : [],
    total: Number(db.total),
    paymentMethod: db.payment_method || 'Dinheiro',
    deliveryType: 'delivery',
    address: db.address || undefined,
    neighborhood: db.neighborhood || undefined,
    status: (db.status || 'pending') as Order['status'],
    paymentStatus: 'pending',
    createdAt: db.created_at,
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

// Apenas estas 10 colunas sao enviadas no insert (SEM id - é BIGINT auto)
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
  'created_at',
] as const

function frontendToDb(order: Order): Record<string, unknown> {
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
    created_at: new Date().toISOString(),
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

    // Criar objeto do pedido (id sera gerado pelo Supabase)
    const newOrder: Order = {
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
      status: "pending",
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
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
    const { password, orderId, status } = body

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 })
    }

    console.log("[orders PATCH] Atualizando pedido:", orderId, { status })

    const supabase = getSupabase()
      
    // Apenas atualizar status (unica coluna garantida)
    const updates: Record<string, unknown> = {}
    if (status !== undefined) {
      updates.status = status
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
    console.log("[orders PATCH] Pedido atualizado:", orderId)
      
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
