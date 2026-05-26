import { list, get } from "@vercel/blob"
import { createClient } from '@supabase/supabase-js'
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
    const customerId = url.searchParams.get("customerId")
    
    if (!phone && !customerId) {
      return NextResponse.json({ error: "Telefone ou ID obrigatorio" }, { status: 400, headers: noCacheHeaders })
    }
    
    // Normalizar telefone
    const normalizedPhone = phone ? phone.replace(/\D/g, "") : ""
    
    console.log("[customers/orders] Buscando pedidos. phone:", normalizedPhone, "customerId:", customerId)

    // Tentar Supabase primeiro
    try {
      const supabase = getSupabase()
      
      if (!supabase) {
        throw new Error('Supabase nao disponivel')
      }
      
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      // Buscar por telefone (normalizado)
      if (normalizedPhone) {
        // Busca flexivel por telefone
        query = query.or(`customer_phone.eq.${normalizedPhone},customer_phone.like.%${normalizedPhone}%`)
      }
      
      // Ou por customerId
      if (customerId) {
        query = query.eq('customer_id', customerId)
      }

      const { data: orders, error } = await query

      if (error) throw error

      console.log(`[customers/orders] ${orders?.length || 0} pedidos encontrados no Supabase`)

      // Mapear para formato frontend seguro
      const safeOrders = (orders || []).map(order => ({
        id: order.id,
        items: order.items_text,
        itemsDetailed: order.items_detailed,
        total: Number(order.total),
        paymentMethod: order.payment_method,
        deliveryType: order.delivery_type,
        address: order.customer_address,
        neighborhood: order.neighborhood,
        status: order.status,
        paymentStatus: order.payment_status,
        createdAt: order.created_at,
        confirmedAt: order.confirmed_at,
        paidAt: order.paid_at,
        entregadorNome: order.entregador_nome,
        saiuParaEntregaEm: order.saiu_para_entrega_em,
        entregueEm: order.entregue_em,
      }))

      return NextResponse.json({ 
        success: true, 
        orders: safeOrders,
        total: safeOrders.length,
        source: 'supabase'
      }, { headers: noCacheHeaders })

    } catch (supabaseError) {
      console.error("[customers/orders] Erro Supabase, tentando Blob:", supabaseError)

      // Fallback: Blob
      const { blobs } = await list({ prefix: ORDERS_PREFIX })
      
      if (blobs.length === 0) {
        return NextResponse.json({ success: true, orders: [], source: 'blob' }, { headers: noCacheHeaders })
      }
      
      const latestBlob = blobs.sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )[0]
      
      const result = await get(latestBlob.pathname, { access: "private" })
      if (!result || !result.stream) {
        return NextResponse.json({ success: true, orders: [], source: 'blob' }, { headers: noCacheHeaders })
      }
      
      const text = await new Response(result.stream).text()
      const allOrders: Order[] = JSON.parse(text)
      
      // Filtrar pedidos do cliente (por telefone ou customerId)
      const customerOrders = allOrders.filter(order => {
        const orderPhone = order.customerPhone?.replace(/\D/g, "") || ""
        
        if (customerId && order.customerId === customerId) return true
        if (normalizedPhone && orderPhone === normalizedPhone) return true
        
        return false
      })
      
      // Ordenar por data (mais recente primeiro)
      customerOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      // Limitar a 20 pedidos mais recentes
      const recentOrders = customerOrders.slice(0, 20)
      
      console.log(`[customers/orders] ${recentOrders.length} pedidos encontrados no Blob`)

      // Remover dados sensiveis
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
        total: customerOrders.length,
        source: 'blob'
      }, { headers: noCacheHeaders })
    }
    
  } catch (error) {
    console.error("[customers/orders] Erro:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500, headers: noCacheHeaders })
  }
}
