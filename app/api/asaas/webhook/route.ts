import { NextRequest, NextResponse } from "next/server"

// Armazenamento temporario de status de pagamentos (em producao usar banco de dados)
// Este webhook atualiza o status quando a Asaas notifica

interface PaymentStatus {
  paymentId: string
  status: string
  confirmedAt?: string
}

// Map em memoria para demo - em producao usar Redis ou banco de dados
const paymentStatusMap = new Map<string, PaymentStatus>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Asaas envia o evento de pagamento
    const { event, payment } = body

    console.log("Webhook Asaas recebido:", event, payment?.id)

    if (payment && payment.id) {
      const isPaid = 
        event === "PAYMENT_RECEIVED" || 
        event === "PAYMENT_CONFIRMED" ||
        payment.status === "RECEIVED" ||
        payment.status === "CONFIRMED"

      paymentStatusMap.set(payment.id, {
        paymentId: payment.id,
        status: isPaid ? "CONFIRMED" : payment.status,
        confirmedAt: isPaid ? new Date().toISOString() : undefined,
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Erro no webhook:", error)
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 }
    )
  }
}

// Endpoint para verificar status via webhook (cache local)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get("paymentId")

  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId obrigatorio" },
      { status: 400 }
    )
  }

  const status = paymentStatusMap.get(paymentId)

  return NextResponse.json({
    paymentId,
    status: status?.status || "PENDING",
    isPaid: status?.status === "CONFIRMED" || status?.status === "RECEIVED",
    confirmedAt: status?.confirmedAt,
  })
}
