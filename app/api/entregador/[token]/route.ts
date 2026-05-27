import { NextRequest, NextResponse } from "next/server"
import { get, list } from "@vercel/blob"
import type { SiteConfig, Order } from "@/lib/config-types"

const CONFIG_PREFIX = "pk-config-"
const ORDERS_PREFIX = "pk-orders-"

// Evitar cache
export const dynamic = "force-dynamic"
export const revalidate = 0

// GET: Verificar token e retornar dados do entregador (sem PIN)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Carregar config para encontrar entregador
    let config: SiteConfig | null = null
    const { blobs } = await list({ prefix: CONFIG_PREFIX })
    
    if (blobs.length > 0) {
      const latestBlob = blobs.sort(
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

    // Retornar apenas dados publicos (sem PIN)
    return NextResponse.json({
      success: true,
      entregador: {
        id: entregador.id,
        nome: entregador.nome,
        status: entregador.status,
      }
    })
  } catch (error) {
    console.error("Erro ao buscar entregador:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// POST: Autenticar com PIN e retornar pedidos
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { pin } = body

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

    // Filtrar pedidos do entregador (status delivering ou preparing com entregador atribuido)
    const pedidosEntregador = orders.filter(o => 
      o.entregadorId === entregador.id && 
      (o.status === "delivering" || (o.status === "preparing" && o.entregadorId))
    )

    // Retornar dados seguros (sem expor telefone completo do cliente para pedidos nao em entrega)
    const pedidosSeguros = pedidosEntregador.map(o => ({
      id: o.id,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      address: o.address,
      neighborhood: o.neighborhood,
      reference: o.reference,
      items: o.items,
      total: o.total,
      paymentMethod: o.paymentMethod,
      observation: o.observation,
      status: o.status,
      saiuParaEntregaEm: o.saiuParaEntregaEm,
      createdAt: o.createdAt,
    }))

    return NextResponse.json({
      success: true,
      entregador: {
        id: entregador.id,
        nome: entregador.nome,
      },
      pedidos: pedidosSeguros
    })
  } catch (error) {
    console.error("Erro ao autenticar entregador:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
