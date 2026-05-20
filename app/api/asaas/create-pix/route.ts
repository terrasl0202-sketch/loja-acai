import { NextRequest, NextResponse } from "next/server"

const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"
const ASAAS_API_KEY = process.env.ASAAS_API_KEY

interface CreatePixRequest {
  value: number
  description: string
  customerName: string
  customerEmail?: string
  customerCpf?: string
  customerPhone?: string
  externalReference?: string
}

async function findOrCreateCustomer(
  name: string,
  cpf?: string,
  email?: string,
  phone?: string
): Promise<{ id: string | null; error?: string }> {
  // Se tiver CPF valido, buscar/criar cliente
  if (cpf && cpf.length >= 11) {
    const cleanCpf = cpf.replace(/\D/g, "")
    
    // Buscar cliente existente por CPF
    const searchResponse = await fetch(
      `${ASAAS_API_URL}/customers?cpfCnpj=${cleanCpf}`,
      {
        headers: {
          "access_token": ASAAS_API_KEY!,
        },
      }
    )
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json()
      if (searchData.data && searchData.data.length > 0) {
        return { id: searchData.data[0].id }
      }
    }

    // Criar novo cliente com CPF
    const createResponse = await fetch(`${ASAAS_API_URL}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY!,
      },
      body: JSON.stringify({
        name: name || "Cliente",
        cpfCnpj: cleanCpf,
        email: email || undefined,
        mobilePhone: phone ? phone.replace(/\D/g, "") : undefined,
      }),
    })

    if (createResponse.ok) {
      const customerData = await createResponse.json()
      return { id: customerData.id }
    }

    const errorData = await createResponse.json()
    console.error("[v0] Erro ao criar cliente com CPF:", errorData)
  }

  // Buscar cliente generico existente ou criar um
  const genericEmail = "cliente@pkgostosuras.com"
  
  const searchGeneric = await fetch(
    `${ASAAS_API_URL}/customers?email=${genericEmail}`,
    {
      headers: {
        "access_token": ASAAS_API_KEY!,
      },
    }
  )

  if (searchGeneric.ok) {
    const searchData = await searchGeneric.json()
    if (searchData.data && searchData.data.length > 0) {
      return { id: searchData.data[0].id }
    }
  }

  // Criar cliente generico (sem CPF, apenas com email)
  const createGeneric = await fetch(`${ASAAS_API_URL}/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "access_token": ASAAS_API_KEY!,
    },
    body: JSON.stringify({
      name: "Cliente PK Gostosuras",
      email: genericEmail,
    }),
  })

  if (createGeneric.ok) {
    const customerData = await createGeneric.json()
    return { id: customerData.id }
  }

  const errorData = await createGeneric.json()
  console.error("[v0] Erro ao criar cliente generico:", errorData)
  return { id: null, error: JSON.stringify(errorData) }
}

export async function POST(request: NextRequest) {
  try {
    if (!ASAAS_API_KEY) {
      console.error("[v0] ASAAS_API_KEY nao configurada")
      return NextResponse.json(
        { error: "Configuracao do sistema de pagamento incompleta" },
        { status: 500 }
      )
    }

    const body: CreatePixRequest = await request.json()
    const { value, description, customerName, customerCpf, customerEmail, customerPhone, externalReference } = body

    console.log("[v0] Criando PIX:", { value, customerName, externalReference })

    if (!value || value <= 0) {
      return NextResponse.json(
        { error: "Valor invalido" },
        { status: 400 }
      )
    }

    // Buscar ou criar cliente
    const customerResult = await findOrCreateCustomer(
      customerName,
      customerCpf,
      customerEmail,
      customerPhone
    )

    if (!customerResult.id) {
      console.error("[v0] Falha ao obter customer:", customerResult.error)
      return NextResponse.json(
        { error: "Erro ao processar dados do cliente", details: customerResult.error },
        { status: 500 }
      )
    }

    console.log("[v0] Customer ID:", customerResult.id)

    // Criar cobranca PIX
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1)

    const paymentBody = {
      customer: customerResult.id,
      billingType: "PIX",
      value: value,
      dueDate: dueDate.toISOString().split("T")[0],
      description: description || "Pedido PK Gostosuras",
      externalReference: externalReference || undefined,
    }

    console.log("[v0] Criando payment:", paymentBody)

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
      },
      body: JSON.stringify(paymentBody),
    })

    const paymentData = await paymentResponse.json()

    if (!paymentResponse.ok) {
      console.error("[v0] Erro ao criar payment:", paymentResponse.status, paymentData)
      return NextResponse.json(
        { 
          error: "Erro ao criar cobranca PIX", 
          details: paymentData,
          status: paymentResponse.status 
        },
        { status: 500 }
      )
    }

    console.log("[v0] Payment criado:", paymentData.id)

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
      const pixError = await pixResponse.json()
      console.error("[v0] Erro ao buscar QR Code:", pixError)
      return NextResponse.json(
        { error: "Erro ao gerar QR Code PIX", details: pixError },
        { status: 500 }
      )
    }

    const pixData = await pixResponse.json()

    console.log("[v0] PIX gerado com sucesso")

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
    console.error("[v0] Erro interno ao criar PIX:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor", details: String(error) },
      { status: 500 }
    )
  }
}
