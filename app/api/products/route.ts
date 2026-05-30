import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Cria Supabase client dinamicamente - retorna null se nao configurado
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[products v96] Envs faltando:", { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey })
    return null
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Tipo do produto no banco
interface DbProduct {
  id: number
  name: string
  description: string
  price: number
  category: string
  category_id: number | null
  image: string
  active: boolean
  featured: boolean
  best_seller: boolean
  stock: number
  sort_order: number
  display_order: number
  created_at: string
  updated_at: string
  // Novos campos de badge
  badge_enabled: boolean
  badge_text: string
  badge_type: string
  badge_color: string
  // Novos campos de serving
  serving_text: string
  show_serving_text: boolean
}

// Tipo do produto no frontend (compatibilidade com codigo existente)
interface FrontendProduct {
  id: number
  name: string
  description: string
  price: number
  category: string
  categoryId?: number | null
  image: string
  active: boolean
  featured?: boolean
  bestSeller?: boolean
  stock?: number
  displayOrder?: number
  // Novos campos de badge
  badgeEnabled?: boolean
  badgeText?: string
  badgeType?: string
  badgeColor?: string
  // Novos campos de serving
  servingText?: string
  showServingText?: boolean
}

// Converte DB -> Frontend
function mapDbToFrontend(db: DbProduct): FrontendProduct {
  return {
    id: db.id,
    name: db.name,
    description: db.description,
    price: Number(db.price),
    category: db.category,
    categoryId: db.category_id,
    image: db.image,
    active: db.active,
    featured: db.featured,
    bestSeller: db.best_seller,
    stock: db.stock,
    displayOrder: db.display_order ?? db.sort_order ?? 0,
    // Novos campos
    badgeEnabled: db.badge_enabled ?? false,
    badgeText: db.badge_text || '',
    badgeType: db.badge_type || 'mais_vendido',
    badgeColor: db.badge_color || '',
    servingText: db.serving_text || '',
    showServingText: db.show_serving_text ?? false,
  }
}

// Converte Frontend -> DB (para insert/update)
function mapFrontendToDb(product: FrontendProduct) {
  return {
    name: product.name,
    description: product.description || '',
    price: product.price,
    category: product.category || 'acai',
    category_id: product.categoryId ?? null,
    image: product.image || '',
    active: product.active !== false,
    featured: product.featured || false,
    best_seller: product.bestSeller || false,
    stock: product.stock ?? 100,
    sort_order: product.id || 0,
    display_order: product.displayOrder ?? 0,
    updated_at: new Date().toISOString(),
    // Novos campos
    badge_enabled: product.badgeEnabled ?? false,
    badge_text: product.badgeText || '',
    badge_type: product.badgeType || 'mais_vendido',
    badge_color: product.badgeColor || '',
    serving_text: product.servingText || '',
    show_serving_text: product.showServingText ?? false,
  }
}

/**
 * GET - Lista todos os produtos do Supabase
 */
export async function GET() {
  console.log("[products v96 GET] Carregando produtos...")
  
  try {
    const supabase = getSupabase()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: "Supabase nao configurado",
        source: 'config_error'
      }, { status: 500 })
    }
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true })
    
    if (error) {
      console.error("[products v96 GET] Erro:", error.message)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        source: 'supabase_error'
      }, { status: 500 })
    }
    
    const products = (data || []).map(mapDbToFrontend)
    console.log(`[products GET] ${products.length} produtos carregados do Supabase`)
    
    return NextResponse.json({ 
      success: true, 
      products,
      source: 'supabase',
      count: products.length
    })
    
  } catch (err) {
    console.error("[products GET] Erro:", err)
    return NextResponse.json({ 
      success: false, 
      error: String(err),
      source: 'error'
    }, { status: 500 })
  }
}

/**
 * POST - Salva todos os produtos (substitui lista completa)
 */
