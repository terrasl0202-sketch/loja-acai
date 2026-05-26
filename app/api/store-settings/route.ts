import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Evitar cache
export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
}

// Criar cliente Supabase (server-side)
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    console.error("[store-settings] Supabase nao configurado")
    return null
  }
  
  return createClient(url, key)
}

// Valores padrao
const DEFAULT_SETTINGS = {
  storeName: 'Acai da Terra',
  subtitle: 'Delivery de Acai',
  slogan: 'O melhor acai da cidade',
  whatsapp: '',
  instagram: '',
  address: '',
  openTime: '14:00',
  closeTime: '22:00',
  closedMessage: 'Estamos fechados no momento. Volte em breve!',
  storeOpen: true,
  manualControl: false,
}

/**
 * GET - Carrega store settings do Supabase
 */
export async function GET() {
  console.log("[store-settings GET] Iniciando...")
  
  try {
    const supabase = getSupabaseClient()
    
    if (!supabase) {
      console.log("[store-settings GET] Supabase nao disponivel, retornando defaults")
      return NextResponse.json({ 
        success: true, 
        settings: DEFAULT_SETTINGS,
        source: 'default'
      }, { headers: noCacheHeaders })
    }

    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 'main')
      .single()

    if (error) {
      console.log("[store-settings GET] Erro Supabase:", error.message)
      
      // Se tabela nao existe, tenta criar registro inicial
      if (error.code === 'PGRST116') {
        console.log("[store-settings GET] Registro nao encontrado, criando inicial...")
        
        const { data: newData, error: insertError } = await supabase
          .from('store_settings')
          .insert({ id: 'main', ...DEFAULT_SETTINGS })
          .select()
          .single()
        
        if (!insertError && newData) {
          console.log("[store-settings GET] Registro inicial criado:", newData)
          return NextResponse.json({ 
            success: true, 
            settings: mapDbToSettings(newData),
            source: 'supabase-new'
          }, { headers: noCacheHeaders })
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        settings: DEFAULT_SETTINGS,
        source: 'default',
        error: error.message
      }, { headers: noCacheHeaders })
    }

    console.log("[store-settings GET] Dados carregados do Supabase:", data)
    
    return NextResponse.json({ 
      success: true, 
      settings: mapDbToSettings(data),
      source: 'supabase'
    }, { headers: noCacheHeaders })

  } catch (error) {
    console.error("[store-settings GET] Erro geral:", error)
    return NextResponse.json({ 
      success: true, 
      settings: DEFAULT_SETTINGS,
      source: 'default',
      error: String(error)
    }, { headers: noCacheHeaders })
  }
}

/**
 * POST - Salva store settings no Supabase
 */
export async function POST(request: Request) {
  console.log("[store-settings POST] Iniciando...")
  
  try {
    const body = await request.json()
    
    // Aceita formato { settings: {...} } ou campos diretos no body
    const settings = body.settings || body
    
    console.log("[store-settings POST] Dados recebidos:", settings)

    // Verifica se tem pelo menos um campo valido
    const hasValidField = settings && (
      settings.store_name !== undefined ||
      settings.storeName !== undefined ||
      settings.store_open !== undefined ||
      settings.storeOpen !== undefined
    )

    if (!hasValidField) {
      return NextResponse.json({ 
        success: false, 
        error: "Settings vazio ou invalido" 
      }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    
    if (!supabase) {
      console.log("[store-settings POST] Supabase nao disponivel")
      return NextResponse.json({ 
        success: false, 
        error: "Supabase nao configurado"
      }, { status: 500 })
    }

    // Mapeia campos camelCase para snake_case se necessario
    const dbData = {
      store_name: settings.store_name || settings.storeName,
      subtitle: settings.subtitle,
      slogan: settings.slogan,
      whatsapp: settings.whatsapp,
      instagram: settings.instagram,
      address: settings.address,
      open_time: settings.open_time || settings.openTime,
      close_time: settings.close_time || settings.closeTime,
      closed_message: settings.closed_message || settings.closedMessage,
      store_open: settings.store_open ?? settings.storeOpen,
      manual_control: settings.manual_control ?? settings.manualControl,
      updated_at: new Date().toISOString(),
    }
    
    console.log("[store-settings POST] Dados para DB:", dbData)

    const { data, error } = await supabase
      .from('store_settings')
      .upsert({ id: 'main', ...dbData }, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      console.error("[store-settings POST] Erro Supabase:", error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    console.log("[store-settings POST] Salvo com sucesso:", data)

    return NextResponse.json({ 
      success: true, 
      settings: mapDbToSettings(data),
      savedTo: 'supabase'
    })

  } catch (error) {
    console.error("[store-settings POST] Erro geral:", error)
    return NextResponse.json({ 
      success: false, 
      error: String(error)
    }, { status: 500 })
  }
}

// =============================================================================
// MAPPERS
// =============================================================================

function mapDbToSettings(data: Record<string, unknown>) {
  return {
    storeName: data.store_name || DEFAULT_SETTINGS.storeName,
    subtitle: data.subtitle || DEFAULT_SETTINGS.subtitle,
    slogan: data.slogan || DEFAULT_SETTINGS.slogan,
    whatsapp: data.whatsapp || DEFAULT_SETTINGS.whatsapp,
    instagram: data.instagram || DEFAULT_SETTINGS.instagram,
    address: data.address || DEFAULT_SETTINGS.address,
    openTime: data.open_time || DEFAULT_SETTINGS.openTime,
    closeTime: data.close_time || DEFAULT_SETTINGS.closeTime,
    closedMessage: data.closed_message || DEFAULT_SETTINGS.closedMessage,
    storeOpen: data.store_open ?? DEFAULT_SETTINGS.storeOpen,
    manualControl: data.manual_control ?? DEFAULT_SETTINGS.manualControl,
    updatedAt: data.updated_at || null,
  }
}

function mapSettingsToDb(settings: Record<string, unknown>) {
  return {
    store_name: settings.storeName,
    subtitle: settings.subtitle,
    slogan: settings.slogan,
    whatsapp: settings.whatsapp,
    instagram: settings.instagram,
    address: settings.address,
    open_time: settings.openTime,
    close_time: settings.closeTime,
    closed_message: settings.closedMessage,
    store_open: settings.storeOpen,
    manual_control: settings.manualControl,
    updated_at: new Date().toISOString(),
  }
}
