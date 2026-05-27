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
 * IGUAL ao /api/debug-supabase que funciona
 * Opcoes auth desabilitam persistSession e autoRefreshToken
 */
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !serviceRoleKey) {
    console.error("[store-settings v97] Envs faltando:", {
      hasUrl: !!url,
      hasServiceKey: !!serviceRoleKey
    })
    return null
  }
  
  // IMPORTANTE: Mesmas opcoes do debug-supabase que funciona
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
 */
export async function GET() {
  console.log("[store-settings v97 GET] Iniciando...")
  
  try {
    const supabase = getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: true, 
        settings: DEFAULT_SETTINGS,
        source: 'default',
        reason: 'supabase_not_configured'
      }, { headers: noCacheHeaders })
    }

    // Primeiro verifica se a tabela existe
    const { count, error: countError } = await supabase
      .from('store_settings')
      .select('*', { count: 'exact', head: true })
    
    console.log("[store-settings v97 GET] Count check:", { count, error: countError?.message })

    if (countError) {
      console.error("[store-settings v97 GET] Erro count:", countError.message)
      return NextResponse.json({ 
        success: true, 
        settings: DEFAULT_SETTINGS,
        source: 'default',
        error: countError.message
      }, { headers: noCacheHeaders })
    }

    // Buscar registro principal
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 'main')
      .single()

    if (error) {
      console.log("[store-settings v97 GET] Erro:", error.code, error.message)
      
      // Se registro nao existe, tenta criar
      if (error.code === 'PGRST116') {
        console.log("[store-settings v97 GET] Criando registro inicial...")
        
        const initialData = {
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
        }
        
        const { data: newData, error: insertError } = await supabase
          .from('store_settings')
          .insert(initialData)
          .select()
          .single()
        
        if (!insertError && newData) {
          console.log("[store-settings v97 GET] Registro criado")
          return NextResponse.json({ 
            success: true, 
            settings: mapDbToSettings(newData),
            source: 'supabase-new'
          }, { headers: noCacheHeaders })
        }
        
        console.error("[store-settings v97 GET] Erro insert:", insertError?.message)
      }
      
      return NextResponse.json({ 
        success: true, 
        settings: DEFAULT_SETTINGS,
        source: 'default',
        error: error.message
      }, { headers: noCacheHeaders })
    }

    console.log("[store-settings v97 GET] Sucesso:", data.store_name)
    
    return NextResponse.json({ 
      success: true, 
      settings: mapDbToSettings(data),
      source: 'supabase'
    }, { headers: noCacheHeaders })

  } catch (error) {
    console.error("[store-settings v97 GET] Erro geral:", error)
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
  console.log("[store-settings v97 POST] Iniciando...")
  
  try {
    const body = await request.json()
    const settings = body.settings || body
    
    console.log("[store-settings v97 POST] Recebido store_name:", settings.store_name || settings.storeName)

    const supabase = getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: "Supabase nao configurado - SERVICE_ROLE_KEY faltando"
      }, { status: 500 })
    }

    // Primeiro verifica se tabela existe (mesmo SELECT do debug-supabase)
    const { count, error: countError } = await supabase
      .from('store_settings')
      .select('*', { count: 'exact', head: true })
    
    console.log("[store-settings v97 POST] Tabela check:", { count, error: countError?.message })
    
    if (countError) {
      console.error("[store-settings v97 POST] Tabela nao acessivel:", countError.message)
      return NextResponse.json({ 
        success: false, 
        error: `Tabela store_settings: ${countError.message}`
      }, { status: 500 })
    }

    // Mapeia campos para DB
    const dbData = {
      id: 'main',
      store_name: settings.store_name || settings.storeName || DEFAULT_SETTINGS.storeName,
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
    
    console.log("[store-settings v97 POST] Salvando:", dbData.store_name)

    // Upsert com onConflict
    const { data, error } = await supabase
      .from('store_settings')
      .upsert(dbData, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      console.error("[store-settings v97 POST] Erro upsert:", error.code, error.message)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    console.log("[store-settings v97 POST] Sucesso! store_name:", data.store_name)

    return NextResponse.json({ 
      success: true, 
      settings: mapDbToSettings(data),
      savedTo: 'supabase'
    })

  } catch (error) {
    console.error("[store-settings v97 POST] Erro geral:", error)
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
    whatsapp: data.whatsapp || '',
    instagram: data.instagram || '',
    address: data.address || '',
    openTime: data.open_time || DEFAULT_SETTINGS.openTime,
    closeTime: data.close_time || DEFAULT_SETTINGS.closeTime,
    closedMessage: data.closed_message || DEFAULT_SETTINGS.closedMessage,
    storeOpen: data.store_open ?? DEFAULT_SETTINGS.storeOpen,
    manualControl: data.manual_control ?? DEFAULT_SETTINGS.manualControl,
    updatedAt: data.updated_at || null,
  }
}
