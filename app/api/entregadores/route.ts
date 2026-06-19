import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getStoreIdFromRequest } from "@/lib/api-store"
import { requireStoreAuth } from "@/lib/store-session"

/**
 * /api/entregadores v2 - MULTIEMPRESA
 * Entregadores isolados por loja.
 */

const BUILD_LABEL = "entregadores-v2"

function generateToken(): string {
  return randomBytes(16).toString('hex')
}

// GET - Buscar entregadores da loja atual (PII/token -> exige sessao admin)
export async function GET(request: NextRequest) {
  const auth = await requireStoreAuth(request)
  if (!auth.ok) return auth.response!
  const storeId = auth.storeId
  console.log(`[${BUILD_LABEL}] GET storeId: ${storeId}`)
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ success: false, error: "SUPABASE_NOT_CONFIGURED", entregadores: [] }, { status: 500 })
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  
  const { data, error } = await supabase
    .from('entregadores')
    .select('*')
    .eq('store_id', storeId) // Filtrar por loja
    .order('created_at', { ascending: false })
  
  if (error) {
    console.log(`[${BUILD_LABEL}] GET error: ${error.code} - ${error.message}`)
    if (error.code === '42P01') {
      return NextResponse.json({ success: true, entregadores: [], source: "supabase" })
    }
    return NextResponse.json({ success: false, error: error.message, entregadores: [] }, { status: 500 })
  }
  
  const entregadores = (data || []).map(e => ({
    id: e.id,
    nome: e.name,
    whatsapp: e.phone,
    status: e.active ? 'ativo' : 'inativo',
    disponibilidade: e.available ? 'disponivel' : 'indisponivel',
    horarioInicio: e.start_time || '08:00',
    horarioFim: e.end_time || '22:00',
    observacao: e.notes || '',
    pin: e.pin || '',
    token: e.token,
    veiculo: e.vehicle,
    totalEntregas: e.total_deliveries || 0,
    pedidosAtuais: e.current_orders || 0,
  }))
  
  return NextResponse.json({ success: true, source: "supabase", entregadores, count: entregadores.length, storeId })
}

// POST - Salvar entregadores da loja atual
export async function POST(request: NextRequest) {
  const auth = await requireStoreAuth(request)
  if (!auth.ok) return auth.response!
  const storeId = auth.storeId
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
  
  // Se veio array de entregadores
  if (body.entregadores && Array.isArray(body.entregadores)) {
    // Buscar tokens existentes DESTA LOJA
    const { data: existingData } = await supabase
      .from('entregadores')
      .select('id, token')
      .eq('store_id', storeId)
    const existingTokens = new Map((existingData || []).map(e => [e.id, e.token]))
    
    // Deletar entregadores DESTA LOJA
    await supabase.from('entregadores').delete().eq('store_id', storeId)
    
    const entregadoresToSave = body.entregadores.map((e: {
      id?: string
      nome: string
      whatsapp: string
      status?: string
      disponivel?: boolean
      token?: string
      pin?: string
      veiculo?: string
      observacoes?: string
      horarioInicio?: string
      horarioFim?: string
      totalEntregas?: number
      pedidosAtuais?: number
    }) => {
      const isNewId = !e.id || e.id.startsWith('entregador-')
      const existingToken = e.id ? existingTokens.get(e.id) : null
      
      return {
        id: isNewId ? crypto.randomUUID() : e.id,
        name: e.nome,
        phone: e.whatsapp,
        active: e.status !== 'inativo',
        available: e.disponivel !== false,
        token: e.token || existingToken || generateToken(),
        pin: e.pin || null,
        vehicle: e.veiculo || null,
        notes: e.observacoes || null,
        start_time: e.horarioInicio || null,
        end_time: e.horarioFim || null,
        total_deliveries: e.totalEntregas || 0,
        current_orders: e.pedidosAtuais || 0,
        store_id: storeId, // SEMPRE salvar store_id
      }
    })
    
    if (entregadoresToSave.length > 0) {
      const { error } = await supabase.from('entregadores').insert(entregadoresToSave)
      
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
    }
    
    return NextResponse.json({ success: true, source: "supabase", count: entregadoresToSave.length, storeId })
  }
  
  // Entregador unico
  if (body.nome || body.name) {
    const entregadorToSave = {
      id: (body.id && !body.id.startsWith('entregador-')) ? body.id : crypto.randomUUID(),
      name: body.nome || body.name,
      phone: body.whatsapp || body.phone,
      active: body.status !== 'inativo',
      available: body.disponivel !== false,
      token: body.token || generateToken(),
      pin: body.pin || null,
      vehicle: body.veiculo || body.vehicle || null,
      notes: body.observacoes || body.notes || null,
      start_time: body.horarioInicio || body.start_time || null,
      end_time: body.horarioFim || body.end_time || null,
      total_deliveries: body.totalEntregas || body.total_deliveries || 0,
      current_orders: body.pedidosAtuais || body.current_orders || 0,
      store_id: storeId, // SEMPRE salvar store_id
    }
    
    const { data, error } = await supabase
      .from('entregadores')
      .insert(entregadorToSave)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      source: "supabase",
      storeId,
      entregador: {
        id: data.id,
        nome: data.name,
        whatsapp: data.phone,
        status: data.active ? 'ativo' : 'inativo',
        token: data.token,
      }
    })
  }
  
  return NextResponse.json({ success: false, error: "Dados invalidos" }, { status: 400 })
}

