import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Evitar cache
export const dynamic = "force-dynamic"
export const revalidate = 0

// Cria Supabase client
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

// GET: Verificar token e retornar dados do entregador (sem PIN)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    // Buscar entregador pelo token no Supabase
    const { data: entregador, error } = await supabase
      .from('entregadores')
      .select('id, name, phone, active, vehicle')
      .eq('token', token)
      .eq('active', true)
      .single()

    if (error || !entregador) {
      console.error("[entregador GET] Token nao encontrado:", token)
      return NextResponse.json({ error: "Entregador not found" }, { status: 404 })
    }

    // Retornar apenas dados publicos (sem PIN)
    return NextResponse.json({
      success: true,
      entregador: {
        id: entregador.id,
        nome: entregador.name,
        status: entregador.active ? 'ativo' : 'inativo',
      }
    })
  } catch (error) {
    console.error("Erro ao buscar entregador:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// POST: Autenticar com PIN e retornar pedidos
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { pin } = body

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    // Buscar entregador pelo token no Supabase
    const { data: entregador, error: entregadorError } = await supabase
      .from('entregadores')
      .select('*')
      .eq('token', token)
      .eq('active', true)
      .single()

    if (entregadorError || !entregador) {
      return NextResponse.json({ error: "Entregador not found" }, { status: 404 })
    }

    // Verificar PIN
    if (entregador.pin !== pin) {
      return NextResponse.json({ error: "PIN incorreto" }, { status: 401 })
    }

    // Buscar pedidos atribuidos ao entregador
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('entregador_id', entregador.id)
      .in('status', ['delivering', 'preparing'])
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error("[entregador POST] Erro ao buscar pedidos:", ordersError)
    }

    // Mapear pedidos para formato do frontend
    const pedidosSeguros = (orders || []).map(o => ({
      id: o.id,
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      address: o.address,
      neighborhood: o.neighborhood,
      reference: o.reference,
      items: o.items,
      total: o.total,
      paymentMethod: o.payment_method,
      observation: o.observation,
      status: o.status,
      saiuParaEntregaEm: o.saiu_para_entrega_em,
      createdAt: o.created_at,
    }))

    return NextResponse.json({
      success: true,
      entregador: {
        id: entregador.id,
        nome: entregador.name,
      },
      pedidos: pedidosSeguros
    })
  } catch (error) {
    console.error("Erro ao autenticar entregador:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
