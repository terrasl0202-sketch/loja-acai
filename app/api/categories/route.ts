import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getStoreIdFromRequest } from "@/lib/api-store"

/**
 * /api/categories v2 - MULTIEMPRESA
 * Categorias isoladas por loja.
 */

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey)
}

interface DbCategory {
  id: number
  name: string
  description: string
  icon: string
  image_url: string
  sort_order: number
  active: boolean
  store_id: number | null
  created_at: string
  updated_at: string
}

interface FrontendCategory {
  id: number
  name: string
  description: string
  icon: string
  imageUrl: string
  sortOrder: number
  active: boolean
}

function mapDbToFrontend(db: DbCategory): FrontendCategory {
  return {
    id: db.id,
    name: db.name,
    description: db.description || '',
    icon: db.icon || 'utensils',
    imageUrl: db.image_url || '',
    sortOrder: db.sort_order || 0,
    active: db.active,
  }
}

function mapFrontendToDb(category: Partial<FrontendCategory>, storeId: number) {
  const result: Record<string, unknown> = {
    store_id: storeId, // SEMPRE salvar store_id
  }
  
  if (category.name !== undefined) result.name = category.name
  if (category.description !== undefined) result.description = category.description
  if (category.icon !== undefined) result.icon = category.icon
  if (category.imageUrl !== undefined) result.image_url = category.imageUrl
  if (category.sortOrder !== undefined) result.sort_order = category.sortOrder
  if (category.active !== undefined) result.active = category.active
  
  result.updated_at = new Date().toISOString()
  
  return result
}

// GET - Listar categorias da loja atual
export async function GET(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  console.log(`[categories v2 GET] storeId: ${storeId}`)
  
  const supabase = getSupabase()
  
  if (!supabase) {
    return NextResponse.json([
      { id: 1, name: 'Acais', description: '', icon: 'ice-cream', imageUrl: '', sortOrder: 1, active: true },
      { id: 2, name: 'Sorvetes', description: '', icon: 'ice-cream-cone', imageUrl: '', sortOrder: 2, active: true },
      { id: 3, name: 'Bebidas', description: '', icon: 'cup-soda', imageUrl: '', sortOrder: 3, active: true },
    ])
  }

  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('store_id', storeId) // Filtrar por loja
      .order('sort_order', { ascending: true })

    if (error) {
      console.error("[categories] Erro ao buscar:", error)
      return NextResponse.json([])
    }

    const categories = (data || []).map(mapDbToFrontend)
    return NextResponse.json(categories)
  } catch (error) {
    console.error("[categories] Erro:", error)
    return NextResponse.json([])
  }
}

// POST - Criar categoria para loja atual
export async function POST(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  const supabase = getSupabase()
  
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase nao configurado' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const dbData = {
      ...mapFrontendToDb(body, storeId),
      created_at: new Date().toISOString(),
    }
    
    const { data, error } = await supabase
      .from('product_categories')
      .insert(dbData)
      .select()
      .single()

    if (error) {
      console.error("[categories] Erro ao criar:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(mapDbToFrontend(data))
  } catch (error) {
    console.error("[categories] Erro:", error)
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 })
  }
}

// PUT - Atualizar categoria (verifica se pertence a loja)
export async function PUT(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  const supabase = getSupabase()
  
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase nao configurado' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatorio' }, { status: 400 })
    }
    
    const dbData = mapFrontendToDb(updates, storeId)
    
    const { data, error } = await supabase
      .from('product_categories')
      .update(dbData)
      .eq('id', id)
      .eq('store_id', storeId) // Seguranca: so atualiza da mesma loja
      .select()
      .single()

    if (error) {
      console.error("[categories] Erro ao atualizar:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(mapDbToFrontend(data))
  } catch (error) {
    console.error("[categories] Erro:", error)
    return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 })
  }
}

// DELETE - Excluir categoria (verifica se pertence a loja)
export async function DELETE(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  const supabase = getSupabase()
  
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase nao configurado' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatorio' }, { status: 400 })
    }
    
    // Desvincula produtos desta categoria (apenas da mesma loja)
    await supabase
      .from('products')
      .update({ category_id: null })
      .eq('category_id', id)
      .eq('store_id', storeId)
    
    // Exclui categoria (apenas se pertence a loja)
    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId) // Seguranca

    if (error) {
      console.error("[categories] Erro ao excluir:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[categories] Erro:", error)
    return NextResponse.json({ error: 'Erro ao excluir categoria' }, { status: 500 })
  }
}
