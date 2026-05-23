import { list, get } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { type Order } from "@/lib/config-types"

const ORDERS_PREFIX = "pk-orders-"

export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
}

// GET - Buscar pedidos do cliente por telefone
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const phone = url.searchParams.get("phone")
    const customerId = url.searchParams.get("customerId")
    
    if (!phone && !customerId) {
      return NextResponse.json({ error: "Telefone ou ID obrigatorio" }, { status: 400, headers: noCacheHeaders })
    }
    
    // Normalizar telefone
    const normalizedPhone = phone ? phone.replace(/\D/g, "") : ""
    
    // Carregar pedidos
    const { blobs } = await list({ prefix: ORDERS_PREFIX })
    
    if (blobs.length === 0) {
      return NextResponse.json({ success: true, orders: [] }, { headers: noCacheHeaders })
    }
    
    const latestBlob = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0]
    
    const result = await get(latestBlob.pathname, { access: "private" })
    if (!result || !result.stream) {
      return NextResponse.json({ success: true, orders: [] }, { headers: noCacheHeaders })
    }
    
    const text = await new Response(result.stream).text()
    const allOrders: Order[] = JSON.parse(text)
    
    // Filtrar pedidos do cliente (por telefone ou customerId)
    const customerOrders = allOrders.filter(order => {
      const orderPhone = order.customerPhone?.replace(/\D/g, "") || ""
      
      // Verificar por customerId se fornecido
      if (customerId && order.customerId === customerId) {
        return true
      }
      
      // Verificar por telefone
      if (normalizedPhone && orderPhone === normalizedPhone) {
        return true
      }
      
      return false
    })
    
    // Ordenar por data (mais recente primeiro)
    customerOrders.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    // Limitar a 20 pedidos mais recentes
    const recentOrders = customerOrders.slice(0, 20)
    
    // Remover dados sensiveis (PIX codes, etc)
    const safeOrders = recentOrders.map(order => ({
      id: order.id,
      items: order.items,
      itemsDetailed: order.itemsDetailed,
      total: order.total,
      paymentMethod: order.paymentMethod,
      deliveryType: order.deliveryType,
      address: order.address,
      neighborhood: order.neighborhood,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      confirmedAt: order.confirmedAt,
      paidAt: order.paidAt,
      entregadorNome: order.entregadorNome,
      saiuParaEntregaEm: order.saiuParaEntregaEm,
      entregueEm: order.entregueEm,
    }))
    
    return NextResponse.json({ 
      success: true, 
      orders: safeOrders,
      total: customerOrders.length
    }, { headers: noCacheHeaders })
    
  } catch (error) {
    console.error("Erro ao buscar pedidos do cliente:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500, headers: noCacheHeaders })
  }
}
