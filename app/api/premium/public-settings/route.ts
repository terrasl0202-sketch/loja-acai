import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET - Buscar configuracoes publicas de cashback e fidelidade
// NAO requer autenticacao - usado no checkout para preview
export async function GET() {
  try {
    const supabase = getSupabase()

    const [cashbackRes, loyaltyRes] = await Promise.all([
      supabase.from("cashback_settings").select("enabled, percentage, min_order_value").limit(1).single(),
      supabase.from("loyalty_settings").select("enabled, points_per_real").limit(1).single(),
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
