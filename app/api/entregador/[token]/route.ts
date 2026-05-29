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

// Buscar config de entregadores
async function getEntregadoresConfig() {
  const supabase = getSupabase()
  if (!supabase) return []
  
  try {
    const { data, error } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'store_config')
      .single()
    
    if (error || !data?.value) return []
    
    const config = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
    return config.entregadores || []
  } catch {
    return []
  }
}

// Interface do entregador do config
interface Entregador {
  id: string
  nome: string
  whatsapp: string
  status: string
  pin?: string
  token?: string
  horarioInicio?: string
  horarioFim?: string
  observacao?: string
}

// GET: Verificar token e retornar dados do entregador (sem PIN)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    // Buscar entregadores do config
    const entregadores = await getEntregadoresConfig() as Entregador[]
    
    // Encontrar entregador pelo token
    const entregador = entregadores.find(e => e.token === token && e.status === 'ativo')
    
    if (!entregador) {
      console.error("[entregador GET] Token nao encontrado:", token)
      return NextResponse.json({ error: "Entregador not found" }, { status: 404 })
    }

    // Retornar apenas dados publicos (sem PIN)
    return NextResponse.json({
      success: true,
      entregador: {
        id: entregador.id,
        nome: entregador.nome,
        status: entregador.status,
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

    // Buscar entregadores do config
    const entregadores = await getEntregadoresConfig() as Entregador[]
    
    // Encontrar entregador pelo token
    const entregador = entregadores.find(e => e.token === token && e.status === 'ativo')
    
    if (!entregador) {
      return NextResponse.json({ error: "Entregador not found" }, { status: 404 })
    }

    // Verificar PIN
    if (entregador.pin !== pin) {
      return NextResponse.json({ error: "PIN incorreto" }, { status: 401 })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    // Buscar pedidos atribuidos ao entregador (por entregador_id ou entregador_nome)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .or(`entregador_id.eq.${entregador.id},entregador_nome.eq.${entregador.nome}`)
      .in('status', ['delivering', 'preparing', 'confirmed'])
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error("[entregador POST] Erro ao buscar pedidos:", ordersError)
    }

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
        nome: entregador.nome,
      },
      pedidos: pedidosSeguros
    })
  } catch (error) {
    console.error("Erro ao autenticar entregador:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
