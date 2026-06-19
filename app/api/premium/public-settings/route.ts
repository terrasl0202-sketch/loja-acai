import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getStoreIdFromRequest } from "@/lib/api-store"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET - Buscar configuracoes publicas de cashback e fidelidade DESTA LOJA
// NAO requer autenticacao - usado no checkout para preview
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()

    // Tenant resolvido no backend para mostrar o cashback/fidelidade corretos
    const storeId = await getStoreIdFromRequest(request)

    const [cashbackRes, loyaltyRes] = await Promise.all([
      supabase.from("cashback_settings").select("enabled, percentage, min_order_value").eq("store_id", storeId).limit(1).single(),
      supabase.from("loyalty_settings").select("enabled, points_per_real").eq("store_id", storeId).limit(1).single(),
    ])

    return NextResponse.json({
      success: true,
      cashback: {
        enabled: cashbackRes.data?.enabled || false,
        percentage: parseFloat(cashbackRes.data?.percentage) || 0,
        minOrderValue: parseFloat(cashbackRes.data?.min_order_value) || 0,
      },
      loyalty: {
        enabled: loyaltyRes.data?.enabled || false,
        pointsPerReal: parseFloat(loyaltyRes.data?.points_per_real) || 0,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar settings premium:", error)
    return NextResponse.json({
      success: true,
      cashback: { enabled: false, percentage: 0, minOrderValue: 0 },
      loyalty: { enabled: false, pointsPerReal: 0 },
    })
  }
}
