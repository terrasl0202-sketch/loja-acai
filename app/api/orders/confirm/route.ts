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
    
    // Log do payload completo recebido
    console.log("[orders/confirm] Payload recebido:", JSON.stringify(body))
    
    const { paymentId, orderId, asaasPaymentId, orderCode } = body
    
    // Aceita varios identificadores
    const effectivePaymentId = paymentId || asaasPaymentId
    const effectiveOrderCode = orderCode || orderId

    console.log("[orders/confirm] effectiveOrderCode:", effectiveOrderCode, "effectivePaymentId:", effectivePaymentId)

    if (!effectivePaymentId && !effectiveOrderCode) {
      console.log("[orders/confirm] ERRO: nenhum identificador fornecido")
      return NextResponse.json({ error: "paymentId, orderId ou orderCode obrigatorio" }, { status: 400 })
    }

    console.log("[orders/confirm] Confirmando pedido. paymentId:", effectivePaymentId, "orderCode:", effectiveOrderCode)

    const supabase = getSupabase()
    
    // BUSCAR APENAS POR order_code (string) - NAO misturar com id (BIGINT)
    let order = null
    
    if (effectiveOrderCode) {
      // Primeiro tentar por order_code (codigo publico como PK20260528...)
      const { data: orderByCode, error: codeError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_code', effectiveOrderCode)
        .single()
      
      if (!codeError && orderByCode) {
        order = orderByCode
        console.log("[orders/confirm] Pedido encontrado por order_code:", effectiveOrderCode)
      } else {
        // Se nao encontrou por order_code e o valor parece ser um numero, tentar por id
        const numericId = parseInt(effectiveOrderCode, 10)
        if (!isNaN(numericId)) {
          const { data: orderById, error: idError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', numericId)
            .single()
          
          if (!idError && orderById) {
            order = orderById
            console.log("[orders/confirm] Pedido encontrado por id numerico:", numericId)
          }
        }
      }
    }

    if (!order) {
      console.log("[orders/confirm] Pedido NAO encontrado. orderCode:", effectiveOrderCode)
      return NextResponse.json({ error: "Pedido nao encontrado", success: false }, { status: 404 })
    }

    console.log("[orders/confirm] Pedido encontrado! id:", order.id, "order_code:", order.order_code, "status atual:", order.status)

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

    console.log("[orders/confirm] SUCESSO! Pedido confirmado. id:", updated.id, "order_code:", updated.order_code, "novo status:", updated.status)

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
