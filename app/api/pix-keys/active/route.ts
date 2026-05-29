import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// GET - Buscar chave PIX ativa para uso no checkout
export async function GET() {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ activeKey: null })
    }

    // Buscar a chave ativa
    const { data, error } = await supabase
      .from("pix_manual_keys")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single()

    if (error) {
      // Se nao encontrou ou tabela nao existe
      if (error.code === "PGRST116" || error.message.includes("no rows") || error.message.includes("does not exist")) {
        // Tentar buscar do store_settings (dados antigos)
        const { data: settingsData } = await supabase
          .from("store_settings")
          .select("pix_key, pix_key_type, pix_receiver_name")
          .eq("id", "main")
          .single()

        if (settingsData && settingsData.pix_key) {
          return NextResponse.json({
            activeKey: {
              id: "legacy",
              alias: "Chave principal",
              keyType: settingsData.pix_key_type || "telefone",
              keyValue: settingsData.pix_key,
              receiverName: settingsData.pix_receiver_name || "",
              city: "SAO PAULO",
              isActive: true,
            },
          })
        }

        return NextResponse.json({ activeKey: null })
      }

      console.error("Erro ao buscar chave PIX ativa:", error)
      return NextResponse.json({ activeKey: null })
    }

    if (!data) {
      return NextResponse.json({ activeKey: null })
    }

    return NextResponse.json({
      activeKey: {
        id: data.id,
        alias: data.alias || "Chave PIX",
        keyType: data.key_type || "telefone",
        keyValue: data.key_value || "",
        receiverName: data.receiver_name || "",
        city: data.city || "SAO PAULO",
        isActive: true,
      },
    })
  } catch (err) {
    console.error("Erro ao buscar chave PIX ativa:", err)
    return NextResponse.json({ activeKey: null })
  }
}
