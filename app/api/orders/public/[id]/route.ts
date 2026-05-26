import { list, get } from "@vercel/blob"
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from "next/server"
import { type Order } from "@/lib/config-types"

const ORDERS_PREFIX = "pk-orders-"

// Evitar cache
export const dynamic = "force-dynamic"
export const revalidate = 0

// Headers para evitar cache
const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
}

// Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase nao configurado')
  return createClient(url, key)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400, headers: noCacheHeaders })
    }

    console.log("[orders/public] Buscando pedido:", orderId)

    // Tentar Supabase primeiro
    try {
      const supabase = getSupabase()
      
      if (!supabase) {
        throw new Error('Supabase nao disponivel')
      }
      
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) throw error

      console.log("[orders/public] Pedido encontrado no Supabase:", orderId)

      // Retornar dados publicos (sem dados sensiveis)
      const publicOrder = {
        id: order.id,
        customerName: order.customer_name,
        items: order.items_text,
        itemsDetailed: order.items_detailed,
        total: Number(order.total),
        paymentMethod: order.payment_method,
        deliveryType: order.delivery_type,
        neighborhood: order.neighborhood,
        status: order.status,
        paymentStatus: order.payment_status,
        createdAt: order.created_at,
        confirmedAt: order.confirmed_at,
        saiuParaEntregaEm: order.saiu_para_entrega_em,
        entregadorNome: order.entregador_nome,
      }

      return NextResponse.json({ success: true, order: publicOrder, source: 'supabase' }, { headers: noCacheHeaders })

    } catch (supabaseError) {
      console.error("[orders/public] Erro Supabase, tentando Blob:", supabaseError)

      // Fallback: Blob
      const { blobs } = await list({ prefix: ORDERS_PREFIX })

      if (blobs.length === 0) {
        return NextResponse.json({ error: "Order not found", success: false }, { status: 404, headers: noCacheHeaders })
      }

      const latestBlob = blobs.sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )[0]

      const result = await get(latestBlob.pathname, { access: "private" })
      
      if (!result || !result.stream) {
        return NextResponse.json({ error: "Failed to load orders", success: false }, { status: 500, headers: noCacheHeaders })
      }
      
      const text = await new Response(result.stream).text()
      const orders = JSON.parse(text) as Order[]
      
      const order = orders.find(o => o.id === orderId)
      
      if (!order) {
        return NextResponse.json({ error: "Order not found", success: false }, { status: 404, headers: noCacheHeaders })
      }

      console.log("[orders/public] Pedido encontrado no Blob:", orderId)

      // Retornar dados publicos (sem dados sensiveis)
      const publicOrder = {
        id: order.id,
        customerName: order.customerName,
        items: order.items,
        itemsDetailed: order.itemsDetailed,
        total: order.total,
        paymentMethod: order.paymentMethod,
        deliveryType: order.deliveryType,
        neighborhood: order.neighborhood,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        confirmedAt: order.confirmedAt,
        saiuParaEntregaEm: order.saiuParaEntregaEm,
        entregadorNome: order.entregadorNome,
      }

      return NextResponse.json({ success: true, order: publicOrder, source: 'blob' }, { headers: noCacheHeaders })
    }

  } catch (error) {
    console.error("[orders/public] Erro:", error)
    return NextResponse.json({ error: "Failed to fetch order", success: false }, { status: 500, headers: noCacheHeaders })
  }
}
