import { NextRequest, NextResponse } from "next/server"
import { get, list, put } from "@vercel/blob"
import type { SiteConfig, Order } from "@/lib/config-types"

const CONFIG_PREFIX = "config/"
const ORDERS_PREFIX = "orders/"

// POST: Marcar pedido como entregue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { pin, orderId } = body

    // Carregar config
    let config: SiteConfig | null = null
    const { blobs: configBlobs } = await list({ prefix: CONFIG_PREFIX })
    
    if (configBlobs.length > 0) {
      const latestBlob = configBlobs.sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )[0]
      const result = await get(latestBlob.pathname, { access: "private" })
      if (result && result.stream) {
        const text = await new Response(result.stream).text()
        config = JSON.parse(text) as SiteConfig
      }
    }

    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 })
    }

    // Encontrar entregador pelo token
    const entregador = (config.entregadores || []).find(e => e.token === token)
    
    if (!entregador) {
      return NextResponse.json({ error: "Entregador not found" }, { status: 404 })
    }

    // Verificar PIN
    if (entregador.pin !== pin) {
      return NextResponse.json({ error: "PIN incorreto" }, { status: 401 })
    }

    // Carregar pedidos
    let orders: Order[] = []
    const { blobs: orderBlobs } = await list({ prefix: ORDERS_PREFIX })
    
    if (orderBlobs.length > 0) {
      const latestBlob = orderBlobs.sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )[0]
      const result = await get(latestBlob.pathname, { access: "private" })
      if (result && result.stream) {
        const text = await new Response(result.stream).text()
        orders = JSON.parse(text) as Order[]
      }
    }

    // Encontrar pedido
    const orderIndex = orders.findIndex(o => o.id === orderId)
    if (orderIndex === -1) {
      return NextResponse.json({ error: "Pedido not found" }, { status: 404 })
    }

    const order = orders[orderIndex]

    // Verificar se o pedido pertence ao entregador
    if (order.entregadorId !== entregador.id) {
      return NextResponse.json({ error: "Pedido nao pertence a este entregador" }, { status: 403 })
    }

    // Atualizar pedido para finalizado
    orders[orderIndex].status = "completed"
    orders[orderIndex].historicoEntrega = [
      ...(orders[orderIndex].historicoEntrega || []),
      { 
        data: new Date().toISOString(), 
        evento: "ENTREGUE", 
        observacao: `Marcado como entregue pelo entregador ${entregador.nome}` 
      }
    ]

    // Salvar pedidos
    await put(`${ORDERS_PREFIX}orders.json`, JSON.stringify(orders), {
      access: "private",
      contentType: "application/json",
    })

    return NextResponse.json({
      success: true,
      message: "Pedido marcado como entregue"
    })
  } catch (error) {
    console.error("Erro ao marcar pedido como entregue:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
