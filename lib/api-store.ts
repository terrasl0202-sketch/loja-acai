import { getServiceClient } from "@/lib/supabase/service"
import { NextRequest } from "next/server"

// Tipo da loja simplificado para APIs
export interface StoreInfo {
  id: number
  store_code: string
  slug: string
  store_name: string
  status: string
  plan: string
}

// Cache da loja main
let mainStoreCache: StoreInfo | null = null
let mainStoreCacheTime = 0
const CACHE_TTL = 60000 // 1 minuto

/**
 * Busca a loja main (fallback padrao)
 */
async function getMainStoreId(): Promise<number> {
  // Verificar cache
  if (mainStoreCache && Date.now() - mainStoreCacheTime < CACHE_TTL) {
    return mainStoreCache.id
  }

  const supabase = getServiceClient()
  if (!supabase) return 1 // Fallback absoluto
  
  const { data } = await supabase
    .from("stores")
    .select("id, store_code, slug, store_name, status, plan")
    .eq("store_code", "main")
    .single()

  if (data) {
    mainStoreCache = data
    mainStoreCacheTime = Date.now()
    return data.id
  }

  return 1 // Fallback se nao encontrar
}

/**
 * Extrai store_id do request (header, query param ou slug)
 * Usado pelas APIs para identificar a loja atual
 */
export async function getStoreIdFromRequest(request?: NextRequest | Request | null): Promise<number> {
  // Tentar extrair de varios lugares
  if (request) {
    const url = new URL(request.url)

    // 0. Header X-Store-Slug (AUTORITATIVO) - usado pelo admin multi-loja
    //    /admin/[slug]. O backend resolve o store_id PELO SLUG no servidor,
    //    nunca confiando em um store_id cru vindo do cliente. Slug invalido
    //    NAO resolve aqui (cai para o fallback), entao rotas que exijam loja
    //    valida devem tratar o resultado.
    const headerStoreSlug = request.headers.get("x-store-slug")
    if (headerStoreSlug) {
      const storeId = await getStoreIdBySlug(headerStoreSlug.trim())
      if (storeId) return storeId
    }

    // 1. Header X-Store-ID (usado por rotas /loja/[slug] e /admin/[slug])
    const headerStoreId = request.headers.get("x-store-id")
    if (headerStoreId) {
      const id = parseInt(headerStoreId)
      if (!isNaN(id) && id > 0) return id
    }
    
    // 2. Query param storeId
    const queryStoreId = url.searchParams.get("storeId")
    if (queryStoreId) {
      const id = parseInt(queryStoreId)
      if (!isNaN(id) && id > 0) return id
    }
    
    // 3. Query param store_id
    const queryStoreId2 = url.searchParams.get("store_id")
    if (queryStoreId2) {
      const id = parseInt(queryStoreId2)
      if (!isNaN(id) && id > 0) return id
    }

    // 4. Tentar identificar pelo slug na URL
    const pathParts = url.pathname.split("/")
    const lojaIndex = pathParts.indexOf("loja")
    if (lojaIndex !== -1 && pathParts[lojaIndex + 1]) {
      const slug = pathParts[lojaIndex + 1]
      const storeId = await getStoreIdBySlug(slug)
      if (storeId) return storeId
    }
    
    // 5. Tentar identificar pelo host (custom domain ou subdomain)
    const host = request.headers.get("host") || ""
    if (host && !host.includes("localhost") && !host.includes("vercel.app")) {
      const storeId = await getStoreIdByDomain(host)
      if (storeId) return storeId
    }
  }

  // Fallback: retornar loja main
  return getMainStoreId()
}

/**
 * Busca store_id por slug
 */
export async function getStoreIdBySlug(slug: string): Promise<number | null> {
  const supabase = getServiceClient()
  if (!supabase) return null
  
  const { data } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .single()

  return data?.id || null
}

/**
 * Busca store_id por dominio customizado
 */
async function getStoreIdByDomain(domain: string): Promise<number | null> {
  const supabase = getServiceClient()
  if (!supabase) return null
  
  // Tentar custom_domain primeiro
  const { data: customData } = await supabase
    .from("stores")
    .select("id")
    .eq("custom_domain", domain)
    .single()

  if (customData?.id) return customData.id

  // Tentar subdomain
  const subdomain = domain.split(".")[0]
  const { data: subData } = await supabase
    .from("stores")
    .select("id")
    .eq("subdomain", subdomain)
    .single()

  return subData?.id || null
}

/**
 * Busca informacoes completas da loja
 */
export async function getStoreInfo(storeId: number): Promise<StoreInfo | null> {
  const supabase = getServiceClient()
  if (!supabase) return null
  
  const { data } = await supabase
    .from("stores")
    .select("id, store_code, slug, store_name, status, plan")
    .eq("id", storeId)
    .single()

  return data || null
}

/**
 * Valida se a loja esta ativa
 */
export async function isStoreActive(storeId: number): Promise<boolean> {
  const store = await getStoreInfo(storeId)
  return store?.status === "active" || store?.status === "trial"
}
