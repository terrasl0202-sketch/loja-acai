import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const PLATFORM_PASSWORD = process.env.PLATFORM_PASSWORD || "platform123"

// GET - Listar todas as lojas
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const password = searchParams.get("password")

  if (password !== PLATFORM_PASSWORD) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ error: "Erro de conexao" }, { status: 500 })
    }
    
    const { data: stores, error } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Buscar estatisticas de cada loja
    const storesWithStats = await Promise.all(
      (stores || []).map(async (store) => {
        const [ordersResult, customersResult, productsResult] = await Promise.all([
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("store_id", store.id),
          supabase.from("customers").select("id", { count: "exact", head: true }).eq("store_id", store.id),
          supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", store.id),
        ])

        return {
          ...store,
          stats: {
            orders: ordersResult.count || 0,
            customers: customersResult.count || 0,
            products: productsResult.count || 0,
          }
        }
      })
    )

    return NextResponse.json({ stores: storesWithStats })
  } catch (error) {
    console.error("Erro ao listar lojas:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST - Criar nova loja
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, store_name, slug, owner_name, owner_email, owner_phone, plan = "starter" } = body

    if (password !== PLATFORM_PASSWORD) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 401 })
    }

    if (!store_name || !slug) {
      return NextResponse.json({ error: "Nome e slug sao obrigatorios" }, { status: 400 })
    }

    // Validar slug (apenas letras minusculas, numeros e hifens)
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
      return NextResponse.json({ error: "Slug invalido. Use apenas letras minusculas, numeros e hifens." }, { status: 400 })
    }

    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Erro de conexao" }, { status: 500 })
    }

    // Verificar se slug ja existe
    const { data: existing } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", slug)
      .single()

    if (existing) {
      return NextResponse.json({ error: "Slug ja esta em uso" }, { status: 400 })
    }

    // Gerar store_code unico
    const store_code = `store_${Date.now()}`

    // Criar loja
    const { data: newStore, error: storeError } = await supabase
      .from("stores")
      .insert({
        store_code,
        slug,
        store_name,
        owner_name,
        owner_email,
        owner_phone,
        plan,
        status: "active"
      })
      .select()
      .single()

    if (storeError) {
      return NextResponse.json({ error: storeError.message }, { status: 500 })
    }

    // Criar configuracoes padrao para a nova loja
    await supabase.from("store_settings").insert({
      store_id: newStore.id,
      store_name,
      primary_color: "#8B5CF6",
      secondary_color: "#A78BFA",
      delivery_fee: 5,
      min_order_value: 15,
      store_open: true,
      accepts_pix: true,
      accepts_card: true,
      accepts_cash: true,
      enable_delivery: true,
      enable_pickup: true,
    })

    // Criar configuracoes premium padrao
    await supabase.from("cashback_settings").insert({
      store_id: newStore.id,
      enabled: false,
      percentage: 5,
      min_order_value: 20,
    })

    await supabase.from("loyalty_settings").insert({
      store_id: newStore.id,
      enabled: false,
      points_per_real: 10,
      min_points_redemption: 100,
      points_value: 0.01,
    })

    // Criar niveis VIP padrao
    const vipLevels = [
      { name: "Bronze", min_spent: 0, max_spent: 100, cashback_bonus_percentage: 0, points_bonus_percentage: 0, color: "#CD7F32", icon: "medal", sort_order: 1 },
      { name: "Prata", min_spent: 100, max_spent: 300, cashback_bonus_percentage: 1, points_bonus_percentage: 5, color: "#C0C0C0", icon: "award", sort_order: 2 },
      { name: "Ouro", min_spent: 300, max_spent: 700, cashback_bonus_percentage: 2, points_bonus_percentage: 10, color: "#FFD700", icon: "crown", sort_order: 3 },
      { name: "Diamante", min_spent: 700, max_spent: null, cashback_bonus_percentage: 3, points_bonus_percentage: 15, color: "#B9F2FF", icon: "gem", sort_order: 4 },
    ]

    for (const level of vipLevels) {
      await supabase.from("customer_levels").insert({ ...level, store_id: newStore.id, active: true })
    }

    // Criar conquistas padrao
    const achievements = [
      { name: "Primeiro Pedido", description: "Faca seu primeiro pedido", icon: "shopping-bag", type: "orders_count", target: 1, points_reward: 50, cashback_reward: 0 },
      { name: "5 Pedidos", description: "Complete 5 pedidos", icon: "package", type: "orders_count", target: 5, points_reward: 100, cashback_reward: 1 },
      { name: "10 Pedidos", description: "Complete 10 pedidos", icon: "package", type: "orders_count", target: 10, points_reward: 200, cashback_reward: 2 },
    ]

    for (const achievement of achievements) {
      await supabase.from("achievements").insert({ ...achievement, store_id: newStore.id, active: true })
    }

    // Criar missoes padrao
    const missions = [
      { title: "Faca 3 pedidos", description: "Complete 3 pedidos para ganhar recompensa", type: "orders_count", target: 3, reward_type: "points", reward_value: 100 },
      { title: "Gaste R$50", description: "Gaste R$50 em pedidos", type: "amount_spent", target: 50, reward_type: "cashback", reward_value: 3 },
    ]

    for (const mission of missions) {
      await supabase.from("missions").insert({ ...mission, store_id: newStore.id, active: true })
    }

    // Criar badges padrao
    const badges = [
      { name: "Cliente Fiel", description: "Cliente com mais de 10 pedidos", icon: "star", color: "#F59E0B" },
      { name: "Cliente do Mes", description: "Foi o cliente do mes", icon: "trophy", color: "#FFD700" },
    ]

    for (const badge of badges) {
      await supabase.from("badges").insert({ ...badge, store_id: newStore.id, active: true })
    }

    return NextResponse.json({ success: true, store: newStore })
  } catch (error) {
    console.error("Erro ao criar loja:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// PATCH - Atualizar loja
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, id, ...updates } = body

    if (password !== PLATFORM_PASSWORD) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 401 })
    }

    if (!id) {
      return NextResponse.json({ error: "ID da loja e obrigatorio" }, { status: 400 })
    }

    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Erro de conexao" }, { status: 500 })
    }

    // Campos permitidos para atualizacao
    const allowedFields = ["store_name", "owner_name", "owner_email", "owner_phone", "plan", "status", "custom_domain", "subdomain", "logo_url"]
    const sanitizedUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field]
      }
    }

    const { data: updated, error } = await supabase
      .from("stores")
      .update(sanitizedUpdates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, store: updated })
  } catch (error) {
    console.error("Erro ao atualizar loja:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
