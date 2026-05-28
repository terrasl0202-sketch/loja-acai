import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from "next/server"

// Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// Cache local para status de pagamentos (backup)
const paymentStatusMap = new Map<string, { status: string; confirmedAt?: string }>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Asaas envia o evento de pagamento
    const { event, payment } = body

    console.log("[Webhook Asaas] Evento recebido:", event, "paymentId:", payment?.id)

    if (!payment || !payment.id) {
      return NextResponse.json({ received: true, message: "No payment data" })
    }

    const isPaid = 
      event === "PAYMENT_RECEIVED" || 
      event === "PAYMENT_CONFIRMED" ||
      payment.status === "RECEIVED" ||
      payment.status === "CONFIRMED"

    const now = new Date().toISOString()

    // Atualizar cache local
    paymentStatusMap.set(payment.id, {
      status: isPaid ? "CONFIRMED" : payment.status,
      confirmedAt: isPaid ? now : undefined,
    })

    // Se pagamento confirmado, tentar atualizar no Supabase
    if (isPaid) {
      console.log("[Webhook Asaas] Pagamento confirmado! paymentId:", payment.id, "externalRef:", payment.externalReference)
      
      const supabase = getSupabase()
      
      if (supabase) {
        let order = null
        
        // ESTRATEGIA 1: Buscar por asaas_payment_id (mais confiavel)
        console.log("[Webhook Asaas] Buscando por asaas_payment_id:", payment.id)
        const { data: orderByPaymentId, error: paymentIdError } = await supabase
          .from('orders')
          .select('id, order_code, status, asaas_payment_id')
          .eq('asaas_payment_id', payment.id)
          .single()
        
        if (!paymentIdError && orderByPaymentId) {
          order = orderByPaymentId
          console.log("[Webhook Asaas] ENCONTRADO por asaas_payment_id!")
        } else {
          console.log("[Webhook Asaas] Nao encontrado por asaas_payment_id. Erro:", paymentIdError?.message)
          
          // ESTRATEGIA 2: Buscar por externalReference (order_code)
          const externalRef = payment.externalReference || payment.description
          if (externalRef) {
            console.log("[Webhook Asaas] Buscando por order_code:", externalRef)
            const { data: orderByCode, error: codeError } = await supabase
              .from('orders')
              .select('id, order_code, status, asaas_payment_id')
              .eq('order_code', externalRef)
              .single()
            
            if (!codeError && orderByCode) {
              order = orderByCode
              console.log("[Webhook Asaas] ENCONTRADO por order_code!")
            } else {
              console.log("[Webhook Asaas] Nao encontrado por order_code. Erro:", codeError?.message)
            }
          }
        }
        
        if (order) {
          console.log("[Webhook Asaas] Pedido encontrado! ID:", order.id, "order_code:", order.order_code, "status atual:", order.status)
          
          if (order.status === 'pending') {
            const { error: updateError } = await supabase
              .from('orders')
              .update({ status: 'confirmed' })
              .eq('id', order.id)

            if (updateError) {
              console.error("[Webhook Asaas] Erro ao atualizar:", updateError.message)
            } else {
              console.log("[Webhook Asaas] SUCESSO! Pedido confirmado via webhook. ID:", order.id, "order_code:", order.order_code)
            }
          } else {
            console.log("[Webhook Asaas] Pedido ja estava:", order.status, "- ignorando")
          }
        } else {
          console.log("[Webhook Asaas] Pedido NAO encontrado para paymentId:", payment.id)
        }
      } else {
        console.error("[Webhook Asaas] Supabase nao configurado")
      }
    }

    return NextResponse.json({ received: true, isPaid })
  } catch (error) {
    console.error("[Webhook Asaas] Erro:", error)
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 }
    )
  }
}

// Endpoint para verificar status de pagamento
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get("paymentId")

  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId obrigatorio" },
      { status: 400 }
    )
  }

  // Verificar cache local
  const cachedStatus = paymentStatusMap.get(paymentId)

  return NextResponse.json({
    paymentId,
    status: cachedStatus?.status || "PENDING",
    isPaid: cachedStatus?.status === "CONFIRMED" || cachedStatus?.status === "RECEIVED",
    confirmedAt: cachedStatus?.confirmedAt,
  })
}
