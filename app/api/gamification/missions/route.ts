import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStoreIdFromRequest, INVALID_STORE_ID } from "@/lib/api-store"
import { requireStoreAuth } from "@/lib/store-session"
import { verifyInternalToken } from "@/lib/internal-token"

// GET - Buscar missoes do cliente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customerId")

    // Identificar loja atual
    const storeId = await getStoreIdFromRequest(request)

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Buscar missoes ativas DESTA LOJA
    const { data: missions } = await supabase
      .from("missions")
      .select("*")
      .eq("store_id", storeId)
      .eq("active", true)
      .order("target", { ascending: true })

    if (!customerId) {
      return NextResponse.json({ missions: missions || [] })
    }

    // Buscar progresso do cliente DESTA LOJA
    const { data: progress } = await supabase
      .from("customer_missions")
      .select("*")
      .eq("customer_id", parseInt(customerId))
      .eq("store_id", storeId)

    const progressMap = new Map(progress?.map(p => [p.mission_id, p]) || [])

    // Buscar dados do cliente DESTA LOJA para calcular progresso
    const validStatuses = ["confirmed", "preparing", "delivering", "completed"]
    
    const [ordersResult, reviewsResult, streakResult] = await Promise.all([
      supabase.from("orders").select("id, total").eq("customer_id", parseInt(customerId)).eq("store_id", storeId).in("status", validStatuses),
      supabase.from("order_reviews").select("id").eq("customer_id", parseInt(customerId)).eq("store_id", storeId),
      supabase.from("customer_streaks").select("current_streak").eq("customer_id", parseInt(customerId)).eq("store_id", storeId).single()
    ])

    const totalOrders = ordersResult.data?.length || 0
    const totalSpent = ordersResult.data?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0
    const totalReviews = reviewsResult.data?.length || 0
    const currentStreak = streakResult.data?.current_streak || 0

    // Combinar dados
    const missionsWithProgress = (missions || []).map(m => {
      const existing = progressMap.get(m.id)
      let currentProgress = 0

      switch (m.type) {
        case "orders_count":
          currentProgress = totalOrders
          break
        case "amount_spent":
          currentProgress = totalSpent
          break
        case "reviews":
          currentProgress = totalReviews
          break
        case "streak":
          currentProgress = currentStreak
          break
      }

      const completed = existing?.completed || currentProgress >= m.target
      const progressPercent = Math.min(100, Math.round((currentProgress / m.target) * 100))

      return {
        ...m,
        currentProgress,
        progressPercent,
        completed,
        completedAt: existing?.completed_at || null,
        rewardClaimed: existing?.reward_claimed || false
      }
    })

    return NextResponse.json({
      missions: missionsWithProgress,
      totalCompleted: missionsWithProgress.filter(m => m.completed).length,
      totalMissions: missions?.length || 0
    })
  } catch (error) {
    console.error("Erro ao buscar missoes:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST - Verificar e completar missoes
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    const { customerId } = await request.json()
    if (!customerId) {
      return NextResponse.json({ error: "customerId required" }, { status: 400 })
    }

    // Identificar loja atual
    const storeId = await getStoreIdFromRequest(request)
    if (!storeId || storeId === INVALID_STORE_ID || storeId <= 0) {
      return NextResponse.json({ error: "Contexto de loja invalido" }, { status: 400 })
    }

    // === AUTORIZACAO (Fase de Seguranca 2) ===
    // Completar missoes concede pontos/cashback: exige origem confiavel (token
    // interno do backend) ou admin autenticado da loja.
    if (!verifyInternalToken(request)) {
      const auth = await requireStoreAuth(request)
      if (!auth.ok) return auth.response!
      if (auth.storeId !== storeId) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
      }
    }

    // Buscar dados do cliente DESTA LOJA
    const validStatuses = ["confirmed", "preparing", "delivering", "completed"]
    
    const [ordersResult, reviewsResult, streakResult, existingMissions] = await Promise.all([
      supabase.from("orders").select("id, total").eq("customer_id", customerId).eq("store_id", storeId).in("status", validStatuses),
      supabase.from("order_reviews").select("id").eq("customer_id", customerId).eq("store_id", storeId),
      supabase.from("customer_streaks").select("current_streak").eq("customer_id", customerId).eq("store_id", storeId).single(),
      supabase.from("customer_missions").select("mission_id, completed, reward_claimed").eq("customer_id", customerId).eq("store_id", storeId)
    ])

    const totalOrders = ordersResult.data?.length || 0
    const totalSpent = ordersResult.data?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0
    const totalReviews = reviewsResult.data?.length || 0
    const currentStreak = streakResult.data?.current_streak || 0
    const completedIds = new Set(existingMissions.data?.filter(m => m.completed).map(m => m.mission_id) || [])

    // Buscar missoes ativas DESTA LOJA
    const { data: missions } = await supabase
      .from("missions")
      .select("*")
      .eq("store_id", storeId)
      .eq("active", true)

    const newCompleted: { id: number; title: string; rewardType: string; rewardValue: number }[] = []

    for (const mission of missions || []) {
      if (completedIds.has(mission.id)) continue

      let currentProgress = 0
      switch (mission.type) {
        case "orders_count":
          currentProgress = totalOrders
          break
        case "amount_spent":
          currentProgress = totalSpent
          break
        case "reviews":
          currentProgress = totalReviews
          break
        case "streak":
          currentProgress = currentStreak
          break
      }

      if (currentProgress >= mission.target) {
        // Completar missao DESTA LOJA
        const { error } = await supabase.from("customer_missions").upsert({
          customer_id: customerId,
          mission_id: mission.id,
          store_id: storeId,
          progress: currentProgress,
          completed: true,
          completed_at: new Date().toISOString(),
          reward_claimed: false
        }, { onConflict: "customer_id,mission_id" })

        if (!error) {
          newCompleted.push({
            id: mission.id,
            title: mission.title,
            rewardType: mission.reward_type,
            rewardValue: mission.reward_value
          })

          // Gerar recompensa automaticamente DESTA LOJA
          if (mission.reward_type === "points" && mission.reward_value > 0) {
            await supabase.from("customer_points").insert({
              customer_id: customerId,
              store_id: storeId,
              points: Math.floor(mission.reward_value),
              type: "earned",
              description: `Missao: ${mission.title}`
            })
          } else if (mission.reward_type === "cashback" && mission.reward_value > 0) {
            await supabase.from("customer_cashback").insert({
              customer_id: customerId,
              store_id: storeId,
              amount: mission.reward_value,
              type: "earned",
              description: `Missao: ${mission.title}`
            })
          }

          // Marcar recompensa como reclamada DESTA LOJA
          await supabase
            .from("customer_missions")
            .update({ reward_claimed: true })
            .eq("customer_id", customerId)
            .eq("mission_id", mission.id)
            .eq("store_id", storeId)
        }
      }
    }

    return NextResponse.json({
      newCompleted,
      totalCompleted: completedIds.size + newCompleted.length
    })
  } catch (error) {
    console.error("Erro ao verificar missoes:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
