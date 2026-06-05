import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST - Verificar todas gamificacoes de um cliente
// Chamado apos pedido confirmado, avaliacao, etc
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    const { customerId, event } = await request.json()
    if (!customerId) {
      return NextResponse.json({ error: "customerId required" }, { status: 400 })
    }

    const results = {
      achievements: { newUnlocked: [] as { name: string; points: number; cashback: number }[] },
      missions: { newCompleted: [] as { title: string; rewardType: string; rewardValue: number }[] },
      streak: { updated: false, currentStreak: 0 },
      badges: { newEarned: [] as { name: string }[] }
    }

    // 1. Verificar conquistas
    try {
      const achievementsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/gamification/achievements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId })
      })
      const achievementsData = await achievementsRes.json()
      if (achievementsData.newUnlocked) {
        results.achievements.newUnlocked = achievementsData.newUnlocked
      }
    } catch (e) {
      console.error("Erro ao verificar conquistas:", e)
    }

    // 2. Verificar missoes
    try {
      const missionsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/gamification/missions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId })
      })
      const missionsData = await missionsRes.json()
      if (missionsData.newCompleted) {
        results.missions.newCompleted = missionsData.newCompleted
      }
    } catch (e) {
      console.error("Erro ao verificar missoes:", e)
    }

    // 3. Atualizar streak (apenas se for evento de pedido confirmado)
    if (event === "order_confirmed") {
      try {
        const streakRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/gamification/streaks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId })
        })
        const streakData = await streakRes.json()
        if (streakData.streak) {
          results.streak.updated = true
          results.streak.currentStreak = streakData.streak.currentStreak
        }
      } catch (e) {
        console.error("Erro ao atualizar streak:", e)
      }
    }

    // 4. Verificar badges automaticos (baseado em conquistas, VIP, etc)
    try {
      // Badge "Cliente Fiel" - 10+ pedidos
      const validStatuses = ["confirmed", "preparing", "delivering", "completed"]
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("customer_id", customerId)
        .in("status", validStatuses)

      const totalOrders = orders?.length || 0

      // Verificar badge cliente fiel (10 pedidos)
      if (totalOrders >= 10) {
        const { data: existingBadge } = await supabase
          .from("customer_badges")
          .select("id")
          .eq("customer_id", customerId)
          .eq("badge_id", 2) // Badge "Cliente Fiel"
          .single()

        if (!existingBadge) {
          const { error } = await supabase.from("customer_badges").insert({
            customer_id: customerId,
            badge_id: 2
          })
          if (!error) {
            results.badges.newEarned.push({ name: "Cliente Fiel" })
          }
        }
      }

      // Verificar badge comprador frequente (streak de 3+)
      const { data: streakData } = await supabase
        .from("customer_streaks")
        .select("current_streak")
        .eq("customer_id", customerId)
        .single()

      if (streakData && streakData.current_streak >= 3) {
        const { data: existingBadge } = await supabase
          .from("customer_badges")
          .select("id")
          .eq("customer_id", customerId)
          .eq("badge_id", 3) // Badge "Comprador Frequente"
          .single()

        if (!existingBadge) {
          const { error } = await supabase.from("customer_badges").insert({
            customer_id: customerId,
            badge_id: 3
          })
          if (!error) {
            results.badges.newEarned.push({ name: "Comprador Frequente" })
          }
        }
      }

      // Verificar badge VIP Diamante
      const { data: levels } = await supabase
        .from("customer_levels")
        .select("*")
        .eq("active", true)
        .order("sort_order")

      const { data: customerOrders } = await supabase
        .from("orders")
        .select("total")
        .eq("customer_id", customerId)
        .in("status", validStatuses)

      const totalSpent = customerOrders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0
      
      // Encontrar nivel atual
      let currentLevelIndex = 0
      if (levels) {
        for (let i = 0; i < levels.length; i++) {
          const level = levels[i]
          const minSpent = Number(level.min_spent) || 0
          const maxSpent = level.max_spent !== null ? Number(level.max_spent) : Infinity
          if (totalSpent >= minSpent && (totalSpent < maxSpent || level.max_spent === null)) {
            currentLevelIndex = i
            break
          }
        }
      }

      // Se for Diamante (indice 3), dar badge
      if (currentLevelIndex === 3) {
        const { data: existingBadge } = await supabase
          .from("customer_badges")
          .select("id")
          .eq("customer_id", customerId)
          .eq("badge_id", 4) // Badge "Cliente Diamante"
          .single()

        if (!existingBadge) {
          const { error } = await supabase.from("customer_badges").insert({
            customer_id: customerId,
            badge_id: 4
          })
          if (!error) {
            results.badges.newEarned.push({ name: "Cliente Diamante" })
          }
        }
      }

    } catch (e) {
      console.error("Erro ao verificar badges:", e)
    }

    return NextResponse.json({
      success: true,
      results
    })
  } catch (error) {
    console.error("Erro ao verificar gamificacao:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
