import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/supabase/service"

/**
 * /api/platform/store-stats
 *
 * Retorna estatisticas e listas (produtos e pedidos) de UMA loja, sempre
 * isoladas por store_id. Roda apenas no servidor com service role (RLS ativo,
 * sem policy publica). A senha do admin e validada server-side (nunca no client)
 * e enviada via POST (nao na query string).
 *
 * NAO altera dados: somente leitura.
 */
export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
}

export async function POST(request: NextRequest) {
  try {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
    if (!ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Autenticacao indisponivel" }, { status: 503, headers: noCacheHeaders })
    }

    const body = await request.json().catch(() => ({}))
    const password = body?.password
    const storeId = Number(body?.storeId)

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 401, headers: noCacheHeaders })
    }

    if (!storeId || isNaN(storeId) || storeId <= 0) {
      return NextResponse.json({ error: "storeId invalido" }, { status: 400, headers: noCacheHeaders })
    }

    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: "Erro de conexao" }, { status: 500, headers: noCacheHeaders })
    }

    // Produtos da loja (contagem + lista) - SEMPRE filtrado por store_id
    const { data: products, count: productsCount } = await supabase
      .from("products")
      .select("id, name, price, active, stock", { count: "exact" })
      .eq("store_id", storeId)
      .order("name", { ascending: true })
      .limit(50)

    // Pedidos da loja (lista recente) - SEMPRE filtrado por store_id
    const { data: orders, count: ordersCount } = await supabase
      .from("orders")
      .select("id, order_code, customer_name, customer_phone, total, status, payment_status, created_at", {
        count: "exact",
      })
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(30)

    const ordersList = orders || []

    // Faturamento: soma do total de pedidos pagos/confirmados
    const revenue = ordersList.reduce((sum, o) => {
      const paid = o.payment_status === "confirmed" || o.payment_status === "paid" || o.payment_status === "pago"
      const confirmedStatus = ["confirmed", "preparing", "delivering", "completed", "entregue", "finalizado"].includes(
        o.status || "",
      )
      return paid || confirmedStatus ? sum + (Number(o.total) || 0) : sum
    }, 0)

    // Clientes unicos (por telefone) entre os pedidos da loja
    const uniquePhones = new Set(
      ordersList.map((o) => o.customer_phone).filter((p): p is string => Boolean(p)),
    )

    return NextResponse.json(
      {
        stats: {
          orders: ordersCount ?? ordersList.length,
          customers: uniquePhones.size,
          products: productsCount ?? (products?.length || 0),
          revenue,
        },
        products: products || [],
        orders: ordersList,
      },
      { headers: noCacheHeaders },
    )
  } catch (error) {
    console.error("[store-stats] Erro:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500, headers: noCacheHeaders })
  }
}
