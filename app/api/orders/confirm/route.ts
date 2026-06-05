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

    console.log("[orders/confirm] effectiveOrderCode:", effectiveOrderCode || "(vazio)", "effectivePaymentId:", effectivePaymentId || "(vazio)")

    if (!effectivePaymentId && !effectiveOrderCode) {
      console.log("[orders/confirm] ERRO: nenhum identificador fornecido")
      return NextResponse.json({ error: "paymentId, orderId ou orderCode obrigatorio" }, { status: 400 })
    }

    const supabase = getSupabase()
    
    let order = null
    
    // ESTRATEGIA 1: Buscar por order_code (se fornecido)
    if (effectiveOrderCode) {
      console.log("[orders/confirm] Buscando por order_code:", effectiveOrderCode)
      const { data: orderByCode, error: codeError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_code', effectiveOrderCode)
        .single()
      
      if (!codeError && orderByCode) {
        order = orderByCode
        console.log("[orders/confirm] ENCONTRADO por order_code!")
      } else {
        console.log("[orders/confirm] Nao encontrado por order_code. Erro:", codeError?.message)
      }
    }

    // ESTRATEGIA 2: Buscar por asaas_payment_id (se order_code falhou ou nao foi fornecido)
    if (!order && effectivePaymentId) {
      console.log("[orders/confirm] Buscando por asaas_payment_id:", effectivePaymentId)
      const { data: orderByPaymentId, error: paymentError } = await supabase
        .from('orders')
        .select('*')
        .eq('asaas_payment_id', effectivePaymentId)
        .single()
      
      if (!paymentError && orderByPaymentId) {
        order = orderByPaymentId
        console.log("[orders/confirm] ENCONTRADO por asaas_payment_id!")
      } else {
        console.log("[orders/confirm] Nao encontrado por asaas_payment_id. Erro:", paymentError?.message)
      }
    }

    // Se ainda nao encontrou, retornar 404
    if (!order) {
      console.log("[orders/confirm] Pedido NAO encontrado. orderCode:", effectiveOrderCode, "paymentId:", effectivePaymentId)
      return NextResponse.json({ error: "Pedido nao encontrado", success: false }, { status: 404 })
    }

    console.log("[orders/confirm] Pedido encontrado! id:", order.id, "order_code:", order.order_code, "asaas_payment_id:", order.asaas_payment_id, "status atual:", order.status)

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

    // Atualizar status E payment_status para confirmed
    // Tambem marca como confirmado automaticamente se vier do Asaas
    const updateData: Record<string, unknown> = { 
      status: 'confirmed',
      payment_status: 'confirmed',
      paid_at: new Date().toISOString(),
    }
    
    // Se veio com paymentId do Asaas, marcar como confirmacao automatica
    if (effectivePaymentId) {
      updateData.confirmed_automatically = true
      updateData.asaas_payment_id = effectivePaymentId
    } else {
      // Confirmacao manual
      updateData.manually_confirmed = true
    }
    
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id)
      .select()
      .single()

    if (updateError) {
      console.error("[orders/confirm] Erro ao atualizar:", updateError.message)
      return NextResponse.json({ error: updateError.message, success: false }, { status: 500 })
    }

    console.log("[orders/confirm] SUCESSO! Pedido confirmado. id:", updated.id, "order_code:", updated.order_code, "novo status:", updated.status)

    // === DEDUZIR CASHBACK E PONTOS USADOS ===
    // Se o pedido usou cashback ou pontos, deduzir do saldo do cliente
    if (order.status === 'pending' && updated.customer_id) {
      const cashbackUsed = Number(updated.cashback_used) || 0
      const pointsRewardUsed = Number(updated.points_reward_used) || 0
      
      if (cashbackUsed > 0) {
        try {
          // Registrar uso do cashback
          await supabase.from('customer_cashback').insert({
            customer_id: updated.customer_id,
            order_id: updated.id,
            type: 'used',
            amount: -cashbackUsed,
            description: `Usado no pedido #${updated.order_code || updated.id}`
          })
          console.log("[orders/confirm] Cashback deduzido:", cashbackUsed)
        } catch (e) {
          console.error("[orders/confirm] Erro ao deduzir cashback:", e)
        }
      }
      
      if (pointsRewardUsed > 0) {
        try {
          // Buscar configuracoes de fidelidade para saber quantos pontos descontar
          const { data: loyaltySettings } = await supabase
            .from('loyalty_settings')
            .select('points_for_reward')
            .single()
          
          const pointsToDeduct = loyaltySettings?.points_for_reward || 500
          
          // Registrar uso dos pontos
          await supabase.from('customer_points').insert({
            customer_id: updated.customer_id,
            order_id: updated.id,
            type: 'used',
            points: -pointsToDeduct,
            description: `Trocado por R$${pointsRewardUsed.toFixed(2)} no pedido #${updated.order_code || updated.id}`
          })
          console.log("[orders/confirm] Pontos deduzidos:", pointsToDeduct)
        } catch (e) {
          console.error("[orders/confirm] Erro ao deduzir pontos:", e)
        }
      }
    }

    // === GERAR CASHBACK E PONTOS ===
    // Apenas para pedidos recem confirmados (status anterior era pending)
    if (order.status === 'pending' && updated.customer_id) {
      try {
        const { generateRewardsForOrder } = await import("@/app/api/premium/generate/route")
        await generateRewardsForOrder({
          orderId: updated.id,
          customerId: updated.customer_id,
          orderTotal: Number(updated.total),
        })
        console.log("[orders/confirm] Cashback/pontos gerados para pedido:", updated.id)
      } catch (rewardError) {
        // Nao falha a confirmacao se houver erro no Premium
        console.error("[orders/confirm] Erro ao gerar recompensas (nao critico):", rewardError)
      }
    }

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
