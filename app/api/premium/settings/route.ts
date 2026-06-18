import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getStoreIdFromRequest } from "@/lib/api-store"

/**
 * /api/premium/settings v2 - MULTIEMPRESA
 * Configuracoes de cashback e fidelidade por loja.
 */

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET - Buscar configuracoes de cashback e fidelidade DESTA LOJA
export async function GET(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  const url = new URL(request.url)
  const password = url.searchParams.get("password")
  
  console.log(`[premium/settings v2 GET] storeId: ${storeId}`)

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = getSupabase()

    const [cashbackRes, loyaltyRes] = await Promise.all([
      supabase.from("cashback_settings").select("*").eq("store_id", storeId).limit(1).single(),
      supabase.from("loyalty_settings").select("*").eq("store_id", storeId).limit(1).single(),
    ])

    return NextResponse.json({
      success: true,
      storeId,
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

// POST - Salvar configuracoes de cashback e fidelidade DESTA LOJA
export async function POST(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  
  try {
    const body = await request.json()
    const { password, cashback, loyalty } = body
    
    console.log(`[premium/settings v2 POST] storeId: ${storeId}`)

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabase()

    // Buscar ou criar cashback_settings DESTA LOJA
    if (cashback) {
      const { data: existing } = await supabase
        .from("cashback_settings")
        .select("id")
        .eq("store_id", storeId)
        .single()
      
      const cashbackData = {
        enabled: cashback.enabled ?? false,
        percentage: cashback.percentage ?? 5,
        min_order_value: cashback.minOrderValue ?? 30,
        store_id: storeId,
        updated_at: new Date().toISOString(),
      }
      
      if (existing) {
        const { error } = await supabase
          .from("cashback_settings")
          .update(cashbackData)
          .eq("id", existing.id)
        
        if (error) {
          console.error("Erro ao salvar cashback:", error)
          return NextResponse.json({ error: "Erro ao salvar cashback" }, { status: 500 })
        }
      } else {
        const { error } = await supabase
          .from("cashback_settings")
          .insert(cashbackData)
        
        if (error) {
          console.error("Erro ao criar cashback:", error)
          return NextResponse.json({ error: "Erro ao criar cashback" }, { status: 500 })
        }
      }
    }

    // Buscar ou criar loyalty_settings DESTA LOJA
    if (loyalty) {
      const { data: existing } = await supabase
        .from("loyalty_settings")
        .select("id")
        .eq("store_id", storeId)
        .single()
      
      const loyaltyData = {
        enabled: loyalty.enabled ?? false,
        points_per_real: loyalty.pointsPerReal ?? 1,
        points_for_reward: loyalty.pointsForReward ?? 500,
        reward_value: loyalty.rewardValue ?? 10,
        store_id: storeId,
        updated_at: new Date().toISOString(),
      }
      
      if (existing) {
        const { error } = await supabase
          .from("loyalty_settings")
          .update(loyaltyData)
          .eq("id", existing.id)
        
        if (error) {
          console.error("Erro ao salvar fidelidade:", error)
          return NextResponse.json({ error: "Erro ao salvar fidelidade" }, { status: 500 })
        }
      } else {
        const { error } = await supabase
          .from("loyalty_settings")
          .insert(loyaltyData)
        
        if (error) {
          console.error("Erro ao criar fidelidade:", error)
          return NextResponse.json({ error: "Erro ao criar fidelidade" }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true, storeId })
  } catch (error) {
    console.error("Erro ao salvar configuracoes premium:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
