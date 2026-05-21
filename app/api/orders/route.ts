import { put, list, get } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { type Order } from "@/lib/config-types"

const ORDERS_PREFIX = "pk-orders-"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "PK1040CAH"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const password = url.searchParams.get("password")

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Buscar arquivo de pedidos
    const { blobs } = await list({ prefix: ORDERS_PREFIX })

    if (blobs.length === 0) {
      return NextResponse.json({ success: true, orders: [] })
    }

    // Pegar o mais recente
    const latestBlob = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0]

    const result = await get(latestBlob.pathname, { access: "private" })

    if (result && result.stream) {
      const text = await new Response(result.stream).text()
      const orders = JSON.parse(text) as Order[]
      return NextResponse.json({ success: true, orders })
    }

    return NextResponse.json({ success: true, orders: [] })
  } catch (error) {
    console.error("[Orders GET] Erro:", error)
    return NextResponse.json({ success: true, orders: [] })
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

    // Adicionar novo pedido
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: order.items,
      total: order.total,
      paymentMethod: order.paymentMethod,
      deliveryType: order.deliveryType,
      address: order.address,
      status: "received",
      createdAt: new Date().toISOString(),
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
    const { password, orderId, status } = body

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!orderId || !status) {
      return NextResponse.json({ error: "orderId and status required" }, { status: 400 })
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

    // Atualizar status
    const orderIndex = orders.findIndex((o) => o.id === orderId)
    if (orderIndex === -1) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    orders[orderIndex].status = status

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
