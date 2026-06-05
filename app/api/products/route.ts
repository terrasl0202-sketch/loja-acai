import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getStoreIdFromRequest } from "@/lib/api-store"

/**
 * /api/products v97 - MULTIEMPRESA
 * Agora filtra por store_id para suporte multiempresa.
 */

// Cria Supabase client dinamicamente
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
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
  store_id: number | null
  created_at: string
  updated_at: string
  badge_enabled: boolean
  badge_text: string
  badge_type: string
  badge_color: string
  serving_text: string
  show_serving_text: boolean
}

// Tipo do produto no frontend
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
  badgeEnabled?: boolean
  badgeText?: string
  badgeType?: string
  badgeColor?: string
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
    badgeEnabled: db.badge_enabled ?? false,
    badgeText: db.badge_text || '',
    badgeType: db.badge_type || 'mais_vendido',
    badgeColor: db.badge_color || '',
    servingText: db.serving_text || '',
    showServingText: db.show_serving_text ?? false,
  }
}

// Converte Frontend -> DB
function mapFrontendToDb(product: FrontendProduct, storeId: number) {
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
    store_id: storeId, // SEMPRE salvar store_id
    updated_at: new Date().toISOString(),
    badge_enabled: product.badgeEnabled ?? false,
    badge_text: product.badgeText || '',
    badge_type: product.badgeType || 'mais_vendido',
    badge_color: product.badgeColor || '',
    serving_text: product.servingText || '',
    show_serving_text: product.showServingText ?? false,
  }
}

/**
 * GET - Lista produtos da loja atual
 */
export async function GET(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  console.log(`[products v97 GET] storeId: ${storeId}`)
  
  try {
    const supabase = getSupabase()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: "Supabase nao configurado"
      }, { status: 500 })
    }
    
    // Filtrar por store_id
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true })
    
    if (error) {
      console.error("[products v97 GET] Erro:", error.message)
      return NextResponse.json({ 
        success: false, 
        error: error.message
      }, { status: 500 })
    }
    
    const products = (data || []).map(mapDbToFrontend)
    console.log(`[products GET] ${products.length} produtos da loja ${storeId}`)
    
    return NextResponse.json({ 
      success: true, 
      products,
      source: 'supabase',
      count: products.length,
      storeId
    })
    
  } catch (err) {
    console.error("[products GET] Erro:", err)
    return NextResponse.json({ 
      success: false, 
      error: String(err)
    }, { status: 500 })
  }
}

/**
 * POST - Salva todos os produtos da loja atual
 */
export async function POST(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  console.log(`[products v97 POST] storeId: ${storeId}`)
  
  try {
    const supabase = getSupabase()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: "Supabase nao configurado"
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
    
    console.log(`[products v97 POST] ${products.length} produtos para loja ${storeId}`)
    
    // 1. Deletar produtos APENAS desta loja
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('store_id', storeId)
    
    if (deleteError) {
      console.error("[products v97 POST] Erro delete:", deleteError.message)
      return NextResponse.json({ 
        success: false, 
        error: deleteError.message 
      }, { status: 500 })
    }
    
    // 2. Inserir novos produtos
    if (products.length > 0) {
      const productsToInsert = products.map((p, index) => ({
        ...mapFrontendToDb(p, storeId),
        sort_order: index,
        created_at: new Date().toISOString(),
      }))
      
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
      console.log(`[products POST] ${savedProducts.length} produtos salvos para loja ${storeId}`)
      
      return NextResponse.json({ 
        success: true, 
        products: savedProducts,
        source: 'supabase',
        count: savedProducts.length,
        storeId
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      products: [],
      source: 'supabase',
      count: 0,
      storeId
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
 * PUT - Atualiza um produto (verifica se pertence a loja)
 */
export async function PUT(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  console.log(`[products v97 PUT] storeId: ${storeId}`)
  
  try {
    const supabase = getSupabase()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: "Supabase nao configurado"
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
    
    // Atualizar APENAS se pertence a esta loja
    const { data, error } = await supabase
      .from('products')
      .update(mapFrontendToDb(product, storeId))
      .eq('id', product.id)
      .eq('store_id', storeId) // Seguranca: so atualiza da mesma loja
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
    console.log(`[products PUT] Produto ${updated.name} atualizado na loja ${storeId}`)
    
    return NextResponse.json({ 
      success: true, 
      product: updated,
      source: 'supabase',
      storeId
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
 * DELETE - Remove um produto (verifica se pertence a loja)
 */
export async function DELETE(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  console.log(`[products v97 DELETE] storeId: ${storeId}`)
  
  try {
    const supabase = getSupabase()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: "Supabase nao configurado"
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
    
    // Deletar APENAS se pertence a esta loja
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', parseInt(id))
      .eq('store_id', storeId) // Seguranca: so deleta da mesma loja
    
    if (error) {
      console.error("[products DELETE] Erro:", error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }
    
    console.log(`[products DELETE] Produto ${id} removido da loja ${storeId}`)
    
    return NextResponse.json({ 
      success: true,
      source: 'supabase',
      storeId
    })
    
  } catch (err) {
    console.error("[products DELETE] Erro:", err)
    return NextResponse.json({ 
      success: false, 
      error: String(err) 
    }, { status: 500 })
  }
}
