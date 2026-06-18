"use client"

import { useState, useEffect } from "react"
import { Store, AlertCircle, Loader2, Clock, Phone, MapPin } from "lucide-react"

// ============================================================
// ADMIN STORE SETTINGS v94
// CORRIGIDO: Sem autosave - apenas estado local
// Salvamento via botao Salvar geral do Admin
// ============================================================

interface StoreSettingsData {
  storeName: string
  subtitle: string
  slogan: string
  closedMessage: string
  whatsapp: string
  address: string
  openTime: string
  closeTime: string
  storeOpen: boolean
  manualControl: boolean
}

interface AdminStoreSettingsProps {
  settings: StoreSettingsData
  isLoading: boolean
  onSettingsChange: (settings: StoreSettingsData) => void
  onPendingChanges?: (hasChanges: boolean, pendingSettings: StoreSettingsData) => void
}

export function AdminStoreSettings({ settings, isLoading, onSettingsChange, onPendingChanges }: AdminStoreSettingsProps) {
  // Estado local do formulario - NAO salva automaticamente
  const [localValues, setLocalValues] = useState<StoreSettingsData>({
    storeName: '',
    subtitle: '',
    slogan: '',
    closedMessage: '',
    whatsapp: '',
    address: '',
    openTime: '',
    closeTime: '',
    storeOpen: false,
    manualControl: false,
  })
  
  // Flag para saber se há mudanças pendentes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Sincroniza com props apenas no load inicial ou quando settings muda externamente
  useEffect(() => {
    if (!isLoading && settings) {
      setLocalValues({
        storeName: settings.storeName || '',
        subtitle: settings.subtitle || '',
        slogan: settings.slogan || '',
        closedMessage: settings.closedMessage || '',
        whatsapp: settings.whatsapp || '',
        address: settings.address || '',
        openTime: settings.openTime || '',
        closeTime: settings.closeTime || '',
        storeOpen: settings.storeOpen ?? false,
        manualControl: settings.manualControl ?? false,
      })
      setHasUnsavedChanges(false)
    }
  }, [settings, isLoading])

  // Handler para mudanca de campo - atualiza APENAS estado local
  // NAO propaga para o pai imediatamente (header nao muda enquanto digita)
  // Usa onPendingChanges para que handleSave tenha acesso aos valores editados
  const handleFieldChange = (field: keyof StoreSettingsData, value: string | boolean) => {
    const newValues = { ...localValues, [field]: value }
    setLocalValues(newValues)
    setHasUnsavedChanges(true)
    
    // Informa o pai sobre mudanças pendentes (para handleSave usar)
    // MAS NAO atualiza o header - o pai deve armazenar separadamente
    if (onPendingChanges) {
      onPendingChanges(true, newValues)
    }
  }

  // Toggle aberto/fechado
  const handleToggleOpen = () => {
    handleFieldChange('storeOpen', !localValues.storeOpen)
  }

  // Toggle controle manual
  const handleToggleManualControl = () => {
    handleFieldChange('manualControl', !localValues.manualControl)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Store className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">Configuracoes da Loja</h2>
          <p className="text-xs text-muted-foreground">Gerencie as informacoes principais</p>
        </div>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      </div>

      <div className="space-y-4">
        {/* Nome da Loja */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome da Loja</label>
          <input
            type="text"
            value={localValues.storeName}
            onChange={(e) => handleFieldChange('storeName', e.target.value)}
            disabled={isLoading}
            placeholder="Ex: Acai da Terra"
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50"
          />
        </div>

        {/* Subtitulo */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subtitulo</label>
          <input
            type="text"
            value={localValues.subtitle}
            onChange={(e) => handleFieldChange('subtitle', e.target.value)}
            disabled={isLoading}
            placeholder="Ex: Delivery de Acai"
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50"
          />
        </div>

        {/* Slogan */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Slogan</label>
          <input
            type="text"
            value={localValues.slogan}
            onChange={(e) => handleFieldChange('slogan', e.target.value)}
            disabled={isLoading}
            placeholder="Ex: O melhor acai da cidade"
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50"
          />
        </div>

        {/* Status da Loja */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-secondary/30 to-secondary/10 rounded-xl border border-border/30">
          <div>
            <p className="font-semibold text-foreground text-sm">Status da Loja</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {localValues.storeOpen ? "Loja esta ABERTA" : "Loja esta FECHADA"}
            </p>
          </div>
          <button
            onClick={handleToggleOpen}
            disabled={isLoading}
            className={`w-14 h-7 rounded-full transition-all shadow-inner disabled:opacity-50 ${
              localValues.storeOpen ? "bg-green-500 shadow-green-600/30" : "bg-red-500/80 shadow-red-600/30"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                localValues.storeOpen ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Controle Manual */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-secondary/30 to-secondary/10 rounded-xl border border-border/30">
          <div>
            <p className="font-semibold text-foreground text-sm">Controle Manual</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ignorar horario automatico</p>
          </div>
          <button
            onClick={handleToggleManualControl}
            disabled={isLoading}
            className={`w-14 h-7 rounded-full transition-all shadow-inner disabled:opacity-50 ${
              localValues.manualControl ? "bg-primary shadow-primary/30" : "bg-secondary shadow-black/20"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                localValues.manualControl ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Horarios de Funcionamento */}
        <div className="p-4 bg-gradient-to-r from-secondary/30 to-secondary/10 rounded-xl border border-border/30 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <p className="font-semibold text-foreground text-sm">Horario de Funcionamento</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Abertura</label>
              <input
                type="time"
                value={localValues.openTime}
                onChange={(e) => handleFieldChange('openTime', e.target.value)}
                disabled={isLoading}
                className="w-full mt-1 px-3 py-2 bg-background/50 border border-border/50 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fechamento</label>
              <input
                type="time"
                value={localValues.closeTime}
                onChange={(e) => handleFieldChange('closeTime', e.target.value)}
                disabled={isLoading}
                className="w-full mt-1 px-3 py-2 bg-background/50 border border-border/50 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Horario atual: {localValues.openTime || '--:--'} as {localValues.closeTime || '--:--'}
          </p>
        </div>

        {/* Mensagem quando fechado */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensagem quando Fechado</label>
          <textarea
            value={localValues.closedMessage}
            onChange={(e) => handleFieldChange('closedMessage', e.target.value)}
            disabled={isLoading}
            rows={2}
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50 resize-none"
          />
        </div>

        {/* Contato - WhatsApp */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Phone className="w-3 h-3" /> WhatsApp
          </label>
          <input
            type="text"
            value={localValues.whatsapp}
            onChange={(e) => handleFieldChange('whatsapp', e.target.value)}
            disabled={isLoading}
            placeholder="5511999999999"
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground mt-1">Formato: 5511999999999 (com codigo do pais)</p>
        </div>

        {/* Contato - Endereco */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Endereco
          </label>
          <input
            type="text"
            value={localValues.address}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            disabled={isLoading}
            placeholder="Rua Principal, 123 - Centro"
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50"
          />
        </div>

        {/* Aviso v94 */}
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Admin v94 - Supabase Only</p>
              <p className="text-sm text-muted-foreground">
                As alteracoes so sao salvas ao clicar no botao Salvar geral.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
