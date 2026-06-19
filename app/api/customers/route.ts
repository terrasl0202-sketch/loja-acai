import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from "next/server"
import { getStoreIdFromRequest } from "@/lib/api-store"
import { getSessionFromRequest } from "@/lib/store-session"

/**
 * /api/customers v2 - MULTIEMPRESA
 * 
 * Clientes sao isolados por loja.
 * Mesmo telefone pode existir em lojas diferentes.
 * Busca por telefone SEMPRE inclui store_id.
 */

export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
}

// Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// Gerar codigo publico do cliente
function generateCustomerCode(): string {
  return `CUST${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`
}

// GET - Buscar cliente por telefone (filtrado por loja)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const phone = url.searchParams.get("phone")
    
    // Identificar loja atual
    const storeId = await getStoreIdFromRequest(request)
    console.log(`[customers GET] storeId: ${storeId}, phone: ${phone}`)
    
    if (!phone) {
      return NextResponse.json({ error: "Telefone obrigatorio" }, { status: 400, headers: noCacheHeaders })
    }
    
    const normalizedPhone = phone.replace(/\D/g, "")
    const supabase = getSupabase()
    
    if (!supabase) {
      return NextResponse.json({ error: "Banco de dados nao disponivel" }, { status: 500, headers: noCacheHeaders })
    }
    
    // Buscar cliente por telefone E store_id
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', normalizedPhone)
      .eq('store_id', storeId) // CRITICO: filtrar por loja
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error("[customers GET] Erro Supabase:", error)
      return NextResponse.json({ error: "Erro ao buscar cliente" }, { status: 500, headers: noCacheHeaders })
    }
    
    if (!customer) {
      return NextResponse.json({ found: false, storeId }, { headers: noCacheHeaders })
    }

    // PRIVACIDADE: o GET por telefone NAO exige PIN, entao qualquer um que saiba
    // o numero poderia enumerar dados. Por isso, sem sessao de admin desta loja
    // retornamos apenas o MINIMO (existencia + nome + flags), OMITINDO PII
    // sensivel (endereco salvo, total gasto). O proprio cliente recupera esses
    // dados via POST action:login (protegido por PIN). O admin autenticado da
    // loja ve os dados completos.
    const session = getSessionFromRequest(request)
    const isStoreAdmin = !!session && session.storeId === storeId

    const publicData: Record<string, unknown> = {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      totalOrders: customer.total_orders,
      isVip: customer.is_vip,
      favorites: customer.favorites || [],
      createdAt: customer.created_at,
    }

    // Campos sensiveis: somente para o admin autenticado da loja.
    if (isStoreAdmin) {
      publicData.totalSpent = customer.total_spent
      publicData.savedAddress = customer.saved_address
      publicData.lastOrderAt = customer.last_order_at
    }

    return NextResponse.json({ found: true, customer: publicData, storeId }, { headers: noCacheHeaders })
    
  } catch (error) {
    console.error("[customers GET] Erro:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500, headers: noCacheHeaders })
  }
}

