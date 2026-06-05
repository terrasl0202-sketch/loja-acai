import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey)
}

// GET - Listar avaliacoes (admin ou publicas)
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const password = url.searchParams.get("password")
  const onlyVisible = url.searchParams.get("visible") === "true"
  const customerId = url.searchParams.get("customerId")
  
  const supabase = getSupabase()
  
  try {
    let query = supabase
      .from('order_reviews')
      .select(`
        *,
        orders (
          order_number,
          customer_name,
          total,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
    
    // Se nao for admin, mostrar apenas visiveis
    if (password !== ADMIN_PASSWORD) {
      query = query.eq('visible', true)
    } else if (onlyVisible) {
      query = query.eq('visible', true)
    }
    
    // Filtrar por cliente
    if (customerId) {
      query = query.eq('customer_id', parseInt(customerId))
    }
    
    const { data, error } = await query.limit(100)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Calcular estatisticas
    const visibleReviews = data?.filter(r => r.visible) || []
    const stats = {
      total: visibleReviews.length,
      averageRating: visibleReviews.length > 0 
        ? (visibleReviews.reduce((s, r) => s + r.rating, 0) / visibleReviews.length).toFixed(1)
        : 0,
      averageProduct: visibleReviews.filter(r => r.product_rating).length > 0
        ? (visibleReviews.filter(r => r.product_rating).reduce((s, r) => s + r.product_rating, 0) / visibleReviews.filter(r => r.product_rating).length).toFixed(1)
        : 0,
      averageDelivery: visibleReviews.filter(r => r.delivery_rating).length > 0
        ? (visibleReviews.filter(r => r.delivery_rating).reduce((s, r) => s + r.delivery_rating, 0) / visibleReviews.filter(r => r.delivery_rating).length).toFixed(1)
        : 0,
      averageService: visibleReviews.filter(r => r.service_rating).length > 0
        ? (visibleReviews.filter(r => r.service_rating).reduce((s, r) => s + r.service_rating, 0) / visibleReviews.filter(r => r.service_rating).length).toFixed(1)
        : 0,
    }
    
    return NextResponse.json({ 
      success: true, 
      reviews: data || [],
      stats
    })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao buscar avaliacoes" }, { status: 500 })
  }
}

// POST - Criar avaliacao
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, customerId, rating, productRating, deliveryRating, serviceRating, comment } = body
    
    if (!orderId || !customerId || !rating) {
      return NextResponse.json({ error: "orderId, customerId e rating sao obrigatorios" }, { status: 400 })
    }
    
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating deve ser entre 1 e 5" }, { status: 400 })
    }
    
    const supabase = getSupabase()
    
    // Verificar se pedido existe e pertence ao cliente
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, order_status')
      .eq('id', orderId)
      .single()
    
    if (orderError || !order) {
      return NextResponse.json({ error: "Pedido nao encontrado" }, { status: 404 })
    }
    
    if (order.customer_id !== customerId) {
      return NextResponse.json({ error: "Pedido nao pertence a este cliente" }, { status: 403 })
    }
    
    // Verificar se pedido esta finalizado
    if (order.order_status !== 'completed') {
      return NextResponse.json({ error: "Apenas pedidos finalizados podem ser avaliados" }, { status: 400 })
    }
    
    // Verificar se ja existe avaliacao (indice unico ja protege, mas vamos dar mensagem amigavel)
    const { data: existing } = await supabase
      .from('order_reviews')
      .select('id')
      .eq('order_id', orderId)
      .single()
    
    if (existing) {
      return NextResponse.json({ error: "Este pedido ja foi avaliado" }, { status: 400 })
    }
    
    // Criar avaliacao
    const { data, error } = await supabase
      .from('order_reviews')
      .insert({
        order_id: orderId,
        customer_id: customerId,
        rating,
        product_rating: productRating || null,
        delivery_rating: deliveryRating || null,
        service_rating: serviceRating || null,
        comment: comment || null,
        visible: true
      })
      .select()
      .single()
    
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: "Este pedido ja foi avaliado" }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, review: data })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao criar avaliacao" }, { status: 500 })
  }
}

// PATCH - Atualizar visibilidade (admin)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, reviewId, visible } = body
    
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }
    
    if (!reviewId || typeof visible !== 'boolean') {
      return NextResponse.json({ error: "reviewId e visible sao obrigatorios" }, { status: 400 })
    }
    
    const supabase = getSupabase()
    
    const { data, error } = await supabase
      .from('order_reviews')
      .update({ visible })
      .eq('id', reviewId)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, review: data })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao atualizar avaliacao" }, { status: 500 })
  }
}
