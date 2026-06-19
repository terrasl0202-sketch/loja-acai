import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from "next/server"
import crypto from 'crypto'
import { enforceRateLimit } from "@/lib/rate-limit"

// Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// Cache para idempotencia - evita processar mesmo evento duas vezes
const processedEvents = new Map<string, { processedAt: string; result: string }>()

// Limpa cache a cada 1 hora para evitar memory leak
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hora
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of processedEvents.entries()) {
    if (now - new Date(value.processedAt).getTime() > CACHE_TTL_MS) {
      processedEvents.delete(key)
    }
  }
}, CACHE_TTL_MS)

// Verifica assinatura do webhook Asaas
function verifyAsaasWebhook(request: NextRequest, body: string): boolean {
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN
  
  // Token obrigatorio: se nao configurado, rejeitar (evita confirmacao de pagamento falsa)
  if (!webhookToken) {
    console.error("[asaas/webhook] ASAAS_WEBHOOK_TOKEN nao configurado - requisicao rejeitada")
    return false
  }
  
  // Asaas envia o token no header 'asaas-access-token'
  const receivedToken = request.headers.get('asaas-access-token')
  
  if (receivedToken && receivedToken === webhookToken) {
    return true
  }
  
  // Alternativa: validar por HMAC se configurado
  const signature = request.headers.get('x-asaas-signature')
  if (signature && webhookToken) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookToken)
      .update(body)
      .digest('hex')
    return signature === expectedSignature
  }
  
  return false
}