// POST - Login ou criar conta (filtrado por loja)
export async function POST(request: NextRequest) {
  try {
    // Identificar loja atual
    const storeId = await getStoreIdFromRequest(request)
    
    const body = await request.json()
    const { action, phone, name, pin } = body
    
    console.log(`[customers POST] storeId: ${storeId}, Acao: ${action}, Phone: ${phone}`)
    
    if (!phone) {
      return NextResponse.json({ error: "Telefone obrigatorio" }, { status: 400, headers: noCacheHeaders })
    }
    
    const normalizedPhone = phone.replace(/\D/g, "")
    const supabase = getSupabase()
    
    if (!supabase) {
      return NextResponse.json({ error: "Banco de dados nao disponivel" }, { status: 500, headers: noCacheHeaders })
    }
    
    // Buscar cliente existente NESTA LOJA
    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', normalizedPhone)
      .eq('store_id', storeId) // CRITICO: filtrar por loja
      .single()
    
    // ACAO: Criar conta
    if (action === "register") {
      if (!name || !pin) {
        return NextResponse.json({ error: "Nome e PIN obrigatorios" }, { status: 400, headers: noCacheHeaders })
      }
      
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return NextResponse.json({ error: "PIN deve ter 4 digitos" }, { status: 400, headers: noCacheHeaders })
      }
      
      if (existing) {
        return NextResponse.json({ error: "Telefone ja cadastrado nesta loja" }, { status: 400, headers: noCacheHeaders })
      }
      
      const newCustomer = {
        customer_code: generateCustomerCode(),
        name,
        phone: normalizedPhone,
        pin,
        store_id: storeId, // SEMPRE salvar store_id
        total_orders: 0,
        total_spent: 0,
        is_vip: false,
        favorites: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      const { data: inserted, error: insertError } = await supabase
        .from('customers')
        .insert(newCustomer)
        .select()
        .single()
      
      if (insertError) {
        console.error("[customers POST] Erro ao criar conta:", insertError.message)
        return NextResponse.json({ error: `Erro ao criar conta: ${insertError.message}` }, { status: 500, headers: noCacheHeaders })
      }
      
      if (!inserted) {
        return NextResponse.json({ error: "Erro ao criar conta: sem retorno" }, { status: 500, headers: noCacheHeaders })
      }
      
      const publicData = {
        id: inserted.id,
        customerCode: inserted.customer_code,
        name: inserted.name,
        phone: inserted.phone,
        totalOrders: 0,
        totalSpent: 0,
        isVip: false,
        favorites: [],
        createdAt: inserted.created_at,
      }
      
      console.log(`[customers POST] Conta criada na loja ${storeId}:`, inserted.id)
      return NextResponse.json({ 
        success: true, 
        customer: publicData,
        storeId,
        message: "Conta criada com sucesso!"
      }, { headers: noCacheHeaders })
    }
    
    // ACAO: Login
    if (action === "login") {
      if (!pin) {
        return NextResponse.json({ error: "PIN obrigatorio" }, { status: 400, headers: noCacheHeaders })
      }
      
      if (!existing) {
        return NextResponse.json({ error: "Cliente nao encontrado nesta loja" }, { status: 404, headers: noCacheHeaders })
      }
      
      if (existing.pin !== pin) {
        return NextResponse.json({ error: "PIN incorreto" }, { status: 401, headers: noCacheHeaders })
      }
      
      const publicData = {
        id: existing.id,
        name: existing.name,
        phone: existing.phone,
        totalOrders: existing.total_orders,
        totalSpent: existing.total_spent,
        isVip: existing.is_vip,
        favorites: existing.favorites || [],
        savedAddress: existing.saved_address,
        lastOrderAt: existing.last_order_at,
        createdAt: existing.created_at,
      }
      
      console.log(`[customers POST] Login na loja ${storeId}:`, publicData.id)
      return NextResponse.json({ 
        success: true, 
        customer: publicData,
        storeId,
        message: "Login realizado!"
      }, { headers: noCacheHeaders })
    }
    
    // ACAO: Atualizar dados
    if (action === "update") {
      if (!existing) {
        return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404, headers: noCacheHeaders })
      }
      
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      
      if (body.newName) updates.name = body.newName
      if (body.savedAddress !== undefined) updates.saved_address = body.savedAddress
      if (body.favorites !== undefined) updates.favorites = body.favorites
      
      // Toggle favorito
      if (body.toggleFavorite !== undefined) {
        const productId = body.toggleFavorite
        const currentFavorites = existing.favorites || []
        const index = currentFavorites.indexOf(productId)
        if (index >= 0) {
          currentFavorites.splice(index, 1)
        } else {
          currentFavorites.push(productId)
        }
        updates.favorites = currentFavorites
      }
      
      // Atualizar apenas se pertence a esta loja
      const { error: updateError } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', existing.id)
        .eq('store_id', storeId) // Seguranca
      
      if (updateError) {
        console.error("[customers POST] Erro ao atualizar:", updateError)
        return NextResponse.json({ error: "Erro ao atualizar dados" }, { status: 500, headers: noCacheHeaders })
      }
      
      const publicData = {
        id: existing.id,
        name: body.newName || existing.name,
        phone: existing.phone,
        totalOrders: existing.total_orders,
        totalSpent: existing.total_spent,
        isVip: existing.is_vip,
        favorites: updates.favorites as string[] || existing.favorites || [],
        savedAddress: updates.saved_address as string || existing.saved_address,
        lastOrderAt: existing.last_order_at,
        createdAt: existing.created_at,
      }
      
      return NextResponse.json({ success: true, customer: publicData, storeId }, { headers: noCacheHeaders })
    }
    
    // ACAO: Registrar pedido (atualizar estatisticas)
    if (action === "recordOrder") {
      if (!existing) {
        return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404, headers: noCacheHeaders })
      }
      
      const { orderTotal } = body
      const newTotalOrders = (existing.total_orders || 0) + 1
      const newTotalSpent = (existing.total_spent || 0) + (orderTotal || 0)
      const isVip = newTotalOrders >= 5
      
      // Atualizar apenas se pertence a esta loja
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          total_orders: newTotalOrders,
          total_spent: newTotalSpent,
          is_vip: isVip,
          last_order_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('store_id', storeId) // Seguranca
      
      if (updateError) {
        console.error("[customers POST] Erro ao registrar pedido:", updateError)
        return NextResponse.json({ error: "Erro ao registrar pedido" }, { status: 500, headers: noCacheHeaders })
      }
      
      const publicData = {
        id: existing.id,
        name: existing.name,
        phone: existing.phone,
        totalOrders: newTotalOrders,
        totalSpent: newTotalSpent,
        isVip,
        favorites: existing.favorites || [],
        savedAddress: existing.saved_address,
        lastOrderAt: new Date().toISOString(),
        createdAt: existing.created_at,
      }
      
      return NextResponse.json({ success: true, customer: publicData, storeId }, { headers: noCacheHeaders })
    }
    
    return NextResponse.json({ error: "Acao invalida" }, { status: 400, headers: noCacheHeaders })
    
  } catch (error) {
    console.error("[customers POST] Erro:", error)
    return NextResponse.json({ error: `Erro interno: ${error instanceof Error ? error.message : 'Desconhecido'}` }, { status: 500, headers: noCacheHeaders })
  }
}
