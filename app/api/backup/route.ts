import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getStoreIdFromRequest } from "@/lib/api-store"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// Verifica autenticacao admin
function verifyAdmin(request: NextRequest): boolean {
  const password = request.headers.get('x-admin-password')
  return password === process.env.ADMIN_PASSWORD
}

export async function GET(request: NextRequest) {
  // Verificar autenticacao
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "full"
  
  // Identificar loja atual
  const storeId = await getStoreIdFromRequest(request)
  
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }
  
  const timestamp = new Date().toISOString()
  const backup: Record<string, unknown> = {
    version: "1.0",
    createdAt: timestamp,
    type,
    storeId,
  }
  
  try {
    // Backup por tipo - FILTRADO POR LOJA
    if (type === "full" || type === "products") {
      const { data: products } = await supabase.from("products").select("*").eq("store_id", storeId).order("id")
      backup.products = products || []
    }
    
    if (type === "full" || type === "categories") {
      const { data: categories } = await supabase.from("product_categories").select("*").eq("store_id", storeId).order("display_order")
      backup.categories = categories || []
    }
    
    if (type === "full" || type === "customers") {
      const { data: customers } = await supabase.from("customers").select("id, name, phone, created_at").eq("store_id", storeId).order("id")
      backup.customers = customers || []
    }
    
    if (type === "full" || type === "orders") {
      const { data: orders } = await supabase.from("orders").select("*").eq("store_id", storeId).order("created_at", { ascending: false }).limit(1000)
      backup.orders = orders || []
    }
    
    if (type === "full" || type === "coupons") {
      const { data: coupons } = await supabase.from("coupons").select("*").eq("store_id", storeId).order("id")
      backup.coupons = coupons || []
    }
    
    if (type === "full" || type === "neighborhoods") {
      const { data: neighborhoods } = await supabase.from("neighborhoods").select("*").eq("store_id", storeId).order("display_order")
      backup.neighborhoods = neighborhoods || []
    }
    
    if (type === "full" || type === "settings") {
      const { data: settings } = await supabase.from("store_settings").select("*").eq("store_id", storeId).single()
      backup.settings = settings || {}
      
      const { data: banners } = await supabase.from("hero_banners").select("*").eq("store_id", storeId).order("display_order")
      backup.banners = banners || []
    }
    
    if (type === "full" || type === "entregadores") {
      const { data: entregadores } = await supabase.from("delivery_drivers").select("*").eq("store_id", storeId).order("id")
      backup.entregadores = entregadores || []
    }
    
    // Gerar nome do arquivo
    const dateStr = timestamp.replace(/[:.]/g, "-").substring(0, 19)
    const filename = `backup-${type}-${dateStr}.json`
    
    // Retornar como download
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
    
  } catch (error) {
    console.error("[Backup] Erro:", error)
    return NextResponse.json({ error: "Backup failed" }, { status: 500 })
  }
}

// Restaurar backup
export async function POST(request: NextRequest) {
  // Verificar autenticacao
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }
  
  try {
    const backup = await request.json()
    const results: Record<string, { success: boolean; count?: number; error?: string }> = {}
    
    // Restaurar produtos
    if (backup.products && Array.isArray(backup.products)) {
      try {
        // Upsert para nao duplicar
        const { error } = await supabase
          .from("products")
          .upsert(backup.products, { onConflict: "id" })
        
        results.products = error 
          ? { success: false, error: error.message }
          : { success: true, count: backup.products.length }
      } catch (e) {
        results.products = { success: false, error: String(e) }
      }
    }
    
    // Restaurar categorias
    if (backup.categories && Array.isArray(backup.categories)) {
      try {
        const { error } = await supabase
          .from("product_categories")
          .upsert(backup.categories, { onConflict: "id" })
        
        results.categories = error 
          ? { success: false, error: error.message }
          : { success: true, count: backup.categories.length }
      } catch (e) {
        results.categories = { success: false, error: String(e) }
      }
    }
    
    // Restaurar cupons
    if (backup.coupons && Array.isArray(backup.coupons)) {
      try {
        const { error } = await supabase
          .from("coupons")
          .upsert(backup.coupons, { onConflict: "id" })
        
        results.coupons = error 
          ? { success: false, error: error.message }
          : { success: true, count: backup.coupons.length }
      } catch (e) {
        results.coupons = { success: false, error: String(e) }
      }
    }
    
    // Restaurar bairros
    if (backup.neighborhoods && Array.isArray(backup.neighborhoods)) {
      try {
        const { error } = await supabase
          .from("neighborhoods")
          .upsert(backup.neighborhoods, { onConflict: "id" })
        
        results.neighborhoods = error 
          ? { success: false, error: error.message }
          : { success: true, count: backup.neighborhoods.length }
      } catch (e) {
        results.neighborhoods = { success: false, error: String(e) }
      }
    }
    
    const allSuccess = Object.values(results).every(r => r.success)
    
    return NextResponse.json({
      success: allSuccess,
      results,
      restoredAt: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error("[Restore] Erro:", error)
    return NextResponse.json({ error: "Restore failed" }, { status: 500 })
  }
}
