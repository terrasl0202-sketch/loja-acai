import { NextRequest, NextResponse } from "next/server"

const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"
const ASAAS_API_KEY = process.env.ASAAS_API_KEY

interface CreatePixRequest {
  value: number
  description: string
  customerName: string
  customerCpf: string
  customerEmail?: string
  customerPhone?: string
  externalReference?: string
}

export async function POST(request: NextRequest) {
  console.log("[Asaas] Iniciando criacao de cobranca PIX")

  if (!ASAAS_API_KEY) {
    console.error("[Asaas] ASAAS_API_KEY nao configurada")
    return NextResponse.json(
      { error: "Configuracao do servidor incompleta" },
      { status: 500 }
    )
  }

  try {
    const body: CreatePixRequest = await request.json()
    console.log("[Asaas] Dados recebidos:", JSON.stringify(body, null, 2))

    // Validar CPF obrigatorio
    const cleanCpf = body.customerCpf?.replace(/\D/g, "") || ""
    if (cleanCpf.length !== 11) {
      console.error("[Asaas] CPF invalido:", cleanCpf)
      return NextResponse.json(
        { error: "CPF obrigatorio para gerar cobranca PIX. Informe um CPF valido com 11 digitos." },
        { status: 400 }
      )
    }

    // 1. Buscar cliente existente por CPF
    console.log("[Asaas] Buscando cliente por CPF:", cleanCpf)
    let customerId: string | null = null

    try {
      const searchResponse = await fetch(
        `${ASAAS_API_URL}/customers?cpfCnpj=${cleanCpf}`,
        {
          headers: {
            "access_token": ASAAS_API_KEY,
          },
        }
      )

      const searchData = await searchResponse.json()
      console.log("[Asaas] Busca cliente por CPF - Status:", searchResponse.status, "Resultado:", JSON.stringify(searchData))

      if (searchResponse.ok && searchData.data && searchData.data.length > 0) {
        customerId = searchData.data[0].id
        console.log("[Asaas] Cliente existente encontrado:", customerId)
      }
    } catch (err) {
      console.error("[Asaas] Erro ao buscar cliente:", err)
    }

    // 2. Criar cliente se nao existir
    if (!customerId) {
      console.log("[Asaas] Criando novo cliente com CPF:", cleanCpf)

      const customerPayload = {
        name: body.customerName || "Cliente PK Gostosuras",
        cpfCnpj: cleanCpf,
        email: body.customerEmail || `cliente_${Date.now()}@pkgostosuras.com`,
        mobilePhone: body.customerPhone?.replace(/\D/g, "") || undefined,
      }

      console.log("[Asaas] Payload criar cliente:", JSON.stringify(customerPayload))

      const createCustomerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": ASAAS_API_KEY,
        },
        body: JSON.stringify(customerPayload),
      })

      const customerResponseText = await createCustomerResponse.text()
      console.log("[Asaas] Resposta criar cliente - Status:", createCustomerResponse.status, "Body:", customerResponseText)

      if (!createCustomerResponse.ok) {
        return NextResponse.json(
          { 
            error: "Erro ao criar cliente no Asaas", 
            details: customerResponseText,
            status: createCustomerResponse.status 
          },
          { status: 500 }
        )
      }

      const customerData = JSON.parse(customerResponseText)
      customerId = customerData.id
      console.log("[Asaas] Novo cliente criado:", customerId)
    }

    // 3. Criar cobranca PIX
    const today = new Date()
    const dueDate = new Date(today.getTime() + 24 * 60 * 60 * 1000) // Amanha
    const dueDateStr = dueDate.toISOString().split("T")[0]

    // Garantir que o valor seja um numero com 2 casas decimais
    const paymentValue = Number(Number(body.value).toFixed(2))

    const paymentPayload = {
      customer: customerId,
      billingType: "PIX",
      value: paymentValue,
      dueDate: dueDateStr,
      description: body.description || "Pedido P.K Gostosuras",
      externalReference: body.externalReference,
    }

    console.log("[Asaas] Criando cobranca PIX:", JSON.stringify(paymentPayload))

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
      },
      body: JSON.stringify(paymentPayload),
    })

    const paymentResponseText = await paymentResponse.text()
    console.log("[Asaas] Resposta criar cobranca - Status:", paymentResponse.status, "Body:", paymentResponseText)

    if (!paymentResponse.ok) {
      return NextResponse.json(
        { 
          error: "Erro ao criar cobranca PIX", 
          details: paymentResponseText,
          status: paymentResponse.status 
        },
        { status: 500 }
      )
    }

    const paymentData = JSON.parse(paymentResponseText)
    console.log("[Asaas] Cobranca criada - ID:", paymentData.id)

    // 4. Buscar QR Code PIX
    console.log("[Asaas] Buscando QR Code para payment:", paymentData.id)

    const pixResponse = await fetch(
      `${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`,
      {
        headers: {
          "access_token": ASAAS_API_KEY,
        },
      }
    )

    const pixResponseText = await pixResponse.text()
    console.log("[Asaas] Resposta pixQrCode - Status:", pixResponse.status, "Body:", pixResponseText.substring(0, 500))

    if (!pixResponse.ok) {
      return NextResponse.json(
        { 
          error: "Erro ao buscar QR Code PIX", 
          details: pixResponseText,
          status: pixResponse.status,
          paymentId: paymentData.id
        },
        { status: 500 }
      )
    }

    const pixData = JSON.parse(pixResponseText)

    if (!pixData.encodedImage || !pixData.payload) {
      console.error("[Asaas] QR Code incompleto:", pixData)
      return NextResponse.json(
        { 
          error: "QR Code PIX incompleto", 
          details: pixData,
          paymentId: paymentData.id
        },
        { status: 500 }
      )
    }

    console.log("[Asaas] PIX gerado com sucesso!")

    return NextResponse.json({
      success: true,
      paymentId: paymentData.id,
      status: paymentData.status,
      value: paymentData.value,
      dueDate: paymentData.dueDate,
      pixQrCode: pixData.encodedImage,
      pixCopyPaste: pixData.payload,
      expirationDate: pixData.expirationDate,
    })

  } catch (error) {
    console.error("[Asaas] Erro geral:", error)
    return NextResponse.json(
      { 
        error: "Erro interno ao processar pagamento", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}
