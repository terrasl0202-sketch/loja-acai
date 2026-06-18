import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStoreIdFromRequest } from "@/lib/api-store"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "PK1040CAH"

// GET - Estatisticas de gamificacao para Admin
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const password = searchParams.get("password")

    // Validar senha admin
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Identificar loja atual
    const storeId = await getStoreIdFromRequest(request)

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Buscar estatisticas DESTA LOJA
    const [
      achievementsResult,
      customerAchievementsResult,
      missionsResult,
      customerMissionsResult,
      badgesResult,
      customerBadgesResult,
      streaksResult
    ] = await Promise.all([
      supabase.from("achievements").select("id, name, type, points_reward, cashback_reward, active").eq("store_id", storeId),
      supabase.from("customer_achievements").select("achievement_id, customer_id").eq("store_id", storeId),
      supabase.from("missions").select("id, title, type, reward_type, reward_value, active").eq("store_id", storeId),
      supabase.from("customer_missions").select("mission_id, customer_id, completed").eq("store_id", storeId).eq("completed", true),
      supabase.from("badges").select("id, name, icon, color, active").eq("store_id", storeId),
      supabase.from("customer_badges").select("badge_id, customer_id").eq("store_id", storeId),
      supabase.from("customer_streaks").select("customer_id, current_streak, best_streak").eq("store_id", storeId).gt("current_streak", 0)
    ])

    // Contar conquistas por tipo
    const achievementStats = {
      total: achievementsResult.data?.length || 0,
      active: achievementsResult.data?.filter(a => a.active).length || 0,
      totalUnlocked: customerAchievementsResult.data?.length || 0,
      uniqueCustomers: new Set(customerAchievementsResult.data?.map(a => a.customer_id)).size
    }

    // Contar missoes
    const missionStats = {
      total: missionsResult.data?.length || 0,
      active: missionsResult.data?.filter(m => m.active).length || 0,
      totalCompleted: customerMissionsResult.data?.length || 0,
      uniqueCustomers: new Set(customerMissionsResult.data?.map(m => m.customer_id)).size
    }

    // Contar badges
    const badgeStats = {
      total: badgesResult.data?.length || 0,
      active: badgesResult.data?.filter(b => b.active).length || 0,
      totalEarned: customerBadgesResult.data?.length || 0,
      uniqueCustomers: new Set(customerBadgesResult.data?.map(b => b.customer_id)).size
    }

    // Contar streaks
    const streakStats = {
      customersWithStreak: streaksResult.data?.length || 0,
      maxCurrentStreak: Math.max(...(streaksResult.data?.map(s => s.current_streak) || [0])),
      maxBestStreak: Math.max(...(streaksResult.data?.map(s => s.best_streak) || [0])),
      avgStreak: streaksResult.data?.length 
        ? Math.round(streaksResult.data.reduce((sum, s) => sum + s.current_streak, 0) / streaksResult.data.length)
        : 0
    }

    // Ranking de conquistas mais desbloqueadas
    const achievementCounts = new Map<number, number>()
    customerAchievementsResult.data?.forEach(ca => {
      achievementCounts.set(ca.achievement_id, (achievementCounts.get(ca.achievement_id) || 0) + 1)
    })

    const topAchievements = achievementsResult.data
      ?.map(a => ({
        ...a,
        unlockCount: achievementCounts.get(a.id) || 0
      }))
      .sort((a, b) => b.unlockCount - a.unlockCount)
      .slice(0, 5)

    return NextResponse.json({
      achievementStats,
      missionStats,
      badgeStats,
      streakStats,
      topAchievements,
      achievements: achievementsResult.data || [],
      missions: missionsResult.data || [],
      badges: badgesResult.data || []
    })
  } catch (error) {
    console.error("Erro ao buscar stats gamificacao:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST - Criar/atualizar conquista, missao ou badge DESTA LOJA
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Identificar loja atual
    const storeId = await getStoreIdFromRequest(request)

    const { type, data, password } = await request.json()

    // Validar senha admin
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    let result
    switch (type) {
      case "achievement":
        if (data.id) {
          result = await supabase
            .from("achievements")
            .update({
              name: data.name,
              description: data.description,
              icon: data.icon,
              type: data.type,
              target: data.target,
              points_reward: data.points_reward,
              cashback_reward: data.cashback_reward,
              active: data.active
            })
            .eq("id", data.id)
            .eq("store_id", storeId) // Seguranca: so atualiza da mesma loja
            .select()
            .single()
        } else {
          result = await supabase
            .from("achievements")
            .insert({ ...data, store_id: storeId })
            .select()
            .single()
        }
        break

      case "mission":
        if (data.id) {
          result = await supabase
            .from("missions")
            .update({
              title: data.title,
              description: data.description,
              type: data.type,
              target: data.target,
              reward_type: data.reward_type,
              reward_value: data.reward_value,
              active: data.active
            })
            .eq("id", data.id)
            .eq("store_id", storeId) // Seguranca: so atualiza da mesma loja
            .select()
            .single()
        } else {
          result = await supabase
            .from("missions")
            .insert({ ...data, store_id: storeId })
            .select()
            .single()
        }
        break

      case "badge":
        if (data.id) {
          result = await supabase
            .from("badges")
            .update({
              name: data.name,
              description: data.description,
              icon: data.icon,
              color: data.color,
              active: data.active
            })
            .eq("id", data.id)
            .eq("store_id", storeId) // Seguranca: so atualiza da mesma loja
            .select()
            .single()
        } else {
          result = await supabase
            .from("badges")
            .insert({ ...data, store_id: storeId })
            .select()
            .single()
        }
        break

      default:
        return NextResponse.json({ error: "Tipo invalido" }, { status: 400 })
    }

    if (result?.error) {
      throw result.error
    }

    return NextResponse.json({ success: true, data: result?.data })
  } catch (error) {
    console.error("Erro ao salvar:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
