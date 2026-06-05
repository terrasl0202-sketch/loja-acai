import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Estatisticas VIP para Admin
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const password = searchParams.get('password')

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Validar senha admin
    const { data: config } = await supabase
      .from('store_settings')
      .select('admin_password')
      .single()

    if (!config || config.admin_password !== password) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Buscar todos os niveis ativos
    const { data: levels } = await supabase
      .from('customer_levels')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (!levels || levels.length === 0) {
      return NextResponse.json({ 
        stats: { byLevel: [], topCustomers: [], nearUpgrade: [] },
        levels: []
      })
    }

    // Buscar todos os clientes com seus totais gastos
    const validStatuses = ['confirmed', 'preparing', 'delivering', 'completed']
    
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, phone')

    if (!customers || customers.length === 0) {
      return NextResponse.json({ 
        stats: { 
          byLevel: levels.map(l => ({ level: l.name, count: 0, color: l.color })),
          topCustomers: [],
          nearUpgrade: []
        },
        levels
      })
    }

    // Buscar totais de pedidos por cliente
    const { data: orderTotals } = await supabase
      .from('orders')
      .select('customer_id, total, id')
      .in('status', validStatuses)
      .not('customer_id', 'is', null)

    // Agrupar totais por cliente
    const customerTotals: Record<number, { total: number; orders: number }> = {}
    orderTotals?.forEach(o => {
      if (o.customer_id) {
        if (!customerTotals[o.customer_id]) {
          customerTotals[o.customer_id] = { total: 0, orders: 0 }
        }
        customerTotals[o.customer_id].total += Number(o.total) || 0
        customerTotals[o.customer_id].orders += 1
      }
    })

    // Classificar clientes por nivel
    const customersByLevel: Record<string, number> = {}
    levels.forEach(l => { customersByLevel[l.name] = 0 })

    interface CustomerWithLevel {
      id: number
      name: string
      phone: string
      totalSpent: number
      totalOrders: number
      levelName: string
      levelColor: string
      nextLevelName: string | null
      amountToNext: number
    }

    const customersWithLevels: CustomerWithLevel[] = customers.map(c => {
      const totals = customerTotals[c.id] || { total: 0, orders: 0 }
      const totalSpent = totals.total

      // Encontrar nivel
      let currentLevel = levels[0]
      let nextLevel = levels[1] || null

      for (let i = 0; i < levels.length; i++) {
        const level = levels[i]
        const minSpent = Number(level.min_spent) || 0
        const maxSpent = level.max_spent !== null ? Number(level.max_spent) : Infinity

        if (totalSpent >= minSpent && (totalSpent < maxSpent || level.max_spent === null)) {
          currentLevel = level
          nextLevel = levels[i + 1] || null
          break
        }
      }

      customersByLevel[currentLevel.name] = (customersByLevel[currentLevel.name] || 0) + 1

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        totalSpent,
        totalOrders: totals.orders,
        levelName: currentLevel.name,
        levelColor: currentLevel.color,
        nextLevelName: nextLevel?.name || null,
        amountToNext: nextLevel ? Math.max(0, Number(nextLevel.min_spent) - totalSpent) : 0,
      }
    })

    // Top clientes por gasto
    const topCustomers = [...customersWithLevels]
      .filter(c => c.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    // Clientes proximos de subir nivel (com menos de R$50 faltando)
    const nearUpgrade = [...customersWithLevels]
      .filter(c => c.nextLevelName && c.amountToNext > 0 && c.amountToNext <= 50)
      .sort((a, b) => a.amountToNext - b.amountToNext)
      .slice(0, 10)

    // Estatisticas por nivel
    const byLevel = levels.map(l => ({
      level: l.name,
      count: customersByLevel[l.name] || 0,
      color: l.color,
    }))

    return NextResponse.json({
      stats: {
        byLevel,
        topCustomers,
        nearUpgrade,
        totalCustomers: customers.length,
      },
      levels,
    })
  } catch (error) {
    console.error("[vip/stats] Erro:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
