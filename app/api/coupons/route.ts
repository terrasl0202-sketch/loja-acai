import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * /api/coupons v1
 * 
 * API para CRUD de cupons no Supabase
 * Tabela: coupons
 */

const BUILD_LABEL = "coupons-v1"

// GET - Busca todos os cupons
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log(`[${BUILD_LABEL}] GET`)
  
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ 
      success: false, 
      error: "SUPABASE_NOT_CONFIGURED",
      coupons: []
    }, { status: 500 })
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.log(`[${BUILD_LABEL}] GET error: ${error.code} - ${error.message}`)
    // Se tabela nao existe, retornar array vazio
    if (error.code === '42P01') {
      return NextResponse.json({ success: true, coupons: [], source: "supabase" })
    }
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      coupons: []
    }, { status: 500 })
  }
  
  // Mapear campos do banco para formato do frontend
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
    // Campos de desconto no frete
    shippingDiscountType: c.shipping_discount_type || null,
    shippingDiscountValue: c.shipping_discount_value || null,
  }))
  
  console.log(`[${BUILD_LABEL}] GET OK: ${coupons.length} cupons`)
  
  return NextResponse.json({
    success: true,
    source: "supabase",
    coupons,
    count: coupons.length
  })
}

// POST - Salva cupons (substitui todos ou adiciona um)
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log(`[${BUILD_LABEL}] POST`)
  
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ 
      success: false, 
      error: "SUPABASE_NOT_CONFIGURED"
    }, { status: 500 })
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  
  const body = await request.json()
  
  // Se veio array de cupons, substituir todos
  if (body.coupons && Array.isArray(body.coupons)) {
    console.log(`[${BUILD_LABEL}] Salvando ${body.coupons.length} cupons`)
    
    // Deletar cupons antigos
    await supabase.from('coupons').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    // Inserir novos - gerar UUID para cada cupom
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
    }))
    
    if (couponsToSave.length > 0) {
      const { error } = await supabase.from('coupons').insert(couponsToSave)
      
      if (error) {
        console.log(`[${BUILD_LABEL}] POST error: ${error.code} - ${error.message}`)
        return NextResponse.json({ 
          success: false, 
          error: error.message
        }, { status: 500 })
      }
    }
    
    console.log(`[${BUILD_LABEL}] POST OK: ${couponsToSave.length} cupons salvos`)
    
    return NextResponse.json({
      success: true,
      source: "supabase",
      count: couponsToSave.length
    })
  }
  
  // Se veio cupom unico, fazer upsert
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
    }
    
    const { data, error } = await supabase
      .from('coupons')
      .upsert(couponToSave, { onConflict: 'code' })
      .select()
      .single()
    
    if (error) {
      console.log(`[${BUILD_LABEL}] POST single error: ${error.code} - ${error.message}`)
      return NextResponse.json({ 
        success: false, 
        error: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      source: "supabase",
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
  
  return NextResponse.json({ 
    success: false, 
    error: "Dados invalidos"
  }, { status: 400 })
}

// DELETE - Remove cupom por ID ou code
export async function DELETE(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log(`[${BUILD_LABEL}] DELETE`)
  
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ 
      success: false, 
      error: "SUPABASE_NOT_CONFIGURED"
    }, { status: 500 })
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  
  const body = await request.json()
  
  if (body.id) {
    const { error } = await supabase.from('coupons').delete().eq('id', body.id)
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
  } else if (body.code) {
    const { error } = await supabase.from('coupons').delete().eq('code', body.code.toUpperCase())
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
  } else {
    return NextResponse.json({ success: false, error: "ID ou code necessario" }, { status: 400 })
  }
  
  return NextResponse.json({ success: true })
}
