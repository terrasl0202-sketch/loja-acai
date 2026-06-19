/**
 * Client SERVER-SIDE com SERVICE ROLE.
 *
 * A tabela public.stores (e outras) tem RLS ativo. Para resolver a loja pelo
 * slug e ler dados isolados por store_id no servidor, usamos a service role key
 * (que ignora RLS por design). Este client NUNCA deve ser importado no frontend:
 * usa SUPABASE_SERVICE_ROLE_KEY, sem prefixo NEXT_PUBLIC_.
 *
 * Nao desabilita RLS nem cria policy publica: apenas roda no servidor com a
 * chave privilegiada, igual ao padrao ja usado em order-insert.ts e nas rotas
 * de API do projeto.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return null
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
