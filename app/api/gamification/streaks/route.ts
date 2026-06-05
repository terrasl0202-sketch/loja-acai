import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Buscar streak do cliente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customerId")

    if (!customerId) {
      return NextResponse.json({ error: "customerId required" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    const { data: streak } = await supabase
      .from("customer_streaks")
      .select("*")
      .eq("customer_id", parseInt(customerId))
      .single()

    if (!streak) {
      return NextResponse.json({
        streak: {
          currentStreak: 0,
          bestStreak: 0,
          lastOrderDate: null
        }
      })
    }

    return NextResponse.json({
      streak: {
        currentStreak: streak.current_streak || 0,
        bestStreak: streak.best_streak || 0,
        lastOrderDate: streak.last_order_date
      }
    })
  } catch (error) {
    console.error("Erro ao buscar streak:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST - Atualizar streak (chamado quando pedido é confirmado)
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

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split("T")[0]

    // Buscar streak atual
    const { data: existingStreak } = await supabase
      .from("customer_streaks")
      .select("*")
      .eq("customer_id", customerId)
      .single()

    if (!existingStreak) {
      // Criar primeiro streak
      const { data: newStreak } = await supabase
        .from("customer_streaks")
        .insert({
          customer_id: customerId,
          current_streak: 1,
          best_streak: 1,
          last_order_date: todayStr
        })
        .select()
        .single()

      return NextResponse.json({
        streak: {
          currentStreak: 1,
          bestStreak: 1,
          lastOrderDate: todayStr
        },
        isNew: true
      })
    }

    // Verificar se ja fez pedido hoje
    if (existingStreak.last_order_date === todayStr) {
      return NextResponse.json({
        streak: {
          currentStreak: existingStreak.current_streak,
          bestStreak: existingStreak.best_streak,
          lastOrderDate: existingStreak.last_order_date
        },
        message: "Streak ja atualizado hoje"
      })
    }

    // Calcular diferenca de dias
    const lastDate = new Date(existingStreak.last_order_date)
    lastDate.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

    let newCurrentStreak = 1
    let newBestStreak = existingStreak.best_streak || 0

    if (diffDays === 1) {
      // Dia consecutivo - incrementa streak
      newCurrentStreak = (existingStreak.current_streak || 0) + 1
    } else if (diffDays > 1) {
      // Quebrou sequencia - reset
      newCurrentStreak = 1
    }

    // Atualizar best streak se necessario
    if (newCurrentStreak > newBestStreak) {
      newBestStreak = newCurrentStreak
    }

    // Atualizar no banco
    await supabase
      .from("customer_streaks")
      .update({
        current_streak: newCurrentStreak,
        best_streak: newBestStreak,
        last_order_date: todayStr,
        updated_at: new Date().toISOString()
      })
      .eq("customer_id", customerId)

    return NextResponse.json({
      streak: {
        currentStreak: newCurrentStreak,
        bestStreak: newBestStreak,
        lastOrderDate: todayStr
      },
      wasConsecutive: diffDays === 1
    })
  } catch (error) {
    console.error("Erro ao atualizar streak:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
