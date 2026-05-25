"use client"

import { Lock, Bell, BellOff, RefreshCw, Volume2, Save, Loader2, Check, LogOut } from "lucide-react"

interface AdminHeaderProps {
  storeName: string
  newOrdersCount: number
  soundActivated: boolean
  soundEnabled: boolean
  saving: boolean
  saveSuccess: boolean
  onRefresh: () => void
  onActivateSound: () => void
  onTestSound: () => void
  onToggleSound: () => void
  onSave: () => void
  onLogout: () => void
  onMarkAsSeen: () => void
}

export function AdminHeader({
  storeName,
  newOrdersCount,
  soundActivated,
  soundEnabled,
  saving,
  saveSuccess,
  onRefresh,
  onActivateSound,
  onTestSound,
  onToggleSound,
  onSave,
  onLogout,
  onMarkAsSeen,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-primary/10 shadow-xl shadow-black/10">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary/30 to-primary/10 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-primary/20 flex-shrink-0">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm sm:text-base text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/80">Painel Admin</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground/70 truncate">{storeName || "P.K Gostosuras"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {newOrdersCount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/15 text-red-400 rounded-xl animate-pulse border border-red-500/20">
                <Bell className="w-3.5 h-3.5" />
                <span className="font-bold text-xs">{newOrdersCount}</span>
              </div>
            )}
            
            {newOrdersCount > 0 && (
              <button
                onClick={onMarkAsSeen}
                className="hidden sm:flex px-2.5 py-1.5 text-xs bg-blue-500/15 text-blue-400 rounded-xl hover:bg-blue-500/25 transition-all border border-blue-500/20"
              >
                Visto
              </button>
            )}
            
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all hover:shadow-lg"
              title="Atualizar pedidos"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            {!soundActivated ? (
              <button
                onClick={onActivateSound}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs rounded-xl hover:brightness-110 transition-all animate-pulse shadow-lg shadow-amber-500/20"
              >
                <Volume2 className="w-4 h-4" />
                <span className="hidden sm:inline">Som</span>
              </button>
            ) : (
              <>
                <button
                  onClick={onTestSound}
                  className="hidden sm:flex px-2.5 py-1.5 text-xs bg-purple-500/15 text-purple-400 rounded-xl hover:bg-purple-500/25 transition-all border border-purple-500/20"
                  title="Testar som"
                >
                  Testar
                </button>
                
                <button
                  onClick={onToggleSound}
                  className={`p-2 rounded-xl transition-all ${
                    soundEnabled
                      ? "bg-green-500/15 text-green-400 hover:bg-green-500/25 ring-1 ring-green-500/20"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                  }`}
                  title={soundEnabled ? "Som ATIVADO" : "Som desativado"}
                >
                  {soundEnabled ? <Bell className="w-4 h-4 sm:w-5 sm:h-5" /> : <BellOff className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </>
            )}
            
            <button
              onClick={onSave}
              disabled={saving}
              className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 font-semibold text-xs sm:text-sm rounded-xl transition-all disabled:opacity-50 shadow-lg ${
                saveSuccess
                  ? "bg-green-500 text-white shadow-green-500/20"
                  : "bg-primary text-primary-foreground hover:brightness-110 shadow-primary/20"
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{saving ? "..." : saveSuccess ? "Salvo!" : "Salvar"}</span>
            </button>

            <button
              onClick={onLogout}
              className="p-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Sair"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
