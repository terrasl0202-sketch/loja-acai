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
  
  // Primeiro, tentar buscar cliente existente por email generico
  const genericEmail = `cliente_${Date.now()}@pkgostosuras.com`
  
  // Se tiver CPF valido (11 digitos), usar CPF
  if (cpf) {
    const cleanCpf = cpf.replace(/\D/g, "")
    if (cleanCpf.length === 11) {
      // Buscar cliente por CPF
      try {
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
            console.log("[Asaas] Cliente existente encontrado por CPF:", searchData.data[0].id)
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
            name: name || "Cliente PK Gostosuras",
            cpfCnpj: cleanCpf,
            email: email || genericEmail,
            mobilePhone: phone ? phone.replace(/\D/g, "") : undefined,
          }),
        })

        const responseText = await createResponse.text()
        console.log("[Asaas] Resposta criar cliente CPF:", createResponse.status, responseText)

        if (createResponse.ok) {
          const customerData = JSON.parse(responseText)
          return { id: customerData.id }
        }
      } catch (err) {
        console.error("[Asaas] Erro ao buscar/criar cliente por CPF:", err)
      }
    }
  }

  // Buscar cliente generico existente
  try {
    const searchGeneric = await fetch(
      `${ASAAS_API_URL}/customers?email=cliente@pkgostosuras.com`,
      {
        headers: {
          "access_token": ASAAS_API_KEY!,
        },
      }
    )

    if (searchGeneric.ok) {
      const searchData = await searchGeneric.json()
      if (searchData.data && searchData.data.length > 0) {
        console.log("[Asaas] Cliente generico existente:", searchData.data[0].id)
        return { id: searchData.data[0].id }
      }
    }
  } catch (err) {
    console.error("[Asaas] Erro ao buscar cliente generico:", err)
  }

  // Criar cliente generico
  try {
    const createGeneric = await fetch(`${ASAAS_API_URL}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY!,
      },
      body: JSON.stringify({
        name: name || "Cliente PK Gostosuras",
        email: "cliente@pkgostosuras.com",
      }),
    })

    const responseText = await createGeneric.text()
    console.log("[Asaas] Resposta criar cliente generico:", createGeneric.status, responseText)

    if (createGeneric.ok) {
      const customerData = JSON.parse(responseText)
      return { id: customerData.id }
    }

    return { id: null, error: responseText }
  } catch (err) {
    console.error("[Asaas] Erro ao criar cliente generico:", err)
    return { id: null, error: String(err) }
  }
}

export async function POST(request: NextRequest) {
  console.log("[Asaas] === Iniciando criacao de PIX ===")
  
  try {
    if (!ASAAS_API_KEY) {
      console.error("[Asaas] ERRO: ASAAS_API_KEY nao configurada")
      return NextResponse.json(
        { error: "Configuracao do sistema de pagamento incompleta" },
        { status: 500 }
      )
    }

    const body: CreatePixRequest = await request.json()
    const { value, description, customerName, customerCpf, customerEmail, customerPhone, externalReference } = body

    console.log("[Asaas] Dados recebidos:", { 
      value, 
      customerName, 
      hasEmail: !!customerEmail,
      hasCpf: !!customerCpf,
      hasPhone: !!customerPhone,
      externalReference 
    })

    if (!value || value <= 0) {
      console.error("[Asaas] ERRO: Valor invalido:", value)
      return NextResponse.json(
        { error: "Valor invalido para cobranca" },
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
      console.error("[Asaas] ERRO: Falha ao obter customer:", customerResult.error)
      return NextResponse.json(
        { 
          error: "Erro ao processar dados do cliente", 
          details: customerResult.error 
        },
        { status: 500 }
      )
    }

    console.log("[Asaas] Customer ID obtido:", customerResult.id)

    // Criar cobranca PIX
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1)
    const dueDateStr = dueDate.toISOString().split("T")[0]

    const paymentBody = {
      customer: customerResult.id,
      billingType: "PIX",
      value: Number(value.toFixed(2)),
      dueDate: dueDateStr,
      description: description || "Pedido PK Gostosuras",
      externalReference: externalReference || `pedido_${Date.now()}`,
    }

    console.log("[Asaas] Criando cobranca PIX:", JSON.stringify(paymentBody))

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
      },
      body: JSON.stringify(paymentBody),
    })

    const paymentText = await paymentResponse.text()
    console.log("[Asaas] Resposta payments:", paymentResponse.status, paymentText)

    if (!paymentResponse.ok) {
      console.error("[Asaas] ERRO ao criar payment - Status:", paymentResponse.status)
      return NextResponse.json(
        { 
          error: "Erro ao criar cobranca PIX", 
          details: paymentText,
          httpStatus: paymentResponse.status 
        },
        { status: 500 }
      )
    }

    const paymentData = JSON.parse(paymentText)
    console.log("[Asaas] Payment criado com sucesso - ID:", paymentData.id, "Status:", paymentData.status)

    // Aguardar um momento para o PIX ser gerado
    await new Promise(resolve => setTimeout(resolve, 500))

    // Buscar QR Code PIX
    console.log("[Asaas] Buscando QR Code para payment:", paymentData.id)
    
    const pixResponse = await fetch(
      `${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`,
      {
        headers: {
          "access_token": ASAAS_API_KEY,
        },
      }
    )

    const pixText = await pixResponse.text()
    console.log("[Asaas] Resposta pixQrCode - Status:", pixResponse.status)
    console.log("[Asaas] Resposta pixQrCode - Body (primeiros 500 chars):", pixText.substring(0, 500))

    if (!pixResponse.ok) {
      console.error("[Asaas] ERRO ao buscar QR Code - Status:", pixResponse.status)
      return NextResponse.json(
        { 
          error: "Erro ao gerar QR Code PIX", 
          details: pixText,
          httpStatus: pixResponse.status,
          paymentId: paymentData.id
        },
        { status: 500 }
      )
    }

    let pixData
    try {
      pixData = JSON.parse(pixText)
    } catch {
      console.error("[Asaas] ERRO: Resposta pixQrCode nao e JSON valido")
      return NextResponse.json(
        { 
          error: "Resposta invalida do servidor de pagamento", 
          details: pixText.substring(0, 200)
        },
        { status: 500 }
      )
    }

    // Verificar campos obrigatorios
    if (!pixData.encodedImage) {
      console.error("[Asaas] ERRO: encodedImage ausente na resposta")
      return NextResponse.json(
        { 
          error: "QR Code nao gerado pelo servidor", 
          details: "Campo encodedImage ausente",
          responseKeys: Object.keys(pixData)
        },
        { status: 500 }
      )
    }

    if (!pixData.payload) {
      console.error("[Asaas] ERRO: payload ausente na resposta")
      return NextResponse.json(
        { 
          error: "Codigo PIX copia e cola nao gerado", 
          details: "Campo payload ausente",
          responseKeys: Object.keys(pixData)
        },
        { status: 500 }
      )
    }

    console.log("[Asaas] === PIX gerado com SUCESSO ===")
    console.log("[Asaas] paymentId:", paymentData.id)
    console.log("[Asaas] status:", paymentData.status)
    console.log("[Asaas] value:", paymentData.value)
    console.log("[Asaas] encodedImage length:", pixData.encodedImage.length)
    console.log("[Asaas] payload length:", pixData.payload.length)
    console.log("[Asaas] expirationDate:", pixData.expirationDate)

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
    console.error("[Asaas] ERRO INTERNO:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
