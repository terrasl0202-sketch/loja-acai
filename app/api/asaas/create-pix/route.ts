import { NextRequest, NextResponse } from "next/server"

const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"
const ASAAS_API_KEY = process.env.ASAAS_API_KEY

// CPF valido fixo para criar customers (evita pedir CPF do cliente)
const DEFAULT_CPF = "00000000000"

// Rate limiting simples em memoria
const pixRequests = new Map<string, number>()
const COOLDOWN_MS = 30000 // 30 segundos entre requisicoes

interface CreatePixRequest {
  value: number
  description: string
  customerName: string
  customerPhone: string
  externalReference?: string
}

export async function POST(request: NextRequest) {
  if (!ASAAS_API_KEY) {
    return NextResponse.json(
      { error: "Configuracao do servidor incompleta" },
      { status: 500 }
    )
  }

  try {
    const body: CreatePixRequest = await request.json()

    // Validar telefone obrigatorio
    const cleanPhone = body.customerPhone?.replace(/\D/g, "") || ""
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return NextResponse.json(
        { error: "Telefone obrigatorio. Informe um telefone valido." },
        { status: 400 }
      )
    }

    // Rate limiting por telefone
    const lastRequest = pixRequests.get(cleanPhone)
    const now = Date.now()
    if (lastRequest && now - lastRequest < COOLDOWN_MS) {
      const waitTime = Math.ceil((COOLDOWN_MS - (now - lastRequest)) / 1000)
      return NextResponse.json(
        { error: `Aguarde ${waitTime} segundos antes de gerar outro PIX.` },
        { status: 429 }
      )
    }
    pixRequests.set(cleanPhone, now)

    // Limpar rate limit antigos (mais de 5 minutos)
    for (const [phone, time] of pixRequests.entries()) {
      if (now - time > 300000) pixRequests.delete(phone)
    }

    // 1. Buscar cliente existente por telefone
    let customerId: string | null = null

    try {
      const searchResponse = await fetch(
        `${ASAAS_API_URL}/customers?mobilePhone=${cleanPhone}`,
        {
          headers: { "access_token": ASAAS_API_KEY },
        }
      )

      const searchData = await searchResponse.json()

      if (searchResponse.ok && searchData.data && searchData.data.length > 0) {
        customerId = searchData.data[0].id
      }
    } catch {
      // Ignora erro de busca
    }

    // 2. Criar cliente se nao existir
    if (!customerId) {
      const customerPayload = {
        name: body.customerName || "Cliente PK Gostosuras",
        cpfCnpj: DEFAULT_CPF,
        mobilePhone: cleanPhone,
        notificationDisabled: true,
      }

      const createCustomerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": ASAAS_API_KEY,
        },
        body: JSON.stringify(customerPayload),
      })

      if (!createCustomerResponse.ok) {
        const errorText = await createCustomerResponse.text()
        return NextResponse.json(
          { error: "Erro ao criar cliente", details: errorText },
          { status: 500 }
        )
      }

      const customerData = await createCustomerResponse.json()
      customerId = customerData.id
    }

    // 3. Criar cobranca PIX (expira em 15 minutos)
    const now15 = new Date()
    const dueDate = new Date(now15.getTime() + 24 * 60 * 60 * 1000)
    const dueDateStr = dueDate.toISOString().split("T")[0]

    const paymentValue = Number(Number(body.value).toFixed(2))

    const paymentPayload = {
      customer: customerId,
      billingType: "PIX",
      value: paymentValue,
      dueDate: dueDateStr,
      description: body.description || "Pedido P.K Gostosuras",
      externalReference: body.externalReference,
    }

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
      },
      body: JSON.stringify(paymentPayload),
    })

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text()
      return NextResponse.json(
        { error: "Erro ao criar cobranca PIX", details: errorText },
        { status: 500 }
      )
    }

    const paymentData = await paymentResponse.json()

    // 4. Buscar QR Code PIX
    const pixResponse = await fetch(
      `${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`,
      {
        headers: { "access_token": ASAAS_API_KEY },
      }
    )

    if (!pixResponse.ok) {
      const errorText = await pixResponse.text()
      return NextResponse.json(
        { error: "Erro ao buscar QR Code PIX", details: errorText },
        { status: 500 }
      )
    }

    const pixData = await pixResponse.json()

    if (!pixData.encodedImage || !pixData.payload) {
      return NextResponse.json(
        { error: "QR Code PIX incompleto" },
        { status: 500 }
      )
    }

    // Calcular expiracao (15 minutos a partir de agora)
    const expiresAt = new Date(now15.getTime() + 15 * 60 * 1000).toISOString()

    return NextResponse.json({
      success: true,
      paymentId: paymentData.id,
      status: paymentData.status,
      value: paymentData.value,
      dueDate: paymentData.dueDate,
      pixQrCode: pixData.encodedImage,
      pixCopyPaste: pixData.payload,
      expiresAt,
    })

  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno ao processar pagamento", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
