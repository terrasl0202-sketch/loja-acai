import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStoreIdFromRequest } from "@/lib/api-store"

/**
 * /api/vip/levels v2 - MULTIEMPRESA
 * Niveis VIP isolados por loja.
 */

// GET - Buscar todos os niveis VIP DESTA LOJA
export async function GET(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  console.log(`[vip/levels v2 GET] storeId: ${storeId}`)
  
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }
    
    const { data: levels, error } = await supabase
      .from('customer_levels')
      .select('*')
      .eq('store_id', storeId) // Filtrar por loja
      .order('sort_order', { ascending: true })

    if (error) {
      console.error("[vip/levels] Erro ao buscar niveis:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ levels: levels || [], storeId })
  } catch (error) {
    console.error("[vip/levels] Erro:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST - Atualizar nivel VIP (Admin) - DESTA LOJA
export async function POST(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }
    
    const body = await request.json()
    const { level, password } = body

    // Validar senha admin DESTA LOJA
    const { data: config } = await supabase
      .from('store_settings')
      .select('admin_password')
      .eq('store_id', storeId)
      .single()

    if (!config || config.admin_password !== password) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    if (!level?.id) {
      return NextResponse.json({ error: "ID do nivel obrigatorio" }, { status: 400 })
    }

    // Atualizar nivel apenas se pertence a esta loja
    const { data: updated, error } = await supabase
      .from('customer_levels')
      .update({
        name: level.name,
        min_spent: level.min_spent,
        max_spent: level.max_spent,
        cashback_bonus_percentage: level.cashback_bonus_percentage,
        points_bonus_percentage: level.points_bonus_percentage,
        benefits: level.benefits || [],
        color: level.color,
        icon: level.icon,
        active: level.active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', level.id)
      .eq('store_id', storeId) // Seguranca
      .select()
      .single()

    if (error) {
      console.error("[vip/levels] Erro ao atualizar nivel:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ level: updated, storeId })
  } catch (error) {
    console.error("[vip/levels] Erro:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
