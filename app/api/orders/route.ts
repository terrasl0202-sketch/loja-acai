import { put, list, get } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { type Order } from "@/lib/config-types"

const ORDERS_PREFIX = "pk-orders-"
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

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const password = url.searchParams.get("password")

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders })
    }

    // Buscar arquivo de pedidos
    const { blobs } = await list({ prefix: ORDERS_PREFIX })

    if (blobs.length === 0) {
      return NextResponse.json({ success: true, orders: [] }, { headers: noCacheHeaders })
    }

    // Pegar o mais recente
    const latestBlob = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0]

    const result = await get(latestBlob.pathname, { access: "private" })

    if (result && result.stream) {
      const text = await new Response(result.stream).text()
      const orders = JSON.parse(text) as Order[]
      return NextResponse.json({ success: true, orders }, { headers: noCacheHeaders })
    }

    return NextResponse.json({ success: true, orders: [] }, { headers: noCacheHeaders })
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

    // Adicionar novo pedido
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
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
    const { password, orderId, status, paymentStatus, manuallyConfirmed, archived } = body

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
      orders[orderIndex].status = status
    }
    if (paymentStatus !== undefined) {
      orders[orderIndex].paymentStatus = paymentStatus
      if (paymentStatus === "confirmed") {
        orders[orderIndex].confirmedAt = new Date().toISOString()
      }
    }
    if (manuallyConfirmed !== undefined) {
      orders[orderIndex].manuallyConfirmed = manuallyConfirmed
      if (manuallyConfirmed) {
        orders[orderIndex].paymentStatus = "confirmed"
        orders[orderIndex].confirmedAt = new Date().toISOString()
      }
    }
    if (archived !== undefined) {
      orders[orderIndex].archived = archived
    }

    // Salvar
    const timestamp = Date.now()
    const filename = `${ORDERS_PREFIX}${timestamp}.json`

    await put(filename, JSON.stringify(orders, null, 2), {
      access: "private",
      contentType: "application/json",
    })

    return NextResponse.json({ success: true, order: orders[orderIndex] })
  } catch (error) {
    console.error("[Orders PATCH] Erro:", error)
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    )
  }
}

// DELETE para arquivar/limpar relatorios
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, action } = body

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[Orders DELETE] Erro:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
