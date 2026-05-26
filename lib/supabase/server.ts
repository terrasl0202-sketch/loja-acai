import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Verifica se as variaveis de ambiente do Supabase estao configuradas (server-side)
 */
export function isSupabaseConfiguredServer(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Cria um cliente Supabase para uso no servidor
 * Retorna null se as variaveis de ambiente nao estiverem configuradas
 * 
 * IMPORTANTE: Nao coloque este cliente em uma variavel global.
 * Sempre crie um novo cliente dentro de cada funcao.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Validacao das envs
  if (!url || !anonKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Supabase Server] Variaveis de ambiente nao configuradas.',
        '\nUsando fallback local.'
      )
    }
    return null
  }
  
  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
