import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * DEBUG ENDPOINT - TEMPORÁRIO
 * Verifica conexão real com Supabase em produção
 * Acesse: /api/debug-supabase
 */
export async function GET() {
  const timestamp = new Date().toISOString()
  const buildLabel = "debug-v96"
  
  // 1. Verificar variáveis de ambiente (sem expor valores)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL_exists: !!supabaseUrl,
    NEXT_PUBLIC_SUPABASE_URL_hostname: supabaseUrl ? new URL(supabaseUrl).hostname : null,
    SUPABASE_SERVICE_ROLE_KEY_exists: !!serviceRoleKey,
    SUPABASE_SERVICE_ROLE_KEY_length: serviceRoleKey ? serviceRoleKey.length : 0,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_exists: !!anonKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_length: anonKey ? anonKey.length : 0,
  }
  
  // 2. Verificar ambiente Vercel
  const vercelEnv = {
    VERCEL_ENV: process.env.VERCEL_ENV || "not_set",
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 8) || "not_set",
    NODE_ENV: process.env.NODE_ENV || "not_set",
  }
  
  // 3. Tentar conectar ao Supabase
  const tableTests: Record<string, { success: boolean; count?: number; error?: string }> = {}
  
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({
      buildLabel,
      timestamp,
      envCheck,
      vercelEnv,
      connection: "FAILED - Missing env vars",
      tableTests: null,
    })
  }
  
  try {
    // Criar cliente com service role para bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
    
    // Testar cada tabela individualmente
    const tables = ["store_settings", "products", "neighborhoods", "orders"]
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true })
        
        if (error) {
          tableTests[table] = { 
            success: false, 
            error: `${error.code}: ${error.message}` 
          }
        } else {
          tableTests[table] = { 
            success: true, 
            count: count ?? 0 
          }
        }
      } catch (e) {
        tableTests[table] = { 
          success: false, 
          error: String(e) 
        }
      }
    }
    
    // Verificar se todas as tabelas funcionaram
    const allSuccess = Object.values(tableTests).every(t => t.success)
    
    return NextResponse.json({
      buildLabel,
      timestamp,
      envCheck,
      vercelEnv,
      connection: allSuccess ? "OK" : "PARTIAL",
      tableTests,
      summary: {
        tablesOk: Object.entries(tableTests).filter(([, v]) => v.success).map(([k]) => k),
        tablesFailed: Object.entries(tableTests).filter(([, v]) => !v.success).map(([k]) => k),
      }
    })
    
  } catch (connectionError) {
    return NextResponse.json({
      buildLabel,
      timestamp,
      envCheck,
      vercelEnv,
      connection: "FAILED",
      connectionError: String(connectionError),
      tableTests: null,
    })
  }
}
