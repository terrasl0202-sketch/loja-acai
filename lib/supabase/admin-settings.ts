import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client'

// ============================================================
// ADMIN SETTINGS SERVICE
// Gerencia TODAS as configuracoes do painel admin via Supabase
// NAO usa Vercel Blob - apenas Supabase + localStorage fallback
// ============================================================

const LOCAL_SETTINGS_KEY = 'pk-admin-settings'

export interface AdminSettings {
  id: string
  storeName: string
  storeOpen: boolean
  manualControl: boolean
  openingTime: string
  closingTime: string
  deliveryFee: number
  minimumOrder: number
  whatsappNumber: string
  pixKey: string
  address: string
  closedMessage: string
  updatedAt: string
}

export interface AdminSettingsResult {
  data: AdminSettings
  source: 'supabase' | 'local' | 'default'
  error: string | null
}

// Valores padrao
const DEFAULT_SETTINGS: AdminSettings = {
  id: 'main',
  storeName: 'Acai da Terra',
  storeOpen: true,
  manualControl: false,
  openingTime: '14:00',
  closingTime: '22:00',
  deliveryFee: 5.00,
  minimumOrder: 15.00,
  whatsappNumber: '',
  pixKey: '',
  address: '',
  closedMessage: 'Estamos fechados no momento',
  updatedAt: new Date().toISOString()
}

/**
 * Converte dados do Supabase para o formato da aplicacao
 */
function fromSupabase(row: Record<string, unknown>): AdminSettings {
  return {
    id: String(row.id || 'main'),
    storeName: String(row.store_name || DEFAULT_SETTINGS.storeName),
    storeOpen: Boolean(row.store_open),
    manualControl: Boolean(row.manual_control),
    openingTime: String(row.opening_time || DEFAULT_SETTINGS.openingTime),
    closingTime: String(row.closing_time || DEFAULT_SETTINGS.closingTime),
    deliveryFee: Number(row.delivery_fee) || DEFAULT_SETTINGS.deliveryFee,
    minimumOrder: Number(row.minimum_order) || DEFAULT_SETTINGS.minimumOrder,
    whatsappNumber: String(row.whatsapp_number || ''),
    pixKey: String(row.pix_key || ''),
    address: String(row.address || ''),
    closedMessage: String(row.closed_message || DEFAULT_SETTINGS.closedMessage),
    updatedAt: String(row.updated_at || new Date().toISOString())
  }
}

/**
 * Converte dados da aplicacao para o formato do Supabase
 */
function toSupabase(settings: Partial<AdminSettings>): Record<string, unknown> {
  const data: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }
  
  if (settings.storeName !== undefined) data.store_name = settings.storeName
  if (settings.storeOpen !== undefined) data.store_open = settings.storeOpen
  if (settings.manualControl !== undefined) data.manual_control = settings.manualControl
  if (settings.openingTime !== undefined) data.opening_time = settings.openingTime
  if (settings.closingTime !== undefined) data.closing_time = settings.closingTime
  if (settings.deliveryFee !== undefined) data.delivery_fee = settings.deliveryFee
  if (settings.minimumOrder !== undefined) data.minimum_order = settings.minimumOrder
  if (settings.whatsappNumber !== undefined) data.whatsapp_number = settings.whatsappNumber
  if (settings.pixKey !== undefined) data.pix_key = settings.pixKey
  if (settings.address !== undefined) data.address = settings.address
  if (settings.closedMessage !== undefined) data.closed_message = settings.closedMessage
  
  return data
}

/**
 * Salva settings no localStorage (fallback)
 */
function saveToLocal(settings: AdminSettings): void {
  try {
    if (typeof window === 'undefined') return
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Ignorar erro
  }
}

/**
 * Carrega settings do localStorage
 */
function loadFromLocal(): AdminSettings | null {
  try {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem(LOCAL_SETTINGS_KEY)
    if (saved) {
      return JSON.parse(saved) as AdminSettings
    }
  } catch {
    // Ignorar erro
  }
  return null
}

/**
 * Busca configuracoes do admin
 * Prioridade: Supabase > localStorage > default
 */
export async function fetchAdminSettings(): Promise<AdminSettingsResult> {
  // Tenta Supabase primeiro
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('*')
          .eq('id', 'main')
          .single()
        
        if (!error && data) {
          const settings = fromSupabase(data)
          // Salva localmente como backup
          saveToLocal(settings)
          return { data: settings, source: 'supabase', error: null }
        }
      }
    } catch (err) {
      console.warn('[AdminSettings] Erro ao buscar do Supabase:', err)
    }
  }
  
  // Fallback: localStorage
  const localSettings = loadFromLocal()
  if (localSettings) {
    return { data: localSettings, source: 'local', error: null }
  }
  
  // Fallback final: valores padrao
  return { data: DEFAULT_SETTINGS, source: 'default', error: null }
}

/**
 * Salva configuracoes do admin
 * Salva em Supabase + localStorage
 */
export async function saveAdminSettings(settings: Partial<AdminSettings>): Promise<{
  success: boolean
  savedTo: 'supabase' | 'local'
  error: string | null
}> {
  // Carrega settings atuais para merge
  const { data: currentSettings } = await fetchAdminSettings()
  const mergedSettings: AdminSettings = {
    ...currentSettings,
    ...settings,
    updatedAt: new Date().toISOString()
  }
  
  // Sempre salva localmente primeiro
  saveToLocal(mergedSettings)
  
  // Tenta salvar no Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient()
      if (supabase) {
        const { error } = await supabase
          .from('admin_settings')
          .upsert({
            id: 'main',
            ...toSupabase(mergedSettings)
          })
        
        if (!error) {
          return { success: true, savedTo: 'supabase', error: null }
        }
        console.warn('[AdminSettings] Erro ao salvar no Supabase:', error.message)
      }
    } catch (err) {
      console.warn('[AdminSettings] Excecao ao salvar:', err)
    }
  }
  
  // Fallback: salvou apenas localmente
  return { success: true, savedTo: 'local', error: null }
}

/**
 * Atualiza apenas o status da loja (aberta/fechada)
 */
export async function updateStoreOpenStatus(
  storeOpen: boolean, 
  manualControl?: boolean
): Promise<{ success: boolean; savedTo: 'supabase' | 'local' }> {
  const updates: Partial<AdminSettings> = { storeOpen }
  if (manualControl !== undefined) {
    updates.manualControl = manualControl
  }
  
  const result = await saveAdminSettings(updates)
  return { success: result.success, savedTo: result.savedTo }
}

/**
 * Busca apenas o status da loja (para a loja publica)
 * Mais leve que fetchAdminSettings completo
 */
export async function fetchStoreOpenStatus(): Promise<{
  storeOpen: boolean
  manualControl: boolean
  openingTime: string
  closingTime: string
  source: 'supabase' | 'local' | 'default'
}> {
  const { data, source } = await fetchAdminSettings()
  return {
    storeOpen: data.storeOpen,
    manualControl: data.manualControl,
    openingTime: data.openingTime,
    closingTime: data.closingTime,
    source
  }
}

// Re-exporta DEFAULT_SETTINGS para uso externo
export { DEFAULT_SETTINGS }
