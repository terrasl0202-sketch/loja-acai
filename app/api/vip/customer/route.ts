import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStoreIdFromRequest } from "@/lib/api-store"

/**
 * /api/vip/customer v2 - MULTIEMPRESA
 * Status VIP do cliente por loja.
 */

export interface CustomerLevel {
  id: number
  name: string
  min_spent: number
  max_spent: number | null
  cashback_bonus_percentage: number
  points_bonus_percentage: number
  benefits: string[]
  color: string
  icon: string
  active: boolean
  sort_order: number
  store_id: number
}

export interface CustomerVipStatus {
  level: CustomerLevel
  totalSpent: number
  nextLevel: CustomerLevel | null
  amountToNextLevel: number
  progressPercent: number
  totalOrders: number
}

// Funcao para calcular status VIP do cliente NESTA LOJA
export async function getCustomerVipStatus(customerId: number, storeId: number): Promise<CustomerVipStatus | null> {
  const supabase = await createClient()
  if (!supabase) return null
  
  // Buscar niveis ativos DESTA LOJA
  const { data: levels } = await supabase
    .from('customer_levels')
    .select('*')
    .eq('active', true)
    .eq('store_id', storeId) // Filtrar por loja
    .order('sort_order', { ascending: true })

  if (!levels || levels.length === 0) {
    return null
  }

  // Calcular total gasto pelo cliente NESTA LOJA (apenas pedidos validos)
  const validStatuses = ['confirmed', 'preparing', 'delivering', 'completed']
  
  const { data: orders } = await supabase
    .from('orders')
    .select('total')
    .eq('customer_id', customerId)
    .eq('store_id', storeId) // Filtrar por loja
    .in('status', validStatuses)

  const totalSpent = orders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0
  const totalOrders = orders?.length || 0

  // Encontrar nivel atual baseado no total gasto
  let currentLevel = levels[0]
  let nextLevel: CustomerLevel | null = null

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i]
    const minSpent = Number(level.min_spent) || 0
    const maxSpent = level.max_spent !== null ? Number(level.max_spent) : Infinity

    if (totalSpent >= minSpent && totalSpent < maxSpent) {
      currentLevel = level
      nextLevel = levels[i + 1] || null
      break
    } else if (totalSpent >= minSpent && level.max_spent === null) {
      currentLevel = level
      nextLevel = null
      break
    }
  }

  // Calcular progresso
  let amountToNextLevel = 0
  let progressPercent = 100

  if (nextLevel) {
    const nextMin = Number(nextLevel.min_spent) || 0
    const currentMin = Number(currentLevel.min_spent) || 0
    const range = nextMin - currentMin
    const progress = totalSpent - currentMin
    
    amountToNextLevel = Math.max(0, nextMin - totalSpent)
    progressPercent = range > 0 ? Math.min(100, Math.round((progress / range) * 100)) : 100
  }

  return {
    level: currentLevel,
    totalSpent,
    nextLevel,
    amountToNextLevel,
    progressPercent,
    totalOrders,
  }
}

// GET - Buscar status VIP do cliente NESTA LOJA
export async function GET(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  console.log(`[vip/customer v2 GET] storeId: ${storeId}`)
  
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const phone = searchParams.get('phone')

    if (!customerId && !phone) {
      return NextResponse.json({ error: "customerId ou phone obrigatorio" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }
    
    let customerIdNum = customerId ? parseInt(customerId) : null

    // Se passou phone, buscar customer DESTA LOJA
    if (!customerIdNum && phone) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone)
        .eq('store_id', storeId) // Filtrar por loja
        .single()

      if (!customer) {
        // Cliente nao existe - retornar nivel Bronze padrao
        const { data: levels } = await supabase
          .from('customer_levels')
          .select('*')
          .eq('active', true)
          .eq('store_id', storeId)
          .order('sort_order', { ascending: true })
          .limit(1)

        const bronzeLevel = levels?.[0] || {
          id: 0,
          name: 'Bronze',
          min_spent: 0,
          max_spent: 100,
          cashback_bonus_percentage: 0,
          points_bonus_percentage: 0,
          benefits: ['Acesso ao programa de fidelidade'],
          color: '#CD7F32',
          icon: 'medal',
          active: true,
          sort_order: 1,
        }

        return NextResponse.json({
          status: {
            level: bronzeLevel,
            totalSpent: 0,
            nextLevel: null,
            amountToNextLevel: 100,
            progressPercent: 0,
            totalOrders: 0,
          },
          storeId
        })
      }

      customerIdNum = customer.id
    }

    if (!customerIdNum) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    const status = await getCustomerVipStatus(customerIdNum, storeId)

    if (!status) {
      return NextResponse.json({ error: "Niveis VIP nao configurados" }, { status: 500 })
    }

    return NextResponse.json({ status, storeId })
  } catch (error) {
    console.error("[vip/customer] Erro:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
