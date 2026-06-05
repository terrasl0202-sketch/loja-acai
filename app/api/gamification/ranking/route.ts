import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Buscar ranking mensal
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customerId")
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Calcular ranking do mes atual baseado nos pedidos
    const validStatuses = ["confirmed", "preparing", "delivering", "completed"]
    const startDate = new Date(year, month - 1, 1).toISOString()
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

    // Buscar pedidos do mes
    const { data: orders } = await supabase
      .from("orders")
      .select("customer_id, total, customer_name, customer_phone")
      .in("status", validStatuses)
      .gte("created_at", startDate)
      .lte("created_at", endDate)

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        ranking: [],
        customerPosition: null,
        month,
        year
      })
    }

    // Agrupar por cliente
    const customerStats = new Map<number, {
      customerId: number
      customerName: string
      customerPhone: string
      totalSpent: number
      totalOrders: number
    }>()

    for (const order of orders) {
      if (!order.customer_id) continue
      
      const existing = customerStats.get(order.customer_id) || {
        customerId: order.customer_id,
        customerName: order.customer_name || "Cliente",
        customerPhone: order.customer_phone || "",
        totalSpent: 0,
        totalOrders: 0
      }
      
      existing.totalSpent += Number(order.total) || 0
      existing.totalOrders += 1
      customerStats.set(order.customer_id, existing)
    }

    // Ordenar por total gasto
    const ranking = Array.from(customerStats.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((c, i) => ({
        position: i + 1,
        ...c
      }))

    // Encontrar posicao do cliente (se fornecido)
    let customerPosition = null
    if (customerId) {
      const allRanked = Array.from(customerStats.values())
        .sort((a, b) => b.totalSpent - a.totalSpent)
      
      const idx = allRanked.findIndex(c => c.customerId === parseInt(customerId))
      if (idx !== -1) {
        customerPosition = {
          position: idx + 1,
          totalSpent: allRanked[idx].totalSpent,
          totalOrders: allRanked[idx].totalOrders,
          totalParticipants: allRanked.length
        }
      }
    }

    // Verificar cliente do mes (primeiro lugar)
    const customerOfMonth = ranking.length > 0 ? ranking[0] : null

    return NextResponse.json({
      ranking,
      customerOfMonth,
      customerPosition,
      month,
      year,
      totalParticipants: customerStats.size
    })
  } catch (error) {
    console.error("Erro ao buscar ranking:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST - Dar recompensa ao cliente do mes (Admin)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    const { customerId, month, year, points, cashback, password } = await request.json()

    // Validar senha admin
    const { data: config } = await supabase
      .from("store_config")
      .select("admin_password")
      .limit(1)
      .single()

    if (config?.admin_password !== password) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Verificar se ja recebeu recompensa
    const { data: existing } = await supabase
      .from("monthly_ranking")
      .select("id, reward_claimed")
      .eq("customer_id", customerId)
      .eq("month", month)
      .eq("year", year)
      .single()

    if (existing?.reward_claimed) {
      return NextResponse.json({ error: "Recompensa ja foi concedida" }, { status: 400 })
    }

    // Dar pontos
    if (points && points > 0) {
      await supabase.from("customer_points").insert({
        customer_id: customerId,
        points,
        type: "earned",
        description: `Cliente do Mes - ${month}/${year}`
      })
    }

    // Dar cashback
    if (cashback && cashback > 0) {
      await supabase.from("customer_cashback").insert({
        customer_id: customerId,
        amount: cashback,
        type: "earned",
        description: `Cliente do Mes - ${month}/${year}`
      })
    }

    // Dar badge de cliente do mes
    await supabase.from("customer_badges").insert({
      customer_id: customerId,
      badge_id: 5 // Badge "Cliente do Mes"
    }).onConflict("customer_id,badge_id")

    // Registrar no ranking
    await supabase.from("monthly_ranking").upsert({
      customer_id: customerId,
      month,
      year,
      position: 1,
      reward_claimed: true
    }, { onConflict: "customer_id,month,year" })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao dar recompensa:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
