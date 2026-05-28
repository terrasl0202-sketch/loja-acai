import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase nao configurado')
  return createClient(url, key)
}

// Confirmar pagamento PIX automatico
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId, orderId, asaasPaymentId, orderCode } = body
    
    // Aceita varios identificadores
    const effectivePaymentId = paymentId || asaasPaymentId
    const effectiveOrderCode = orderCode || orderId

    if (!effectivePaymentId && !effectiveOrderCode) {
      return NextResponse.json({ error: "paymentId, orderId ou orderCode obrigatorio" }, { status: 400 })
    }

    console.log("[orders/confirm] Confirmando pedido. paymentId:", effectivePaymentId, "orderCode:", effectiveOrderCode)

    const supabase = getSupabase()
    
    // Buscar pedido por orderCode (mais confiavel) ou id
    let query = supabase.from('orders').select('*')
    
    if (effectiveOrderCode) {
      // Tentar primeiro por order_code, depois por id
      query = query.or(`order_code.eq.${effectiveOrderCode},id.eq.${effectiveOrderCode}`)
    }

    const { data: orders, error: fetchError } = await query.limit(1)

    if (fetchError) {
      console.error("[orders/confirm] Erro ao buscar:", fetchError.message)
      return NextResponse.json({ error: fetchError.message, success: false }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      console.log("[orders/confirm] Pedido nao encontrado")
      return NextResponse.json({ error: "Pedido nao encontrado", success: false }, { status: 404 })
    }

    const order = orders[0]
    console.log("[orders/confirm] Pedido encontrado:", order.id, "status atual:", order.status)

    // Se ja esta confirmado, retornar sucesso sem atualizar
    if (order.status === 'confirmed' || order.status === 'preparing' || order.status === 'delivering' || order.status === 'completed') {
      console.log("[orders/confirm] Pedido ja confirmado, ignorando")
      return NextResponse.json({ 
        success: true, 
        order: {
          id: String(order.id),
          orderCode: order.order_code,
          status: order.status,
          customerName: order.customer_name,
        },
        message: 'Pedido ja confirmado',
        source: 'supabase'
      })
    }

    // Atualizar status para confirmed
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', order.id)
      .select()
      .single()

    if (updateError) {
      console.error("[orders/confirm] Erro ao atualizar:", updateError.message)
      return NextResponse.json({ error: updateError.message, success: false }, { status: 500 })
    }

    console.log("[orders/confirm] Pedido confirmado com sucesso! ID:", updated.id)

    return NextResponse.json({ 
      success: true, 
      order: {
        id: String(updated.id),
        orderCode: updated.order_code,
        customerName: updated.customer_name,
        customerPhone: updated.customer_phone,
        total: Number(updated.total),
        paymentMethod: updated.payment_method,
        status: updated.status,
      },
      source: 'supabase'
    })

  } catch (error) {
    console.error("[orders/confirm] Erro:", error)
    return NextResponse.json(
      { error: "Failed to confirm payment", details: String(error) },
      { status: 500 }
    )
  }
}
