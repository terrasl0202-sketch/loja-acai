import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/supabase/service"
import { verifyStoreAdmin } from "@/lib/platform-auth"

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
    const body = await request.json().catch(() => ({}))
    const password = body?.password
    const storeId = Number(body?.storeId)

    // Autenticacao por loja (senha por loja com fallback global transitorio)
    const auth = await verifyStoreAdmin(storeId, password)
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error || "Acesso negado" },
        { status: auth.status, headers: noCacheHeaders },
      )
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

    // Categorias da loja - SEMPRE filtrado por store_id
    const { data: categories } = await supabase
      .from("product_categories")
      .select("id, name, description, icon, image_url, sort_order, active")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })

    // Bairros da loja - SEMPRE filtrado por store_id
    const { data: neighborhoods } = await supabase
      .from("neighborhoods")
      .select("id, name, delivery_fee, active, sort_order")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })

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
        categories: categories || [],
        neighborhoods: neighborhoods || [],
      },
      { headers: noCacheHeaders },
    )
  } catch (error) {
    console.error("[store-stats] Erro:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500, headers: noCacheHeaders })
  }
}
