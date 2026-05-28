/**
 * @module Store Service
 * @description Service para gerenciar configuracoes da loja
 * 
 * @architecture
 * - Usa StorageAdapter para persistencia
 * - Fonte unica de verdade para settings da loja
 * - Emite eventos para sincronizacao entre componentes
 * 
 * @example
 * import { storeService } from '@/lib/services'
 * 
 * // Carregar settings
 * const settings = await storeService.getSettings()
 * 
 * // Salvar settings
 * await storeService.saveSettings({ storeName: 'Minha Loja' })
 * 
 * // Ouvir mudancas
 * storeService.subscribe((settings) => console.log('Mudou!', settings))
 */

import { storage } from '@/lib/storage'
import type { StoreSettings, StoreStatus } from '@/types'
import { DEFAULT_STORE_SETTINGS, calculateStoreStatus } from '@/types'
import { STORAGE_KEYS } from '@/config/storage.keys'

// =============================================================================
// TYPES
// =============================================================================

type SettingsListener = (settings: StoreSettings) => void

// =============================================================================
// STORE SERVICE
// =============================================================================

class StoreService {
  private listeners: Set<SettingsListener> = new Set()
  private cachedSettings: StoreSettings | null = null
  private pollInterval: NodeJS.Timeout | null = null
  
  // ---------------------------------------------------------------------------
  // SETTINGS CRUD
  // ---------------------------------------------------------------------------
  
  /**
   * Carrega as configuracoes da loja
   * Fonte unica de verdade: SUPABASE via /api/store-settings
   */
  async getSettings(): Promise<StoreSettings> {
    try {
      // Buscar do Supabase via API
      const response = await fetch('/api/store-settings', { cache: 'no-store' })
      const data = await response.json()
      
      if (data.success && data.settings) {
        const s = data.settings
        
        // Converter formato da API para StoreSettings
        const settings: StoreSettings = {
          storeName: s.storeName || DEFAULT_STORE_SETTINGS.storeName,
          subtitle: s.subtitle || DEFAULT_STORE_SETTINGS.subtitle,
          slogan: s.slogan || DEFAULT_STORE_SETTINGS.slogan,
          storeOpen: s.storeOpen ?? DEFAULT_STORE_SETTINGS.storeOpen,
          manualControl: s.manualControl ?? DEFAULT_STORE_SETTINGS.manualControl,
          openTime: s.openTime || s.storeHours?.openTime || DEFAULT_STORE_SETTINGS.openTime,
          closeTime: s.closeTime || s.storeHours?.closeTime || DEFAULT_STORE_SETTINGS.closeTime,
          closedMessage: s.closedMessage || s.storeHours?.closedMessage || DEFAULT_STORE_SETTINGS.closedMessage,
          whatsapp: s.whatsappConfig?.number || s.whatsapp || DEFAULT_STORE_SETTINGS.whatsapp,
          instagram: s.instagram || DEFAULT_STORE_SETTINGS.instagram,
          address: s.address || DEFAULT_STORE_SETTINGS.address,
          deliveryEnabled: s.delivery?.enabled ?? DEFAULT_STORE_SETTINGS.deliveryEnabled,
          pickupEnabled: s.delivery?.pickupEnabled ?? DEFAULT_STORE_SETTINGS.pickupEnabled,
          minOrderValue: s.delivery?.minimumOrder ?? DEFAULT_STORE_SETTINGS.minOrderValue,
          pixEnabled: s.payment?.pixManualEnabled ?? DEFAULT_STORE_SETTINGS.pixEnabled,
          cardEnabled: s.payment?.cardEnabled ?? DEFAULT_STORE_SETTINGS.cardEnabled,
          cashEnabled: s.payment?.cashEnabled ?? DEFAULT_STORE_SETTINGS.cashEnabled,
          updatedAt: s.updatedAt || new Date().toISOString(),
        }
        
        this.cachedSettings = settings
        return settings
      }
      
      // Fallback para localStorage se API falhar
      const saved = await storage.get<StoreSettings>(STORAGE_KEYS.STORE_STATUS)
      if (saved) {
        this.cachedSettings = { ...DEFAULT_STORE_SETTINGS, ...saved }
        return this.cachedSettings
      }
      
      return DEFAULT_STORE_SETTINGS
    } catch (error) {
      console.error('[StoreService] Erro ao carregar settings:', error)
      
      // Fallback para localStorage em caso de erro
      try {
        const saved = await storage.get<StoreSettings>(STORAGE_KEYS.STORE_STATUS)
        if (saved) {
          this.cachedSettings = { ...DEFAULT_STORE_SETTINGS, ...saved }
          return this.cachedSettings
        }
      } catch {
        // Ignora erro do fallback
      }
      
      return DEFAULT_STORE_SETTINGS
    }
  }
  
  /**
   * Salva as configuracoes da loja
   * Salva no SUPABASE via /api/store-settings
   */
  async saveSettings(partial: Partial<StoreSettings>): Promise<StoreSettings> {
    try {
      const current = await this.getSettings()
      
      const updated: StoreSettings = {
        ...current,
        ...partial,
        updatedAt: new Date().toISOString()
      }
      
      // Salvar no Supabase via API
      const response = await fetch('/api/store-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: updated.storeName,
          subtitle: updated.subtitle,
          slogan: updated.slogan,
          store_open: updated.storeOpen,
          manual_control: updated.manualControl,
          open_time: updated.openTime,
          close_time: updated.closeTime,
          closed_message: updated.closedMessage,
          whatsapp: updated.whatsapp,
          instagram: updated.instagram,
          address: updated.address,
        })
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao salvar no Supabase')
      }
      