// Gera ID unico para o evento (para idempotencia)
function getEventId(payment: { id?: string }, event: string): string {
  return `${payment?.id || 'unknown'}_${event}_${Date.now()}`
}

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    // Hardening: rate limit por IP para conter floods de webhook (fail-open).
    // A assinatura Asaas ja autentica; o limite e uma camada extra anti-abuso e
    // generoso para nao perder eventos legitimos. A idempotencia abaixo cobre
    // reentregas legitimas do Asaas.
    const limited = await enforceRateLimit(request, {
      action: "asaas-webhook",
      limit: 100,
      windowSec: 60,
    })
    if (limited) return limited

    // Ler body como texto para validacao
    const bodyText = await request.text()
    
    // Validar origem do webhook
    if (!verifyAsaasWebhook(request, bodyText)) {
      console.error(`[Webhook ${requestId}] Assinatura invalida - possivel fraude`)
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid webhook signature" },
        { status: 401 }
      )
    }
    
    // Parse do body
    let body: { event?: string; payment?: { id?: string; status?: string; externalReference?: string; description?: string } }
    try {
      body = JSON.parse(bodyText)
    } catch {
      console.error(`[Webhook ${requestId}] JSON invalido`)
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid JSON" },
        { status: 400 }
      )
    }
    
    const { event, payment } = body

    // Validar payload
    if (!event || typeof event !== 'string') {
      return NextResponse.json({ received: true, message: "No event type" })
    }

    if (!payment || !payment.id) {
      return NextResponse.json({ received: true, message: "No payment data" })
    }

    // Verificar idempotencia - mesmo pagamento + mesmo evento
    const idempotencyKey = `${payment.id}_${event}`
    const cached = processedEvents.get(idempotencyKey)
    if (cached) {
      console.log(`[Webhook ${requestId}] Evento ja processado (idempotencia): ${idempotencyKey}`)
      return NextResponse.json({ 
        received: true, 
        message: "Already processed",
        processedAt: cached.processedAt,
        result: cached.result
      })
    }

    const isPaid = 
      event === "PAYMENT_RECEIVED" || 
      event === "PAYMENT_CONFIRMED" ||
      payment.status === "RECEIVED" ||
      payment.status === "CONFIRMED"

    const now = new Date().toISOString()
    let result = "ignored"

    // Se pagamento confirmado, atualizar no Supabase
    if (isPaid) {
      const supabase = getSupabase()
      
      if (supabase) {
        let order = null
        
        // ESTRATEGIA 1: Buscar por asaas_payment_id
        const { data: orderByPaymentId } = await supabase
          .from('orders')
          .select('id, order_code, status, asaas_payment_id')
          .eq('asaas_payment_id', payment.id)
          .single()
        
        if (orderByPaymentId) {
          order = orderByPaymentId
        } else {
          // ESTRATEGIA 2: Buscar por externalReference (order_code).
          // create-pix agora envia externalReference = order_code. Como defesa,
          // se vier vazio, tenta extrair o codigo (PK.../ORD-...) da descricao
          // em vez de comparar a descricao inteira (que nunca casa com order_code).
          const codeFromDescription = payment.description?.match(/\b(PK\d+|ORD-\d+)\b/)?.[1]
          const externalRef = payment.externalReference || codeFromDescription
          if (externalRef) {
            const { data: orderByCode } = await supabase
              .from('orders')
              .select('id, order_code, status, asaas_payment_id')
              .eq('order_code', externalRef)
              .single()
            
            if (orderByCode) {
              order = orderByCode
            }
          }
        }
        
        if (order) {
          if (order.status === 'pending') {
            // Buscar dados completos do pedido para gerar recompensas
            const { data: fullOrder } = await supabase
              .from('orders')
              .select('id, customer_id, total, order_code, cashback_used, points_reward_used, store_id')
              .eq('id', order.id)
              .single()

            const { error: updateError } = await supabase
              .from('orders')
              .update({ 
                status: 'confirmed',
                payment_status: 'confirmed',
                confirmed_automatically: true,
                paid_at: now,
              })
              .eq('id', order.id)

            if (updateError) {
              console.error(`[Webhook ${requestId}] Erro ao atualizar:`, updateError.message)
              result = "error"
            } else {
              result = "confirmed"
              
              // === DEDUZIR CASHBACK E PONTOS USADOS ===
              if (fullOrder?.customer_id) {
                const cashbackUsed = Number(fullOrder.cashback_used) || 0
                const pointsRewardUsed = Number(fullOrder.points_reward_used) || 0
                
                if (cashbackUsed > 0) {
                  try {
                    await supabase.from('customer_cashback').insert({
                      customer_id: fullOrder.customer_id,
                      order_id: fullOrder.id,
                      store_id: fullOrder.store_id,
                      type: 'used',
                      amount: -cashbackUsed,
                      description: `Usado no pedido #${fullOrder.order_code || fullOrder.id}`
                    })
                    console.log(`[Webhook ${requestId}] Cashback deduzido:`, cashbackUsed)
                  } catch (e) {
                    console.error(`[Webhook ${requestId}] Erro deduzir cashback:`, e)
                  }
                }
                
                if (pointsRewardUsed > 0) {
                  try {
                    const { data: loyaltySettings } = await supabase
                      .from('loyalty_settings')
                      .select('points_for_reward')
                      .eq('store_id', fullOrder.store_id)
                      .limit(1)
                      .single()
                    
                    const pointsToDeduct = loyaltySettings?.points_for_reward || 500
                    
                    await supabase.from('customer_points').insert({
                      customer_id: fullOrder.customer_id,
                      order_id: fullOrder.id,
                      store_id: fullOrder.store_id,
                      type: 'used',
                      points: -pointsToDeduct,
                      description: `Trocado por R$${pointsRewardUsed.toFixed(2)} no pedido #${fullOrder.order_code || fullOrder.id}`
                    })
                    console.log(`[Webhook ${requestId}] Pontos deduzidos:`, pointsToDeduct)
                  } catch (e) {
                    console.error(`[Webhook ${requestId}] Erro deduzir pontos:`, e)
                  }
                }
              }
              
              // === GERAR CASHBACK E PONTOS ===
              if (fullOrder?.customer_id) {
                try {
                  const { generateRewardsForOrder } = await import("@/app/api/premium/generate/route")
                  await generateRewardsForOrder({
                    orderId: fullOrder.id,
                    customerId: fullOrder.customer_id,
                    orderTotal: Number(fullOrder.total),
                    storeId: fullOrder.store_id,
                  })
                  console.log(`[Webhook ${requestId}] Recompensas geradas para pedido:`, fullOrder.id)
                } catch (rewardError) {
                  console.error(`[Webhook ${requestId}] Erro recompensas (nao critico):`, rewardError)
                }
              }
            }
          } else {
            result = "already_processed"
          }
        } else {
          result = "order_not_found"
        }
      } else {
        result = "no_database"
      }
    }

    // Registrar no cache de idempotencia
    processedEvents.set(idempotencyKey, {
      processedAt: now,
      result
    })

    return NextResponse.json({ received: true, isPaid, result })
  } catch (error) {
    console.error(`[Webhook ${requestId}] Erro:`, error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

// Endpoint para verificar status de pagamento (protegido)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get("paymentId")

  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId obrigatorio" },
      { status: 400 }
    )
  }

  // Verificar no Supabase
  const supabase = getSupabase()
  if (supabase) {
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, payment_status, paid_at')
      .eq('asaas_payment_id', paymentId)
      .single()
    
    if (order) {
      return NextResponse.json({
        paymentId,
        status: order.payment_status || order.status,
        isPaid: order.payment_status === 'confirmed' || order.status === 'confirmed',
        confirmedAt: order.paid_at,
      })
    }
  }

  return NextResponse.json({
    paymentId,
    status: "PENDING",
    isPaid: false,
  })
}
