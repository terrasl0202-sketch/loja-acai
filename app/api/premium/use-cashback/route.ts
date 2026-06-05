import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey)
}

// POST - Usar cashback em um pedido
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, orderId, amount } = body
    
    if (!customerId || !orderId || !amount || amount <= 0) {
      return NextResponse.json({ 
        error: "customerId, orderId e amount positivo sao obrigatorios" 
      }, { status: 400 })
    }
    
    const supabase = getSupabase()
    
    // Verificar se cashback esta ativo
    const { data: settings } = await supabase
      .from('cashback_settings')
      .select('enabled')
      .single()
    
    if (!settings?.enabled) {
      return NextResponse.json({ error: "Cashback nao esta ativo" }, { status: 400 })
    }
    
    // Buscar saldo atual do cliente
    const { data: transactions } = await supabase
      .from('customer_cashback')
      .select('amount, type')
      .eq('customer_id', customerId)
    
    const balance = (transactions || []).reduce((total, t) => {
      if (t.type === 'earned' || t.type === 'adjusted') {
        return total + Number(t.amount)
      } else if (t.type === 'used' || t.type === 'expired') {
        return total - Math.abs(Number(t.amount))
      }
      return total
    }, 0)
    
    if (balance < amount) {
      return NextResponse.json({ 
        error: "Saldo insuficiente", 
        saldoDisponivel: balance,
        solicitado: amount
      }, { status: 400 })
    }
    
    // Verificar se ja usou cashback neste pedido
    const { data: existing } = await supabase
      .from('customer_cashback')
      .select('id')
      .eq('order_id', orderId)
      .eq('type', 'used')
      .single()
    
    if (existing) {
      return NextResponse.json({ error: "Cashback ja foi usado neste pedido" }, { status: 400 })
    }
    
    // Registrar uso
    const { data, error } = await supabase
      .from('customer_cashback')
      .insert({
        customer_id: customerId,
        order_id: orderId,
        amount: Math.abs(amount), // Armazenar positivo, tipo 'used' indica deducao
        type: 'used',
        description: `Cashback usado no pedido #${orderId}`
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      cashbackUsed: amount,
      newBalance: balance - amount,
      transaction: data
    })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao usar cashback" }, { status: 500 })
  }
}
