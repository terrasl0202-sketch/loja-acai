/**
 * Servico para gerenciar status da loja (aberta/fechada)
 * 
 * Hierarquia de persistencia:
 * 1. Supabase (se configurado)
 * 2. localStorage (fallback)
 * 3. Horario automatico (ultimo fallback)
 * 
 * NAO depende do Vercel Blob
 */

import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client'

// Chave do localStorage para fallback
const LOCAL_STORE_STATUS_KEY = 'pk-store-status'

export interface StoreStatus {
  storeOpen: boolean
  manualControl: boolean
  updatedAt: string
  source: 'supabase' | 'local' | 'auto'
}

export interface StoreStatusResult {
  data: StoreStatus
  error: string | null
}

/**
 * Horarios de funcionamento padrao
 */
const DEFAULT_HOURS = {
  weekday: { open: 14, close: 22 },  // Seg-Sex: 14h-22h
  weekend: { open: 14, close: 22 }   // Sab-Dom: 14h-22h
}

/**
 * Verifica se esta dentro do horario de funcionamento
 */
function isWithinBusinessHours(): boolean {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay() // 0 = Domingo, 6 = Sabado
  
  const isWeekend = day === 0 || day === 6
  const hours = isWeekend ? DEFAULT_HOURS.weekend : DEFAULT_HOURS.weekday
  
  return hour >= hours.open && hour < hours.close
}

/**
 * Busca o status da loja
 * Prioridade: Supabase > localStorage > horario automatico
 */
export async function fetchStoreStatus(): Promise<StoreStatusResult> {
  // 1. Tenta Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('store_config')
          .select('*')
          .eq('id', 'main')
          .single()
        
        if (!error && data) {
          // Se controle manual esta ativo, usa o status salvo
          if (data.manual_control) {
            return {
              data: {
                storeOpen: data.store_open,
                manualControl: true,
                updatedAt: data.updated_at,
                source: 'supabase'
              },
              error: null
            }
          }
          // Senao, usa horario automatico
          return {
            data: {
              storeOpen: isWithinBusinessHours(),
              manualControl: false,
              updatedAt: new Date().toISOString(),
              source: 'auto'
            },
            error: null
          }
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[StoreStatus] Erro ao buscar do Supabase:', err)
      }
    }
  }

  // 2. Tenta localStorage
  const localStatus = getLocalStoreStatus()
  if (localStatus) {
    if (localStatus.manualControl) {
      return {
        data: localStatus,
        error: null
      }
    }
  }

  // 3. Fallback para horario automatico
  return {
    data: {
      storeOpen: isWithinBusinessHours(),
      manualControl: false,
      updatedAt: new Date().toISOString(),
      source: 'auto'
    },
    error: null
  }
}

/**
 * Atualiza o status da loja
 * Salva no Supabase E no localStorage (para garantir)
 */
export async function updateStoreStatus(
  storeOpen: boolean,
  manualControl: boolean
): Promise<{ success: boolean; error: string | null }> {
  const now = new Date().toISOString()
  
  // Sempre salva no localStorage como fallback
  saveLocalStoreStatus({
    storeOpen,
    manualControl,
    updatedAt: now,
    source: 'local'
  })

  // Tenta salvar no Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient()
      if (supabase) {
        const { error } = await supabase
          .from('store_config')
          .upsert({
            id: 'main',
            store_open: storeOpen,
            manual_control: manualControl,
            updated_at: now
          })
        
        if (error) {
          console.error('[StoreStatus] Erro ao salvar no Supabase:', error.message)
          // Nao retorna erro - localStorage ja salvou
          return { success: true, error: null }
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[StoreStatus] Status salvo no Supabase:', { storeOpen, manualControl })
        }
        
        return { success: true, error: null }
      }
    } catch (err) {
      console.error('[StoreStatus] Excecao ao salvar no Supabase:', err)
      // Nao retorna erro - localStorage ja salvou
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[StoreStatus] Status salvo apenas no localStorage:', { storeOpen, manualControl })
  }

  return { success: true, error: null }
}

/**
 * Abre a loja manualmente
 */
export async function openStore(): Promise<{ success: boolean; error: string | null }> {
  return updateStoreStatus(true, true)
}

/**
 * Fecha a loja manualmente
 */
export async function closeStore(): Promise<{ success: boolean; error: string | null }> {
  return updateStoreStatus(false, true)
}

/**
 * Volta para controle automatico por horario
 */
export async function setAutoControl(): Promise<{ success: boolean; error: string | null }> {
  return updateStoreStatus(isWithinBusinessHours(), false)
}

// ============ Funcoes de localStorage ============

function getLocalStoreStatus(): StoreStatus | null {
  try {
    if (typeof window === 'undefined') return null
    
    const stored = localStorage.getItem(LOCAL_STORE_STATUS_KEY)
    if (!stored) return null
    
    const parsed = JSON.parse(stored)
    return {
      storeOpen: parsed.storeOpen,
      manualControl: parsed.manualControl,
      updatedAt: parsed.updatedAt,
      source: 'local'
    }
  } catch {
    return null
  }
}

function saveLocalStoreStatus(status: StoreStatus): void {
  try {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(LOCAL_STORE_STATUS_KEY, JSON.stringify(status))
  } catch (err) {
    console.error('[StoreStatus] Erro ao salvar no localStorage:', err)
  }
}

/**
 * Limpa o status local (para testes)
 */
export function clearLocalStoreStatus(): void {
  try {
    if (typeof window === 'undefined') return
    localStorage.removeItem(LOCAL_STORE_STATUS_KEY)
  } catch {
    // ignora
  }
}
