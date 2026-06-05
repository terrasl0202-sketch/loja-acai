import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Buscar badges do cliente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customerId")

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Buscar todas badges ativas
    const { data: badges } = await supabase
      .from("badges")
      .select("*")
      .eq("active", true)

    if (!customerId) {
      return NextResponse.json({ badges: badges || [] })
    }

    // Buscar badges do cliente
    const { data: earned } = await supabase
      .from("customer_badges")
      .select("badge_id, earned_at")
      .eq("customer_id", parseInt(customerId))

    const earnedIds = new Set(earned?.map(e => e.badge_id) || [])
    const earnedMap = new Map(earned?.map(e => [e.badge_id, e.earned_at]) || [])

    // Combinar dados
    const badgesWithStatus = (badges || []).map(b => ({
      ...b,
      earned: earnedIds.has(b.id),
      earnedAt: earnedMap.get(b.id) || null
    }))

    return NextResponse.json({
      badges: badgesWithStatus,
      totalEarned: earnedIds.size,
      totalBadges: badges?.length || 0
    })
  } catch (error) {
    console.error("Erro ao buscar badges:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST - Conceder badge a um cliente (Admin)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    const { customerId, badgeId, password } = await request.json()

    // Validar senha admin
    const { data: config } = await supabase
      .from("store_config")
      .select("admin_password")
      .limit(1)
      .single()

    if (config?.admin_password !== password) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    if (!customerId || !badgeId) {
      return NextResponse.json({ error: "customerId e badgeId required" }, { status: 400 })
    }

    // Conceder badge
    const { error } = await supabase.from("customer_badges").insert({
      customer_id: customerId,
      badge_id: badgeId
    })

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Cliente ja possui esta badge" }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao conceder badge:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
