import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * /api/store-settings v101
 * 
 * IDENTICO ao /api/debug-supabase
 * - Mesmas envs
 * - Mesmo createClient
 * - Mesmas options
 * - Debug info para comparar
 */

const BUILD_LABEL = "store-settings-v101"

// GET - Busca store_settings do Supabase
export async function GET() {
  // Copiar EXATAMENTE do debug-supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  // Debug info - IDENTICO ao debug-supabase
  const debugInfo = {
    buildLabel: BUILD_LABEL,
    hostname: supabaseUrl ? new URL(supabaseUrl).hostname : null,
    serviceRoleExists: !!serviceRoleKey,
    keyPrefix: serviceRoleKey ? serviceRoleKey.substring(0, 10) : null,
    timestamp: new Date().toISOString(),
  }
  
  console.log(`[${BUILD_LABEL}] GET - hostname: ${debugInfo.hostname}`)
  
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ 
      success: false, 
      error: "SUPABASE_NOT_CONFIGURED",
      debug: debugInfo
    }, { status: 500 })
  }
  
  // Criar cliente IDENTICO ao debug-supabase
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .limit(1)
    .single()
  
  if (error) {
    console.log(`[${BUILD_LABEL}] GET error: ${error.code} - ${error.message}`)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      errorCode: error.code,
      debug: debugInfo
    }, { status: 500 })
  }
  
  console.log(`[${BUILD_LABEL}] GET OK: ${data.store_name}`)
  
  return NextResponse.json({
    success: true,
    source: "supabase",
    debug: debugInfo,
    settings: {
      storeName: data.store_name || '',
      subtitle: data.subtitle || '',
      slogan: data.slogan || '',
      closedMessage: data.closed_message || '',
      whatsapp: data.whatsapp || '',
      instagram: data.instagram || '',
      address: data.address || '',
      openTime: data.open_time || '',
      closeTime: data.close_time || '',
      storeOpen: data.store_open ?? false,
      manualControl: data.manual_control ?? false,
    }
  })
}

// POST - Salva store_settings no Supabase
export async function POST(request: Request) {
  // Copiar EXATAMENTE do debug-supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  // Debug info
  const debugInfo = {
    buildLabel: BUILD_LABEL,
    hostname: supabaseUrl ? new URL(supabaseUrl).hostname : null,
    serviceRoleExists: !!serviceRoleKey,
    keyPrefix: serviceRoleKey ? serviceRoleKey.substring(0, 10) : null,
    timestamp: new Date().toISOString(),
  }
  
  console.log(`[${BUILD_LABEL}] POST - hostname: ${debugInfo.hostname}`)
  
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ 
      success: false, 
      error: "SUPABASE_NOT_CONFIGURED",
      debug: debugInfo
    }, { status: 500 })
  }
  
  // Criar cliente IDENTICO ao debug-supabase
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  
  const body = await request.json()
  
  const dataToSave = {
    id: 'main',
    store_name: body.store_name ?? body.storeName ?? '',
    subtitle: body.subtitle ?? '',
    slogan: body.slogan ?? '',
    closed_message: body.closed_message ?? body.closedMessage ?? '',
    whatsapp: body.whatsapp ?? '',
    instagram: body.instagram ?? '',
    address: body.address ?? '',
    open_time: body.open_time ?? body.openTime ?? '',
    close_time: body.close_time ?? body.closeTime ?? '',
    store_open: body.store_open ?? body.storeOpen ?? false,
    manual_control: body.manual_control ?? body.manualControl ?? false,
    updated_at: new Date().toISOString(),
  }
  
  console.log(`[${BUILD_LABEL}] POST saving: ${dataToSave.store_name}`)
  
  const { data, error } = await supabase
    .from('store_settings')
    .upsert(dataToSave, { onConflict: 'id' })
    .select()
    .single()
  
  if (error) {
    console.log(`[${BUILD_LABEL}] POST error: ${error.code} - ${error.message}`)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      errorCode: error.code,
      debug: debugInfo
    }, { status: 500 })
  }
  
  console.log(`[${BUILD_LABEL}] POST OK: ${data.store_name}`)
  
  return NextResponse.json({
    success: true,
    source: "supabase",
    debug: debugInfo,
    settings: {
      storeName: data.store_name || '',
      subtitle: data.subtitle || '',
      slogan: data.slogan || '',
      closedMessage: data.closed_message || '',
      whatsapp: data.whatsapp || '',
      instagram: data.instagram || '',
      address: data.address || '',
      openTime: data.open_time || '',
      closeTime: data.close_time || '',
      storeOpen: data.store_open ?? false,
      manualControl: data.manual_control ?? false,
    }
  })
}
