import { put, list, get, del } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { type Order } from "@/lib/config-types"

const ORDERS_PREFIX = "pk-orders-"
const FINANCIAL_HISTORY_PREFIX = "pk-financial-history-"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "PK1040CAH"

// Evitar cache
export const dynamic = "force-dynamic"
export const revalidate = 0

// Headers para evitar cache
const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
}

// Funcao para limpar blobs antigos (manter apenas os 2 mais recentes)
async function cleanupOldBlobs() {
  try {
    const { blobs } = await list({ prefix: ORDERS_PREFIX })
    if (blobs.length > 2) {
      const sorted = blobs.sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )
      // Deletar todos exceto os 2 mais recentes
      const toDelete = sorted.slice(2)
      for (const blob of toDelete) {
        await del(blob.url)
      }
    }
  } catch (error) {
    console.error("[Cleanup] Erro ao limpar blobs antigos:", error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const password = url.searchParams.get("password")
    const includeHistory = url.searchParams.get("includeHistory") === "true"

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders })
    }

    // Buscar arquivo de pedidos
    const { blobs } = await list({ prefix: ORDERS_PREFIX })

    if (blobs.length === 0) {
      return NextResponse.json({ success: true, orders: [], financialHistory: [] }, { headers: noCacheHeaders })
    }

    // Pegar o mais recente
    const latestBlob = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0]

    const result = await get(latestBlob.pathname, { access: "private" })
    
    let financialHistory: Array<{ id: string, total: number, paymentMethod: string, createdAt: string, confirmedAt?: string, deletedAt: string }> = []
    
    // Carregar historico financeiro se solicitado
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

    if (result && result.stream) {
      const text = await new Response(result.stream).text()
      let orders = JSON.parse(text) as Order[]
      
      // Deduplicar pedidos por ID (manter a versao mais recente de cada)
      const orderMap = new Map<string, Order>()
      for (const order of orders) {
        const existing = orderMap.get(order.id)
        if (!existing) {
          orderMap.set(order.id, order)
        } else {
          // Manter a versao com status mais avancado ou mais recente
          const existingDate = new Date(existing.createdAt).getTime()
          const orderDate = new Date(order.createdAt).getTime()
          // Priorizar: cancelled > completed > delivering > preparing > confirmed > pending
          const statusPriority: Record<string, number> = { cancelled: 6, completed: 5, delivering: 4, preparing: 3, confirmed: 2, pending: 1 }
          const existingPriority = statusPriority[existing.status] || 0
          const orderPriority = statusPriority[order.status] || 0
          
          if (orderPriority > existingPriority || (orderPriority === existingPriority && orderDate > existingDate)) {
            orderMap.set(order.id, order)
          }
        }
      }
      orders = Array.from(orderMap.values())
      
      return NextResponse.json({ success: true, orders, financialHistory }, { headers: noCacheHeaders })
    }

    return NextResponse.json({ success: true, orders: [], financialHistory }, { headers: noCacheHeaders })
  } catch (error) {
    console.error("[Orders GET] Erro:", error)
    return NextResponse.json({ success: true, orders: [] }, { headers: noCacheHeaders })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order } = body

    if (!order) {
      return NextResponse.json({ error: "Order is required" }, { status: 400 })
    }

    // Carregar pedidos existentes
    let orders: Order[] = []
    try {
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
    } catch {
      // Sem pedidos anteriores
    }

    // Determinar se e PIX automatico
    const isPixAutomatic = order.paymentMethod === "PIX Asaas" || order.isPixAutomatic

    // Usar o ID publico que vem do frontend (PK...) ou gerar um interno
    const publicOrderId = order.orderId || order.id || `ORD-${Date.now()}`
    
    // Verificar se pedido ja existe (para evitar duplicacao)
    const existingOrderIndex = orders.findIndex((o) => o.id === publicOrderId)
    if (existingOrderIndex !== -1) {
      // Pedido ja existe, retornar o existente sem duplicar
      console.log("[Orders POST] Pedido ja existe, ignorando duplicacao:", publicOrderId)
      return NextResponse.json({ success: true, order: orders[existingOrderIndex], duplicate: true })
    }

    // Adicionar novo pedido
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
      paymentStatus: isPixAutomatic ? "pending" : "pending",
      createdAt: new Date().toISOString(),
      isPixAutomatic,
      asaasPaymentId: order.asaasPaymentId,
      asaasPixCode: order.asaasPixCode,
      asaasQrCodeUrl: order.asaasQrCodeUrl,
      manuallyConfirmed: false,
      archived: false,
    }

    orders.unshift(newOrder)

    // Salvar
    const timestamp = Date.now()
    const filename = `${ORDERS_PREFIX}${timestamp}.json`

    await put(filename, JSON.stringify(orders, null, 2), {
      access: "private",
      contentType: "application/json",
    })

    // Limpar blobs antigos
    await cleanupOldBlobs()

    return NextResponse.json({ success: true, order: newOrder })
  } catch (error) {
    console.error("[Orders POST] Erro:", error)
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}

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

    // Atualizar pedido
    const orderIndex = orders.findIndex((o) => o.id === orderId)
    if (orderIndex === -1) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Atualizar campos conforme fornecido
    if (status !== undefined) {
      // Validar que o status so pode avancar (exceto para cancelled e voltar para preparing)
      const statusOrder: Record<string, number> = { 
        pending: 1, 
        confirmed: 2, 
        preparing: 3, 
        delivering: 4, 
        completed: 5, 
        cancelled: 0 // Cancelado pode vir de qualquer estado
      }
      const currentStatusOrder = statusOrder[orders[orderIndex].status] || 0
      const newStatusOrder = statusOrder[status] || 0
      
      // Permitir: avanco normal, cancelamento, ou voltar para preparing (problema na entrega)
      const isValidTransition = 
        status === "cancelled" || // Sempre pode cancelar
        status === "preparing" || // Sempre pode voltar para preparo (problema entrega)
        newStatusOrder >= currentStatusOrder // Avanco normal
      
      if (!isValidTransition) {
        console.log(`[Orders PATCH] Transicao de status bloqueada: ${orders[orderIndex].status} -> ${status}`)
        return NextResponse.json({ 
          error: "Invalid status transition", 
          currentStatus: orders[orderIndex].status,
          attemptedStatus: status 
        }, { status: 400 })
      }
      
      orders[orderIndex].status = status
      // Se mudou para "delivering", salvar horario de saida
      if (status === "delivering") {
        orders[orderIndex].saiuParaEntregaEm = new Date().toISOString()
      }
    }
    if (paymentStatus !== undefined) {
      // Nunca regredir de confirmed para pending
      if (orders[orderIndex].paymentStatus === "confirmed" && paymentStatus === "pending") {
        console.log(`[Orders PATCH] Impedida regressao de paymentStatus: confirmed -> pending`)
      } else {
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
        orders[orderIndex].status = "confirmed" // Mover para aguardando preparo
        orders[orderIndex].confirmedAt = new Date().toISOString()
        orders[orderIndex].paidAt = new Date().toISOString()
      }
    }
    if (archived !== undefined) {
      orders[orderIndex].archived = archived
    }
    // Campos do entregador
    if (entregadorId !== undefined) {
      orders[orderIndex].entregadorId = entregadorId
    }
    if (entregadorNome !== undefined) {
      orders[orderIndex].entregadorNome = entregadorNome
    }
    if (entregadorWhatsapp !== undefined) {
      orders[orderIndex].entregadorWhatsapp = entregadorWhatsapp
    }
    // Historico de entrega
    if (historicoEntrega !== undefined) {
      orders[orderIndex].historicoEntrega = historicoEntrega
    }
    // Limpar dados do entregador (quando volta para preparo)
    if (limparEntregador === true) {
      orders[orderIndex].entregadorId = undefined
      orders[orderIndex].entregadorNome = undefined
      orders[orderIndex].entregadorWhatsapp = undefined
      orders[orderIndex].saiuParaEntregaEm = undefined
    }

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
    console.error("[Orders PATCH] Erro:", error)
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    )
  }
}

