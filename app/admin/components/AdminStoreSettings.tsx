"use client"

import { useState, useEffect } from "react"
import { Store, AlertCircle, Loader2, Check, Wifi, WifiOff } from "lucide-react"
import type { SiteConfig } from "@/lib/config-types"
import { fetchStoreStatus, updateStoreStatus, type StoreStatus } from "@/lib/supabase"

interface AdminStoreSettingsProps {
  config: SiteConfig
  onConfigChange: (updater: (prev: SiteConfig) => SiteConfig) => void
}

export function AdminStoreSettings({ config, onConfigChange }: AdminStoreSettingsProps) {
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Carrega o status da loja ao montar
  useEffect(() => {
    loadStoreStatus()
  }, [])

  async function loadStoreStatus() {
    setLoading(true)
    try {
      const { data } = await fetchStoreStatus()
      setStoreStatus(data)
    } catch (err) {
      console.error('[Admin] Erro ao carregar status:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleOpen() {
    if (!storeStatus || saving) return
    
    setSaving(true)
    const newOpen = !storeStatus.storeOpen
    
    // Atualiza UI imediatamente (otimista)
    setStoreStatus(prev => prev ? { ...prev, storeOpen: newOpen, manualControl: true } : null)
    
    try {
      await updateStoreStatus(newOpen, true)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error('[Admin] Erro ao salvar status:', err)
      // Reverte em caso de erro
      setStoreStatus(prev => prev ? { ...prev, storeOpen: !newOpen } : null)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleManual() {
    if (!storeStatus || saving) return
    
    setSaving(true)
    const newManual = !storeStatus.manualControl
    
    // Atualiza UI imediatamente (otimista)
    setStoreStatus(prev => prev ? { ...prev, manualControl: newManual } : null)
    
    try {
      await updateStoreStatus(storeStatus.storeOpen, newManual)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error('[Admin] Erro ao salvar controle manual:', err)
      setStoreStatus(prev => prev ? { ...prev, manualControl: !newManual } : null)
    } finally {
      setSaving(false)
    }
  }

  const sourceLabel = {
    supabase: { text: 'Supabase', icon: Wifi, color: 'text-green-400' },
    local: { text: 'Local', icon: WifiOff, color: 'text-yellow-400' },
    auto: { text: 'Automatico', icon: Store, color: 'text-blue-400' }
  }

  const currentSource = storeStatus ? sourceLabel[storeStatus.source] : null

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
            Salvo
          </div>
        )}
        {saving && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome da Loja</label>
          <input
            type="text"
            value={config.storeName || ""}
            onChange={(e) => onConfigChange(prev => ({ ...prev, storeName: e.target.value }))}
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
          />
        </div>

        {/* Status da Loja - Agora usa Supabase/localStorage */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-secondary/30 to-secondary/10 rounded-xl border border-border/30">
          <div>
            <p className="font-semibold text-foreground text-sm">Status da Loja</p>
            {loading ? (
              <p className="text-xs text-muted-foreground mt-0.5">Carregando...</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                {storeStatus?.storeOpen ? "Loja esta ABERTA" : "Loja esta FECHADA"}
              </p>
            )}
          </div>
          <button
            onClick={handleToggleOpen}
            disabled={loading || saving}
            className={`w-14 h-7 rounded-full transition-all shadow-inner disabled:opacity-50 ${
              storeStatus?.storeOpen ? "bg-green-500 shadow-green-600/30" : "bg-red-500/80 shadow-red-600/30"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                storeStatus?.storeOpen ? "translate-x-8" : "translate-x-1"
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
              storeStatus?.manualControl ? "bg-primary shadow-primary/30" : "bg-secondary shadow-black/20"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                storeStatus?.manualControl ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Fonte do Status */}
        {currentSource && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <currentSource.icon className={`w-3.5 h-3.5 ${currentSource.color}`} />
            <span>Status salvo em: <span className={currentSource.color}>{currentSource.text}</span></span>
          </div>
        )}

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
