import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from "next/server"

// Evitar cache
export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
}

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

    console.log("[orders/public] Buscando pedido por order_code:", orderId)

    const supabase = getSupabase()
    
    // Buscar por order_code (codigo publico do pedido)
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_code', orderId)
      .single()

    if (error || !order) {
      console.log("[orders/public] Pedido nao encontrado:", orderId, error?.message)
      return NextResponse.json({ error: "Pedido nao encontrado", success: false }, { status: 404, headers: noCacheHeaders })
    }

    console.log("[orders/public] Pedido encontrado! ID:", order.id)

    // Retornar dados publicos
    const publicOrder = {
      id: String(order.id),
      orderCode: order.order_code,
      customerName: order.customer_name,
      items: order.items,
      itemsDetailed: Array.isArray(order.items) ? order.items : undefined,
      total: Number(order.total),
      paymentMethod: order.payment_method,
      neighborhood: order.neighborhood,
      status: order.status,
      paymentStatus: order.payment_status,
      createdAt: order.created_at,
    }

    return NextResponse.json({ success: true, order: publicOrder, source: 'supabase' }, { headers: noCacheHeaders })

  } catch (error) {
    console.error("[orders/public] Erro:", error)
    return NextResponse.json({ error: "Erro ao buscar pedido", success: false }, { status: 500, headers: noCacheHeaders })
  }
}
