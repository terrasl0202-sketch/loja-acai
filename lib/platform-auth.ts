import { getServiceClient } from "@/lib/supabase/service"

/**
 * Autenticacao do admin POR LOJA.
 *
 * Estrategia (transicao segura):
 *  - Le a loja via service role (RLS ativo, sem policy publica).
 *  - Se a coluna `admin_password` existir e estiver preenchida para a loja,
 *    valida a senha contra ela (senha por loja - alvo do SaaS).
 *  - Caso contrario, faz fallback para a ADMIN_PASSWORD global (transicao),
 *    para nao quebrar enquanto a coluna nao foi criada/preenchida.
 *
 * Nunca expoe service role nem senha ao frontend. Nunca desabilita RLS.
 */
export interface StoreRow {
  id: number
  slug: string | null
  store_code: string | null
  store_name: string | null
  status: string | null
  admin_password?: string | null
}

export interface StoreAuthResult {
  ok: boolean
  store?: StoreRow
  status: number
  error?: string
}

export async function verifyStoreAdmin(
  storeId: number,
  password: unknown,
): Promise<StoreAuthResult> {
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

  // select('*') evita erro caso a coluna admin_password ainda nao exista
  const { data: store, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .single()

  if (error || !store) {
    return { ok: false, status: 404, error: "Loja nao encontrada" }
  }

  const perStorePassword = (store as StoreRow).admin_password
  const globalPassword = process.env.ADMIN_PASSWORD

  // 1) Senha por loja, se definida
  if (perStorePassword && perStorePassword.length > 0) {
    if (password === perStorePassword) {
      return { ok: true, store: store as StoreRow, status: 200 }
    }
    return { ok: false, status: 401, error: "Acesso negado" }
  }

  // 2) Fallback transitorio: senha global
  if (globalPassword && password === globalPassword) {
    return { ok: true, store: store as StoreRow, status: 200 }
  }

  return { ok: false, status: 401, error: "Acesso negado" }
}
