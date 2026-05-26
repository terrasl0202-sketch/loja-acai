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
   * Fonte unica de verdade: localStorage pk-store-status
   */
  async getSettings(): Promise<StoreSettings> {
    try {
      const saved = await storage.get<StoreSettings>(STORAGE_KEYS.STORE_STATUS)
      
      if (saved) {
        // Merge com defaults para garantir todos os campos
        this.cachedSettings = { ...DEFAULT_STORE_SETTINGS, ...saved }
        return this.cachedSettings
      }
      
      return DEFAULT_STORE_SETTINGS
    } catch (error) {
      console.error('[StoreService] Erro ao carregar settings:', error)
      return DEFAULT_STORE_SETTINGS
    }
  }
  
  /**
   * Salva as configuracoes da loja
   * Atualiza localStorage e notifica listeners
   */
  async saveSettings(partial: Partial<StoreSettings>): Promise<StoreSettings> {
    try {
      const current = await this.getSettings()
      
      const updated: StoreSettings = {
        ...current,
        ...partial,
        updatedAt: new Date().toISOString()
      }
      
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
   * Util quando admin e storefront estao em abas diferentes
   */
  startPolling(intervalMs: number = 2000): void {
    if (this.pollInterval) return
    
    this.pollInterval = setInterval(async () => {
      const settings = await this.getSettings()
      
      // Verifica se mudou
      if (JSON.stringify(settings) !== JSON.stringify(this.cachedSettings)) {
        this.cachedSettings = settings
        this.notifyListeners(settings)
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
