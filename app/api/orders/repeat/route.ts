import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey)
}

// GET - Buscar itens de um pedido para repetir
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const orderId = url.searchParams.get("orderId")
  
  if (!orderId) {
    return NextResponse.json({ error: "orderId e obrigatorio" }, { status: 400 })
  }
  
  const supabase = getSupabase()
  
  try {
    // Buscar pedido com items_detailed
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, items, items_detailed, total, customer_id')
      .eq('id', parseInt(orderId))
      .single()
    
    if (orderError || !order) {
      return NextResponse.json({ error: "Pedido nao encontrado" }, { status: 404 })
    }
    
    // Tentar parsear items_detailed se for string
    let itemsDetailed = order.items_detailed
    if (typeof itemsDetailed === 'string') {
      try {
        itemsDetailed = JSON.parse(itemsDetailed)
      } catch {
        itemsDetailed = null
      }
    }
    
    // Se nao tiver items_detailed, tentar parsear items
    if (!itemsDetailed && order.items) {
      // Format: "2x Acai 500ml, 1x Acai 300ml"
      const parsedItems: { name: string; quantity: number }[] = []
      const parts = order.items.split(',').map((s: string) => s.trim())
      for (const part of parts) {
        const match = part.match(/^(\d+)x\s+(.+)$/)
        if (match) {
          parsedItems.push({
            name: match[2],
            quantity: parseInt(match[1])
          })
        }
      }
      itemsDetailed = parsedItems
    }
    
    if (!itemsDetailed || !Array.isArray(itemsDetailed) || itemsDetailed.length === 0) {
      return NextResponse.json({ 
        error: "Nao foi possivel recuperar os itens deste pedido",
        order 
      }, { status: 400 })
    }
    
    // Buscar produtos ativos com os mesmos nomes
    const productNames = itemsDetailed.map((item: { name: string }) => item.name)
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, active')
      .in('name', productNames)
    
    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }
    
    // Mapear itens do pedido para produtos atuais
    const cartItems: { productId: number; name: string; quantity: number; currentPrice: number; available: boolean; reason?: string }[] = []
    const unavailableItems: { name: string; quantity: number; reason: string }[] = []
    
    for (const item of itemsDetailed as { id?: number; name: string; quantity: number; price?: number }[]) {
      const product = products?.find(p => p.name === item.name)
      
      if (!product) {
        unavailableItems.push({
          name: item.name,
          quantity: item.quantity,
          reason: "Produto nao encontrado"
        })
      } else if (!product.active) {
        unavailableItems.push({
          name: item.name,
          quantity: item.quantity,
          reason: "Produto indisponivel"
        })
      } else {
        cartItems.push({
          productId: product.id,
          name: product.name,
          quantity: item.quantity,
          currentPrice: product.price,
          available: true
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      cartItems,
      unavailableItems,
      hasUnavailable: unavailableItems.length > 0
    })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 500 })
  }
}
