import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface GenerateRewardsParams {
  orderId: number
  customerId: number
  orderTotal: number
  // store_id da LOJA do pedido. Obrigatorio: recompensas, settings e niveis VIP
  // sao isolados por loja. Sem isso, bonus/config de uma loja vazariam para outra.
  storeId: number
}

// Gerar cashback e pontos para um pedido confirmado
// PROTECAO ANTI-DUPLICATA: verifica se ja existe registro com order_id + type='earned'
// BONUS VIP: aplica bonus do nivel do cliente na geracao
export async function generateRewardsForOrder(params: GenerateRewardsParams): Promise<{
  cashbackGenerated: number
  pointsGenerated: number
  alreadyGenerated: boolean
}> {
  const { orderId, customerId, orderTotal, storeId } = params
  const supabase = getSupabase()

  let cashbackGenerated = 0
  let pointsGenerated = 0
  let alreadyGenerated = false

  try {
    // Buscar configuracoes e nivel VIP do cliente DESTA LOJA
    const [cashbackSettings, loyaltySettings, customerLevels] = await Promise.all([
      supabase.from("cashback_settings").select("*").eq("store_id", storeId).limit(1).single(),
      supabase.from("loyalty_settings").select("*").eq("store_id", storeId).limit(1).single(),
      supabase.from("customer_levels").select("*").eq("store_id", storeId).eq("active", true).order("sort_order", { ascending: true }),
    ])

    // Calcular total gasto pelo cliente NESTA LOJA para determinar nivel VIP
    const validStatuses = ['confirmed', 'preparing', 'delivering', 'completed']
    const { data: customerOrders } = await supabase
      .from("orders")
      .select("total")
      .eq("customer_id", customerId)
      .eq("store_id", storeId)
      .in("status", validStatuses)
    
    const totalSpent = customerOrders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0
    
    // Encontrar nivel VIP atual do cliente
    let vipCashbackBonus = 0
    let vipPointsBonus = 0
    
    if (customerLevels.data && customerLevels.data.length > 0) {
      for (const level of customerLevels.data) {
        const minSpent = Number(level.min_spent) || 0
        const maxSpent = level.max_spent !== null ? Number(level.max_spent) : Infinity
        
        if (totalSpent >= minSpent && (totalSpent < maxSpent || level.max_spent === null)) {
          vipCashbackBonus = Number(level.cashback_bonus_percentage) || 0
          vipPointsBonus = Number(level.points_bonus_percentage) || 0
          break
        }
      }
    }

    // === GERAR CASHBACK ===
    if (cashbackSettings.data?.enabled) {
      const { percentage, min_order_value } = cashbackSettings.data
      const finalPercentage = percentage + vipCashbackBonus // Aplica bonus VIP

      // Verificar se pedido atinge valor minimo
      if (orderTotal >= min_order_value) {
        // PROTECAO ANTI-DUPLICATA: verificar se ja existe
        const { data: existingCashback } = await supabase
          .from("customer_cashback")
          .select("id")
          .eq("order_id", orderId)
          .eq("type", "earned")
          .limit(1)
          .single()

        if (existingCashback) {
          alreadyGenerated = true
        } else {
          // Calcular cashback com bonus VIP
          cashbackGenerated = Number(((orderTotal * finalPercentage) / 100).toFixed(2))

          // Inserir registro (indice unico garante protecao extra)
          const bonusText = vipCashbackBonus > 0 ? ` (+${vipCashbackBonus}% VIP)` : ''
          const { error } = await supabase.from("customer_cashback").insert({
            customer_id: customerId,
            order_id: orderId,
            store_id: storeId,
            amount: cashbackGenerated,
            type: "earned",
            description: `Cashback de ${finalPercentage}%${bonusText} no pedido #${orderId}`,
          })

          if (error) {
            // Se erro de duplicata, ignorar silenciosamente
            if (error.code === "23505") {
              alreadyGenerated = true
              cashbackGenerated = 0
            } else {
              console.error("Erro ao gerar cashback:", error)
            }
          }
        }
      }
    }

    // === GERAR PONTOS ===
    if (loyaltySettings.data?.enabled) {
      const { points_per_real } = loyaltySettings.data
      // Aplica bonus VIP nos pontos
      const bonusMultiplier = 1 + (vipPointsBonus / 100)

      // PROTECAO ANTI-DUPLICATA: verificar se ja existe
      const { data: existingPoints } = await supabase
        .from("customer_points")
        .select("id")
        .eq("order_id", orderId)
        .eq("type", "earned")
        .limit(1)
        .single()

      if (existingPoints) {
        alreadyGenerated = true
      } else {
        // Calcular pontos com bonus VIP
        const basePoints = Math.floor(orderTotal * points_per_real)
        pointsGenerated = Math.floor(basePoints * bonusMultiplier)

        if (pointsGenerated > 0) {
          // Inserir registro (indice unico garante protecao extra)
          const bonusText = vipPointsBonus > 0 ? ` (+${vipPointsBonus}% VIP)` : ''
          const { error } = await supabase.from("customer_points").insert({
            customer_id: customerId,
            order_id: orderId,
            store_id: storeId,
            points: pointsGenerated,
            type: "earned",
            description: `${pointsGenerated} pontos ganhos${bonusText} no pedido #${orderId}`,
          })

          if (error) {
            // Se erro de duplicata, ignorar silenciosamente
            if (error.code === "23505") {
              alreadyGenerated = true
              pointsGenerated = 0
            } else {
              console.error("Erro ao gerar pontos:", error)
            }
          }
        }
      }
    }

    return { cashbackGenerated, pointsGenerated, alreadyGenerated }
  } catch (error) {
    console.error("Erro ao gerar recompensas:", error)
    return { cashbackGenerated: 0, pointsGenerated: 0, alreadyGenerated: false }
  }
}

// POST - Gerar recompensas manualmente (para testes/admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, orderId, customerId, orderTotal } = body

    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
    if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!orderId || !customerId || !orderTotal) {
      return NextResponse.json({ error: "orderId, customerId e orderTotal sao obrigatorios" }, { status: 400 })
    }

    // store_id resolvido a partir do PROPRIO pedido (fonte autoritativa no
    // servidor), nunca confiando em valor enviado pelo cliente.
    const supabase = getSupabase()
    const { data: order } = await supabase
      .from("orders")
      .select("store_id")
      .eq("id", orderId)
      .limit(1)
      .single()

    if (!order?.store_id) {
      return NextResponse.json({ error: "Pedido nao encontrado" }, { status: 404 })
    }

    const result = await generateRewardsForOrder({
      orderId,
      customerId,
      orderTotal,
      storeId: order.store_id,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("Erro ao gerar recompensas:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