// PUT - Atualizar entregador (verifica se pertence a loja)
export async function PUT(request: NextRequest) {
  const auth = await requireStoreAuth(request)
  if (!auth.ok) return auth.response!
  const storeId = auth.storeId
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ success: false, error: "SUPABASE_NOT_CONFIGURED" }, { status: 500 })
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  
  const body = await request.json()
  
  if (!body.id) {
    return NextResponse.json({ success: false, error: "ID necessario" }, { status: 400 })
  }
  
  const updateData: Record<string, unknown> = {}
  if (body.nome !== undefined) updateData.name = body.nome
  if (body.whatsapp !== undefined) updateData.phone = body.whatsapp
  if (body.status !== undefined) updateData.active = body.status !== 'inativo'
  if (body.disponivel !== undefined) updateData.available = body.disponivel
  if (body.veiculo !== undefined) updateData.vehicle = body.veiculo
  if (body.pin !== undefined) updateData.pin = body.pin
  if (body.observacoes !== undefined) updateData.notes = body.observacoes
  if (body.horarioInicio !== undefined) updateData.start_time = body.horarioInicio
  if (body.horarioFim !== undefined) updateData.end_time = body.horarioFim
  if (body.totalEntregas !== undefined) updateData.total_deliveries = body.totalEntregas
  if (body.pedidosAtuais !== undefined) updateData.current_orders = body.pedidosAtuais
  
  const { data, error } = await supabase
    .from('entregadores')
    .update(updateData)
    .eq('id', body.id)
    .eq('store_id', storeId) // Seguranca
    .select()
    .single()
  
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({
    success: true,
    source: "supabase",
    storeId,
    entregador: {
      id: data.id,
      nome: data.name,
      whatsapp: data.phone,
      status: data.active ? 'ativo' : 'inativo',
      token: data.token,
    }
  })
}

// DELETE - Remover entregador (verifica se pertence a loja)
export async function DELETE(request: NextRequest) {
  const auth = await requireStoreAuth(request)
  if (!auth.ok) return auth.response!
  const storeId = auth.storeId
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ success: false, error: "SUPABASE_NOT_CONFIGURED" }, { status: 500 })
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  
  const body = await request.json()
  
  if (!body.id) {
    return NextResponse.json({ success: false, error: "ID necessario" }, { status: 400 })
  }
  
  const { error } = await supabase
    .from('entregadores')
    .delete()
    .eq('id', body.id)
    .eq('store_id', storeId) // Seguranca
  
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ success: true, storeId })
}
