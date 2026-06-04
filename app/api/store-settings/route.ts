import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * /api/store-settings v102
 * 
 * API expandida para salvar TODAS as configuracoes do Admin no Supabase:
 * - Dados basicos da loja (storeName, subtitle, slogan, etc)
 * - Banner (mainText, secondaryText, promo*)
 * - Horario avancado (abandonedOrderMinutes, autoArchiveDays)
 * - Entrega (enabled, estimatedTime, pickupEnabled)
 * - Pagamento (minValueForAsaas, pix*)
 * - WhatsApp (defaultMessage, receiptMessage, supportEnabled)
 * - Notificacoes (soundEnabled, soundVolume)
 */

const BUILD_LABEL = "store-settings-v102"

// GET - Busca store_settings do Supabase
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  const debugInfo = {
    buildLabel: BUILD_LABEL,
    hostname: supabaseUrl ? new URL(supabaseUrl).hostname : null,
    serviceRoleExists: !!serviceRoleKey,
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
  
  // Retornar TODOS os campos expandidos
  return NextResponse.json({
    success: true,
    source: "supabase",
    debug: debugInfo,
    settings: {
      // Dados basicos da loja
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
      
      // Banner
      banner: {
        mainText: data.banner_main_text || '',
        secondaryText: data.banner_secondary_text || '',
        promoActive: data.banner_promo_active ?? false,
        promoPrice: data.banner_promo_price ?? 0,
        promoText: data.banner_promo_text || '',
        imageUrl: data.banner_image_url || '/acai-bowl.jpg',
      },
      
      // Horario avancado
      storeHours: {
        isOpen: data.store_open ?? false,
        manualControl: data.manual_control ?? false,
        openTime: data.open_time || '',
        closeTime: data.close_time || '',
        closedMessage: data.closed_message || '',
        abandonedOrderMinutes: data.abandoned_order_minutes ?? 15,
        autoArchiveDays: data.auto_archive_days ?? 0,
      },
      
      // Entrega
      delivery: {
        enabled: data.delivery_enabled ?? true,
        defaultFee: data.delivery_default_fee ?? 5,
        minimumOrder: data.delivery_minimum_order ?? 10,
        estimatedTime: data.delivery_estimated_time || '30-45 min',
        pickupEnabled: data.delivery_pickup_enabled ?? true,
      },
      
      // Pagamento
      payment: {
        minValueForAsaas: data.payment_min_value_asaas ?? 15,
        pixManualEnabled: data.payment_pix_manual_enabled ?? true,
        pixAsaasEnabled: data.payment_pix_asaas_enabled ?? true,
        pixExpirationMinutes: data.payment_pix_expiration_minutes ?? 15,
        cardEnabled: data.payment_card_enabled ?? false,
        cashEnabled: data.payment_cash_enabled ?? true,
      },
      
      // PIX Manual
      pixManual: {
        key: data.pix_key || '',
        keyFull: data.pix_key || '',
        receiverName: data.pix_receiver_name || '',
        keyType: data.pix_key_type || 'telefone',
      },
      
      // WhatsApp
      whatsappConfig: {
        number: data.whatsapp || '',
        defaultMessage: data.whatsapp_default_message || 'Ola! Gostaria de fazer um pedido.',
        receiptMessage: data.whatsapp_receipt_message || 'Envie o comprovante do PIX por aqui.',
        supportEnabled: data.whatsapp_support_enabled ?? true,
      },
      
      // Notificacoes
      notifications: {
        soundEnabled: data.notification_sound_enabled ?? true,
        soundVolume: data.notification_sound_volume ?? 80,
      },
    }
  })
}

