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
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

// Interface do entregador do Supabase
interface EntregadorDb {
  id: string
  name: string
  phone: string
  active: boolean
  available: boolean
  token: string
  pin: string | null
  vehicle: string | null
  notes: string | null
  start_time: string | null
  end_time: string | null
}

// GET: Verificar token e retornar dados do entregador (sem PIN)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    console.log("[entregador GET] Buscando entregador com token:", token)
    
    const supabase = getSupabase()
    if (!supabase) {
      console.error("[entregador GET] Supabase nao configurado")
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }
    
    // Buscar entregador pelo token na tabela entregadores
    const { data: entregador, error } = await supabase
      .from('entregadores')
      .select('*')
      .eq('token', token)
      .eq('active', true)
      .single()
    
    if (error || !entregador) {
      console.error("[entregador GET] Token nao encontrado:", token, error?.message)
      return NextResponse.json({ error: "Entregador not found" }, { status: 404 })
    }
    
    console.log("[entregador GET] Entregador encontrado:", entregador.name)

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
    console.error("[entregador GET] Erro:", error)
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

    console.log("[entregador POST] Autenticando token:", token)
    
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    // Buscar entregador pelo token na tabela entregadores
    const { data: entregador, error: entregadorError } = await supabase
      .from('entregadores')
      .select('*')
      .eq('token', token)
      .eq('active', true)
      .single()
    
    if (entregadorError || !entregador) {
      console.error("[entregador POST] Token nao encontrado:", token)
      return NextResponse.json({ error: "Entregador not found" }, { status: 404 })
    }

    // Verificar PIN
    if (entregador.pin && entregador.pin !== pin) {
      console.error("[entregador POST] PIN incorreto para:", entregador.name)
      return NextResponse.json({ error: "PIN incorreto" }, { status: 401 })
    }

    console.log("[entregador POST] Autenticado:", entregador.name)

    // Buscar pedidos atribuidos ao entregador (por entregador_id ou entregador_nome)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .or(`entregador_id.eq.${entregador.id},entregador_nome.eq.${entregador.name}`)
      .in('status', ['delivering', 'preparing', 'confirmed'])
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error("[entregador POST] Erro ao buscar pedidos:", ordersError.message)
    }

    console.log("[entregador POST] Pedidos encontrados:", (orders || []).length)

    // Formatar itens para exibicao
    const formatItems = (items: unknown): string => {
      if (typeof items === 'string') {
        try {
          const parsed = JSON.parse(items)
          if (Array.isArray(parsed)) {
            return parsed.map((item: { productName?: string; name?: string; quantity?: number; price?: number; subtotal?: number }) => {
              const name = item.productName || item.name || 'Produto'
              const qty = item.quantity || 1
              const subtotal = item.subtotal || ((item.price || 0) * qty)
              return `${qty}x ${name} - R$ ${subtotal.toFixed(2)}`
            }).join('\n')
          }
          return items
        } catch {
          return items
        }
      }
      if (Array.isArray(items)) {
        return items.map((item: { productName?: string; name?: string; quantity?: number; price?: number; subtotal?: number }) => {
          const name = item.productName || item.name || 'Produto'
          const qty = item.quantity || 1
          const subtotal = item.subtotal || ((item.price || 0) * qty)
          return `${qty}x ${name} - R$ ${subtotal.toFixed(2)}`
        }).join('\n')
      }
      return 'Sem itens'
    }

    // Mapear pedidos para formato do frontend
    const pedidosSeguros = (orders || []).map(o => ({
      id: o.order_code || String(o.id),
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      address: o.address,
      neighborhood: o.neighborhood,
      reference: o.reference,
      items: formatItems(o.items),
      total: Number(o.total),
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
    console.error("[entregador POST] Erro:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