export async function POST(request: Request) {
  console.log("[products v96 POST] Salvando produtos...")
  
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
    const products: FrontendProduct[] = body.products || body
    
    if (!Array.isArray(products)) {
      return NextResponse.json({ 
        success: false, 
        error: "Produtos deve ser um array" 
      }, { status: 400 })
    }
    
    console.log(`[products v96 POST] ${products.length} produtos para salvar`)
    
    // 1. Deletar todos os produtos existentes
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .gte('id', 0)
    
    if (deleteError) {
      console.error("[products v96 POST] Erro delete:", deleteError.message)
      return NextResponse.json({ 
        success: false, 
        error: deleteError.message 
      }, { status: 500 })
    }
    
    // 2. Inserir novos produtos (se houver)
    if (products.length > 0) {
      const productsToInsert = products.map((p, index) => ({
        ...mapFrontendToDb(p),
        sort_order: index,
        created_at: new Date().toISOString(),
      }))
      
      console.log("[products POST] Inserindo produtos:", productsToInsert.map(p => p.name))
      
      const { data: inserted, error: insertError } = await supabase
        .from('products')
        .insert(productsToInsert)
        .select()
      
      if (insertError) {
        console.error("[products POST] Erro ao inserir:", insertError)
        return NextResponse.json({ 
          success: false, 
          error: `Erro ao inserir produtos: ${insertError.message}` 
        }, { status: 500 })
      }
      
      const savedProducts = (inserted || []).map(mapDbToFrontend)
      console.log(`[products POST] ${savedProducts.length} produtos salvos com sucesso`)
      
      return NextResponse.json({ 
        success: true, 
        products: savedProducts,
        source: 'supabase',
        count: savedProducts.length
      })
    }
    
    console.log("[products POST] Lista vazia - todos produtos removidos")
    return NextResponse.json({ 
      success: true, 
      products: [],
      source: 'supabase',
      count: 0
    })
    
  } catch (err) {
    console.error("[products POST] Erro:", err)
    return NextResponse.json({ 
      success: false, 
      error: String(err) 
    }, { status: 500 })
  }
}

/**
 * PUT - Atualiza um produto especifico
 */
export async function PUT(request: Request) {
  console.log("[products v96 PUT] Atualizando produto...")
  
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
    const product: FrontendProduct = body.product || body
    
    if (!product || !product.id) {
      return NextResponse.json({ 
        success: false, 
        error: "Produto invalido ou sem ID" 
      }, { status: 400 })
    }
    
    console.log(`[products v96 PUT] Atualizando produto ID ${product.id}: ${product.name}`)
    
    const { data, error } = await supabase
      .from('products')
      .update(mapFrontendToDb(product))
      .eq('id', product.id)
      .select()
      .single()
    
    if (error) {
      console.error("[products PUT] Erro:", error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }
    
    const updated = mapDbToFrontend(data)
    console.log(`[products PUT] Produto ${updated.name} atualizado`)
    
    return NextResponse.json({ 
      success: true, 
      product: updated,
      source: 'supabase'
    })
    
  } catch (err) {
    console.error("[products PUT] Erro:", err)
    return NextResponse.json({ 
      success: false, 
      error: String(err) 
    }, { status: 500 })
  }
}

/**
 * DELETE - Remove um produto
 */
export async function DELETE(request: Request) {
  console.log("[products v96 DELETE] Removendo produto...")
  
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
        error: "ID do produto nao informado" 
      }, { status: 400 })
    }
    
    console.log(`[products v96 DELETE] Removendo produto ID ${id}`)
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', parseInt(id))
    
    if (error) {
      console.error("[products DELETE] Erro:", error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }
    
    console.log(`[products DELETE] Produto ${id} removido`)
    
    return NextResponse.json({ 
      success: true,
      source: 'supabase'
    })
    
  } catch (err) {
    console.error("[products DELETE] Erro:", err)
    return NextResponse.json({ 
      success: false, 
      error: String(err) 
    }, { status: 500 })
  }
}
