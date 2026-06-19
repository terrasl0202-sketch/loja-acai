import { NextRequest, NextResponse } from "next/server"
import { getStoreIdFromRequest, getStoreIdBySlug } from "@/lib/api-store"
import { insertOrderIfNotExists } from "@/lib/supabase/order-insert"

const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"
const ASAAS_API_KEY = process.env.ASAAS_API_KEY

// CPF válido fixo para customers (pode ser configurado via env)
const DEFAULT_CPF = process.env.ASAAS_DEFAULT_CPF || "52998224725"

// Rate limiting simples - apenas 5 segundos
const pixRequests = new Map<string, number>()
const COOLDOWN_MS = 5000

interface CreatePixOrder {
  customerName?: string
  customerPhone?: string
  customerId?: string
  address?: string | null
  neighborhood?: string | null
  paymentMethod?: string
  itemsDetailed?: unknown[]
  total?: number
  cashbackUsed?: number
  pointsRewardUsed?: number
  // Slug da loja (checkout multi-loja em /loja/[slug]). Quando presente, o
  // backend resolve o store_id PELO SLUG (fonte autoritativa) e ignora qualquer
  // store_id que o cliente tente enviar livremente.
  storeSlug?: string
}

interface CreatePixRequest {
  value: number
  description: string
  customerName: string
  customerPhone: string
  externalReference?: string
  // Dados completos do pedido, persistidos no banco ANTES de exibir o PIX
  order?: CreatePixOrder
}

