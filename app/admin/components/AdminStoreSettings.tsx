"use client"

import { Store, AlertCircle } from "lucide-react"
import type { SiteConfig } from "@/lib/config-types"

interface AdminStoreSettingsProps {
  config: SiteConfig
  onConfigChange: (updater: (prev: SiteConfig) => SiteConfig) => void
}

export function AdminStoreSettings({ config, onConfigChange }: AdminStoreSettingsProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Store className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Configuracoes da Loja</h2>
          <p className="text-xs text-muted-foreground">Gerencie as informacoes principais</p>
        </div>
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

        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-secondary/30 to-secondary/10 rounded-xl border border-border/30">
          <div>
            <p className="font-semibold text-foreground text-sm">Status da Loja</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {config.storeHours?.isOpen ? "Loja esta ABERTA" : "Loja esta FECHADA"}
            </p>
          </div>
          <button
            onClick={() => onConfigChange(prev => ({
              ...prev,
              storeHours: { ...prev.storeHours, isOpen: !prev.storeHours?.isOpen }
            }))}
            className={`w-14 h-7 rounded-full transition-all shadow-inner ${
              config.storeHours?.isOpen ? "bg-green-500 shadow-green-600/30" : "bg-red-500/80 shadow-red-600/30"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                config.storeHours?.isOpen ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-secondary/30 to-secondary/10 rounded-xl border border-border/30">
          <div>
            <p className="font-semibold text-foreground text-sm">Controle Manual</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ignorar horario automatico</p>
          </div>
          <button
            onClick={() => onConfigChange(prev => ({
              ...prev,
              storeHours: { ...prev.storeHours, manualControl: !prev.storeHours?.manualControl }
            }))}
            className={`w-14 h-7 rounded-full transition-all shadow-inner ${
              config.storeHours?.manualControl ? "bg-primary shadow-primary/30" : "bg-secondary shadow-black/20"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                config.storeHours?.manualControl ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
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
