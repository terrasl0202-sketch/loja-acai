"use client"

import { useState, useEffect } from "react"
import { Store, AlertCircle, Loader2, Check, WifiOff, Clock } from "lucide-react"

// ============================================================
// ADMIN STORE SETTINGS
// Gerencia TODAS as configuracoes da loja via localStorage
// Fonte unica de verdade: pk-store-status
// NAO usa Vercel Blob, NAO usa Supabase, NAO usa fetch
// ============================================================

const LOCAL_KEY = 'pk-store-status'

interface StoreStatus {
  storeOpen: boolean
  manualControl: boolean
  storeName: string
  openTime: string
  closeTime: string
  closedMessage: string
  updatedAt: string
}

const DEFAULT_STATUS: StoreStatus = {
  storeOpen: true,
  manualControl: false,
  storeName: 'Acai da Terra',
  openTime: '14:00',
  closeTime: '22:00',
  closedMessage: 'Estamos fechados no momento. Volte em breve!',
  updatedAt: new Date().toISOString()
}

function loadStatus(): StoreStatus {
  if (typeof window === 'undefined') return DEFAULT_STATUS
  try {
    const saved = localStorage.getItem(LOCAL_KEY)
    if (saved) {
      return { ...DEFAULT_STATUS, ...JSON.parse(saved) }
    }
  } catch {
    // Ignora erro
  }
  return DEFAULT_STATUS
}

function saveStatus(status: StoreStatus): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(status))
  } catch {
    // Ignora erro
  }
}

export function AdminStoreSettings() {
  const [status, setStatus] = useState<StoreStatus>(DEFAULT_STATUS)
  const [loading, setLoading] = useState(true)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Carrega do localStorage ao montar
  useEffect(() => {
    const loaded = loadStatus()
    setStatus(loaded)
    setLoading(false)
  }, [])

  // Salvar qualquer alteracao
  function handleSave(newStatus: StoreStatus) {
    const updated = { ...newStatus, updatedAt: new Date().toISOString() }
    setStatus(updated)
    saveStatus(updated)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  // Toggle status da loja (aberta/fechada)
  function handleToggleOpen() {
    handleSave({ ...status, storeOpen: !status.storeOpen, manualControl: true })
  }

  // Toggle controle manual
  function handleToggleManual() {
    handleSave({ ...status, manualControl: !status.manualControl })
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
        {saveSuccess && (
          <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
            <Check className="w-4 h-4" />
            Salvo localmente
          </div>
        )}
        {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      </div>

      <div className="space-y-4">
        {/* Nome da Loja */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome da Loja</label>
          <input
            type="text"
            value={status.storeName}
            onChange={(e) => setStatus(prev => ({ ...prev, storeName: e.target.value }))}
            onBlur={(e) => handleSave({ ...status, storeName: e.target.value })}
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
                {status.storeOpen ? "Loja esta ABERTA" : "Loja esta FECHADA"}
              </p>
            )}
          </div>
          <button
            onClick={handleToggleOpen}
            disabled={loading}
            className={`w-14 h-7 rounded-full transition-all shadow-inner disabled:opacity-50 ${
              status.storeOpen ? "bg-green-500 shadow-green-600/30" : "bg-red-500/80 shadow-red-600/30"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                status.storeOpen ? "translate-x-8" : "translate-x-1"
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
            disabled={loading}
            className={`w-14 h-7 rounded-full transition-all shadow-inner disabled:opacity-50 ${
              status.manualControl ? "bg-primary shadow-primary/30" : "bg-secondary shadow-black/20"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                status.manualControl ? "translate-x-8" : "translate-x-1"
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
                value={status.openTime}
                onChange={(e) => {
                  const newStatus = { ...status, openTime: e.target.value }
                  setStatus(newStatus)
                  handleSave(newStatus)
                }}
                disabled={loading}
                className="w-full mt-1 px-3 py-2 bg-background/50 border border-border/50 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fechamento</label>
              <input
                type="time"
                value={status.closeTime}
                onChange={(e) => {
                  const newStatus = { ...status, closeTime: e.target.value }
                  setStatus(newStatus)
                  handleSave(newStatus)
                }}
                disabled={loading}
                className="w-full mt-1 px-3 py-2 bg-background/50 border border-border/50 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Horario atual: {status.openTime} as {status.closeTime}
          </p>
        </div>

        {/* Mensagem quando fechado */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensagem quando Fechado</label>
          <textarea
            value={status.closedMessage}
            onChange={(e) => setStatus(prev => ({ ...prev, closedMessage: e.target.value }))}
            onBlur={(e) => handleSave({ ...status, closedMessage: e.target.value })}
            disabled={loading}
            rows={2}
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50 resize-none"
          />
        </div>

        {/* Indicador de armazenamento */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <WifiOff className="w-3.5 h-3.5 text-yellow-400" />
          <span>Configuracoes salvas em: <span className="text-yellow-400">localStorage</span></span>
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
