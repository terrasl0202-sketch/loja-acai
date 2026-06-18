import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStoreIdFromRequest } from "@/lib/api-store"

/**
 * /api/gamification/achievements v2 - MULTIEMPRESA
 * Conquistas isoladas por loja.
 */

// GET - Buscar conquistas do cliente NESTA LOJA
export async function GET(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  console.log(`[gamification/achievements v2 GET] storeId: ${storeId}`)
  
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customerId")

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Buscar conquistas ativas DESTA LOJA
    const { data: achievements } = await supabase
      .from("achievements")
      .select("*")
      .eq("store_id", storeId)
      .eq("active", true)
      .order("target", { ascending: true })

    if (!customerId) {
      return NextResponse.json({ achievements: achievements || [], storeId })
    }

    // Buscar conquistas desbloqueadas do cliente NESTA LOJA
    const { data: unlocked } = await supabase
      .from("customer_achievements")
      .select("achievement_id, unlocked_at, reward_claimed")
      .eq("customer_id", parseInt(customerId))
      .eq("store_id", storeId)

    const unlockedIds = new Set(unlocked?.map(u => u.achievement_id) || [])
    const unlockedMap = new Map(unlocked?.map(u => [u.achievement_id, u]) || [])

    const achievementsWithStatus = (achievements || []).map(a => ({
      ...a,
      unlocked: unlockedIds.has(a.id),
      unlockedAt: unlockedMap.get(a.id)?.unlocked_at || null,
      rewardClaimed: unlockedMap.get(a.id)?.reward_claimed || false
    }))

    return NextResponse.json({
      achievements: achievementsWithStatus,
      totalUnlocked: unlockedIds.size,
      totalAchievements: achievements?.length || 0,
      storeId
    })
  } catch (error) {
    console.error("Erro ao buscar conquistas:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST - Verificar e desbloquear conquistas NESTA LOJA
export async function POST(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    const { customerId } = await request.json()
    if (!customerId) {
      return NextResponse.json({ error: "customerId required" }, { status: 400 })
    }

    const validStatuses = ["confirmed", "preparing", "delivering", "completed"]
    
    // Buscar dados do cliente NESTA LOJA
    const [ordersResult, reviewsResult, levelsResult, existingAchievements] = await Promise.all([
      supabase.from("orders").select("id, total").eq("customer_id", customerId).eq("store_id", storeId).in("status", validStatuses),
      supabase.from("reviews").select("id").eq("customer_id", customerId).eq("store_id", storeId),
      supabase.from("customer_levels").select("*").eq("store_id", storeId).eq("active", true).order("sort_order"),
      supabase.from("customer_achievements").select("achievement_id").eq("customer_id", customerId).eq("store_id", storeId)
    ])

    const orders = ordersResult.data || []
    const reviews = reviewsResult.data || []
    const totalOrders = orders.length
    const totalSpent = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
    const totalReviews = reviews.length
    const existingIds = new Set(existingAchievements.data?.map(a => a.achievement_id) || [])

    let vipLevel = 1
    if (levelsResult.data) {
      for (let i = 0; i < levelsResult.data.length; i++) {
        const level = levelsResult.data[i]
        const minSpent = Number(level.min_spent) || 0
        const maxSpent = level.max_spent !== null ? Number(level.max_spent) : Infinity
        if (totalSpent >= minSpent && (totalSpent < maxSpent || level.max_spent === null)) {
          vipLevel = i + 1
          break
        }
      }
    }

    // Buscar conquistas ativas DESTA LOJA
    const { data: achievements } = await supabase
      .from("achievements")
      .select("*")
      .eq("store_id", storeId)
      .eq("active", true)

    const newUnlocked: { id: number; name: string; points: number; cashback: number }[] = []

    for (const achievement of achievements || []) {
      if (existingIds.has(achievement.id)) continue

      let shouldUnlock = false

      switch (achievement.type) {
        case "orders_count":
          shouldUnlock = totalOrders >= achievement.target
          break
        case "amount_spent":
          shouldUnlock = totalSpent >= achievement.target
          break
        case "reviews":
          shouldUnlock = totalReviews >= achievement.target
          break
        case "vip_level":
          shouldUnlock = vipLevel >= achievement.target
          break
      }

      if (shouldUnlock) {
        const { error } = await supabase.from("customer_achievements").insert({
          customer_id: customerId,
          store_id: storeId,
          achievement_id: achievement.id,
          reward_claimed: false
        })

        if (!error) {
          newUnlocked.push({
            id: achievement.id,
            name: achievement.name,
            points: achievement.points_reward || 0,
            cashback: achievement.cashback_reward || 0
          })

          // Gerar recompensas NESTA LOJA
          if (achievement.points_reward > 0) {
            await supabase.from("customer_points").insert({
              customer_id: customerId,
              store_id: storeId,
              points: achievement.points_reward,
              type: "earned",
              description: `Conquista: ${achievement.name}`
            })
          }

          if (achievement.cashback_reward > 0) {
            await supabase.from("customer_cashback").insert({
              customer_id: customerId,
              store_id: storeId,
              amount: achievement.cashback_reward,
              type: "earned",
              description: `Conquista: ${achievement.name}`
            })
          }

          await supabase
            .from("customer_achievements")
            .update({ reward_claimed: true })
            .eq("customer_id", customerId)
            .eq("store_id", storeId)
            .eq("achievement_id", achievement.id)
        }
      }
    }

    return NextResponse.json({
      newUnlocked,
      totalUnlocked: existingIds.size + newUnlocked.length,
      storeId
    })
  } catch (error) {
    console.error("Erro ao verificar conquistas:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
