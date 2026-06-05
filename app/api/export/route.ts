import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import * as XLSX from "xlsx"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function verifyAdmin(request: NextRequest): boolean {
  const password = request.headers.get('x-admin-password')
  return password === process.env.ADMIN_PASSWORD
}

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "orders"
  
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }
  
  try {
    let data: Record<string, unknown>[] = []
    let filename = ""
    
    if (type === "orders") {
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000)
      
      data = (orders || []).map(o => ({
        "Numero": o.order_code || o.id,
        "Cliente": o.customer_name,
        "Telefone": o.customer_phone,
        "Bairro": o.neighborhood || "-",
        "Pagamento": o.payment_method,
        "Total": o.total,
        "Status": o.status,
        "Status Pagamento": o.payment_status || "-",
        "Data": new Date(o.created_at).toLocaleString("pt-BR"),
      }))
      filename = "pedidos"
    }
    
    if (type === "customers") {
      const { data: customers } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false })
      
      // Buscar totais de pedidos por cliente
      const { data: orders } = await supabase
        .from("orders")
        .select("customer_phone, total")
      
      const customerTotals = new Map<string, { count: number; total: number }>()
      orders?.forEach(o => {
        const phone = o.customer_phone
        if (phone) {
          const current = customerTotals.get(phone) || { count: 0, total: 0 }
          customerTotals.set(phone, {
            count: current.count + 1,
            total: current.total + (o.total || 0)
          })
        }
      })
      
      data = (customers || []).map(c => {
        const stats = customerTotals.get(c.phone) || { count: 0, total: 0 }
        return {
          "Nome": c.name,
          "Telefone": c.phone,
          "Pedidos": stats.count,
          "Total Gasto": stats.total.toFixed(2),
          "Cadastrado em": new Date(c.created_at).toLocaleString("pt-BR"),
        }
      })
      filename = "clientes"
    }
    
    if (type === "products") {
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .order("name")
      
      // Buscar vendas por produto
      const { data: orders } = await supabase
        .from("orders")
        .select("items, total, status")
        .in("status", ["confirmed", "preparing", "delivering", "completed"])
      
      const productSales = new Map<string, { qty: number; revenue: number }>()
      orders?.forEach(o => {
        const items = Array.isArray(o.items) ? o.items : []
        items.forEach((item: { name?: string; quantity?: number; price?: number }) => {
          if (item.name) {
            const current = productSales.get(item.name) || { qty: 0, revenue: 0 }
            productSales.set(item.name, {
              qty: current.qty + (item.quantity || 1),
              revenue: current.revenue + ((item.price || 0) * (item.quantity || 1))
            })
          }
        })
      })
      
      data = (products || []).map(p => {
        const sales = productSales.get(p.name) || { qty: 0, revenue: 0 }
        return {
          "Produto": p.name,
          "Preco": p.price,
          "Categoria": p.category || "-",
          "Ativo": p.active ? "Sim" : "Nao",
          "Quantidade Vendida": sales.qty,
          "Faturamento": sales.revenue.toFixed(2),
        }
      })
      filename = "produtos"
    }
    
    // Criar workbook Excel
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Dados")
    
    // Ajustar largura das colunas
    const maxWidth = 50
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, 
        ...data.map(row => String(row[key as keyof typeof row] || "").length)
      ))
    }))
    ws["!cols"] = colWidths
    
    // Gerar buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
    
    const dateStr = new Date().toISOString().substring(0, 10)
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}-${dateStr}.xlsx"`,
      },
    })
    
  } catch (error) {
    console.error("[Export] Erro:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
