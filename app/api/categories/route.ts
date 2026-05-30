import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Cria Supabase client dinamicamente
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[categories] Envs faltando:", { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey })
    return null
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Tipo da categoria no banco
interface DbCategory {
  id: number
  name: string
  description: string
  icon: string
  image_url: string
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
}

// Tipo da categoria no frontend
interface FrontendCategory {
  id: number
  name: string
  description: string
  icon: string
  imageUrl: string
  sortOrder: number
  active: boolean
}

// Converte DB -> Frontend
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

// Converte Frontend -> DB
function mapFrontendToDb(category: Partial<FrontendCategory>) {
  const result: Record<string, unknown> = {}
  
  if (category.name !== undefined) result.name = category.name
  if (category.description !== undefined) result.description = category.description
  if (category.icon !== undefined) result.icon = category.icon
  if (category.imageUrl !== undefined) result.image_url = category.imageUrl
  if (category.sortOrder !== undefined) result.sort_order = category.sortOrder
  if (category.active !== undefined) result.active = category.active
  
  result.updated_at = new Date().toISOString()
  
  return result
}

// GET - Listar todas as categorias
export async function GET() {
  const supabase = getSupabase()
  
  if (!supabase) {
    // Retorna categorias padrao se Supabase nao configurado
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
      .order('sort_order', { ascending: true })

    if (error) {
      console.error("[categories] Erro ao buscar:", error)
      // Retorna categorias padrao em caso de erro (tabela pode nao existir)
      return NextResponse.json([
        { id: 1, name: 'Acais', description: '', icon: 'ice-cream', imageUrl: '', sortOrder: 1, active: true },
        { id: 2, name: 'Sorvetes', description: '', icon: 'ice-cream-cone', imageUrl: '', sortOrder: 2, active: true },
        { id: 3, name: 'Bebidas', description: '', icon: 'cup-soda', imageUrl: '', sortOrder: 3, active: true },
      ])
    }

    const categories = (data || []).map(mapDbToFrontend)
    return NextResponse.json(categories)
  } catch (error) {
    console.error("[categories] Erro:", error)
    return NextResponse.json([])
  }
}

// POST - Criar nova categoria
export async function POST(request: Request) {
  const supabase = getSupabase()
  
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase nao configurado' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const dbData = mapFrontendToDb(body)
    
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

// PUT - Atualizar categoria
export async function PUT(request: Request) {
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
    
    const dbData = mapFrontendToDb(updates)
    
    const { data, error } = await supabase
      .from('product_categories')
      .update(dbData)
      .eq('id', id)
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

// DELETE - Excluir categoria
export async function DELETE(request: Request) {
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
    
    // Primeiro, desvincula produtos desta categoria
    await supabase
      .from('products')
      .update({ category_id: null })
      .eq('category_id', id)
    
    // Depois, exclui a categoria
    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', id)

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