// DELETE para arquivar/limpar relatorios ou excluir pedidos
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, action, orderIds } = body

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Excluir pedidos especificos
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
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

      const originalCount = orders.length
      const idsToDelete = new Set(orderIds)
      
      // Salvar historico financeiro dos pedidos finalizados antes de excluir
      const ordersToDelete = orders.filter(o => idsToDelete.has(o.id))
      const completedOrdersToArchive = ordersToDelete.filter(o => o.status === "completed" && o.paymentStatus === "confirmed")
      
      if (completedOrdersToArchive.length > 0) {
        // Carregar historico existente
        let financialHistory: Array<{ id: string, total: number, paymentMethod: string, createdAt: string, confirmedAt?: string, deletedAt: string }> = []
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
          // Sem historico anterior
        }
        
        // Adicionar pedidos excluidos ao historico
        for (const order of completedOrdersToArchive) {
          financialHistory.push({
            id: order.id,
            total: order.total,
            paymentMethod: order.paymentMethod,
            createdAt: order.createdAt,
            confirmedAt: order.confirmedAt,
            deletedAt: new Date().toISOString()
          })
        }
        
        // Salvar historico atualizado
        const historyTimestamp = Date.now()
        const historyFilename = `${FINANCIAL_HISTORY_PREFIX}${historyTimestamp}.json`
        await put(historyFilename, JSON.stringify(financialHistory, null, 2), {
          access: "private",
          contentType: "application/json",
        })
      }
      
      orders = orders.filter(o => !idsToDelete.has(o.id))
      const deletedCount = originalCount - orders.length

      // Salvar
      const timestamp = Date.now()
      const filename = `${ORDERS_PREFIX}${timestamp}.json`

      await put(filename, JSON.stringify(orders, null, 2), {
        access: "private",
        contentType: "application/json",
      })

      // Limpar blobs antigos
      await cleanupOldBlobs()

      return NextResponse.json({ 
        success: true, 
        message: `${deletedCount} pedido(s) excluido(s)`,
        deletedCount
      })
    }

    if (action === "archive_all") {
      // Marcar todos os pedidos como arquivados (nao apaga)
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

      // Arquivar todos
      orders = orders.map(o => ({ ...o, archived: true }))

      // Salvar
      const timestamp = Date.now()
      const filename = `${ORDERS_PREFIX}${timestamp}.json`

      await put(filename, JSON.stringify(orders, null, 2), {
        access: "private",
        contentType: "application/json",
      })

      return NextResponse.json({ success: true, message: "All orders archived" })
    }

    if (action === "cleanup_duplicates") {
      // Deduplicar e limpar pedidos bugados
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

      const originalCount = orders.length
      
      // Deduplicar por ID (manter versao com status mais avancado)
      const orderMap = new Map<string, Order>()
      for (const order of orders) {
        const existing = orderMap.get(order.id)
        if (!existing) {
          orderMap.set(order.id, order)
        } else {
          const statusPriority: Record<string, number> = { cancelled: 6, completed: 5, delivering: 4, preparing: 3, confirmed: 2, pending: 1 }
          const existingPriority = statusPriority[existing.status] || 0
          const orderPriority = statusPriority[order.status] || 0
          
          if (orderPriority > existingPriority) {
            orderMap.set(order.id, order)
          }
        }
      }
      orders = Array.from(orderMap.values())
      
      const removedCount = originalCount - orders.length

      // Salvar lista limpa
      const timestamp = Date.now()
      const filename = `${ORDERS_PREFIX}${timestamp}.json`

      await put(filename, JSON.stringify(orders, null, 2), {
        access: "private",
        contentType: "application/json",
      })

      // Limpar blobs antigos
      await cleanupOldBlobs()

      return NextResponse.json({ 
        success: true, 
        message: `Limpeza concluida. ${removedCount} duplicatas removidas.`,
        originalCount,
        finalCount: orders.length,
        removedCount
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[Orders DELETE] Erro:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