export async function POST(request: NextRequest) {
  if (!ASAAS_API_KEY) {
    console.error("[Asaas] ASAAS_API_KEY nao configurada")
    return NextResponse.json(
      { error: "Configuracao do servidor incompleta" },
      { status: 500 }
    )
  }

  try {
    const body: CreatePixRequest = await request.json()
    
    console.log("[Asaas] Dados recebidos:", {
      value: body.value,
      valueType: typeof body.value,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
    })

    // Validar telefone obrigatorio
    const cleanPhone = body.customerPhone?.replace(/\D/g, "") || ""
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return NextResponse.json(
        { error: "Telefone obrigatorio. Informe um telefone valido." },
        { status: 400 }
      )
    }

    // Resolver store_id de forma AUTORITATIVA e ANTECIPADA.
    // Se o checkout enviou storeSlug (fluxo /loja/[slug]), resolvemos pelo slug
    // no servidor ANTES de criar qualquer cobranca no Asaas. Slug invalido =>
    // 400 imediato (jamais cair no fallback da loja principal, o que misturaria
    // pedidos entre lojas, nem gerar cobranca orfa). Sem storeSlug => null aqui
    // e o store_id sera resolvido por host no bloco de persistencia (PK intacta).
    const storeSlug = typeof body.order?.storeSlug === "string" ? body.order.storeSlug.trim() : ""
    let resolvedStoreId: number | null = null
    if (storeSlug) {
      resolvedStoreId = await getStoreIdBySlug(storeSlug)
      if (!resolvedStoreId) {
        console.error("[Asaas] storeSlug invalido, abortando antes do pagamento:", storeSlug)
        return NextResponse.json(
          { error: "Loja invalida. Recarregue a pagina e tente novamente." },
          { status: 400 }
        )
      }
      console.log("[Asaas] store_id resolvido pelo slug:", storeSlug, "->", resolvedStoreId)
    }

    // Rate limiting leve (5 segundos)
    const lastRequest = pixRequests.get(cleanPhone)
    const now = Date.now()
    if (lastRequest && now - lastRequest < COOLDOWN_MS) {
      const waitTime = Math.ceil((COOLDOWN_MS - (now - lastRequest)) / 1000)
      return NextResponse.json(
        { error: `Aguarde ${waitTime} segundos e tente novamente.` },
        { status: 429 }
      )
    }
    pixRequests.set(cleanPhone, now)

    // Limpar rate limit antigos
    for (const [phone, time] of pixRequests.entries()) {
      if (now - time > 60000) pixRequests.delete(phone)
    }

    // 1. Buscar cliente existente por telefone
    let customerId: string | null = null
    let customerHasCpf = false

    try {
      console.log("[Asaas] Buscando cliente por telefone:", cleanPhone)
      const searchResponse = await fetch(
        `${ASAAS_API_URL}/customers?mobilePhone=${cleanPhone}`,
        {
          headers: { "access_token": ASAAS_API_KEY },
        }
      )

      const searchData = await searchResponse.json()
      console.log("[Asaas] Busca cliente:", searchResponse.status, searchData?.data?.length || 0, "encontrados")

      if (searchResponse.ok && searchData.data && searchData.data.length > 0) {
        const existingCustomer = searchData.data[0]
        customerId = existingCustomer.id
        customerHasCpf = !!existingCustomer.cpfCnpj
        console.log("[Asaas] Cliente existente:", customerId, "tem CPF:", customerHasCpf)
      }
    } catch (e) {
      console.log("[Asaas] Erro busca cliente (ignorado):", e)
    }

    // 2. Se cliente existe mas nao tem CPF, atualizar
    if (customerId && !customerHasCpf) {
      try {
        console.log("[Asaas] Atualizando cliente com CPF:", customerId)
        const updateResponse = await fetch(`${ASAAS_API_URL}/customers/${customerId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "access_token": ASAAS_API_KEY,
          },
          body: JSON.stringify({ cpfCnpj: DEFAULT_CPF }),
        })
        console.log("[Asaas] Atualização CPF:", updateResponse.status)
      } catch (e) {
        console.log("[Asaas] Erro ao atualizar CPF (ignorado):", e)
      }
    }

    // 3. Criar cliente se nao existir
    if (!customerId) {
      const customerPayload = {
        name: body.customerName || "Cliente PK Gostosuras",
        cpfCnpj: DEFAULT_CPF,
        mobilePhone: cleanPhone,
        notificationDisabled: true,
      }

      console.log("[Asaas] Criando cliente:", customerPayload)

      const createCustomerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": ASAAS_API_KEY,
        },
        body: JSON.stringify(customerPayload),
      })

      const customerResponseText = await createCustomerResponse.text()
      console.log("[Asaas] Resposta criar cliente:", createCustomerResponse.status, customerResponseText)

      if (!createCustomerResponse.ok) {
        return NextResponse.json(
          { error: "Erro ao criar cliente", details: customerResponseText },
          { status: 500 }
        )
      }

      const customerData = JSON.parse(customerResponseText)
      customerId = customerData.id
      console.log("[Asaas] Novo cliente criado:", customerId)
    }

    // 4. Criar cobranca PIX
    const nowDate = new Date()
    const dueDate = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000)
    const dueDateStr = dueDate.toISOString().split("T")[0]

    // Garantir valor numerico valido
    let paymentValue = Number(body.value)
    if (isNaN(paymentValue) || paymentValue <= 0) {
      console.error("[Asaas] Valor invalido:", body.value)
      return NextResponse.json(
        { error: "Valor do pagamento invalido" },
        { status: 400 }
      )
    }
    paymentValue = Math.round(paymentValue * 100) / 100

    const paymentPayload: Record<string, unknown> = {
      customer: customerId,
      billingType: "PIX",
      value: paymentValue,
      dueDate: dueDateStr,
      description: body.description || "Pedido P.K Gostosuras",
    }

    // Enviar externalReference = order_code para o Asaas, de modo que o webhook
    // consiga localizar o pedido por externalReference (alem do asaas_payment_id).
    if (body.externalReference) {
      paymentPayload.externalReference = body.externalReference
    }

    console.log("[Asaas] Payload pagamento:", JSON.stringify(paymentPayload))

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
      },
      body: JSON.stringify(paymentPayload),
    })

    const paymentResponseText = await paymentResponse.text()
    console.log("[Asaas] Resposta pagamento:", paymentResponse.status, paymentResponseText)

    if (!paymentResponse.ok) {
      return NextResponse.json(
        { error: "Erro ao criar cobranca PIX", details: paymentResponseText },
        { status: 500 }
      )
    }

    const paymentData = JSON.parse(paymentResponseText)
    console.log("[Asaas] Pagamento criado:", paymentData.id)

    // 4.1 PERSISTIR O PEDIDO NO BANCO ANTES DE EXIBIR O PIX
    // Garante que o pedido exista no Supabase com asaas_payment_id e order_code.
    // Se a gravacao falhar, NAO retornamos o QR Code (a tela de "aprovado" nunca
    // aparece sem pedido persistido).
    if (body.externalReference) {
      try {
        const orderInput = body.order || {}

        // store_id AUTORITATIVO: usa o que foi resolvido pelo slug no inicio
        // (fluxo /loja/[slug]); sem slug, resolve pelo host (PK/dominio). Nunca
        // confia em um store_id cru vindo do cliente.
        const storeId = resolvedStoreId ?? (await getStoreIdFromRequest(request))
        const result = await insertOrderIfNotExists({
          orderCode: body.externalReference,
          customerName: orderInput.customerName || body.customerName,
          customerPhone: orderInput.customerPhone || body.customerPhone,
          address: orderInput.address ?? null,
          neighborhood: orderInput.neighborhood ?? null,
          paymentMethod: orderInput.paymentMethod || "PIX Asaas",
          itemsDetailed: orderInput.itemsDetailed || [],
          total: Number(orderInput.total ?? paymentValue),
          status: "pending",
          paymentStatus: "pending",
          asaasPaymentId: paymentData.id,
          cashbackUsed: orderInput.cashbackUsed || 0,
          pointsRewardUsed: orderInput.pointsRewardUsed || 0,
          storeId,
        })
        console.log(
          "[Asaas] Pedido persistido:",
          result.id,
          result.duplicate ? "(ja existia)" : "(novo)"
        )
      } catch (persistError) {
        console.error("[Asaas] FALHA ao persistir pedido:", persistError)
        return NextResponse.json(
          {
            error:
              "Nao foi possivel registrar seu pedido. Tente novamente em instantes.",
            details:
              persistError instanceof Error
                ? persistError.message
                : String(persistError),
          },
          { status: 500 }
        )
      }
    } else {
      console.error("[Asaas] externalReference ausente - pedido nao sera persistido")
      return NextResponse.json(
        { error: "Referencia do pedido ausente. Tente novamente." },
        { status: 400 }
      )
    }

    // 5. Buscar QR Code PIX
    const pixResponse = await fetch(
      `${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`,
      {
        headers: { "access_token": ASAAS_API_KEY },
      }
    )

    const pixResponseText = await pixResponse.text()
    console.log("[Asaas] Resposta QR Code:", pixResponse.status)

    if (!pixResponse.ok) {
      return NextResponse.json(
        { error: "Erro ao buscar QR Code PIX", details: pixResponseText },
        { status: 500 }
      )
    }

    const pixData = JSON.parse(pixResponseText)

    if (!pixData.encodedImage || !pixData.payload) {
      console.error("[Asaas] QR Code incompleto:", pixData)
      return NextResponse.json(
        { error: "QR Code PIX incompleto" },
        { status: 500 }
      )
    }

    // Expiracao: 15 minutos
    const expiresAt = new Date(nowDate.getTime() + 15 * 60 * 1000).toISOString()

    console.log("[Asaas] PIX gerado com sucesso!")

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
    console.error("[Asaas] Erro geral:", error)
    return NextResponse.json(
      { error: "Erro interno ao processar pagamento", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