      // Tambem salva no localStorage como cache
      await storage.set(STORAGE_KEYS.STORE_STATUS, updated)
      
      this.cachedSettings = updated
      this.notifyListeners(updated)
      
      return updated
    } catch (error) {
      console.error('[StoreService] Erro ao salvar settings:', error)
      throw error
    }
  }
  
  /**
   * Atualiza campo especifico
   */
  async updateField<K extends keyof StoreSettings>(
    field: K, 
    value: StoreSettings[K]
  ): Promise<StoreSettings> {
    return this.saveSettings({ [field]: value } as Partial<StoreSettings>)
  }
  
  // ---------------------------------------------------------------------------
  // STORE STATUS (TEMPO REAL)
  // ---------------------------------------------------------------------------
  
  /**
   * Retorna status atual da loja (aberta/fechada)
   * Calculado a partir das settings + horario atual
   */
  async getStatus(): Promise<StoreStatus> {
    const settings = await this.getSettings()
    return calculateStoreStatus(settings)
  }
  
  /**
   * Verifica se a loja esta aberta
   */
  async isOpen(): Promise<boolean> {
    const status = await this.getStatus()
    return status.isOpen
  }
  
  /**
   * Abre/fecha a loja manualmente
   */
  async setOpen(isOpen: boolean): Promise<StoreSettings> {
    return this.saveSettings({ 
      storeOpen: isOpen, 
      manualControl: true 
    })
  }
  
  /**
   * Desativa controle manual (usa horario automatico)
   */
  async useAutomaticSchedule(): Promise<StoreSettings> {
    return this.saveSettings({ manualControl: false })
  }
  
  // ---------------------------------------------------------------------------
  // SUBSCRIPTIONS
  // ---------------------------------------------------------------------------
  
  /**
   * Inscreve-se para mudancas nas settings
   * Retorna funcao para cancelar inscricao
   */
  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener)
    
    // Envia valor atual imediatamente
    if (this.cachedSettings) {
      listener(this.cachedSettings)
    } else {
      this.getSettings().then(settings => listener(settings))
    }
    
    return () => this.listeners.delete(listener)
  }
  
  /**
   * Notifica todos os listeners
   */
  private notifyListeners(settings: StoreSettings): void {
    this.listeners.forEach(listener => {
      try {
        listener(settings)
      } catch (error) {
        console.error('[StoreService] Erro em listener:', error)
      }
    })
  }
  
  // ---------------------------------------------------------------------------
  // POLLING (SINCRONIZACAO)
  // ---------------------------------------------------------------------------
  
  /**
   * Inicia polling para detectar mudancas externas
   * Busca do Supabase periodicamente
   */
  startPolling(intervalMs: number = 30000): void {
    if (this.pollInterval) return
    
    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/store-settings', { cache: 'no-store' })
        const data = await response.json()
        
        if (data.success && data.settings) {
          const s = data.settings
          const settings: StoreSettings = {
            storeName: s.storeName || DEFAULT_STORE_SETTINGS.storeName,
            subtitle: s.subtitle || DEFAULT_STORE_SETTINGS.subtitle,
            slogan: s.slogan || DEFAULT_STORE_SETTINGS.slogan,
            storeOpen: s.storeOpen ?? DEFAULT_STORE_SETTINGS.storeOpen,
            manualControl: s.manualControl ?? DEFAULT_STORE_SETTINGS.manualControl,
            openTime: s.openTime || s.storeHours?.openTime || DEFAULT_STORE_SETTINGS.openTime,
            closeTime: s.closeTime || s.storeHours?.closeTime || DEFAULT_STORE_SETTINGS.closeTime,
            closedMessage: s.closedMessage || s.storeHours?.closedMessage || DEFAULT_STORE_SETTINGS.closedMessage,
            whatsapp: s.whatsappConfig?.number || s.whatsapp || DEFAULT_STORE_SETTINGS.whatsapp,
            instagram: s.instagram || DEFAULT_STORE_SETTINGS.instagram,
            address: s.address || DEFAULT_STORE_SETTINGS.address,
            deliveryEnabled: s.delivery?.enabled ?? DEFAULT_STORE_SETTINGS.deliveryEnabled,
            pickupEnabled: s.delivery?.pickupEnabled ?? DEFAULT_STORE_SETTINGS.pickupEnabled,
            minOrderValue: s.delivery?.minimumOrder ?? DEFAULT_STORE_SETTINGS.minOrderValue,
            pixEnabled: s.payment?.pixManualEnabled ?? DEFAULT_STORE_SETTINGS.pixEnabled,
            cardEnabled: s.payment?.cardEnabled ?? DEFAULT_STORE_SETTINGS.cardEnabled,
            cashEnabled: s.payment?.cashEnabled ?? DEFAULT_STORE_SETTINGS.cashEnabled,
            updatedAt: s.updatedAt || new Date().toISOString(),
          }
          
          // Verifica se mudou
          if (JSON.stringify(settings) !== JSON.stringify(this.cachedSettings)) {
            this.cachedSettings = settings
            this.notifyListeners(settings)
          }
        }
      } catch (error) {
        console.error('[StoreService] Erro no polling:', error)
      }
    }, intervalMs)
  }
  
  /**
   * Para o polling
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }
  
  // ---------------------------------------------------------------------------
  // RESET
  // ---------------------------------------------------------------------------
  
  /**
   * Reseta para configuracoes padrao
   */
  async reset(): Promise<StoreSettings> {
    await storage.remove(STORAGE_KEYS.STORE_STATUS)
    this.cachedSettings = null
    this.notifyListeners(DEFAULT_STORE_SETTINGS)
    return DEFAULT_STORE_SETTINGS
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const storeService = new StoreService()
