import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * /api/store-settings v100 MINIMALISTA
 * 
 * - SEM fallback
 * - SEM default
 * - SEM mock
 * - SEM cache
 * - SEM recovery
 * - Apenas Supabase direto
 */

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    return null
  }
  
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

// GET - Busca store_settings do Supabase
export async function GET() {
  console.log("[store-settings v100] GET")
  
  const supabase = getSupabase()
  
  if (!supabase) {
    return NextResponse.json({ 
      success: false, 
      error: "SUPABASE_NOT_CONFIGURED" 
    }, { status: 500 })
  }
  
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .limit(1)
    .single()
  
  if (error) {
    console.log("[store-settings v100] GET error:", error.message)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
  
  console.log("[store-settings v100] GET OK:", data.store_name)
  
  return NextResponse.json({
    success: true,
    source: "supabase",
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
  console.log("[store-settings v100] POST")
  
  const supabase = getSupabase()
  
  if (!supabase) {
    return NextResponse.json({ 
      success: false, 
      error: "SUPABASE_NOT_CONFIGURED" 
    }, { status: 500 })
  }
  
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
  
  console.log("[store-settings v100] POST saving:", dataToSave.store_name)
  
  const { data, error } = await supabase
    .from('store_settings')
    .upsert(dataToSave, { onConflict: 'id' })
    .select()
    .single()
  
  if (error) {
    console.log("[store-settings v100] POST error:", error.message)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
  
  console.log("[store-settings v100] POST OK:", data.store_name)
  
  return NextResponse.json({
    success: true,
    source: "supabase",
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