// POST - Salva store_settings no Supabase
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  const debugInfo = {
    buildLabel: BUILD_LABEL,
    hostname: supabaseUrl ? new URL(supabaseUrl).hostname : null,
    serviceRoleExists: !!serviceRoleKey,
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
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  
  const body = await request.json()
  
  // Montar objeto com TODOS os campos
  const dataToSave: Record<string, unknown> = {
    id: 'main',
    updated_at: new Date().toISOString(),
  }
  
  // Dados basicos da loja
  if (body.store_name !== undefined || body.storeName !== undefined) {
    dataToSave.store_name = body.store_name ?? body.storeName ?? ''
  }
  if (body.subtitle !== undefined) dataToSave.subtitle = body.subtitle
  if (body.slogan !== undefined) dataToSave.slogan = body.slogan
  if (body.closed_message !== undefined || body.closedMessage !== undefined) {
    dataToSave.closed_message = body.closed_message ?? body.closedMessage ?? ''
  }
  if (body.whatsapp !== undefined) dataToSave.whatsapp = body.whatsapp
  if (body.address !== undefined) dataToSave.address = body.address
  if (body.open_time !== undefined || body.openTime !== undefined) {
    dataToSave.open_time = body.open_time ?? body.openTime ?? ''
  }
  if (body.close_time !== undefined || body.closeTime !== undefined) {
    dataToSave.close_time = body.close_time ?? body.closeTime ?? ''
  }
  if (body.store_open !== undefined || body.storeOpen !== undefined) {
    dataToSave.store_open = body.store_open ?? body.storeOpen ?? false
  }
  if (body.manual_control !== undefined || body.manualControl !== undefined) {
    dataToSave.manual_control = body.manual_control ?? body.manualControl ?? false
  }
  
  // Banner
  if (body.banner_main_text !== undefined) dataToSave.banner_main_text = body.banner_main_text
  if (body.banner_secondary_text !== undefined) dataToSave.banner_secondary_text = body.banner_secondary_text
  if (body.banner_promo_active !== undefined) dataToSave.banner_promo_active = body.banner_promo_active
  if (body.banner_promo_price !== undefined) dataToSave.banner_promo_price = body.banner_promo_price
  if (body.banner_promo_text !== undefined) dataToSave.banner_promo_text = body.banner_promo_text
  if (body.banner_image_url !== undefined) dataToSave.banner_image_url = body.banner_image_url
  
  // Se veio objeto banner, extrair campos
  if (body.banner) {
    if (body.banner.mainText !== undefined) dataToSave.banner_main_text = body.banner.mainText
    if (body.banner.secondaryText !== undefined) dataToSave.banner_secondary_text = body.banner.secondaryText
    if (body.banner.promoActive !== undefined) dataToSave.banner_promo_active = body.banner.promoActive
    if (body.banner.promoPrice !== undefined) dataToSave.banner_promo_price = body.banner.promoPrice
    if (body.banner.promoText !== undefined) dataToSave.banner_promo_text = body.banner.promoText
    if (body.banner.imageUrl !== undefined) dataToSave.banner_image_url = body.banner.imageUrl
  }
  
  // Horario avancado
  if (body.abandoned_order_minutes !== undefined) dataToSave.abandoned_order_minutes = body.abandoned_order_minutes
  if (body.auto_archive_days !== undefined) dataToSave.auto_archive_days = body.auto_archive_days
  
  // Se veio objeto storeHours, extrair campos
  if (body.storeHours) {
    if (body.storeHours.abandonedOrderMinutes !== undefined) dataToSave.abandoned_order_minutes = body.storeHours.abandonedOrderMinutes
    if (body.storeHours.autoArchiveDays !== undefined) dataToSave.auto_archive_days = body.storeHours.autoArchiveDays
    if (body.storeHours.isOpen !== undefined) dataToSave.store_open = body.storeHours.isOpen
    if (body.storeHours.manualControl !== undefined) dataToSave.manual_control = body.storeHours.manualControl
    if (body.storeHours.openTime !== undefined) dataToSave.open_time = body.storeHours.openTime
    if (body.storeHours.closeTime !== undefined) dataToSave.close_time = body.storeHours.closeTime
    if (body.storeHours.closedMessage !== undefined) dataToSave.closed_message = body.storeHours.closedMessage
  }
  
  // Entrega
  if (body.delivery_enabled !== undefined) dataToSave.delivery_enabled = body.delivery_enabled
  if (body.delivery_default_fee !== undefined) dataToSave.delivery_default_fee = body.delivery_default_fee
  if (body.delivery_minimum_order !== undefined) dataToSave.delivery_minimum_order = body.delivery_minimum_order
  if (body.delivery_estimated_time !== undefined) dataToSave.delivery_estimated_time = body.delivery_estimated_time
  if (body.delivery_pickup_enabled !== undefined) dataToSave.delivery_pickup_enabled = body.delivery_pickup_enabled
  
  // Se veio objeto delivery, extrair campos
  if (body.delivery) {
    if (body.delivery.enabled !== undefined) dataToSave.delivery_enabled = body.delivery.enabled
    if (body.delivery.defaultFee !== undefined) dataToSave.delivery_default_fee = body.delivery.defaultFee
    if (body.delivery.minimumOrder !== undefined) dataToSave.delivery_minimum_order = body.delivery.minimumOrder
    if (body.delivery.estimatedTime !== undefined) dataToSave.delivery_estimated_time = body.delivery.estimatedTime
    if (body.delivery.pickupEnabled !== undefined) dataToSave.delivery_pickup_enabled = body.delivery.pickupEnabled
  }
  
  // Pagamento
  if (body.payment_min_value_asaas !== undefined) dataToSave.payment_min_value_asaas = body.payment_min_value_asaas
  if (body.payment_pix_manual_enabled !== undefined) dataToSave.payment_pix_manual_enabled = body.payment_pix_manual_enabled
  if (body.payment_pix_asaas_enabled !== undefined) dataToSave.payment_pix_asaas_enabled = body.payment_pix_asaas_enabled
  if (body.payment_pix_expiration_minutes !== undefined) dataToSave.payment_pix_expiration_minutes = body.payment_pix_expiration_minutes
  if (body.payment_card_enabled !== undefined) dataToSave.payment_card_enabled = body.payment_card_enabled
  if (body.payment_cash_enabled !== undefined) dataToSave.payment_cash_enabled = body.payment_cash_enabled
  
  // Se veio objeto payment, extrair campos
  if (body.payment) {
    if (body.payment.minValueForAsaas !== undefined) dataToSave.payment_min_value_asaas = body.payment.minValueForAsaas
    if (body.payment.pixManualEnabled !== undefined) dataToSave.payment_pix_manual_enabled = body.payment.pixManualEnabled
    if (body.payment.pixAsaasEnabled !== undefined) dataToSave.payment_pix_asaas_enabled = body.payment.pixAsaasEnabled
    if (body.payment.pixExpirationMinutes !== undefined) dataToSave.payment_pix_expiration_minutes = body.payment.pixExpirationMinutes
    if (body.payment.cardEnabled !== undefined) dataToSave.payment_card_enabled = body.payment.cardEnabled
    if (body.payment.cashEnabled !== undefined) dataToSave.payment_cash_enabled = body.payment.cashEnabled
  }
  
  // PIX Manual
  if (body.pix_key !== undefined) dataToSave.pix_key = body.pix_key
  if (body.pix_key_type !== undefined) dataToSave.pix_key_type = body.pix_key_type
  if (body.pix_receiver_name !== undefined) dataToSave.pix_receiver_name = body.pix_receiver_name
  
  // Se veio objeto pixManual, extrair campos
  if (body.pixManual) {
    if (body.pixManual.key !== undefined) dataToSave.pix_key = body.pixManual.key
    if (body.pixManual.keyFull !== undefined) dataToSave.pix_key = body.pixManual.keyFull
    if (body.pixManual.keyType !== undefined) dataToSave.pix_key_type = body.pixManual.keyType
    if (body.pixManual.receiverName !== undefined) dataToSave.pix_receiver_name = body.pixManual.receiverName
  }
  
  // WhatsApp config
  if (body.whatsapp_default_message !== undefined) dataToSave.whatsapp_default_message = body.whatsapp_default_message
  if (body.whatsapp_receipt_message !== undefined) dataToSave.whatsapp_receipt_message = body.whatsapp_receipt_message
  if (body.whatsapp_support_enabled !== undefined) dataToSave.whatsapp_support_enabled = body.whatsapp_support_enabled
  
  // Se veio objeto whatsappConfig, extrair campos
  if (body.whatsappConfig) {
    if (body.whatsappConfig.number !== undefined) dataToSave.whatsapp = body.whatsappConfig.number
    if (body.whatsappConfig.defaultMessage !== undefined) dataToSave.whatsapp_default_message = body.whatsappConfig.defaultMessage
    if (body.whatsappConfig.receiptMessage !== undefined) dataToSave.whatsapp_receipt_message = body.whatsappConfig.receiptMessage
    if (body.whatsappConfig.supportEnabled !== undefined) dataToSave.whatsapp_support_enabled = body.whatsappConfig.supportEnabled
  }
  
  // Notificacoes
  if (body.notification_sound_enabled !== undefined) dataToSave.notification_sound_enabled = body.notification_sound_enabled
  if (body.notification_sound_volume !== undefined) dataToSave.notification_sound_volume = body.notification_sound_volume
  
  // Se veio objeto notifications, extrair campos
  if (body.notifications) {
    if (body.notifications.soundEnabled !== undefined) dataToSave.notification_sound_enabled = body.notifications.soundEnabled
    if (body.notifications.soundVolume !== undefined) dataToSave.notification_sound_volume = body.notifications.soundVolume
  }
  
  console.log(`[${BUILD_LABEL}] POST saving: ${dataToSave.store_name || 'N/A'}`)
  
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
