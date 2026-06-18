// Script para corrigir pedidos com payment_status inconsistente
// Executa diretamente no Supabase

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('ERRO: Variaveis de ambiente do Supabase nao encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const MODE = process.argv[2] || 'diagnose' // diagnose, dryrun, fix

async function main() {
  console.log('='.repeat(60))
  console.log('CORRECAO DE PAYMENT_STATUS - PEDIDOS INCONSISTENTES')
  console.log('='.repeat(60))
  console.log(`Modo: ${MODE.toUpperCase()}`)
  console.log('')

  // Buscar pedidos inconsistentes
  // Usando os campos corretos do schema: order_status (nao status), order_number (nao order_code)
  const statusesConfirmados = ['confirmed', 'preparing', 'delivering', 'completed']
  
  const { data: pedidosInconsistentes, error: errorBusca } = await supabase
    .from('orders')
    .select('id, order_number, order_status, payment_status, total, created_at, customer_name')
    .in('order_status', statusesConfirmados)
    .neq('payment_status', 'confirmed')
    .order('created_at', { ascending: false })

  if (errorBusca) {
    console.error('Erro ao buscar pedidos:', errorBusca)
    process.exit(1)
  }

  // Calcular faturamento perdido
  const faturamentoPerdido = pedidosInconsistentes.reduce((sum, p) => {
    const total = typeof p.total === 'number' ? p.total : parseFloat(p.total) || 0
    return sum + total
  }, 0)

  console.log('DIAGNOSTICO:')
  console.log('-'.repeat(40))
  console.log(`Pedidos inconsistentes encontrados: ${pedidosInconsistentes.length}`)
  console.log(`Faturamento perdido: R$ ${faturamentoPerdido.toFixed(2)}`)
  console.log('')

  if (pedidosInconsistentes.length === 0) {
    console.log('Nenhum pedido inconsistente encontrado!')
    console.log('Todos os pedidos estao com payment_status sincronizado.')
    
    // Mostrar totais gerais
    const { data: totais } = await supabase
      .from('orders')
      .select('id, order_status, payment_status, total')
      .in('order_status', statusesConfirmados)
    
    if (totais && totais.length > 0) {
      const faturamentoTotal = totais.reduce((s, p) => s + (parseFloat(p.total) || 0), 0)
      console.log('')
      console.log('RESUMO DO FATURAMENTO:')
      console.log('-'.repeat(40))
      console.log(`Total de pedidos confirmados: ${totais.length}`)
      console.log(`Faturamento total: R$ ${faturamentoTotal.toFixed(2)}`)
    }
    
    process.exit(0)
  }

  // Mostrar primeiros 10 pedidos
  console.log('Primeiros 10 pedidos inconsistentes:')
  console.log('-'.repeat(40))
  pedidosInconsistentes.slice(0, 10).forEach((p, i) => {
    console.log(`${i + 1}. #${p.order_number || p.id}`)
    console.log(`   Cliente: ${p.customer_name}`)
    console.log(`   Status: ${p.order_status} | Payment: ${p.payment_status}`)
    console.log(`   Total: R$ ${(parseFloat(p.total) || 0).toFixed(2)}`)
    console.log(`   Data: ${new Date(p.created_at).toLocaleString('pt-BR')}`)
    console.log('')
  })

  if (MODE === 'diagnose') {
    console.log('Para corrigir, execute:')
    console.log('  node --env-file=/vercel/share/.env.project scripts/fix-payment-status.mjs dryrun')
    console.log('  node --env-file=/vercel/share/.env.project scripts/fix-payment-status.mjs fix')
    process.exit(0)
  }

  if (MODE === 'dryrun') {
    console.log('SIMULACAO (DRY RUN):')
    console.log('-'.repeat(40))
    console.log(`Seria atualizado payment_status para 'confirmed' em ${pedidosInconsistentes.length} pedidos`)
    console.log(`Faturamento que seria recuperado: R$ ${faturamentoPerdido.toFixed(2)}`)
    console.log('')
    console.log('Para executar a correcao real, rode:')
    console.log('  node --env-file=/vercel/share/.env.project scripts/fix-payment-status.mjs fix')
    process.exit(0)
  }

  if (MODE === 'fix') {
    console.log('EXECUTANDO CORRECAO:')
    console.log('-'.repeat(40))

    const ids = pedidosInconsistentes.map(p => p.id)
    
    const { data: updated, error: errorUpdate } = await supabase
      .from('orders')
      .update({ 
        payment_status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .in('id', ids)
      .select('id')

    if (errorUpdate) {
      console.error('Erro ao atualizar pedidos:', errorUpdate)
      process.exit(1)
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('CORRECAO CONCLUIDA COM SUCESSO!')
    console.log('='.repeat(60))
    console.log(`Pedidos corrigidos: ${updated?.length || pedidosInconsistentes.length}`)
    console.log(`Faturamento recuperado: R$ ${faturamentoPerdido.toFixed(2)}`)
    console.log('')
    
    // Mostrar totais apos correcao
    const { data: totaisApos } = await supabase
      .from('orders')
      .select('id, order_status, payment_status, total')
      .in('order_status', statusesConfirmados)
      .eq('payment_status', 'confirmed')
    
    if (totaisApos && totaisApos.length > 0) {
      const faturamentoTotal = totaisApos.reduce((s, p) => s + (parseFloat(p.total) || 0), 0)
      console.log('RESUMO APOS CORRECAO:')
      console.log('-'.repeat(40))
      console.log(`Total de pedidos confirmados: ${totaisApos.length}`)
      console.log(`Faturamento total: R$ ${faturamentoTotal.toFixed(2)}`)
    }
    
    console.log('')
    console.log('Proximo passo: Recarregue o Dashboard para ver o faturamento atualizado.')
  }
}

main().catch(console.error)
