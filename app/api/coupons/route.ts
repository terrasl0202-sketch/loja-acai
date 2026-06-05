import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getStoreIdFromRequest } from "@/lib/api-store"

/**
 * /api/coupons v2 - MULTIEMPRESA
 * 
 * Cupons isolados por loja.
 * Mesmo codigo pode existir em lojas diferentes.
 */

const BUILD_LABEL = "coupons-v2"

// GET - Busca cupons da loja atual
export async function GET(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  console.log(`[${BUILD_LABEL}] GET storeId: ${storeId}`)
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ success: false, error: "SUPABASE_NOT_CONFIGURED", coupons: [] }, { status: 500 })
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('store_id', storeId) // Filtrar por loja
    .order('created_at', { ascending: false })
  
  if (error) {
    console.log(`[${BUILD_LABEL}] GET error: ${error.code} - ${error.message}`)
    if (error.code === '42P01') {
      return NextResponse.json({ success: true, coupons: [], source: "supabase" })
    }
    return NextResponse.json({ success: false, error: error.message, coupons: [] }, { status: 500 })
  }
  
  const coupons = (data || []).map(c => ({
    id: c.id,
    code: c.code,
    type: c.discount_type || 'percentage',
    value: c.discount_value || 0,
    active: c.active ?? true,
    minimumOrder: c.min_order_value || 0,
    maxUses: c.max_uses || 0,
    currentUses: c.current_uses || 0,
    validFrom: c.valid_from,
    validUntil: c.valid_until,
    shippingDiscountType: c.shipping_discount_type || null,
    shippingDiscountValue: c.shipping_discount_value || null,
  }))
  
  return NextResponse.json({ success: true, source: "supabase", coupons, count: coupons.length, storeId })
}

// POST - Salva cupons da loja atual
export async function POST(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  console.log(`[${BUILD_LABEL}] POST storeId: ${storeId}`)
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ success: false, error: "SUPABASE_NOT_CONFIGURED" }, { status: 500 })
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  
  const body = await request.json()
  
  // Se veio array de cupons, substituir APENAS os desta loja
  if (body.coupons && Array.isArray(body.coupons)) {
    console.log(`[${BUILD_LABEL}] Salvando ${body.coupons.length} cupons para loja ${storeId}`)
    
    // Deletar cupons antigos DESTA LOJA
    await supabase.from('coupons').delete().eq('store_id', storeId)
    
    const couponsToSave = body.coupons.map((c: {
      id?: string
      code: string
      type?: string
      discountType?: string
      value?: number
      discountValue?: number
      active?: boolean
      minimumOrder?: number
      minOrderValue?: number
      maxUses?: number
      currentUses?: number
      validFrom?: string
      validUntil?: string
      shippingDiscountType?: string
      shippingDiscountValue?: number
    }) => ({
      id: (c.id && !c.id.startsWith('coupon-')) ? c.id : crypto.randomUUID(),
      code: c.code.toUpperCase(),
      discount_type: c.discountType || c.type || 'percentage',
      discount_value: c.discountValue ?? c.value ?? 0,
      active: c.active ?? true,
      min_order_value: c.minOrderValue ?? c.minimumOrder ?? 0,
      max_uses: c.maxUses || 0,
      current_uses: c.currentUses || 0,
      valid_from: c.validFrom || null,
      valid_until: c.validUntil || null,
      shipping_discount_type: c.shippingDiscountType || null,
      shipping_discount_value: c.shippingDiscountValue || null,
      store_id: storeId, // SEMPRE salvar store_id
    }))
    
    if (couponsToSave.length > 0) {
      const { error } = await supabase.from('coupons').insert(couponsToSave)
      
      if (error) {
        console.log(`[${BUILD_LABEL}] POST error: ${error.code} - ${error.message}`)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
    }
    
    return NextResponse.json({ success: true, source: "supabase", count: couponsToSave.length, storeId })
  }
  
  // Se veio cupom unico
  if (body.code) {
    const couponToSave = {
      id: (body.id && !body.id.startsWith('coupon-')) ? body.id : crypto.randomUUID(),
      code: body.code.toUpperCase(),
      discount_type: body.discountType || body.type || 'percentage',
      discount_value: body.discountValue ?? body.value ?? 0,
      active: body.active ?? true,
      min_order_value: body.minOrderValue ?? body.minimumOrder ?? 0,
      max_uses: body.maxUses || 0,
      current_uses: body.currentUses || 0,
      valid_from: body.validFrom || null,
      valid_until: body.validUntil || null,
      shipping_discount_type: body.shippingDiscountType || null,
      shipping_discount_value: body.shippingDiscountValue || null,
      store_id: storeId, // SEMPRE salvar store_id
    }
    
    // Upsert por code + store_id
    const { data, error } = await supabase
      .from('coupons')
      .upsert(couponToSave, { onConflict: 'code,store_id' })
      .select()
      .single()
    
    if (error) {
      console.log(`[${BUILD_LABEL}] POST single error: ${error.code} - ${error.message}`)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      source: "supabase",
      storeId,
      coupon: {
        id: data.id,
        code: data.code,
        type: data.discount_type,
        value: data.discount_value,
        active: data.active,
        minimumOrder: data.min_order_value,
      }
    })
  }
  
  return NextResponse.json({ success: false, error: "Dados invalidos" }, { status: 400 })
}

// DELETE - Remove cupom (verifica se pertence a loja)
export async function DELETE(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  console.log(`[${BUILD_LABEL}] DELETE storeId: ${storeId}`)
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ success: false, error: "SUPABASE_NOT_CONFIGURED" }, { status: 500 })
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  
  const body = await request.json()
  
  if (body.id) {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', body.id)
      .eq('store_id', storeId) // Seguranca
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
  } else if (body.code) {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('code', body.code.toUpperCase())
      .eq('store_id', storeId) // Seguranca
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
  } else {
    return NextResponse.json({ success: false, error: "ID ou code necessario" }, { status: 400 })
  }
  
  return NextResponse.json({ success: true, storeId })
}
