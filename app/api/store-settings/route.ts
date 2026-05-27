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
 * v99 - Igual ao /api/debug-supabase que funciona
 */
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !serviceRoleKey) {
    console.error("[store-settings v99] Envs faltando")
    return null
  }
  
  return createClient(url, serviceRoleKey, {
    auth: { 
      persistSession: false, 
      autoRefreshToken: false 
    }
  })
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
 * v99 - NUNCA retorna campo "error" se success=true
 */
export async function GET() {
  console.log("[store-settings v99 GET] Iniciando...")
  
  const supabase = getSupabaseClient()
  
  if (!supabase) {
    // Supabase nao configurado - retorna default SEM erro
    return NextResponse.json({ 
      success: true, 
      settings: DEFAULT_SETTINGS,
      source: 'default'
    }, { headers: noCacheHeaders })
  }

  try {
    // Buscar registro principal diretamente
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 'main')
      .single()

    // Se encontrou dados, retorna SEM campo error
    if (data && !error) {
      console.log("[store-settings v99 GET] OK:", data.store_name)
      return NextResponse.json({ 
        success: true, 
        settings: mapDbToSettings(data),
        source: 'supabase'
      }, { headers: noCacheHeaders })
    }

    // Se registro nao existe (PGRST116), tenta criar
    if (error?.code === 'PGRST116') {
      console.log("[store-settings v99 GET] Criando registro inicial...")
      
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
      
      if (newData && !insertError) {
        console.log("[store-settings v99 GET] Registro criado")
        return NextResponse.json({ 
          success: true, 
          settings: mapDbToSettings(newData),
          source: 'supabase'
        }, { headers: noCacheHeaders })
      }
    }

    // Qualquer outro erro - retorna default SEM campo error (para nao poluir)
    console.log("[store-settings v99 GET] Usando default")
    return NextResponse.json({ 
      success: true, 
      settings: DEFAULT_SETTINGS,
      source: 'default'
    }, { headers: noCacheHeaders })

  } catch (e) {
    console.error("[store-settings v99 GET] Catch:", e)
    return NextResponse.json({ 
      success: true, 
      settings: DEFAULT_SETTINGS,
      source: 'default'
    }, { headers: noCacheHeaders })
  }
}

/**
 * POST - Salva store settings no Supabase
 * v99 - Retorna APENAS erro atual real se falhar
 */
export async function POST(request: Request) {
  console.log("[store-settings v99 POST] Iniciando...")
  
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
    console.log("[store-settings v99 POST] Salvando:", storeName)

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
      console.error("[store-settings v99 POST] Erro:", error.message)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    console.log("[store-settings v99 POST] OK:", data.store_name)

    // Sucesso - SEM campo error
    return NextResponse.json({ 
      success: true, 
      settings: mapDbToSettings(data),
      source: 'supabase'
    })

  } catch (e) {
    console.error("[store-settings v99 POST] Catch:", e)
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
