import { put, list, get, del } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { type Order } from "@/lib/config-types"

const ORDERS_PREFIX = "pk-orders-"

export const dynamic = "force-dynamic"

// Funcao para limpar blobs antigos (manter apenas os 2 mais recentes)
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

// Confirmar pagamento PIX automatico
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId, orderId } = body

    if (!paymentId && !orderId) {
      return NextResponse.json({ error: "paymentId or orderId required" }, { status: 400 })
    }

    // Carregar pedidos
    let orders: Order[] = []
    const { blobs } = await list({ prefix: ORDERS_PREFIX })
    
    if (blobs.length > 0) {
      const latestBlob = blobs.sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )[0]
      const result = await get(latestBlob.pathname, { access: "private" })
      if (result && result.stream) {
        const text = await new Response(result.stream).text()
        orders = JSON.parse(text) as Order[]
      }
    }

    // Encontrar pedido por paymentId ou orderId
    let orderIndex = -1
    if (paymentId) {
      orderIndex = orders.findIndex((o) => o.asaasPaymentId === paymentId)
    }
    if (orderIndex === -1 && orderId) {
      orderIndex = orders.findIndex((o) => o.id === orderId)
    }

    if (orderIndex === -1) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Atualizar status de pagamento
    const now = new Date().toISOString()
    orders[orderIndex].paymentStatus = "confirmed"
    orders[orderIndex].confirmedAt = now
    orders[orderIndex].paidAt = now
    orders[orderIndex].status = "confirmed"
    orders[orderIndex].confirmedAutomatically = true
    
    console.log("[Confirm Payment] Pedido confirmado:", orders[orderIndex].id)

    // Salvar
    const timestamp = Date.now()
    const filename = `${ORDERS_PREFIX}${timestamp}.json`

    await put(filename, JSON.stringify(orders, null, 2), {
      access: "private",
      contentType: "application/json",
    })

    // Limpar blobs antigos
    await cleanupOldBlobs()

    return NextResponse.json({ success: true, order: orders[orderIndex] })
  } catch (error) {
    console.error("[Confirm Payment] Erro:", error)
    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 }
    )
  }
}
