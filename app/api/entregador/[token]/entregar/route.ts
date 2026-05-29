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

// POST: Atualizar status do pedido pelo entregador
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { pin, orderId, action, observacao } = body
    
    console.log("[entregador/entregar POST] Token:", token, "OrderId:", orderId, "Action:", action)
    
    // Validar action
    const validActions = ["iniciar", "finalizar", "cancelar"]
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Acao invalida" }, { status: 400 })
    }

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
      console.error("[entregador/entregar POST] Entregador nao encontrado")
      return NextResponse.json({ error: "Entregador not found" }, { status: 404 })
    }

    // Verificar PIN (se configurado)
    if (entregador.pin && entregador.pin !== pin) {
      console.error("[entregador/entregar POST] PIN incorreto")
      return NextResponse.json({ error: "PIN incorreto" }, { status: 401 })
    }

    // Buscar pedido (por order_code ou id)
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .or(`order_code.eq.${orderId},id.eq.${orderId}`)
      .limit(1)

    if (orderError || !orders || orders.length === 0) {
      console.error("[entregador/entregar POST] Pedido nao encontrado:", orderId)
      return NextResponse.json({ error: "Pedido not found" }, { status: 404 })
    }

    const order = orders[0]

    // Verificar se o pedido pertence ao entregador
    if (order.entregador_id !== entregador.id && order.entregador_nome !== entregador.name) {
      console.error("[entregador/entregar POST] Pedido nao pertence ao entregador")
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
      console.log("[entregador/entregar POST] Iniciando entrega para pedido:", orderId)
    } else if (action === "finalizar") {
      // Finalizar entrega - mudar para completed
      newStatus = "completed"
      updates.status = "completed"
      updates.entregue_em = agora
      console.log("[entregador/entregar POST] Finalizando entrega para pedido:", orderId)
    } else if (action === "cancelar") {
      // Cancelar - mudar para cancelled
      newStatus = "cancelled"
      updates.status = "cancelled"
      updates.cancelado_em = agora
      updates.motivo_cancelamento = observacao || "Cancelado pelo entregador"
      console.log("[entregador/entregar POST] Cancelando pedido:", orderId)
    }

    // Atualizar pedido no Supabase
    const { error: updateError } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order.id)

    if (updateError) {
      console.error("[entregador/entregar POST] Erro ao atualizar pedido:", updateError.message)
      return NextResponse.json({ error: "Erro ao atualizar pedido" }, { status: 500 })
    }

    const messages: Record<string, string> = {
      iniciar: "Entrega iniciada",
      finalizar: "Pedido entregue com sucesso",
      cancelar: "Pedido cancelado"
    }

    console.log("[entregador/entregar POST] Sucesso:", messages[action])

    return NextResponse.json({
      success: true,
      message: messages[action],
      newStatus
    })
  } catch (error) {
    console.error("[entregador/entregar POST] Erro:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
