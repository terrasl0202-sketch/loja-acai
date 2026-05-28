import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Cria Supabase client dinamicamente - retorna null se nao configurado
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[neighborhoods v96] Envs faltando:", { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey })
    return null
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Tipo do bairro no banco
interface DbNeighborhood {
  id: string
  name: string
  fee: number
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// Tipo do bairro no frontend
interface FrontendNeighborhood {
  id: string | number
  name: string
  deliveryFee: number
  fee?: number
  active: boolean
  order?: number
}

// Mappers
function mapDbToFrontend(db: DbNeighborhood): FrontendNeighborhood {
  return {
    id: db.id,
    name: db.name,
    deliveryFee: Number(db.fee) || 0,
    fee: Number(db.fee) || 0,
    active: db.active,
    order: db.sort_order
  }
}

function mapFrontendToDb(front: FrontendNeighborhood, index: number) {
  return {
    name: front.name,
    fee: front.deliveryFee ?? front.fee ?? 0,
    active: front.active !== false,
    sort_order: front.order ?? index,
    updated_at: new Date().toISOString()
  }
}

// SEM bairros fallback - apenas Supabase
const FALLBACK_NEIGHBORHOODS: FrontendNeighborhood[] = []

/**
 * GET - Lista todos os bairros
 */
export async function GET() {
  console.log("[neighborhoods v96 GET] Carregando bairros...")
  
  try {
    const supabase = getSupabase()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: true, 
        neighborhoods: FALLBACK_NEIGHBORHOODS,
        source: 'fallback',
        error: 'Supabase nao configurado'
      })
    }
    
    const { data, error } = await supabase
      .from('neighborhoods')
      .select('*')
      .order('sort_order', { ascending: true })
    
    if (error) {
      console.error("[neighborhoods v96 GET] Erro:", error.message)
      return NextResponse.json({ 
        success: true, 
        neighborhoods: FALLBACK_NEIGHBORHOODS,
        source: 'fallback',
        error: error.message
      })
    }
    
    const neighborhoods = (data || []).map(mapDbToFrontend)
    console.log(`[neighborhoods v96 GET] ${neighborhoods.length} bairros carregados`)
    
    return NextResponse.json({ 
      success: true, 
      neighborhoods,
      source: 'supabase'
    })
    
  } catch (error) {
    console.error("[neighborhoods v96 GET] Erro:", error)
    return NextResponse.json({ 
      success: true, 
      neighborhoods: FALLBACK_NEIGHBORHOODS,
      source: 'fallback',
      error: String(error)
    })
  }
}

/**
 * POST - Salva todos os bairros (substitui)
 */
export async function POST(request: Request) {
  console.log("[neighborhoods v96 POST] Salvando bairros...")
  
  try {
    const supabase = getSupabase()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: "Supabase nao configurado",
        source: 'config_error'
      }, { status: 500 })
    }
    
    const body = await request.json()
    const neighborhoods: FrontendNeighborhood[] = body.neighborhoods || body
    
    if (!Array.isArray(neighborhoods)) {
      return NextResponse.json({ 
        success: false, 
        error: "neighborhoods deve ser um array" 
      }, { status: 400 })
    }
    
    console.log(`[neighborhoods v96 POST] ${neighborhoods.length} bairros`)
    
    // Deletar todos os bairros existentes
    const { error: deleteError } = await supabase
      .from('neighborhoods')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (deleteError) {
      console.error("[neighborhoods v96 POST] Erro delete:", deleteError.message)
    }
    
    // Inserir novos bairros
    if (neighborhoods.length > 0) {
      const toInsert = neighborhoods.map((n, i) => mapFrontendToDb(n, i))
      
      const { data, error: insertError } = await supabase
        .from('neighborhoods')
        .insert(toInsert)
        .select()
      
      if (insertError) {
        console.error("[neighborhoods v96 POST] Erro insert:", insertError.message)
        return NextResponse.json({ 
          success: false, 
          error: insertError.message 
        }, { status: 500 })
      }
      
      console.log(`[neighborhoods v96 POST] ${data?.length || 0} salvos`)
      
      return NextResponse.json({ 
        success: true, 
        count: data?.length || 0,
        neighborhoods: (data || []).map(mapDbToFrontend),
        source: 'supabase'
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      count: 0,
      neighborhoods: [],
      source: 'supabase'
    })
    
  } catch (error) {
    console.error("[neighborhoods POST] Erro:", error)
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 })
  }
}

/**
 * PUT - Atualiza um bairro especifico
 */
export async function PUT(request: Request) {
  console.log("[neighborhoods v96 PUT] Atualizando bairro...")
  
  try {
    const supabase = getSupabase()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: "Supabase nao configurado",
        source: 'config_error'
      }, { status: 500 })
    }
    
    const body = await request.json()
    const neighborhood: FrontendNeighborhood = body.neighborhood || body
    
    if (!neighborhood.id) {
      return NextResponse.json({ 
        success: false, 
        error: "ID do bairro obrigatorio" 
      }, { status: 400 })
    }
    
    const updateData = {
      name: neighborhood.name,
      fee: neighborhood.deliveryFee ?? neighborhood.fee ?? 0,
      active: neighborhood.active,
      sort_order: neighborhood.order ?? 0,
      updated_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('neighborhoods')
      .update(updateData)
      .eq('id', neighborhood.id)
      .select()
      .single()
    
    if (error) {
      console.error("[neighborhoods PUT] Erro:", error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }
    
    console.log(`[neighborhoods PUT] Bairro atualizado: ${data.name}`)
    
    return NextResponse.json({ 
      success: true, 
      neighborhood: mapDbToFrontend(data),
      source: 'supabase'
    })
    
  } catch (error) {
    console.error("[neighborhoods PUT] Erro:", error)
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 })
  }
}

/**
 * DELETE - Remove um bairro
 */
export async function DELETE(request: Request) {
  console.log("[neighborhoods v96 DELETE] Removendo bairro...")
  
  try {
    const supabase = getSupabase()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: "Supabase nao configurado",
        source: 'config_error'
      }, { status: 500 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: "ID obrigatorio" 
      }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('neighborhoods')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error("[neighborhoods DELETE] Erro:", error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }
    
    console.log(`[neighborhoods DELETE] Bairro removido: ${id}`)
    
    return NextResponse.json({ 
      success: true, 
      source: 'supabase'
    })
    
  } catch (error) {
    console.error("[neighborhoods DELETE] Erro:", error)
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 })
  }
}
