import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

// Endpoint para diagnostico de ambiente e banco de dados
// Protegido por senha admin
export async function GET(request: NextRequest) {
  const password = request.headers.get("x-admin-password")
  
  if (!ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD nao configurado" }, { status: 500 })
  }
  
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Senha admin incorreta" }, { status: 401 })
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  // Informacoes seguras sobre ambiente
  const envInfo = {
    nodeEnv: process.env.NODE_ENV || "unknown",
    vercelEnv: process.env.VERCEL_ENV || "local",
    isVercel: !!process.env.VERCEL,
    
    // Supabase - apenas info segura (hostname, nao URL completa)
    supabaseConfigured: !!(url && key),
    supabaseUrlHost: url ? new URL(url).hostname : null,
    supabaseProjectRef: url ? new URL(url).hostname.split('.')[0] : null,
    
    // Variaveis disponiveis (sem valores)
    envVarsAvailable: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      ADMIN_PASSWORD: !!ADMIN_PASSWORD,
      ASAAS_API_KEY: !!process.env.ASAAS_API_KEY,
    }
  }
  
  // Se Supabase nao configurado, retornar apenas info de ambiente
  if (!url || !key) {
    return NextResponse.json({
      success: false,
      error: "Supabase nao configurado",
      environment: envInfo,
      database: null
    })
  }
  
  try {
    const supabase = createClient(url, key)
    
    // Contar registros em cada tabela
    const [
      ordersResult,
      productsResult,
      customersResult,
      categoriesResult,
      couponsResult,
      neighborhoodsResult,
      entregadoresResult,
      bannersResult
    ] = await Promise.all([
      supabase.from('orders').select('id, created_at, order_status, payment_status', { count: 'exact', head: false }).order('created_at', { ascending: false }).limit(5),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('product_categories').select('id', { count: 'exact', head: true }),
      supabase.from('coupons').select('id', { count: 'exact', head: true }),
      supabase.from('neighborhoods').select('id', { count: 'exact', head: true }),
      supabase.from('delivery_drivers').select('id', { count: 'exact', head: true }),
      supabase.from('hero_banners').select('id', { count: 'exact', head: true }),
    ])
    
    // Ultimos pedidos para verificacao
    const recentOrders = ordersResult.data?.map(o => ({
      id: o.id,
      createdAt: o.created_at,
      orderStatus: o.order_status,
      paymentStatus: o.payment_status
    })) || []
    
    // Contar pedidos por status
    const { data: allOrders } = await supabase.from('orders').select('order_status, payment_status, total')
    
    const statusCounts: Record<string, number> = {}
    const paymentStatusCounts: Record<string, number> = {}
    let totalFaturamento = 0
    let pedidosInconsistentes = 0
    
    const statusesConfirmados = ['confirmed', 'preparing', 'delivering', 'completed']
    
    allOrders?.forEach(o => {
      const status = o.order_status || 'null'
      const paymentStatus = o.payment_status || 'null'
      
      statusCounts[status] = (statusCounts[status] || 0) + 1
      paymentStatusCounts[paymentStatus] = (paymentStatusCounts[paymentStatus] || 0) + 1
      
      // Faturamento = pedidos confirmados
      if (statusesConfirmados.includes(status)) {
        totalFaturamento += parseFloat(o.total) || 0
      }
      
      // Inconsistentes = status confirmado mas payment_status pendente
      if (statusesConfirmados.includes(status) && paymentStatus !== 'confirmed') {
        pedidosInconsistentes++
      }
    })
    
    return NextResponse.json({
      success: true,
      environment: envInfo,
      database: {
        tablesCount: {
          orders: ordersResult.count || 0,
          products: productsResult.count || 0,
          customers: customersResult.count || 0,
          categories: categoriesResult.count || 0,
          coupons: couponsResult.count || 0,
          neighborhoods: neighborhoodsResult.count || 0,
          entregadores: entregadoresResult.count || 0,
          banners: bannersResult.count || 0,
        },
        ordersByStatus: statusCounts,
        ordersByPaymentStatus: paymentStatusCounts,
        faturamentoTotal: totalFaturamento.toFixed(2),
        pedidosInconsistentes,
        recentOrders,
        lastOrderCreatedAt: recentOrders[0]?.createdAt || null,
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
      environment: envInfo,
      database: null
    }, { status: 500 })
  }
}
