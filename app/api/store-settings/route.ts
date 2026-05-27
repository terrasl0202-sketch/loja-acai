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

/**
 * Criar cliente Supabase com SERVICE_ROLE_KEY
 * v100 - Igual ao /api/debug-supabase que funciona
 */
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !serviceRoleKey) {
    console.error("[store-settings v100] Envs faltando")
    return null
  }
  
  return createClient(url, serviceRoleKey, {
    auth: { 
      persistSession: false, 
      autoRefreshToken: false 
    }
  })
}

// Valores padrao - SOMENTE usado se Supabase falhar
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
 * v100 - source:"supabase" OBRIGATORIO se dados vierem do banco
 */
export async function GET() {
  console.log("[store-settings v100 GET] Iniciando...")
  
  const supabase = getSupabaseClient()
  
  if (!supabase) {
    console.log("[store-settings v100] using default - no client")
    return NextResponse.json({ 
      success: true, 
      settings: DEFAULT_SETTINGS,
      source: 'default'
    }, { headers: noCacheHeaders })
  }

  try {
    // Buscar registro principal
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 'main')
      .single()

    console.log("[store-settings v100 GET] query result:", { 
      hasData: !!data, 
      hasError: !!error,
      errorCode: error?.code,
      storeName: data?.store_name 
    })

    // CASO 1: Dados encontrados - OBRIGATORIO retornar source: "supabase"
    if (data) {
      console.log("[store-settings v100] using supabase - data found:", data.store_name)
      return NextResponse.json({ 
        success: true, 
        settings: mapDbToSettings(data),
        source: 'supabase'
      }, { headers: noCacheHeaders })
    }

    // CASO 2: Registro nao existe (PGRST116) - criar e retornar source: "supabase"
    if (error?.code === 'PGRST116') {
      console.log("[store-settings v100] Criando registro inicial...")
      
      const { data: newData, error: insertError } = await supabase
        .from('store_settings')
        .insert({
          id: 'main',
          store_name: DEFAULT_SETTINGS.storeName,
          subtitle: DEFAULT_SETTINGS.subtitle,
          slogan: DEFAULT_SETTINGS.slogan,
          whatsapp: DEFAULT_SETTINGS.whatsapp,
          instagram: DEFAULT_SETTINGS.instagram,
          address: DEFAULT_SETTINGS.address,
          open_time: DEFAULT_SETTINGS.openTime,
          close_time: DEFAULT_SETTINGS.closeTime,
          closed_message: DEFAULT_SETTINGS.closedMessage,
          store_open: DEFAULT_SETTINGS.storeOpen,
          manual_control: DEFAULT_SETTINGS.manualControl,
        })
        .select()
        .single()
      
      if (newData) {
        console.log("[store-settings v100] using supabase - created new")
        return NextResponse.json({ 
          success: true, 
          settings: mapDbToSettings(newData),
          source: 'supabase'
        }, { headers: noCacheHeaders })
      }
      
      console.error("[store-settings v100] Insert failed:", insertError?.message)
    }

    // CASO 3: Erro real do Supabase - SOMENTE aqui usa default
    console.log("[store-settings v100] using default - error:", error?.message)
    return NextResponse.json({ 
      success: true, 
      settings: DEFAULT_SETTINGS,
      source: 'default'
    }, { headers: noCacheHeaders })

  } catch (e) {
    console.error("[store-settings v100] using default - catch:", e)
    return NextResponse.json({ 
      success: true, 
      settings: DEFAULT_SETTINGS,
      source: 'default'
    }, { headers: noCacheHeaders })
  }
}

/**
 * POST - Salva store settings no Supabase
 * v100 - Retorna source:"supabase" se salvou com sucesso
 */
export async function POST(request: Request) {
  console.log("[store-settings v100 POST] Iniciando...")
  
  const supabase = getSupabaseClient()
  
  if (!supabase) {
    return NextResponse.json({ 
      success: false, 
      error: "Supabase nao configurado"
    }, { status: 500 })
  }

  try {
    const body = await request.json()
    const settings = body.settings || body
    
    const storeName = settings.store_name || settings.storeName || DEFAULT_SETTINGS.storeName
    console.log("[store-settings v100 POST] Salvando:", storeName)

    // Mapeia campos para DB
    const dbData = {
      id: 'main',
      store_name: storeName,
      subtitle: settings.subtitle || DEFAULT_SETTINGS.subtitle,
      slogan: settings.slogan || DEFAULT_SETTINGS.slogan,
      whatsapp: settings.whatsapp || '',
      instagram: settings.instagram || '',
      address: settings.address || '',
      open_time: settings.open_time || settings.openTime || DEFAULT_SETTINGS.openTime,
      close_time: settings.close_time || settings.closeTime || DEFAULT_SETTINGS.closeTime,
      closed_message: settings.closed_message || settings.closedMessage || DEFAULT_SETTINGS.closedMessage,
      store_open: settings.store_open ?? settings.storeOpen ?? DEFAULT_SETTINGS.storeOpen,
      manual_control: settings.manual_control ?? settings.manualControl ?? DEFAULT_SETTINGS.manualControl,
      updated_at: new Date().toISOString(),
    }

    // Upsert
    const { data, error } = await supabase
      .from('store_settings')
      .upsert(dbData, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      console.error("[store-settings v100 POST] Erro:", error.message)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    console.log("[store-settings v100 POST] OK - saved to supabase:", data.store_name)

    return NextResponse.json({ 
      success: true, 
      settings: mapDbToSettings(data),
      source: 'supabase'
    })

  } catch (e) {
    console.error("[store-settings v100 POST] Catch:", e)
    return NextResponse.json({ 
      success: false, 
      error: String(e)
    }, { status: 500 })
  }
}

// =============================================================================
// MAPPER
// =============================================================================

function mapDbToSettings(data: Record<string, unknown>) {
  return {
    storeName: data.store_name || DEFAULT_SETTINGS.storeName,
    subtitle: data.subtitle || DEFAULT_SETTINGS.subtitle,
    slogan: data.slogan || DEFAULT_SETTINGS.slogan,
    whatsapp: data.whatsapp || '',
    instagram: data.instagram || '',
    address: data.address || '',
    openTime: data.open_time || DEFAULT_SETTINGS.openTime,
    closeTime: data.close_time || DEFAULT_SETTINGS.closeTime,
    closedMessage: data.closed_message || DEFAULT_SETTINGS.closedMessage,
    storeOpen: data.store_open ?? DEFAULT_SETTINGS.storeOpen,
    manualControl: data.manual_control ?? DEFAULT_SETTINGS.manualControl,
  }
}
