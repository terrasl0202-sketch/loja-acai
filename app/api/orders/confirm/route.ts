import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from "next/server"
import { getStoreSlugById } from "@/lib/api-store"
import { requireStoreAuth } from "@/lib/store-session"
import { getInternalToken, INTERNAL_TOKEN_HEADER } from "@/lib/internal-token"
import { enforceRateLimit } from "@/lib/rate-limit"
import { getClientIp, logSecurityEvent } from "@/lib/security-log"

export const dynamic = "force-dynamic"

// Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase nao configurado')
  return createClient(url, key)
}

/**
 * Verifica, de forma autoritativa no servidor, se um pagamento Asaas esta
 * realmente pago E vinculado a este pedido. NUNCA confia na alegacao do cliente
 * de que pagou. Usado no caminho automatico de /api/orders/confirm.
 */
async function verifyAsaasPaymentForOrder(
  order: { asaas_payment_id?: string | null; order_code?: string | null },
  paymentId: string,
): Promise<{ ok: boolean; status: number; error?: string }> {
  // 1. Vinculo: se o pedido ja tem um asaas_payment_id, ele DEVE ser o mesmo.
  if (order.asaas_payment_id && order.asaas_payment_id !== paymentId) {
    return { ok: false, status: 403, error: "Pagamento nao corresponde ao pedido" }
  }

  const apiKey = process.env.ASAAS_API_KEY
  const apiUrl = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"
  if (!apiKey) return { ok: false, status: 500, error: "Asaas nao configurado" }

  try {
    const r = await fetch(`${apiUrl}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { access_token: apiKey },
    })
    if (!r.ok) return { ok: false, status: 402, error: "Pagamento nao confirmado" }
    const data = await r.json()
    const isPaid = data?.status === "RECEIVED" || data?.status === "CONFIRMED"
    if (!isPaid) return { ok: false, status: 402, error: "Pagamento ainda nao recebido" }
    // 2. Defesa extra quando nao havia vinculo previo: o externalReference do
    // pagamento (order_code) precisa bater com o pedido.
    if (
      !order.asaas_payment_id &&
      data?.externalReference &&
      order.order_code &&
      data.externalReference !== order.order_code
    ) {
      return { ok: false, status: 403, error: "Pagamento nao corresponde ao pedido" }
    }
    return { ok: true, status: 200 }
  } catch {
    return { ok: false, status: 502, error: "Falha ao verificar pagamento" }
  }
}

// Confirmar pagamento PIX automatico
export async function POST(request: NextRequest) {
  try {
    // Hardening: rate limit por IP para conter sondagem/abuso da rota de
    // confirmacao (fail-open). Generoso para nao atrapalhar o polling legitimo
    // do checkout.
    const limited = await enforceRateLimit(request, {
      action: "order-confirm",
      limit: 60,
      windowSec: 60,
    })
    if (limited) return limited

    const body = await request.json()
    
    // Log do payload completo recebido
    console.log("[orders/confirm] Payload recebido:", JSON.stringify(body))
    
    const { paymentId, orderId, asaasPaymentId, orderCode } = body
    
    // Aceita varios identificadores
    const effectivePaymentId = paymentId || asaasPaymentId
    const effectiveOrderCode = orderCode || orderId

    console.log("[orders/confirm] effectiveOrderCode:", effectiveOrderCode || "(vazio)", "effectivePaymentId:", effectivePaymentId || "(vazio)")

    if (!effectivePaymentId && !effectiveOrderCode) {
      console.log("[orders/confirm] ERRO: nenhum identificador fornecido")
      return NextResponse.json({ error: "paymentId, orderId ou orderCode obrigatorio" }, { status: 400 })
    }

    const supabase = getSupabase()
    
    let order = null
    
    // ESTRATEGIA 1: Buscar por order_code (se fornecido)
    if (effectiveOrderCode) {
      console.log("[orders/confirm] Buscando por order_code:", effectiveOrderCode)
      const { data: orderByCode, error: codeError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_code', effectiveOrderCode)
        .single()
      
      if (!codeError && orderByCode) {
        order = orderByCode
        console.log("[orders/confirm] ENCONTRADO por order_code!")
      } else {
        console.log("[orders/confirm] Nao encontrado por order_code. Erro:", codeError?.message)
      }
    }

    // ESTRATEGIA 2: Buscar por asaas_payment_id (se order_code falhou ou nao foi fornecido)
    if (!order && effectivePaymentId) {
      console.log("[orders/confirm] Buscando por asaas_payment_id:", effectivePaymentId)
      const { data: orderByPaymentId, error: paymentError } = await supabase
        .from('orders')
        .select('*')
        .eq('asaas_payment_id', effectivePaymentId)
        .single()
      
      if (!paymentError && orderByPaymentId) {
        order = orderByPaymentId
        console.log("[orders/confirm] ENCONTRADO por asaas_payment_id!")
      } else {
        console.log("[orders/confirm] Nao encontrado por asaas_payment_id. Erro:", paymentError?.message)
      }
    }

    // Se ainda nao encontrou, retornar 404
    if (!order) {
      console.log("[orders/confirm] Pedido NAO encontrado. orderCode:", effectiveOrderCode, "paymentId:", effectivePaymentId)
      return NextResponse.json({ error: "Pedido nao encontrado", success: false }, { status: 404 })
    }

    console.log("[orders/confirm] Pedido encontrado! id:", order.id, "order_code:", order.order_code, "asaas_payment_id:", order.asaas_payment_id, "status atual:", order.status)

    // === AUTORIZACAO (Fase de Seguranca 2) ===
    // A confirmacao NUNCA pode ser anonima por orderCode. Dois caminhos validos:
    //  - Automatico (tem paymentId): so confirma se o pagamento estiver REALMENTE
    //    pago no Asaas E vinculado a este pedido (verificacao server-side). Isso
    //    cobre tanto o webhook quanto o polling do checkout, sem confiar no client.
    //  - Manual (sem paymentId): exige admin autenticado DA LOJA DO PEDIDO.
    const orderStoreId = Number(order.store_id) || 0
    if (effectivePaymentId) {
      const verified = await verifyAsaasPaymentForOrder(order, effectivePaymentId)
      if (!verified.ok) {
        console.log("[orders/confirm] Verificacao Asaas falhou:", verified.error)
        return NextResponse.json({ success: false, error: verified.error }, { status: verified.status })
      }
    } else {
      const auth = await requireStoreAuth(request)
      if (!auth.ok) {
        console.log("[orders/confirm] Confirmacao manual sem sessao admin valida")
        return auth.response!
      }
      if (!orderStoreId || auth.storeId !== orderStoreId) {
        logSecurityEvent("cross_tenant", {
          ip: getClientIp(request),
          route: "orders/confirm",
          storeId: auth.storeId,
          detail: `admin loja ${auth.storeId} tentou confirmar pedido da loja ${orderStoreId}`,
        })
        return NextResponse.json({ success: false, error: "Acesso negado a este pedido" }, { status: 403 })
      }
    }

    // Se ja esta confirmado, retornar sucesso sem atualizar
    if (order.status === 'confirmed' || order.status === 'preparing' || order.status === 'delivering' || order.status === 'completed') {
      console.log("[orders/confirm] Pedido ja confirmado, ignorando")
      return NextResponse.json({ 
        success: true, 
        order: {
          id: String(order.id),
          orderCode: order.order_code,
          status: order.status,
          customerName: order.customer_name,
        },
        message: 'Pedido ja confirmado',
        source: 'supabase'
      })
    }

    // Atualizar status E payment_status para confirmed
    // Tambem marca como confirmado automaticamente se vier do Asaas
    const updateData: Record<string, unknown> = { 
      status: 'confirmed',
      payment_status: 'confirmed',
      paid_at: new Date().toISOString(),
    }
    
    // Se veio com paymentId do Asaas, marcar como confirmacao automatica
    if (effectivePaymentId) {
      updateData.confirmed_automatically = true
      updateData.asaas_payment_id = effectivePaymentId
    } else {
      // Confirmacao manual
      updateData.manually_confirmed = true
    }
    
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id)
      .select()
      .single()

    if (updateError) {
      console.error("[orders/confirm] Erro ao atualizar:", updateError.message)
      return NextResponse.json({ error: updateError.message, success: false }, { status: 500 })
    }

    console.log("[orders/confirm] SUCESSO! Pedido confirmado. id:", updated.id, "order_code:", updated.order_code, "novo status:", updated.status)

    // === DEDUZIR CASHBACK E PONTOS USADOS ===
    // Se o pedido usou cashback ou pontos, deduzir do saldo do cliente
    if (order.status === 'pending' && updated.customer_id) {
      const cashbackUsed = Number(updated.cashback_used) || 0
      const pointsRewardUsed = Number(updated.points_reward_used) || 0
      
      if (cashbackUsed > 0) {
        try {
          // Registrar uso do cashback
          await supabase.from('customer_cashback').insert({
            customer_id: updated.customer_id,
            order_id: updated.id,
            store_id: updated.store_id,
            type: 'used',
            amount: -cashbackUsed,
            description: `Usado no pedido #${updated.order_code || updated.id}`
          })
          console.log("[orders/confirm] Cashback deduzido:", cashbackUsed)
        } catch (e) {
          console.error("[orders/confirm] Erro ao deduzir cashback:", e)
        }
      }
      
      if (pointsRewardUsed > 0) {
        try {
          // Buscar configuracoes de fidelidade para saber quantos pontos descontar
          const { data: loyaltySettings } = await supabase
            .from('loyalty_settings')
            .select('points_for_reward')
            .eq('store_id', updated.store_id)
            .limit(1)
            .single()
          
          const pointsToDeduct = loyaltySettings?.points_for_reward || 500
          
          // Registrar uso dos pontos
          await supabase.from('customer_points').insert({
            customer_id: updated.customer_id,
            order_id: updated.id,
            store_id: updated.store_id,
            type: 'used',
            points: -pointsToDeduct,
            description: `Trocado por R$${pointsRewardUsed.toFixed(2)} no pedido #${updated.order_code || updated.id}`
          })
          console.log("[orders/confirm] Pontos deduzidos:", pointsToDeduct)
        } catch (e) {
          console.error("[orders/confirm] Erro ao deduzir pontos:", e)
        }
      }
    }

    // === GERAR CASHBACK E PONTOS ===
    // Apenas para pedidos recem confirmados (status anterior era pending)
    if (order.status === 'pending' && updated.customer_id) {
      try {
        const { generateRewardsForOrder } = await import("@/app/api/premium/generate/route")
        await generateRewardsForOrder({
          orderId: updated.id,
          customerId: updated.customer_id,
          orderTotal: Number(updated.total),
          storeId: updated.store_id,
        })
        console.log("[orders/confirm] Cashback/pontos gerados para pedido:", updated.id)
      } catch (rewardError) {
        // Nao falha a confirmacao se houver erro no Premium
        console.error("[orders/confirm] Erro ao gerar recompensas (nao critico):", rewardError)
      }

      // === VERIFICAR GAMIFICACAO ===
      // Verificar conquistas, missoes, streaks e badges
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
        // Propagar o tenant: resolve o slug da loja do pedido e envia via header,
        // para a gamificacao operar na loja correta (e nao na principal).
        const gamHeaders: Record<string, string> = { "Content-Type": "application/json" }
        const storeSlug = updated.store_id ? await getStoreSlugById(updated.store_id) : null
        if (storeSlug) gamHeaders["x-store-slug"] = storeSlug
        // Origem confiavel: prova que esta chamada vem do backend (confirmacao
        // real de pedido), nao de um cliente arbitrario.
        gamHeaders[INTERNAL_TOKEN_HEADER] = getInternalToken()
        await fetch(`${baseUrl}/api/gamification/check`, {
          method: "POST",
          headers: gamHeaders,
          body: JSON.stringify({ 
            customerId: updated.customer_id,
            event: "order_confirmed"
          })
        })
        console.log("[orders/confirm] Gamificacao verificada para cliente:", updated.customer_id)
      } catch (gamificationError) {
        // Nao falha a confirmacao se houver erro na gamificacao
        console.error("[orders/confirm] Erro ao verificar gamificacao (nao critico):", gamificationError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      order: {
        id: String(updated.id),
        orderCode: updated.order_code,
        customerName: updated.customer_name,
        customerPhone: updated.customer_phone,
        total: Number(updated.total),
        paymentMethod: updated.payment_method,
        status: updated.status,
      },
      source: 'supabase'
    })

  } catch (error) {
    console.error("[orders/confirm] Erro:", error)
    return NextResponse.json(
      { error: "Failed to confirm payment", details: String(error) },
      { status: 500 }
    )
  }
}
