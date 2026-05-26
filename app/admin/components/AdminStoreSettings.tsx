"use client"

import { useState, useEffect, useCallback } from "react"
import { Store, AlertCircle, Loader2, Check, Wifi, WifiOff, Database } from "lucide-react"
import { 
  fetchAdminSettings, 
  saveAdminSettings, 
  updateStoreOpenStatus,
  type AdminSettings 
} from "@/lib/supabase"

// ============================================================
// ADMIN STORE SETTINGS
// Gerencia configuracoes da loja via Supabase
// NAO usa Vercel Blob - apenas Supabase + localStorage fallback
// ============================================================

interface AdminStoreSettingsProps {
  onSettingsLoaded?: (settings: AdminSettings) => void
}

export function AdminStoreSettings({ onSettingsLoaded }: AdminStoreSettingsProps) {
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [savedTo, setSavedTo] = useState<'supabase' | 'local' | null>(null)
  const [source, setSource] = useState<'supabase' | 'local' | 'default'>('default')

  // Carrega as configuracoes ao montar
  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const { data, source: dataSource } = await fetchAdminSettings()
      setSettings(data)
      setSource(dataSource)
      onSettingsLoaded?.(data)
    } catch (err) {
      console.error('[AdminStore] Erro ao carregar:', err)
    } finally {
      setLoading(false)
    }
  }, [onSettingsLoaded])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Toggle status da loja (aberta/fechada)
  async function handleToggleOpen() {
    if (!settings || saving) return
    
    setSaving(true)
    const newOpen = !settings.storeOpen
    
    // Atualiza UI imediatamente (otimista)
    setSettings(prev => prev ? { ...prev, storeOpen: newOpen, manualControl: true } : null)
    
    try {
      const result = await updateStoreOpenStatus(newOpen, true)
      setSavedTo(result.savedTo)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error('[AdminStore] Erro ao salvar status:', err)
      // Reverte em caso de erro
      setSettings(prev => prev ? { ...prev, storeOpen: !newOpen } : null)
    } finally {
      setSaving(false)
    }
  }

  // Toggle controle manual
  async function handleToggleManual() {
    if (!settings || saving) return
    
    setSaving(true)
    const newManual = !settings.manualControl
    
    // Atualiza UI imediatamente (otimista)
    setSettings(prev => prev ? { ...prev, manualControl: newManual } : null)
    
    try {
      const result = await updateStoreOpenStatus(settings.storeOpen, newManual)
      setSavedTo(result.savedTo)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error('[AdminStore] Erro ao salvar controle manual:', err)
      setSettings(prev => prev ? { ...prev, manualControl: !newManual } : null)
    } finally {
      setSaving(false)
    }
  }

  // Salvar nome da loja
  async function handleSaveStoreName(name: string) {
    if (!settings || saving) return
    
    setSaving(true)
    setSettings(prev => prev ? { ...prev, storeName: name } : null)
    
    try {
      const result = await saveAdminSettings({ storeName: name })
      setSavedTo(result.savedTo)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error('[AdminStore] Erro ao salvar nome:', err)
    } finally {
      setSaving(false)
    }
  }

  const sourceLabels = {
    supabase: { text: 'Supabase', icon: Database, color: 'text-green-400' },
    local: { text: 'Local', icon: WifiOff, color: 'text-yellow-400' },
    default: { text: 'Padrao', icon: Store, color: 'text-blue-400' }
  }

  const currentSource = sourceLabels[source]

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
        {saveSuccess && (
          <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
            <Check className="w-4 h-4" />
            {savedTo === 'supabase' ? 'Salvo no Supabase' : 'Salvo localmente'}
          </div>
        )}
        {saving && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      </div>

      <div className="space-y-4">
        {/* Nome da Loja */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome da Loja</label>
          <input
            type="text"
            value={settings?.storeName || ""}
            onChange={(e) => setSettings(prev => prev ? { ...prev, storeName: e.target.value } : null)}
            onBlur={(e) => handleSaveStoreName(e.target.value)}
            disabled={loading}
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50"
          />
        </div>

        {/* Status da Loja */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-secondary/30 to-secondary/10 rounded-xl border border-border/30">
          <div>
            <p className="font-semibold text-foreground text-sm">Status da Loja</p>
            {loading ? (
              <p className="text-xs text-muted-foreground mt-0.5">Carregando...</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                {settings?.storeOpen ? "Loja esta ABERTA" : "Loja esta FECHADA"}
              </p>
            )}
          </div>
          <button
            onClick={handleToggleOpen}
            disabled={loading || saving}
            className={`w-14 h-7 rounded-full transition-all shadow-inner disabled:opacity-50 ${
              settings?.storeOpen ? "bg-green-500 shadow-green-600/30" : "bg-red-500/80 shadow-red-600/30"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                settings?.storeOpen ? "translate-x-8" : "translate-x-1"
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
            onClick={handleToggleManual}
            disabled={loading || saving}
            className={`w-14 h-7 rounded-full transition-all shadow-inner disabled:opacity-50 ${
              settings?.manualControl ? "bg-primary shadow-primary/30" : "bg-secondary shadow-black/20"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                settings?.manualControl ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Fonte das Configuracoes */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <currentSource.icon className={`w-3.5 h-3.5 ${currentSource.color}`} />
          <span>Configuracoes carregadas de: <span className={currentSource.color}>{currentSource.text}</span></span>
        </div>

        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Dica</p>
              <p className="text-sm text-muted-foreground">
                Com controle manual ativado, a loja fica aberta/fechada conforme o botao acima, independente do horario configurado.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
