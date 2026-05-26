import { createBrowserClient } from '@supabase/ssr'

/**
 * Verifica se as variaveis de ambiente do Supabase estao configuradas
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Cria um cliente Supabase para uso no browser
 * Retorna null se as variaveis de ambiente nao estiverem configuradas
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Validacao das envs
  if (!url || !anonKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Supabase] Variaveis de ambiente nao configuradas.',
        '\n- NEXT_PUBLIC_SUPABASE_URL:', url ? 'OK' : 'FALTANDO',
        '\n- NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey ? 'OK' : 'FALTANDO',
        '\nUsando fallback local (localStorage/FALLBACK_NEIGHBORHOODS)'
      )
    }
    return null
  }
  
  return createBrowserClient(url, anonKey)
}

// Singleton para evitar multiplas instancias
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

/**
 * Retorna um cliente Supabase singleton (reutiliza a mesma instancia)
 * Retorna null se as envs nao estiverem configuradas
 */
export function getSupabaseClient() {
  if (clientInstance) return clientInstance
  
  const client = createClient()
  if (client) {
    clientInstance = client
    if (process.env.NODE_ENV === 'development') {
      console.log('[Supabase] Cliente inicializado com sucesso')
    }
  }
  
  return clientInstance
}
