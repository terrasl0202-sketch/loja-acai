import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET - Buscar configuracoes de cashback e fidelidade
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const password = url.searchParams.get("password")

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = getSupabase()

    const [cashbackRes, loyaltyRes] = await Promise.all([
      supabase.from("cashback_settings").select("*").limit(1).single(),
      supabase.from("loyalty_settings").select("*").limit(1).single(),
    ])

    return NextResponse.json({
      success: true,
      cashback: cashbackRes.data || {
        enabled: false,
        percentage: 5,
        min_order_value: 30,
      },
      loyalty: loyaltyRes.data || {
        enabled: false,
        points_per_real: 1,
        points_for_reward: 500,
        reward_value: 10,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar configuracoes premium:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST - Salvar configuracoes de cashback e fidelidade
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, cashback, loyalty } = body

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabase()

    // Atualizar cashback_settings
    if (cashback) {
      const { error: cashbackError } = await supabase
        .from("cashback_settings")
        .upsert({
          id: 1,
          enabled: cashback.enabled ?? false,
          percentage: cashback.percentage ?? 5,
          min_order_value: cashback.minOrderValue ?? 30,
          updated_at: new Date().toISOString(),
        })

      if (cashbackError) {
        console.error("Erro ao salvar cashback:", cashbackError)
        return NextResponse.json({ error: "Erro ao salvar cashback" }, { status: 500 })
      }
    }

    // Atualizar loyalty_settings
    if (loyalty) {
      const { error: loyaltyError } = await supabase
        .from("loyalty_settings")
        .upsert({
          id: 1,
          enabled: loyalty.enabled ?? false,
          points_per_real: loyalty.pointsPerReal ?? 1,
          points_for_reward: loyalty.pointsForReward ?? 500,
          reward_value: loyalty.rewardValue ?? 10,
          updated_at: new Date().toISOString(),
        })

      if (loyaltyError) {
        console.error("Erro ao salvar fidelidade:", loyaltyError)
        return NextResponse.json({ error: "Erro ao salvar fidelidade" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao salvar configuracoes premium:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
