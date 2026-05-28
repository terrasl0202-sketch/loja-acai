import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
}

// Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase nao configurado')
  return createClient(url, key)
}

// GET - Buscar pedidos do cliente por telefone
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const phone = url.searchParams.get("phone")
    
    if (!phone) {
      return NextResponse.json({ error: "Telefone obrigatorio" }, { status: 400, headers: noCacheHeaders })
    }
    
    // Normalizar telefone
    const normalizedPhone = phone.replace(/\D/g, "")
    
    console.log("[customers/orders] Buscando pedidos. phone:", normalizedPhone)

    const supabase = getSupabase()
    
    // Buscar por telefone - usar apenas colunas que existem
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_code, customer_name, customer_phone, address, neighborhood, payment_method, items, total, status, created_at')
      .or(`customer_phone.eq.${normalizedPhone},customer_phone.like.%${normalizedPhone}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error("[customers/orders] Erro Supabase:", error.message)
      return NextResponse.json({ error: error.message, success: false }, { status: 500, headers: noCacheHeaders })
    }

    console.log(`[customers/orders] ${orders?.length || 0} pedidos encontrados`)

    // Mapear para formato frontend seguro
    const safeOrders = (orders || []).map(order => ({
      id: String(order.id),
      orderCode: order.order_code || String(order.id),
      customerName: order.customer_name,
      items: order.items,
      total: Number(order.total),
      paymentMethod: order.payment_method,
      address: order.address,
      neighborhood: order.neighborhood,
      status: order.status,
      createdAt: order.created_at,
    }))

    return NextResponse.json({ 
      success: true, 
      orders: safeOrders,
      total: safeOrders.length,
      source: 'supabase'
    }, { headers: noCacheHeaders })
    
  } catch (error) {
    console.error("[customers/orders] Erro:", error)
    return NextResponse.json({ error: "Erro interno", success: false }, { status: 500, headers: noCacheHeaders })
  }
}
