import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

/**
 * /api/entregadores v1
 * 
 * API para CRUD de entregadores no Supabase
 * Tabela: entregadores
 */

const BUILD_LABEL = "entregadores-v1"

// Gerar token unico para entregador
function generateToken(): string {
  return randomBytes(16).toString('hex')
}

// GET - Busca todos os entregadores
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log(`[${BUILD_LABEL}] GET`)
  
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ 
      success: false, 
      error: "SUPABASE_NOT_CONFIGURED",
      entregadores: []
    }, { status: 500 })
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  
  const { data, error } = await supabase
    .from('entregadores')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.log(`[${BUILD_LABEL}] GET error: ${error.code} - ${error.message}`)
    // Se tabela nao existe, retornar array vazio
    if (error.code === '42P01') {
      return NextResponse.json({ success: true, entregadores: [], source: "supabase" })
    }
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      entregadores: []
    }, { status: 500 })
  }
  
  // Mapear campos do banco para formato do frontend
  const entregadores = (data || []).map(e => ({
    id: e.id,
    nome: e.name,
    whatsapp: e.phone,
    status: e.active ? 'ativo' : 'inativo',
    disponibilidade: 'disponivel', // Valor padrao, pode ser expandido
    horarioInicio: '08:00',
    horarioFim: '22:00',
    observacao: '',
    token: e.token,
    veiculo: e.vehicle,
    totalEntregas: e.total_deliveries || 0,
    pedidosAtuais: e.current_orders || 0,
  }))
  
  console.log(`[${BUILD_LABEL}] GET OK: ${entregadores.length} entregadores`)
  
  return NextResponse.json({
    success: true,
    source: "supabase",
    entregadores,
    count: entregadores.length
  })
}

// POST - Salva entregadores (substitui todos ou adiciona um)
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
  
  // Se veio array de entregadores, substituir todos
  if (body.entregadores && Array.isArray(body.entregadores)) {
    console.log(`[${BUILD_LABEL}] Salvando ${body.entregadores.length} entregadores`)
    
    // Buscar entregadores existentes para preservar tokens
    const { data: existingData } = await supabase.from('entregadores').select('id, token')
    const existingTokens = new Map((existingData || []).map(e => [e.id, e.token]))
    
    // Deletar entregadores antigos
    await supabase.from('entregadores').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    // Inserir novos
    const entregadoresToSave = body.entregadores.map((e: {
      id?: string
      nome: string
      whatsapp: string
      status?: string
      token?: string
      veiculo?: string
      totalEntregas?: number
      pedidosAtuais?: number
    }) => {
      const isNewId = !e.id || e.id.startsWith('entregador-')
      const existingToken = e.id ? existingTokens.get(e.id) : null
      
      return {
        id: isNewId ? undefined : e.id, // Gerar novo UUID se ID for temporario
        name: e.nome,
        phone: e.whatsapp,
        active: e.status !== 'inativo',
        token: e.token || existingToken || generateToken(),
        vehicle: e.veiculo || null,
        total_deliveries: e.totalEntregas || 0,
        current_orders: e.pedidosAtuais || 0,
      }
    })
    
    if (entregadoresToSave.length > 0) {
      const { error } = await supabase.from('entregadores').insert(entregadoresToSave)
      
      if (error) {
        console.log(`[${BUILD_LABEL}] POST error: ${error.code} - ${error.message}`)
        return NextResponse.json({ 
          success: false, 
          error: error.message
        }, { status: 500 })
      }
    }
    
    console.log(`[${BUILD_LABEL}] POST OK: ${entregadoresToSave.length} entregadores salvos`)
    
    return NextResponse.json({
      success: true,
      source: "supabase",
      count: entregadoresToSave.length
    })
  }
  
  // Se veio entregador unico, fazer upsert
  if (body.nome || body.name) {
    const entregadorToSave = {
      name: body.nome || body.name,
      phone: body.whatsapp || body.phone,
      active: body.status !== 'inativo',
      token: body.token || generateToken(),
      vehicle: body.veiculo || body.vehicle || null,
      total_deliveries: body.totalEntregas || body.total_deliveries || 0,
      current_orders: body.pedidosAtuais || body.current_orders || 0,
    }
    
    const { data, error } = await supabase
      .from('entregadores')
      .insert(entregadorToSave)
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
      entregador: {
        id: data.id,
        nome: data.name,
        whatsapp: data.phone,
        status: data.active ? 'ativo' : 'inativo',
        token: data.token,
      }
    })
  }
  
  return NextResponse.json({ 
    success: false, 
    error: "Dados invalidos"
  }, { status: 400 })
}

// PUT - Atualiza entregador especifico
export async function PUT(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log(`[${BUILD_LABEL}] PUT`)
  
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
  
  if (!body.id) {
    return NextResponse.json({ success: false, error: "ID necessario" }, { status: 400 })
  }
  
  const updateData: Record<string, unknown> = {}
  if (body.nome !== undefined) updateData.name = body.nome
  if (body.whatsapp !== undefined) updateData.phone = body.whatsapp
  if (body.status !== undefined) updateData.active = body.status !== 'inativo'
  if (body.veiculo !== undefined) updateData.vehicle = body.veiculo
  if (body.totalEntregas !== undefined) updateData.total_deliveries = body.totalEntregas
  if (body.pedidosAtuais !== undefined) updateData.current_orders = body.pedidosAtuais
  
  const { data, error } = await supabase
    .from('entregadores')
    .update(updateData)
    .eq('id', body.id)
    .select()
    .single()
  
  if (error) {
    console.log(`[${BUILD_LABEL}] PUT error: ${error.code} - ${error.message}`)
    return NextResponse.json({ 
      success: false, 
      error: error.message
    }, { status: 500 })
  }
  
  return NextResponse.json({
    success: true,
    source: "supabase",
    entregador: {
      id: data.id,
      nome: data.name,
      whatsapp: data.phone,
      status: data.active ? 'ativo' : 'inativo',
      token: data.token,
    }
  })
}

// DELETE - Remove entregador por ID
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
  
  if (!body.id) {
    return NextResponse.json({ success: false, error: "ID necessario" }, { status: 400 })
  }
  
  const { error } = await supabase.from('entregadores').delete().eq('id', body.id)
  
  if (error) {
    console.log(`[${BUILD_LABEL}] DELETE error: ${error.code} - ${error.message}`)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ success: true })
}
