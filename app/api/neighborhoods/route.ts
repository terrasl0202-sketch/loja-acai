import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getStoreIdFromRequest } from "@/lib/api-store"
import { requireStoreAuth } from "@/lib/store-session"

/**
 * /api/neighborhoods v2 - MULTIEMPRESA
 * Bairros isolados por loja.
 */

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey)
}

interface DbNeighborhood {
  id: string
  name: string
  delivery_fee: number
  active: boolean
  sort_order: number
  store_id: number | null
  created_at: string
}

interface FrontendNeighborhood {
  id: string | number
  name: string
  deliveryFee: number
  fee?: number
  active: boolean
  order?: number
}

function mapDbToFrontend(db: DbNeighborhood): FrontendNeighborhood {
  return {
    id: db.id,
    name: db.name,
    deliveryFee: Number(db.delivery_fee) || 0,
    fee: Number(db.delivery_fee) || 0,
    active: db.active,
    order: db.sort_order
  }
}

function mapFrontendToDb(front: FrontendNeighborhood, index: number, storeId: number) {
  return {
    name: front.name,
    delivery_fee: front.deliveryFee ?? front.fee ?? 0,
    active: front.active !== false,
    sort_order: front.order ?? index,
    store_id: storeId // SEMPRE salvar store_id
  }
}

// GET - Listar bairros da loja atual
export async function GET(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  console.log(`[neighborhoods v2 GET] storeId: ${storeId}`)
  
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ success: true, neighborhoods: [], source: 'fallback' })
    }
    
    const { data, error } = await supabase
      .from('neighborhoods')
      .select('*')
      .eq('store_id', storeId) // Filtrar por loja
      .order('sort_order', { ascending: true })
    
    if (error) {
      console.error("[neighborhoods v2 GET] Erro:", error.message)
      return NextResponse.json({ success: true, neighborhoods: [], source: 'fallback', error: error.message })
    }
    
    const neighborhoods = (data || []).map(mapDbToFrontend)
    return NextResponse.json({ success: true, neighborhoods, source: 'supabase', storeId })
    
  } catch (error) {
    console.error("[neighborhoods v2 GET] Erro:", error)
    return NextResponse.json({ success: true, neighborhoods: [], source: 'fallback', error: String(error) })
  }
}

// POST - Salvar bairros da loja atual
export async function POST(request: NextRequest) {
  const auth = await requireStoreAuth(request)
  if (!auth.ok) return auth.response!
  const storeId = auth.storeId
  console.log(`[neighborhoods v2 POST] storeId: ${storeId}`)
  
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase nao configurado" }, { status: 500 })
    }
    
    const body = await request.json()
    const neighborhoods: FrontendNeighborhood[] = body.neighborhoods || body
    
    if (!Array.isArray(neighborhoods)) {
      return NextResponse.json({ success: false, error: "neighborhoods deve ser um array" }, { status: 400 })
    }
    
    // Deletar bairros APENAS desta loja
    const { error: deleteError } = await supabase
      .from('neighborhoods')
      .delete()
      .eq('store_id', storeId)
    
    if (deleteError) {
      console.error("[neighborhoods v2 POST] Erro delete:", deleteError.message)
    }
    
    // Remover duplicados
    const uniqueNeighborhoods = neighborhoods.filter((n, index, self) => 
      index === self.findIndex(t => t.name.toLowerCase().trim() === n.name.toLowerCase().trim())
    )
    
    if (uniqueNeighborhoods.length > 0) {
      const toInsert = uniqueNeighborhoods.map((n, i) => mapFrontendToDb(n, i, storeId))
      
      const { data, error: insertError } = await supabase
        .from('neighborhoods')
        .insert(toInsert)
        .select()
      
      if (insertError) {
        console.error("[neighborhoods v2 POST] Erro insert:", insertError.message)
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true, 
        count: data?.length || 0,
        neighborhoods: (data || []).map(mapDbToFrontend),
        source: 'supabase',
        storeId
      })
    }
    
    return NextResponse.json({ success: true, count: 0, neighborhoods: [], source: 'supabase', storeId })
    
  } catch (error) {
    console.error("[neighborhoods POST] Erro:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// PUT - Atualizar bairro (verifica se pertence a loja)
export async function PUT(request: NextRequest) {
  const auth = await requireStoreAuth(request)
  if (!auth.ok) return auth.response!
  const storeId = auth.storeId
  
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase nao configurado" }, { status: 500 })
    }
    
    const body = await request.json()
    const neighborhood: FrontendNeighborhood = body.neighborhood || body
    
    if (!neighborhood.id) {
      return NextResponse.json({ success: false, error: "ID do bairro obrigatorio" }, { status: 400 })
    }
    
    const updateData = {
      name: neighborhood.name,
      delivery_fee: neighborhood.deliveryFee ?? neighborhood.fee ?? 0,
      active: neighborhood.active,
      sort_order: neighborhood.order ?? 0
    }
    
    const { data, error } = await supabase
      .from('neighborhoods')
      .update(updateData)
      .eq('id', neighborhood.id)
      .eq('store_id', storeId) // Seguranca
      .select()
      .single()
    
    if (error) {
      console.error("[neighborhoods PUT] Erro:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, neighborhood: mapDbToFrontend(data), source: 'supabase', storeId })
    
  } catch (error) {
    console.error("[neighborhoods PUT] Erro:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// DELETE - Remover bairro (verifica se pertence a loja)
export async function DELETE(request: NextRequest) {
  const auth = await requireStoreAuth(request)
  if (!auth.ok) return auth.response!
  const storeId = auth.storeId
  
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase nao configurado" }, { status: 500 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ success: false, error: "ID obrigatorio" }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('neighborhoods')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId) // Seguranca
    
    if (error) {
      console.error("[neighborhoods DELETE] Erro:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, source: 'supabase', storeId })
    
  } catch (error) {
    console.error("[neighborhoods DELETE] Erro:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
