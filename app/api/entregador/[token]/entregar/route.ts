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
}

// POST: Atualizar status do pedido pelo entregador
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { pin, orderId, action, observacao } = body
    
    // Validar action
    const validActions = ["iniciar", "finalizar", "cancelar"]
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Acao invalida" }, { status: 400 })
    }

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

    // Buscar pedido (por order_code ou id)
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .or(`order_code.eq.${orderId},id.eq.${orderId}`)
      .limit(1)

    if (orderError || !orders || orders.length === 0) {
      return NextResponse.json({ error: "Pedido not found" }, { status: 404 })
    }

    const order = orders[0]

    // Verificar se o pedido pertence ao entregador
    if (order.entregador_id !== entregador.id && order.entregador_nome !== entregador.nome) {
      return NextResponse.json({ error: "Pedido nao pertence a este entregador" }, { status: 403 })
    }

    const agora = new Date().toISOString()
    let newStatus = order.status
    const updates: Record<string, unknown> = {}

    // Executar acao
    if (action === "iniciar") {
      // Iniciar entrega - mudar para delivering
      newStatus = "delivering"
      updates.status = "delivering"
      updates.saiu_para_entrega_em = agora
    } else if (action === "finalizar") {
      // Finalizar entrega - mudar para completed
      newStatus = "completed"
      updates.status = "completed"
      updates.entregue_em = agora
    } else if (action === "cancelar") {
      // Cancelar - mudar para cancelled
      newStatus = "cancelled"
      updates.status = "cancelled"
      updates.cancelado_em = agora
      updates.motivo_cancelamento = observacao || "Cancelado pelo entregador"
    }

    // Atualizar pedido no Supabase
    const { error: updateError } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order.id)

    if (updateError) {
      console.error("[entregador entregar] Erro ao atualizar pedido:", updateError)
      return NextResponse.json({ error: "Erro ao atualizar pedido" }, { status: 500 })
    }

    const messages: Record<string, string> = {
      iniciar: "Entrega iniciada",
      finalizar: "Pedido entregue com sucesso",
      cancelar: "Pedido cancelado"
    }

    return NextResponse.json({
      success: true,
      message: messages[action],
      newStatus
    })
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
