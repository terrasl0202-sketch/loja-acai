import { NextRequest, NextResponse } from "next/server"
import { get, list, put, del } from "@vercel/blob"
import type { SiteConfig, Order } from "@/lib/config-types"

const CONFIG_PREFIX = "pk-config-"
const ORDERS_PREFIX = "pk-orders-"

// Evitar cache
export const dynamic = "force-dynamic"
export const revalidate = 0

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

// POST: Atualizar status do pedido pelo entregador
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { pin, orderId, action, observacao } = body
    
    // Validar action
    const validActions = ["iniciar", "finalizar", "cancelar"]
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Acao invalida" }, { status: 400 })
    }

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

    const agora = new Date().toISOString()

    // Executar acao
    if (action === "iniciar") {
      // Iniciar entrega - mudar para delivering
      orders[orderIndex].status = "delivering"
      orders[orderIndex].saiuParaEntregaEm = agora
      orders[orderIndex].historicoEntrega = [
        ...(orders[orderIndex].historicoEntrega || []),
        { 
          data: agora, 
          evento: "SAIU_PARA_ENTREGA", 
          observacao: `Entrega iniciada por ${entregador.nome}` 
        }
      ]
    } else if (action === "finalizar") {
      // Finalizar entrega - mudar para completed
      orders[orderIndex].status = "completed"
      orders[orderIndex].entregueEm = agora
      orders[orderIndex].historicoEntrega = [
        ...(orders[orderIndex].historicoEntrega || []),
        { 
          data: agora, 
          evento: "ENTREGUE", 
          observacao: `Entregue por ${entregador.nome}` 
        }
      ]
    } else if (action === "cancelar") {
      // Cancelar - mudar para cancelled
      orders[orderIndex].status = "cancelled"
      orders[orderIndex].canceladoEm = agora
      orders[orderIndex].motivoCancelamento = observacao || "Cancelado pelo entregador"
      orders[orderIndex].historicoEntrega = [
        ...(orders[orderIndex].historicoEntrega || []),
        { 
          data: agora, 
          evento: "CANCELADO", 
          observacao: observacao || `Cancelado pelo entregador ${entregador.nome}` 
        }
      ]
    }

    // Salvar pedidos com o mesmo formato da API principal (timestamp no nome)
    const timestamp = Date.now()
    const filename = `${ORDERS_PREFIX}${timestamp}.json`

    await put(filename, JSON.stringify(orders, null, 2), {
      access: "private",
      contentType: "application/json",
    })

    // Limpar blobs antigos
    await cleanupOldBlobs()

    const messages: Record<string, string> = {
      iniciar: "Entrega iniciada",
      finalizar: "Pedido entregue com sucesso",
      cancelar: "Pedido cancelado"
    }

    return NextResponse.json({
      success: true,
      message: messages[action],
      newStatus: orders[orderIndex].status
    })
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
