import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("Supabase credentials missing")
  return createClient(url, key)
}

/**
 * API de correcao de payment_status inconsistente
 * 
 * GET: Diagnostico - mostra quantos pedidos estao inconsistentes
 * POST: Correcao - atualiza payment_status para 'confirmed' onde status indica pagamento
 * 
 * Protegido por senha admin
 */

export async function GET(request: NextRequest) {
  try {
    const password = request.headers.get('x-admin-password')
    
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabase()

    // Buscar pedidos inconsistentes:
    // status = confirmed/preparing/delivering/completed
    // MAS payment_status != confirmed
    const { data: inconsistentes, error } = await supabase
      .from('orders')
      .select('id, order_code, status, payment_status, total, created_at')
      .in('status', ['confirmed', 'preparing', 'delivering', 'completed'])
      .or('payment_status.is.null,payment_status.neq.confirmed')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calcular faturamento perdido
    const faturamentoPerdido = (inconsistentes || []).reduce((sum, o) => sum + (Number(o.total) || 0), 0)

    // Buscar totais para comparacao
    const { data: todosConfirmados } = await supabase
      .from('orders')
      .select('id, total')
      .in('status', ['confirmed', 'preparing', 'delivering', 'completed'])

    const faturamentoTotal = (todosConfirmados || []).reduce((sum, o) => sum + (Number(o.total) || 0), 0)

    return NextResponse.json({
      success: true,
      diagnostico: {
        pedidosInconsistentes: inconsistentes?.length || 0,
        faturamentoPerdido: faturamentoPerdido.toFixed(2),
        faturamentoTotal: faturamentoTotal.toFixed(2),
        pedidos: inconsistentes?.slice(0, 20) || [], // Mostrar primeiros 20
      },
      mensagem: inconsistentes?.length 
        ? `Encontrados ${inconsistentes.length} pedidos com payment_status inconsistente. Use POST para corrigir.`
        : "Nenhuma inconsistencia encontrada!"
    })

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, dryRun } = body

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabase()

    // Buscar pedidos inconsistentes
    const { data: inconsistentes, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_code, status, payment_status, total')
      .in('status', ['confirmed', 'preparing', 'delivering', 'completed'])
      .or('payment_status.is.null,payment_status.neq.confirmed')

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!inconsistentes || inconsistentes.length === 0) {
      return NextResponse.json({
        success: true,
        corrigidos: 0,
        mensagem: "Nenhum pedido inconsistente encontrado!"
      })
    }

    // Se dryRun, apenas retornar o que seria corrigido
    if (dryRun) {
      const faturamento = inconsistentes.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
      return NextResponse.json({
        success: true,
        dryRun: true,
        seraoCorrigidos: inconsistentes.length,
        faturamentoQueSeraRecuperado: faturamento.toFixed(2),
        pedidos: inconsistentes.slice(0, 10),
        mensagem: `DryRun: ${inconsistentes.length} pedidos seriam corrigidos. Envie dryRun: false para executar.`
      })
    }

    // Executar correcao
    const ids = inconsistentes.map(o => o.id)
    
    const { error: updateError, count } = await supabase
      .from('orders')
      .update({ 
        payment_status: 'confirmed',
        paid_at: new Date().toISOString()
      })
      .in('id', ids)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const faturamentoRecuperado = inconsistentes.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

    return NextResponse.json({
      success: true,
      corrigidos: count || inconsistentes.length,
      faturamentoRecuperado: faturamentoRecuperado.toFixed(2),
      pedidosCorrigidos: inconsistentes.map(o => o.order_code),
      mensagem: `Corrigidos ${inconsistentes.length} pedidos! Faturamento recuperado: R$ ${faturamentoRecuperado.toFixed(2)}`
    })

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
