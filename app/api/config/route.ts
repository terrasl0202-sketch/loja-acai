import { NextResponse } from "next/server"
import { type SiteConfig, defaultConfig } from "@/lib/config-types"
import { createClient } from "@supabase/supabase-js"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "PK1040CAH"
const LOCAL_CONFIG_KEY = "pk-site-config"

// Evitar cache
export const dynamic = "force-dynamic"
export const revalidate = 0

// Headers para evitar cache
const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
}

// Criar cliente Supabase (server-side)
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    return null
  }
  
  return createClient(url, key)
}

export async function GET(request: Request) {
  try {
    // Verificar senha para acesso admin (opcional)
    const url = new URL(request.url)
    const isAdmin = url.searchParams.get("admin") === "true"
    const password = url.searchParams.get("password")

    if (isAdmin && password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Tentar carregar config do Supabase
    const supabase = getSupabaseClient()
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('*')
          .eq('id', 'main')
          .single()
        
        if (!error && data) {
          // Mesclar dados do Supabase com defaultConfig
          const config: SiteConfig = {
            ...defaultConfig,
            storeName: data.store_name || defaultConfig.storeName,
            storeHours: {
              ...defaultConfig.storeHours,
              isOpen: data.store_open,
              manualControl: data.manual_control,
              openTime: data.opening_time || defaultConfig.storeHours.openTime,
              closeTime: data.closing_time || defaultConfig.storeHours.closeTime,
              closedMessage: data.closed_message || defaultConfig.storeHours.closedMessage,
            },
            delivery: {
              ...defaultConfig.delivery,
              defaultFee: data.delivery_fee || defaultConfig.delivery.defaultFee,
              minimumOrder: data.minimum_order || defaultConfig.delivery.minimumOrder,
            },
            whatsapp: {
              ...defaultConfig.whatsapp,
              number: data.whatsapp_number || defaultConfig.whatsapp.number,
            },
            pixManual: {
              ...defaultConfig.pixManual,
              keyType: data.pix_key_type || defaultConfig.pixManual.keyType || 'telefone',
              key: data.pix_key || defaultConfig.pixManual.key,
              keyFull: data.pix_key || defaultConfig.pixManual.keyFull,
              receiverName: data.pix_receiver_name || defaultConfig.pixManual.receiverName,
              city: data.pix_city || defaultConfig.pixManual.city || 'SAO PAULO',
            },
          }
          
          return NextResponse.json({ success: true, config, source: 'supabase' }, { headers: noCacheHeaders })
        }
      } catch (e) {
        console.warn("[Config GET] Erro ao buscar do Supabase:", e)
      }
    }

    // Usar defaultConfig se Supabase falhar ou nao houver dados
    return NextResponse.json({ success: true, config: defaultConfig, source: 'default' }, { headers: noCacheHeaders })
  } catch (error) {
    console.error("[Config GET] Erro geral:", error)
    return NextResponse.json({ success: true, config: defaultConfig, source: 'default' }, { headers: noCacheHeaders })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { password, config } = body

    // Verificar senha
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 })
    }

    // Validar config
    if (!config) {
      return NextResponse.json({ error: "Config vazia" }, { status: 400 })
    }

    // Tentar salvar no Supabase
    const supabase = getSupabaseClient()
    
    if (supabase) {
      try {
        const updateData = {
          id: 'main',
          store_name: config.storeName,
          store_open: config.storeHours?.isOpen ?? true,
          manual_control: config.storeHours?.manualControl ?? false,
          opening_time: config.storeHours?.openTime || '14:00',
          closing_time: config.storeHours?.closeTime || '22:00',
          closed_message: config.storeHours?.closedMessage || 'Estamos fechados no momento',
          delivery_fee: config.delivery?.defaultFee || 5,
          minimum_order: config.delivery?.minimumOrder || 15,
          whatsapp_number: config.whatsapp?.number || '',
          pix_key: config.pixManual?.key || '',
          updated_at: new Date().toISOString(),
        }

        const { error } = await supabase
          .from('admin_settings')
          .upsert(updateData, { onConflict: 'id' })

        if (!error) {
          return NextResponse.json({ 
            success: true, 
            config,
            savedTo: 'supabase'
          })
        } else {
          console.warn("[Config POST] Erro Supabase:", error.message)
        }
      } catch (e) {
        console.warn("[Config POST] Excecao Supabase:", e)
      }
    }

    // Se chegou aqui, Supabase falhou - retornar sucesso mesmo assim
    // O frontend ja salvou em localStorage
    return NextResponse.json({ 
      success: true, 
      config,
      savedTo: 'local',
      warning: "Supabase indisponivel, config salva apenas localmente"
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[Config POST] ERRO:", errorMessage)
    // Mesmo com erro, retornar sucesso - frontend ja salvou localmente
    return NextResponse.json({ 
      success: true,
      savedTo: 'local',
      warning: errorMessage
    })
  }
}
