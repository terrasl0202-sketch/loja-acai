import crypto from "crypto"
import type { NextRequest } from "next/server"
import { getServiceClient } from "@/lib/supabase/service"
import { getStoreIdFromRequest } from "@/lib/api-store"

/**
 * Autenticacao do admin POR LOJA com senha em HASH (nunca texto puro).
 *
 * Estrategia:
 *  - Cada loja guarda `admin_password_hash` em public.stores (SHA-256).
 *  - A senha enviada e comparada via hash contra a loja daquele slug/id.
 *  - Senha da Loja Teste so abre a Loja Teste; senha da PK so abre a PK.
 *  - Fallback transitorio: a ADMIN_PASSWORD global e aceita APENAS pela loja
 *    PRINCIPAL (store_code = 'main') e SOMENTE enquanto ela ainda nao tiver um
 *    hash definido. Assim que a senha da PK for definida no /platform, a senha
 *    global para de funcionar para login. Isso evita travar o admin durante a
 *    transicao (anti-lockout) sem manter a senha global ativa para sempre.
 *  - PLATFORM_PASSWORD continua exclusivo do painel master /platform.
 *
 * Nunca expoe service role nem hash ao frontend. Nunca desabilita RLS.
 */

// Pepper estatico de aplicacao: nao e segredo, apenas dificulta rainbow tables
// simples. A formula de hash deve ser IDENTICA no set (platform/stores) e no
// verify (aqui), senao a validacao nunca casa.
const PEPPER = "pkgostosuras::store-admin::v1"

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(`${PEPPER}:${password}`).digest("hex")
}

export interface StoreRow {
  id: number
  slug: string | null
  store_code: string | null
  store_name: string | null
  status: string | null
  admin_password_hash?: string | null
}

export interface StoreAuthResult {
  ok: boolean
  store?: StoreRow
  status: number
  error?: string
}

/**
 * Valida a senha contra a loja informada por id.
 */
export async function verifyStoreAdmin(storeId: number, password: unknown): Promise<StoreAuthResult> {
  if (!storeId || isNaN(storeId) || storeId <= 0) {
    return { ok: false, status: 400, error: "storeId invalido" }
  }
  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, status: 401, error: "Acesso negado" }
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return { ok: false, status: 500, error: "Erro de conexao" }
  }

  // select('*') evita erro caso a coluna ainda nao exista no schema
  const { data: store, error } = await supabase.from("stores").select("*").eq("id", storeId).single()

  if (error || !store) {
    return { ok: false, status: 404, error: "Loja nao encontrada" }
  }

  const row = store as StoreRow
  const hash = row.admin_password_hash
  const isMainStore = row.store_code === "main"
  const globalPassword = process.env.ADMIN_PASSWORD

  // 1) Hash definido para a loja => valida SOMENTE contra o hash (global ignorada)
  if (hash && hash.length > 0) {
    if (hashPassword(password) === hash) {
      return { ok: true, store: row, status: 200 }
    }
    return { ok: false, status: 401, error: "Acesso negado" }
  }

  // 2) Sem hash: bootstrap anti-lockout SOMENTE para a loja principal
  if (isMainStore && globalPassword && password === globalPassword) {
    return { ok: true, store: row, status: 200 }
  }

  // 3) Loja secundaria sem hash => precisa definir a senha no /platform
  return { ok: false, status: 401, error: "Acesso negado" }
}

/**
 * Resolve a loja a partir do request (prioriza x-store-slug, depois host) e
 * valida a senha contra o hash daquela loja. Usado pelas rotas /api/* que o
 * admin chama (login e operacoes de dados).
 */
export async function verifyAdminForRequest(
  request: NextRequest | Request,
  password: unknown,
): Promise<{ ok: boolean; storeId: number; status: number }> {
  const storeId = await getStoreIdFromRequest(request)
  const result = await verifyStoreAdmin(storeId, password)
  return { ok: result.ok, storeId, status: result.status }
}
