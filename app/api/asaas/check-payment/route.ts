import { NextRequest, NextResponse } from "next/server"

const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"
const ASAAS_API_KEY = process.env.ASAAS_API_KEY

export async function GET(request: NextRequest) {
  try {
    if (!ASAAS_API_KEY) {
      return NextResponse.json(
        { error: "ASAAS_API_KEY nao configurada" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get("paymentId")

    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId obrigatorio" },
        { status: 400 }
      )
    }

    const response = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, {
      headers: {
        "access_token": ASAAS_API_KEY,
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Erro ao verificar status do pagamento" },
        { status: 500 }
      )
    }

    const data = await response.json()

    // Status possiveis: PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, etc.
    const isPaid = data.status === "RECEIVED" || data.status === "CONFIRMED"

    return NextResponse.json({
      paymentId: data.id,
      status: data.status,
      isPaid,
      value: data.value,
      paymentDate: data.paymentDate,
      confirmedDate: data.confirmedDate,
    })
  } catch (error) {
    console.error("Erro ao verificar pagamento:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
