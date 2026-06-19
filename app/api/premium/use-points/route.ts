import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getStoreIdFromRequest, INVALID_STORE_ID } from "@/lib/api-store"
import { isCustomerAuthorized } from "@/lib/customer-session"
import { verifyInternalToken } from "@/lib/internal-token"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey)
}

// POST - Usar recompensa de pontos em um pedido
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, orderId } = body
    
    if (!customerId || !orderId) {
      return NextResponse.json({ 
        error: "customerId e orderId sao obrigatorios" 
      }, { status: 400 })
    }

    // Tenant resolvido no backend. CRITICO: pontos sao por loja - nunca podem
    // ser resgatados em outra loja.
    const storeId = await getStoreIdFromRequest(request)
    if (!storeId || storeId === INVALID_STORE_ID || storeId <= 0) {
      return NextResponse.json({ error: "Contexto de loja invalido" }, { status: 400 })
    }

    // === AUTORIZACAO (Fase de Seguranca 2) ===
    // Consumir saldo de pontos altera estado financeiro. So aceitamos origem
    // confiavel: chamada interna do backend (token interno), o proprio cliente
    // (sessao de cliente desta loja) ou um admin da loja. Nunca apenas
    // customerId/orderId no body.
    if (!verifyInternalToken(request) && !isCustomerAuthorized(request, storeId, { customerId })) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
    }

    const supabase = getSupabase()
    
    // Verificar se fidelidade esta ativa NESTA LOJA
    const { data: settings } = await supabase
      .from('loyalty_settings')
      .select('enabled, points_for_reward, reward_value')
      .eq('store_id', storeId)
      .limit(1)
      .single()
    
    if (!settings?.enabled) {
      return NextResponse.json({ error: "Fidelidade nao esta ativa" }, { status: 400 })
    }
    
    const pointsRequired = settings.points_for_reward || 500
    const rewardValue = settings.reward_value || 10
    
    // Buscar saldo atual de pontos do cliente NESTA LOJA
    const { data: transactions } = await supabase
      .from('customer_points')
      .select('points, type')
      .eq('customer_id', customerId)
      .eq('store_id', storeId)
    
    const balance = (transactions || []).reduce((total, t) => {
      if (t.type === 'earned' || t.type === 'adjusted') {
        return total + Number(t.points)
      } else if (t.type === 'used' || t.type === 'expired') {
        return total - Math.abs(Number(t.points))
      }
      return total
    }, 0)
    
    if (balance < pointsRequired) {
      return NextResponse.json({ 
        error: "Pontos insuficientes para recompensa", 
        saldoDisponivel: balance,
        pontosNecessarios: pointsRequired
      }, { status: 400 })
    }
    
    // Verificar se ja usou recompensa neste pedido
    const { data: existing } = await supabase
      .from('customer_points')
      .select('id')
      .eq('order_id', orderId)
      .eq('store_id', storeId)
      .eq('type', 'used')
      .single()
    
    if (existing) {
      return NextResponse.json({ error: "Recompensa ja foi usada neste pedido" }, { status: 400 })
    }
    
    // Registrar uso dos pontos JA VINCULADO A LOJA
    const { data, error } = await supabase
      .from('customer_points')
      .insert({
        customer_id: customerId,
        order_id: orderId,
        store_id: storeId,
        points: pointsRequired, // Armazenar positivo, tipo 'used' indica deducao
        type: 'used',
        description: `Recompensa de ${pointsRequired} pontos usada no pedido #${orderId}`
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      pointsUsed: pointsRequired,
      rewardValue: rewardValue,
      newBalance: balance - pointsRequired,
      transaction: data
    })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao usar recompensa" }, { status: 500 })
  }
}
