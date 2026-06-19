import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getStoreIdFromRequest } from "@/lib/api-store"
import { requireStoreAuth } from "@/lib/store-session"

/**
 * /api/banners v2 - MULTIEMPRESA
 * Banners isolados por loja.
 */

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey)
}

interface DbBanner {
  id: number
  image_url: string
  title: string
  subtitle: string
  link_url: string
  sort_order: number
  active: boolean
  store_id: number | null
  created_at: string
  updated_at: string
}

interface FrontendBanner {
  id: number
  imageUrl: string
  title: string
  subtitle: string
  linkUrl: string
  sortOrder: number
  active: boolean
}

function mapDbToFrontend(db: DbBanner): FrontendBanner {
  return {
    id: db.id,
    imageUrl: db.image_url || '',
    title: db.title || '',
    subtitle: db.subtitle || '',
    linkUrl: db.link_url || '',
    sortOrder: db.sort_order || 0,
    active: db.active,
  }
}

// GET - Listar banners da loja atual
export async function GET(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  console.log(`[banners v2 GET] storeId: ${storeId}`)
  
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json([])
    }

    const { data, error } = await supabase
      .from('hero_banners')
      .select('*')
      .eq('store_id', storeId) // Filtrar por loja
      .order('sort_order', { ascending: true })

    if (error) {
      console.error("[banners] Erro ao buscar:", error)
      return NextResponse.json([])
    }

    const banners = (data || []).map(mapDbToFrontend)
    return NextResponse.json(banners)
  } catch (error) {
    console.error("[banners] Erro:", error)
    return NextResponse.json([])
  }
}

// POST - Criar banner para loja atual
export async function POST(request: NextRequest) {
  const auth = await requireStoreAuth(request)
  if (!auth.ok) return auth.response!
  const storeId = auth.storeId
  
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase nao configurado" }, { status: 500 })
    }

    const body = await request.json()
    
    // Verificar limite de 5 banners POR LOJA
    const { count } = await supabase
      .from('hero_banners')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
    
    if ((count || 0) >= 5) {
      return NextResponse.json({ error: "Limite de 5 banners atingido" }, { status: 400 })
    }

    // Obter maior sort_order DESTA LOJA
    const { data: maxOrder } = await supabase
      .from('hero_banners')
      .select('sort_order')
      .eq('store_id', storeId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const newSortOrder = (maxOrder?.sort_order || 0) + 1

    const dbData = {
      image_url: body.imageUrl || '',
      title: body.title || '',
      subtitle: body.subtitle || '',
      link_url: body.linkUrl || '',
      sort_order: newSortOrder,
      active: body.active !== false,
      store_id: storeId, // SEMPRE salvar store_id
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('hero_banners')
      .insert(dbData)
      .select()
      .single()

    if (error) {
      console.error("[banners] Erro ao criar:", error)
      return NextResponse.json({ error: "Erro ao criar banner" }, { status: 500 })
    }

    return NextResponse.json(mapDbToFrontend(data))
  } catch (error) {
    console.error("[banners] Erro:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// PUT - Atualizar banner(s) (verifica se pertence a loja)
export async function PUT(request: NextRequest) {
  const auth = await requireStoreAuth(request)
  if (!auth.ok) return auth.response!
  const storeId = auth.storeId
  
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase nao configurado" }, { status: 500 })
    }

    const body = await request.json()

    // Atualizar multiplos banners (batch)
    if (Array.isArray(body)) {
      const results = []
      for (const banner of body) {
        if (!banner.id) continue
        
        const dbData: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (banner.imageUrl !== undefined) dbData.image_url = banner.imageUrl
        if (banner.title !== undefined) dbData.title = banner.title
        if (banner.subtitle !== undefined) dbData.subtitle = banner.subtitle
        if (banner.linkUrl !== undefined) dbData.link_url = banner.linkUrl
        if (banner.sortOrder !== undefined) dbData.sort_order = banner.sortOrder
        if (banner.active !== undefined) dbData.active = banner.active
        
        const { data, error } = await supabase
          .from('hero_banners')
          .update(dbData)
          .eq('id', banner.id)
          .eq('store_id', storeId) // Seguranca
          .select()
          .single()

        if (!error && data) {
          results.push(mapDbToFrontend(data))
        }
      }
      return NextResponse.json(results)
    }

    // Atualizar um banner
    if (!body.id) {
      return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 })
    }

    const dbData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.imageUrl !== undefined) dbData.image_url = body.imageUrl
    if (body.title !== undefined) dbData.title = body.title
    if (body.subtitle !== undefined) dbData.subtitle = body.subtitle
    if (body.linkUrl !== undefined) dbData.link_url = body.linkUrl
    if (body.sortOrder !== undefined) dbData.sort_order = body.sortOrder
    if (body.active !== undefined) dbData.active = body.active
    
    const { data, error } = await supabase
      .from('hero_banners')
      .update(dbData)
      .eq('id', body.id)
      .eq('store_id', storeId) // Seguranca
      .select()
      .single()

    if (error) {
      console.error("[banners] Erro ao atualizar:", error)
      return NextResponse.json({ error: "Erro ao atualizar banner" }, { status: 500 })
    }

    return NextResponse.json(mapDbToFrontend(data))
  } catch (error) {
    console.error("[banners] Erro:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// DELETE - Excluir banner (verifica se pertence a loja)
export async function DELETE(request: NextRequest) {
  const auth = await requireStoreAuth(request)
  if (!auth.ok) return auth.response!
  const storeId = auth.storeId
  
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase nao configurado" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 })
    }

    const { error } = await supabase
      .from('hero_banners')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId) // Seguranca

    if (error) {
      console.error("[banners] Erro ao excluir:", error)
      return NextResponse.json({ error: "Erro ao excluir banner" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[banners] Erro:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
