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
    
    console.log("[entregador/entregar POST] === INICIO ===")
    console.log("[entregador/entregar POST] Token recebido:", token)
    console.log("[entregador/entregar POST] OrderId recebido:", orderId)
    console.log("[entregador/entregar POST] Action:", action)
    
    // Validar action
    const validActions = ["iniciar", "finalizar", "cancelar"]
    if (!validActions.includes(action)) {
      console.log("[entregador/entregar POST] Acao invalida:", action)
      return NextResponse.json({ error: "Acao invalida" }, { status: 400 })
    }

    const supabase = getSupabase()
    if (!supabase) {
      console.log("[entregador/entregar POST] Database not configured")
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    // Buscar entregador pelo token na tabela entregadores
    console.log("[entregador/entregar POST] Buscando entregador por token...")
    const { data: entregador, error: entregadorError } = await supabase
      .from('entregadores')
      .select('*')
      .eq('token', token)
      .eq('active', true)
      .single()
    
    if (entregadorError || !entregador) {
      console.error("[entregador/entregar POST] Entregador nao encontrado. Erro:", entregadorError?.message)
      return NextResponse.json({ error: "Entregador not found" }, { status: 404 })
    }
    
    console.log("[entregador/entregar POST] Entregador encontrado:", entregador.name, "ID:", entregador.id)

    // Verificar PIN (se configurado)
    if (entregador.pin && entregador.pin !== pin) {
      console.error("[entregador/entregar POST] PIN incorreto")
      return NextResponse.json({ error: "PIN incorreto" }, { status: 401 })
    }

    // Buscar pedido - DETECTAR SE E order_code (PK...) OU id (numerico)
    const isOrderCode = typeof orderId === 'string' && orderId.startsWith('PK')
    console.log("[entregador/entregar POST] Buscando pedido por:", isOrderCode ? "order_code" : "id", "=", orderId)
    
    let orderQuery
    if (isOrderCode) {
      // Buscar por order_code (string)
      orderQuery = supabase
        .from('orders')
        .select('*')
        .eq('order_code', orderId)
        .limit(1)
    } else {
      // Buscar por id (BIGINT) - tentar converter para numero
      const numericId = parseInt(orderId, 10)
      if (isNaN(numericId)) {
        console.error("[entregador/entregar POST] orderId invalido (nao e PK nem numerico):", orderId)
        return NextResponse.json({ error: "orderId invalido" }, { status: 400 })
      }
      orderQuery = supabase
        .from('orders')
        .select('*')
        .eq('id', numericId)
        .limit(1)
    }

    const { data: orders, error: orderError } = await orderQuery

    if (orderError) {
      console.error("[entregador/entregar POST] Erro Supabase ao buscar pedido:", orderError.message, orderError.details, orderError.hint)
      return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      console.error("[entregador/entregar POST] Pedido nao encontrado:", orderId, "(buscou por", isOrderCode ? "order_code" : "id", ")")
      return NextResponse.json({ error: "Pedido not found" }, { status: 404 })
    }

    const order = orders[0]
    console.log("[entregador/entregar POST] Pedido encontrado! ID:", order.id, "OrderCode:", order.order_code, "Status atual:", order.status)

    // Verificar se o pedido pertence ao entregador (por id, nome OU whatsapp)
    const entregadorId = String(entregador.id)
    const pertenceAoEntregador = 
      order.entregador_id === entregadorId ||
      order.entregador_id === entregador.id ||
      order.entregador_nome === entregador.name ||
      order.entregador_whatsapp === entregador.whatsapp
    
    console.log("[entregador/entregar POST] Verificando vinculo:")
    console.log("  - order.entregador_id:", order.entregador_id)
    console.log("  - entregador.id:", entregador.id, "(string:", entregadorId, ")")
    console.log("  - order.entregador_nome:", order.entregador_nome)
    console.log("  - entregador.name:", entregador.name)
    console.log("  - Pertence ao entregador?", pertenceAoEntregador)

    if (!pertenceAoEntregador) {
      console.error("[entregador/entregar POST] Pedido nao pertence ao entregador")
      return NextResponse.json({ error: "Pedido nao pertence a este entregador" }, { status: 403 })
    }

    const agora = new Date().toISOString()
    const statusAntes = order.status
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
      if (observacao) {
        updates.motivo_cancelamento = observacao
      }
    }
    
    console.log("[entregador/entregar POST] Atualizando pedido:")
    console.log("  - Status antes:", statusAntes)
    console.log("  - Status depois:", newStatus)
    console.log("  - Updates:", JSON.stringify(updates))

    // Atualizar pedido no Supabase usando o ID interno (BIGINT)
    const { error: updateError } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order.id)

    if (updateError) {
      console.error("[entregador/entregar POST] Erro Supabase ao atualizar pedido:", updateError.message, updateError.details, updateError.hint)
      return NextResponse.json({ error: "Erro ao atualizar pedido" }, { status: 500 })
    }

    const messages: Record<string, string> = {
      iniciar: "Entrega iniciada",
      finalizar: "Pedido entregue com sucesso",
      cancelar: "Pedido cancelado"
    }

    console.log("[entregador/entregar POST] === SUCESSO ===", messages[action])

    return NextResponse.json({
      success: true,
      message: messages[action],
      newStatus
    })
  } catch (error) {
    console.error("[entregador/entregar POST] Erro geral:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
