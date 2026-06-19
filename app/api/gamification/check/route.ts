import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStoreIdFromRequest, INVALID_STORE_ID } from "@/lib/api-store"
import { requireStoreAuth } from "@/lib/store-session"
import { getInternalToken, verifyInternalToken, INTERNAL_TOKEN_HEADER } from "@/lib/internal-token"

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

    // Identificar loja atual
    const storeId = await getStoreIdFromRequest(request)
    if (!storeId || storeId === INVALID_STORE_ID || storeId <= 0) {
      return NextResponse.json({ error: "Contexto de loja invalido" }, { status: 400 })
    }

    // === AUTORIZACAO (Fase de Seguranca 2) ===
    // Conceder recompensas (badges/pontos/cashback) deve vir de ORIGEM CONFIAVEL:
    //  - chamada interna do backend (token interno), ex.: apos confirmacao real
    //    de pedido em /api/orders/confirm; ou
    //  - admin autenticado da loja.
    // Nunca aceitar concessao arbitraria so com customerId no body.
    if (!verifyInternalToken(request)) {
      const auth = await requireStoreAuth(request)
      if (!auth.ok) return auth.response!
      if (auth.storeId !== storeId) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
      }
    }

    // Propagar o contexto de tenant para as sub-chamadas internas, para que
    // achievements/missions/streaks operem na MESMA loja (sem isso, cairiam no
    // fallback por host = loja principal). Tambem propagamos o token interno
    // para autorizar essas sub-chamadas como origem confiavel.
    const incomingSlug = request.headers.get("x-store-slug")
    const internalHeaders: Record<string, string> = { "Content-Type": "application/json" }
    if (incomingSlug) internalHeaders["x-store-slug"] = incomingSlug
    internalHeaders[INTERNAL_TOKEN_HEADER] = getInternalToken()

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
        headers: internalHeaders,
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
        headers: internalHeaders,
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
          headers: internalHeaders,
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

    // 4. Verificar badges automaticos (baseado em conquistas, VIP, etc) DESTA LOJA
    try {
      // Badge "Cliente Fiel" - 10+ pedidos
      const validStatuses = ["confirmed", "preparing", "delivering", "completed"]
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("customer_id", customerId)
        .eq("store_id", storeId)
        .in("status", validStatuses)

      const totalOrders = orders?.length || 0

      // Verificar badge cliente fiel (10 pedidos) DESTA LOJA
      if (totalOrders >= 10) {
        const { data: existingBadge } = await supabase
          .from("customer_badges")
          .select("id")
          .eq("customer_id", customerId)
          .eq("store_id", storeId)
          .eq("badge_id", 2) // Badge "Cliente Fiel"
          .single()

        if (!existingBadge) {
          const { error } = await supabase.from("customer_badges").insert({
            customer_id: customerId,
            store_id: storeId,
            badge_id: 2
          })
          if (!error) {
            results.badges.newEarned.push({ name: "Cliente Fiel" })
          }
        }
      }

      // Verificar badge comprador frequente (streak de 3+) DESTA LOJA
      const { data: streakData } = await supabase
        .from("customer_streaks")
        .select("current_streak")
        .eq("customer_id", customerId)
        .eq("store_id", storeId)
        .single()

      if (streakData && streakData.current_streak >= 3) {
        const { data: existingBadge } = await supabase
          .from("customer_badges")
          .select("id")
          .eq("customer_id", customerId)
          .eq("store_id", storeId)
          .eq("badge_id", 3) // Badge "Comprador Frequente"
          .single()

        if (!existingBadge) {
          const { error } = await supabase.from("customer_badges").insert({
            customer_id: customerId,
            store_id: storeId,
            badge_id: 3
          })
          if (!error) {
            results.badges.newEarned.push({ name: "Comprador Frequente" })
          }
        }
      }

      // Verificar badge VIP Diamante DESTA LOJA
      const { data: levels } = await supabase
        .from("customer_levels")
        .select("*")
        .eq("store_id", storeId)
        .eq("active", true)
        .order("sort_order")

      const { data: customerOrders } = await supabase
        .from("orders")
        .select("total")
        .eq("customer_id", customerId)
        .eq("store_id", storeId)
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

      // Se for Diamante (indice 3), dar badge DESTA LOJA
      if (currentLevelIndex === 3) {
        const { data: existingBadge } = await supabase
          .from("customer_badges")
          .select("id")
          .eq("customer_id", customerId)
          .eq("store_id", storeId)
          .eq("badge_id", 4) // Badge "Cliente Diamante"
          .single()

        if (!existingBadge) {
          const { error } = await supabase.from("customer_badges").insert({
            customer_id: customerId,
            store_id: storeId,
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
