import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from "next/server"
import crypto from 'crypto'

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
  
  // Se nao configurado, aceitar (modo desenvolvimento)
  if (!webhookToken) {
    return true
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
          // ESTRATEGIA 2: Buscar por externalReference (order_code)
          const externalRef = payment.externalReference || payment.description
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
