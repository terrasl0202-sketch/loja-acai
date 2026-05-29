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
    const { pin, orderId, action } = body
    
    console.log("[entregador/entregar] Token:", token, "OrderId:", orderId, "Action:", action)
    
    // Validar action
    const validActions = ["iniciar", "finalizar", "cancelar"]
    if (!validActions.includes(action)) {
      console.log("[entregador/entregar] Acao invalida:", action)
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
      console.error("[entregador/entregar] Entregador nao encontrado:", entregadorError?.message)
      return NextResponse.json({ error: "Entregador not found" }, { status: 404 })
    }
    
    console.log("[entregador/entregar] Entregador:", entregador.name)

    // Verificar PIN (se configurado)
    if (entregador.pin && entregador.pin !== pin) {
      return NextResponse.json({ error: "PIN incorreto" }, { status: 401 })
    }

    // Buscar pedido - DETECTAR SE E order_code (PK...) OU id (numerico)
    const isOrderCode = typeof orderId === 'string' && orderId.startsWith('PK')
    console.log("[entregador/entregar] Buscando por:", isOrderCode ? "order_code" : "id", "=", orderId)
    
    let orders = null
    let orderError = null
    
    if (isOrderCode) {
      // Buscar por order_code (string)
      const result = await supabase
        .from('orders')
        .select('*')
        .eq('order_code', orderId)
      orders = result.data
      orderError = result.error
    } else {
      // Buscar por id (BIGINT)
      const numericId = parseInt(orderId, 10)
      if (isNaN(numericId)) {
        return NextResponse.json({ error: "orderId invalido" }, { status: 400 })
      }
      const result = await supabase
        .from('orders')
        .select('*')
        .eq('id', numericId)
      orders = result.data
      orderError = result.error
    }

    if (orderError) {
      console.error("[entregador/entregar] Erro ao buscar pedido:", orderError.message)
      return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      console.error("[entregador/entregar] Pedido nao encontrado:", orderId)
      return NextResponse.json({ error: "Pedido not found" }, { status: 404 })
    }

    const order = orders[0]
    console.log("[entregador/entregar] Pedido encontrado - ID:", order.id, "Status:", order.status)

    // Verificar se o pedido pertence ao entregador
    const entregadorId = String(entregador.id)
    const pertence = 
      order.entregador_id === entregadorId ||
      order.entregador_id === entregador.id ||
      order.entregador_nome === entregador.name ||
      order.entregador_whatsapp === entregador.whatsapp

    if (!pertence) {
      console.error("[entregador/entregar] Pedido nao pertence ao entregador")
      return NextResponse.json({ error: "Pedido nao pertence a este entregador" }, { status: 403 })
    }

    // Determinar novo status - SOMENTE atualizar campo 'status'
    let newStatus = order.status
    if (action === "iniciar") {
      newStatus = "delivering"
    } else if (action === "finalizar") {
      newStatus = "completed"
    } else if (action === "cancelar") {
      newStatus = "cancelled"
    }

    console.log("[entregador/entregar] Atualizando status:", order.status, "->", newStatus)

    // Atualizar SOMENTE o campo status (outros campos podem nao existir)
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id)

    if (updateError) {
      console.error("[entregador/entregar] Erro ao atualizar:", updateError.message)
      return NextResponse.json({ error: "Erro ao atualizar pedido" }, { status: 500 })
    }

    const messages: Record<string, string> = {
      iniciar: "Entrega iniciada",
      finalizar: "Pedido entregue com sucesso",
      cancelar: "Pedido cancelado"
    }

    console.log("[entregador/entregar] Sucesso:", messages[action])

    return NextResponse.json({
      success: true,
      message: messages[action],
      newStatus
    })
  } catch (error) {
    console.error("[entregador/entregar] Erro geral:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
