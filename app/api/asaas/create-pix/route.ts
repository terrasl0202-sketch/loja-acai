import { NextRequest, NextResponse } from "next/server"

const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"
const ASAAS_API_KEY = process.env.ASAAS_API_KEY

interface CreatePixRequest {
  value: number
  description: string
  customerName: string
  customerEmail?: string
  externalReference?: string
}

export async function POST(request: NextRequest) {
  try {
    if (!ASAAS_API_KEY) {
      return NextResponse.json(
        { error: "ASAAS_API_KEY nao configurada" },
        { status: 500 }
      )
    }

    const body: CreatePixRequest = await request.json()
    const { value, description, customerName, externalReference } = body

    if (!value || value <= 0) {
      return NextResponse.json(
        { error: "Valor invalido" },
        { status: 400 }
      )
    }

    // Criar ou buscar cliente
    const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
      },
      body: JSON.stringify({
        name: customerName || "Cliente PK Gostosuras",
        cpfCnpj: "00000000000", // CPF generico para pedidos sem cadastro
      }),
    })

    let customerId: string

    if (customerResponse.ok) {
      const customerData = await customerResponse.json()
      customerId = customerData.id
    } else {
      // Buscar cliente existente
      const searchResponse = await fetch(
        `${ASAAS_API_URL}/customers?cpfCnpj=00000000000`,
        {
          headers: {
            "access_token": ASAAS_API_KEY,
          },
        }
      )
      const searchData = await searchResponse.json()
      if (searchData.data && searchData.data.length > 0) {
        customerId = searchData.data[0].id
      } else {
        return NextResponse.json(
          { error: "Erro ao criar cliente" },
          { status: 500 }
        )
      }
    }

    // Criar cobranca PIX
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1) // Vencimento em 1 dia

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: "PIX",
        value: value,
        dueDate: dueDate.toISOString().split("T")[0],
        description: description || "Pedido PK Gostosuras",
        externalReference: externalReference,
      }),
    })

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json()
      console.error("Erro Asaas:", errorData)
      return NextResponse.json(
        { error: "Erro ao criar cobranca PIX", details: errorData },
        { status: 500 }
      )
    }

    const paymentData = await paymentResponse.json()

    // Buscar QR Code PIX
    const pixResponse = await fetch(
      `${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`,
      {
        headers: {
          "access_token": ASAAS_API_KEY,
        },
      }
    )

    if (!pixResponse.ok) {
      return NextResponse.json(
        { error: "Erro ao gerar QR Code PIX" },
        { status: 500 }
      )
    }

    const pixData = await pixResponse.json()

    return NextResponse.json({
      success: true,
      paymentId: paymentData.id,
      status: paymentData.status,
      value: paymentData.value,
      pixQrCode: pixData.encodedImage,
      pixCopyPaste: pixData.payload,
      expirationDate: pixData.expirationDate,
    })
  } catch (error) {
    console.error("Erro ao criar PIX:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
