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
      console.log("[Webhook Asaas] Pagamento confirmado! Atualizando Supabase...")
      
      const supabase = getSupabase()
      
      if (supabase) {
        // Buscar pedido pelo externalReference (que contem o order_code)
        // Asaas envia o externalReference que foi passado na criacao do pagamento
        const externalRef = payment.externalReference || payment.description
        
        if (externalRef) {
          // Tentar encontrar o pedido por order_code
          const { data: orders, error: searchError } = await supabase
            .from('orders')
            .select('id, order_code, status')
            .or(`order_code.eq.${externalRef},order_code.ilike.%${externalRef}%`)
            .limit(1)

          if (searchError) {
            console.error("[Webhook Asaas] Erro ao buscar pedido:", searchError.message)
          } else if (orders && orders.length > 0) {
            const order = orders[0]
            
            // Atualizar status do pedido para confirmed
            const { error: updateError } = await supabase
              .from('orders')
              .update({ status: 'confirmed' })
              .eq('id', order.id)

            if (updateError) {
              console.error("[Webhook Asaas] Erro ao atualizar pedido:", updateError.message)
            } else {
              console.log("[Webhook Asaas] Pedido atualizado com sucesso! ID:", order.id, "order_code:", order.order_code)
            }
          } else {
            console.log("[Webhook Asaas] Pedido nao encontrado para externalRef:", externalRef)
          }
        }
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
