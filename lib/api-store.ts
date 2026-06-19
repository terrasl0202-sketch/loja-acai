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

// Sentinela para tenant explicito porem invalido (slug inexistente).
// Nao casa com nenhuma loja real, prevenindo vazamento para a PK.
export const INVALID_STORE_ID = -1

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
    //    nunca confiando em um store_id cru vindo do cliente.
    //    SEGURANCA CRITICA: se o slug for EXPLICITO mas invalido/inexistente,
    //    NUNCA cair no fallback para a loja principal (isso causaria escrita/
    //    leitura cruzada). Retornamos INVALID_STORE_ID, que nao casa com nenhum
    //    registro (.eq('store_id', -1) => vazio) nem contamina a PK.
    const headerStoreSlug = request.headers.get("x-store-slug")
    if (headerStoreSlug) {
      const storeId = await getStoreIdBySlug(headerStoreSlug.trim())
      return storeId ?? INVALID_STORE_ID
    }

    // SEGURANCA: NUNCA mais confiar em store_id cru vindo do cliente.
    // Os antigos blocos de x-store-id / ?storeId / ?store_id foram REMOVIDOS
    // porque permitiam que qualquer cliente trocasse de loja forjando um header
    // ou query param (leitura/escrita/exclusao cruzada). O store_id agora so
    // pode vir de: (a) x-store-slug resolvido no servidor; (b) slug na URL;
    // (c) host/dominio. Operacoes cross-store do painel master usam a rota
    // autenticada /api/platform/store-mutate, que resolve o store_id pela
    // propria sessao da plataforma (nunca por este caminho).

    // 1. Tentar identificar pelo slug na URL (/loja/[slug]). Slug EXPLICITO e
    //    invalido nao pode cair na PK -> INVALID_STORE_ID.
    const pathParts = url.pathname.split("/")
    const lojaIndex = pathParts.indexOf("loja")
    if (lojaIndex !== -1 && pathParts[lojaIndex + 1]) {
      const slug = pathParts[lojaIndex + 1]
      const storeId = await getStoreIdBySlug(slug)
      return storeId ?? INVALID_STORE_ID
    }

    // 2. Tentar identificar pelo host (custom domain ou subdomain)
    const host = request.headers.get("host") || ""
    if (host && !host.includes("localhost") && !host.includes("vercel.app")) {
      const storeId = await getStoreIdByDomain(host)
      if (storeId) return storeId
    }
  }

  // Fallback APENAS quando NAO ha nenhum sinal de tenant (ex.: dominio raiz da
  // plataforma sem mapeamento de loja). Esse caminho representa a vitrine da
  // loja PRINCIPAL (store_code = 'main'), que e legitima para o dominio base.
  // Importante: tenant EXPLICITO porem invalido NAO chega aqui (retornou
  // INVALID_STORE_ID acima), entao isso nunca causa vazamento cross-tenant.
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
 * Busca o slug de uma loja pelo seu id. Usado para propagar o contexto de
 * tenant (x-store-slug) em chamadas internas servidor-a-servidor (ex.: confirm
 * -> gamification), preservando o isolamento por loja.
 */
export async function getStoreSlugById(storeId: number): Promise<string | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  const { data } = await supabase
    .from("stores")
    .select("slug")
    .eq("id", storeId)
    .single()

  return data?.slug || null
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
