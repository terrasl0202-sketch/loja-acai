import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET - Buscar saldo de cashback e pontos do cliente
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const phone = url.searchParams.get("phone")
  const customerId = url.searchParams.get("customerId")

  if (!phone && !customerId) {
    return NextResponse.json({ error: "phone ou customerId obrigatorio" }, { status: 400 })
  }

  try {
    const supabase = getSupabase()

    // Buscar cliente
    let customerQuery = supabase.from("customers").select("*")
    if (customerId) {
      customerQuery = customerQuery.eq("id", parseInt(customerId))
    } else if (phone) {
      customerQuery = customerQuery.eq("phone", phone)
    }

    const { data: customer, error: customerError } = await customerQuery.limit(1).single()

    if (customerError || !customer) {
      return NextResponse.json({ 
        success: true, 
        found: false,
        cashbackBalance: 0,
        pointsBalance: 0,
        cashbackHistory: [],
        pointsHistory: [],
      })
    }

    // Buscar historico de cashback
    const { data: cashbackHistory } = await supabase
      .from("customer_cashback")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })

    // Buscar historico de pontos
    const { data: pointsHistory } = await supabase
      .from("customer_points")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })

    // Calcular saldo de cashback
    const cashbackBalance = (cashbackHistory || []).reduce((acc, item) => {
      if (item.type === "earned" || item.type === "adjusted") {
        return acc + parseFloat(item.amount)
      } else if (item.type === "used" || item.type === "expired") {
        return acc - parseFloat(item.amount)
      }
      return acc
    }, 0)

    // Calcular saldo de pontos
    const pointsBalance = (pointsHistory || []).reduce((acc, item) => {
      if (item.type === "earned" || item.type === "adjusted") {
        return acc + item.points
      } else if (item.type === "used" || item.type === "expired") {
        return acc - item.points
      }
      return acc
    }, 0)

    // Buscar configuracoes para mostrar info da recompensa
    const { data: loyaltySettings } = await supabase
      .from("loyalty_settings")
      .select("*")
      .limit(1)
      .single()

    return NextResponse.json({
      success: true,
      found: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
      },
      cashbackBalance: Math.max(0, cashbackBalance),
      pointsBalance: Math.max(0, pointsBalance),
      cashbackHistory: cashbackHistory || [],
      pointsHistory: pointsHistory || [],
      loyalty: loyaltySettings ? {
        pointsForReward: loyaltySettings.points_for_reward,
        rewardValue: loyaltySettings.reward_value,
        progressToReward: Math.min(100, Math.round((pointsBalance / loyaltySettings.points_for_reward) * 100)),
      } : null,
    })
  } catch (error) {
    console.error("Erro ao buscar saldo premium:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
