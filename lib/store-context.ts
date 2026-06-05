import { createClient } from "@/lib/supabase"
import { NextRequest } from "next/server"

// Tipo da loja
export interface Store {
  id: number
  store_code: string
  slug: string
  store_name: string
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  plan: 'starter' | 'plus' | 'pro' | 'elite'
  status: 'active' | 'suspended' | 'trial' | 'cancelled'
  custom_domain: string | null
  subdomain: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}

// Cache simples para evitar queries repetidas
let mainStoreCache: Store | null = null
let mainStoreCacheTime = 0
const CACHE_TTL = 60000 // 1 minuto

/**
 * Busca a loja main (padrao) do sistema
 */
async function getMainStore(): Promise<Store | null> {
  // Verificar cache
  if (mainStoreCache && Date.now() - mainStoreCacheTime < CACHE_TTL) {
    return mainStoreCache
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("store_code", "main")
    .single()

  if (error || !data) {
    console.error("[store-context] Erro ao buscar loja main:", error)
    return null
  }

  // Atualizar cache
  mainStoreCache = data
  mainStoreCacheTime = Date.now()

  return data
}

/**
 * Identifica a loja atual baseado na requisicao
 * 
 * Ordem de prioridade:
 * 1. custom_domain (dominio personalizado)
 * 2. subdomain (subdominio)
 * 3. slug na URL (/loja/[slug] ou /admin/[slug])
 * 4. fallback para loja main
 */
export async function getCurrentStore(request?: NextRequest | Request | null): Promise<Store> {
  const supabase = createClient()
  
  // Se tiver request, tentar identificar por host/URL
  if (request) {
    const url = new URL(request.url)
    const host = request.headers.get("host") || ""
    const pathname = url.pathname

    // 1. Verificar custom_domain
    if (host && !host.includes("localhost") && !host.includes("vercel")) {
      const { data: storeByDomain } = await supabase
        .from("stores")
        .select("*")
        .eq("custom_domain", host)
        .eq("status", "active")
        .single()

      if (storeByDomain) {
        return storeByDomain
      }
    }

    // 2. Verificar subdomain (ex: loja.pkgostosuras.shop)
    const subdomain = host.split(".")[0]
    if (subdomain && subdomain !== "www" && subdomain !== "localhost") {
      const { data: storeBySubdomain } = await supabase
        .from("stores")
        .select("*")
        .eq("subdomain", subdomain)
        .eq("status", "active")
        .single()

      if (storeBySubdomain) {
        return storeBySubdomain
      }
    }

    // 3. Verificar slug na URL (/loja/[slug] ou /admin/[slug])
    const lojaMatch = pathname.match(/^\/loja\/([^\/]+)/)
    const adminMatch = pathname.match(/^\/admin\/([^\/]+)/)
    const slug = lojaMatch?.[1] || adminMatch?.[1]

    if (slug && slug !== "main") {
      const { data: storeBySlug } = await supabase
        .from("stores")
        .select("*")
        .eq("slug", slug)
        .single()

      if (storeBySlug) {
        return storeBySlug
      }
    }

    // 4. Verificar parametro storeId na query string
    const storeIdParam = url.searchParams.get("storeId")
    if (storeIdParam) {
      const { data: storeById } = await supabase
        .from("stores")
        .select("*")
        .eq("id", parseInt(storeIdParam))
        .single()

      if (storeById) {
        return storeById
      }
    }
  }

  // Fallback: retornar loja main
  const mainStore = await getMainStore()
  if (!mainStore) {
    // Fallback absoluto: criar objeto minimo
    return {
      id: 1,
      store_code: "main",
      slug: "pkgostosuras",
      store_name: "PK Gostosuras",
      owner_name: null,
      owner_email: null,
      owner_phone: null,
      plan: "elite",
      status: "active",
      custom_domain: null,
      subdomain: null,
      logo_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  return mainStore
}

/**
 * Retorna apenas o ID da loja atual
 */
export async function getCurrentStoreId(request?: NextRequest | Request | null): Promise<number> {
  const store = await getCurrentStore(request)
  return store.id
}

/**
 * Busca uma loja por slug
 */
export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .single()

  if (error) {
    return null
  }

  return data
}

/**
 * Busca uma loja por ID
 */
export async function getStoreById(id: number): Promise<Store | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    return null
  }

  return data
}

/**
 * Lista todas as lojas ativas
 */
export async function listActiveStores(): Promise<Store[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("status", "active")
    .order("store_name")

  if (error) {
    console.error("[store-context] Erro ao listar lojas:", error)
    return []
  }

  return data || []
}

/**
 * Verifica se a loja esta ativa
 */
export function isStoreActive(store: Store): boolean {
  return store.status === "active" || store.status === "trial"
}

/**
 * Limpa o cache da loja main (usar apos atualizacoes)
 */
export function clearStoreCache() {
  mainStoreCache = null
  mainStoreCacheTime = 0
}
