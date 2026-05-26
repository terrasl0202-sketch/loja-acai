import { put, list, get, del } from "@vercel/blob"
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from "next/server"
import { type Order } from "@/lib/config-types"

const ORDERS_PREFIX = "pk-orders-"

export const dynamic = "force-dynamic"

// Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase nao configurado')
  return createClient(url, key)
}

// Funcao para limpar blobs antigos (manter apenas os 2 mais recentes)
async function cleanupOldBlobs() {
  try {
    const { blobs } = await list({ prefix: ORDERS_PREFIX })
    if (blobs.length > 2) {
      const sorted = blobs.sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )
      const toDelete = sorted.slice(2)
      for (const blob of toDelete) {
        await del(blob.url)
      }
    }
  } catch (error) {
    console.error("[Cleanup] Erro ao limpar blobs antigos:", error)
  }
}

// Confirmar pagamento PIX automatico
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId, orderId, asaasPaymentId } = body
    
    // Aceita tanto paymentId quanto asaasPaymentId
    const effectivePaymentId = paymentId || asaasPaymentId

    if (!effectivePaymentId && !orderId) {
      return NextResponse.json({ error: "paymentId or orderId required" }, { status: 400 })
    }

    console.log("[orders/confirm] Confirmando pedido. paymentId:", effectivePaymentId, "orderId:", orderId)

    const now = new Date().toISOString()

    // Tentar confirmar no Supabase primeiro
    try {
      const supabase = getSupabase()
      
      if (!supabase) {
        throw new Error('Supabase nao disponivel')
      }
      
      // Buscar pedido por paymentId ou orderId
      let query = supabase.from('orders').select('*')
      
      if (effectivePaymentId) {
        query = query.eq('asaas_payment_id', effectivePaymentId)
      } else if (orderId) {
        query = query.eq('id', orderId)
      }

      const { data: orders, error: fetchError } = await query

      if (fetchError) throw fetchError

      if (!orders || orders.length === 0) {
        console.log("[orders/confirm] Pedido nao encontrado no Supabase, tentando Blob")
        throw new Error('Nao encontrado no Supabase')
      }

      const order = orders[0]

      // Atualizar status de pagamento
      const { data: updated, error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'confirmed',
          confirmed_at: now,
          paid_at: now,
          status: 'confirmed',
          confirmed_automatically: true,
          updated_at: now
        })
        .eq('id', order.id)
        .select()
        .single()

      if (updateError) throw updateError

      console.log("[orders/confirm] Pedido confirmado no Supabase:", order.id)

      // Retornar no formato esperado pelo frontend
      return NextResponse.json({ 
        success: true, 
        order: {
          id: updated.id,
          customerName: updated.customer_name,
          customerPhone: updated.customer_phone,
          total: Number(updated.total),
          paymentMethod: updated.payment_method,
          deliveryType: updated.delivery_type,
          status: updated.status,
          paymentStatus: updated.payment_status,
          createdAt: updated.created_at,
          confirmedAt: updated.confirmed_at,
          paidAt: updated.paid_at,
          confirmedAutomatically: updated.confirmed_automatically,
        },
        source: 'supabase'
      })

    } catch (supabaseError) {
      console.error("[orders/confirm] Erro Supabase, tentando Blob:", supabaseError)

      // Fallback: Blob
      let orders: Order[] = []
      const { blobs } = await list({ prefix: ORDERS_PREFIX })
      
      if (blobs.length > 0) {
        const latestBlob = blobs.sort(
          (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        )[0]
        const result = await get(latestBlob.pathname, { access: "private" })
        if (result && result.stream) {
          const text = await new Response(result.stream).text()
          orders = JSON.parse(text) as Order[]
        }
      }

      // Encontrar pedido por paymentId ou orderId
      let orderIndex = -1
      if (effectivePaymentId) {
        orderIndex = orders.findIndex((o) => o.asaasPaymentId === effectivePaymentId)
      }
      if (orderIndex === -1 && orderId) {
        orderIndex = orders.findIndex((o) => o.id === orderId)
      }

      if (orderIndex === -1) {
        console.log("[orders/confirm] Pedido nao encontrado. paymentId:", effectivePaymentId, "orderId:", orderId)
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }

      // Atualizar status de pagamento
      orders[orderIndex].paymentStatus = "confirmed"
      orders[orderIndex].confirmedAt = now
      orders[orderIndex].paidAt = now
      orders[orderIndex].status = "confirmed"
      orders[orderIndex].confirmedAutomatically = true
      
      console.log("[orders/confirm] Pedido confirmado no Blob:", orders[orderIndex].id)

      // Salvar
      const timestamp = Date.now()
      const filename = `${ORDERS_PREFIX}${timestamp}.json`

      await put(filename, JSON.stringify(orders, null, 2), {
        access: "private",
        contentType: "application/json",
      })

      // Limpar blobs antigos
      await cleanupOldBlobs()

      return NextResponse.json({ success: true, order: orders[orderIndex], source: 'blob' })
    }

  } catch (error) {
    console.error("[orders/confirm] Erro:", error)
    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 }
    )
  }
}
