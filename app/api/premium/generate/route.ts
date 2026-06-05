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
}

// Gerar cashback e pontos para um pedido confirmado
// PROTECAO ANTI-DUPLICATA: verifica se ja existe registro com order_id + type='earned'
export async function generateRewardsForOrder(params: GenerateRewardsParams): Promise<{
  cashbackGenerated: number
  pointsGenerated: number
  alreadyGenerated: boolean
}> {
  const { orderId, customerId, orderTotal } = params
  const supabase = getSupabase()

  let cashbackGenerated = 0
  let pointsGenerated = 0
  let alreadyGenerated = false

  try {
    // Buscar configuracoes
    const [cashbackSettings, loyaltySettings] = await Promise.all([
      supabase.from("cashback_settings").select("*").limit(1).single(),
      supabase.from("loyalty_settings").select("*").limit(1).single(),
    ])

    // === GERAR CASHBACK ===
    if (cashbackSettings.data?.enabled) {
      const { percentage, min_order_value } = cashbackSettings.data

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
          // Calcular cashback
          cashbackGenerated = Number(((orderTotal * percentage) / 100).toFixed(2))

          // Inserir registro (indice unico garante protecao extra)
          const { error } = await supabase.from("customer_cashback").insert({
            customer_id: customerId,
            order_id: orderId,
            amount: cashbackGenerated,
            type: "earned",
            description: `Cashback de ${percentage}% no pedido #${orderId}`,
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
        // Calcular pontos
        pointsGenerated = Math.floor(orderTotal * points_per_real)

        if (pointsGenerated > 0) {
          // Inserir registro (indice unico garante protecao extra)
          const { error } = await supabase.from("customer_points").insert({
            customer_id: customerId,
            order_id: orderId,
            points: pointsGenerated,
            type: "earned",
            description: `${pointsGenerated} pontos ganhos no pedido #${orderId}`,
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

    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!orderId || !customerId || !orderTotal) {
      return NextResponse.json({ error: "orderId, customerId e orderTotal sao obrigatorios" }, { status: 400 })
    }

    const result = await generateRewardsForOrder({
      orderId,
      customerId,
      orderTotal,
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
