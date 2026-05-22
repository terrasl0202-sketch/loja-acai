import { list, get } from "@vercel/blob"
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400, headers: noCacheHeaders })
    }

    // Buscar arquivo de pedidos
    const { blobs } = await list({ prefix: ORDERS_PREFIX })

    if (blobs.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404, headers: noCacheHeaders })
    }

    // Pegar o mais recente
    const latestBlob = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0]

    const result = await get(latestBlob.pathname, { access: "private" })

    if (result && result.stream) {
      const text = await new Response(result.stream).text()
      const orders = JSON.parse(text) as Order[]
      
      // Buscar pedido por ID
      const order = orders.find(o => o.id === orderId)
      
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404, headers: noCacheHeaders })
      }

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

      return NextResponse.json({ success: true, order: publicOrder }, { headers: noCacheHeaders })
    }

    return NextResponse.json({ error: "Order not found" }, { status: 404, headers: noCacheHeaders })
  } catch (error) {
    console.error("[Orders Public GET] Erro:", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500, headers: noCacheHeaders })
  }
}
