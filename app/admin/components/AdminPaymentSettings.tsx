"use client"

import type { SiteConfig } from "@/lib/config-types"
import { AdminPixWallet } from "./AdminPixWallet"

interface AdminPaymentSettingsProps {
  config: SiteConfig
  onConfigChange: (updater: (prev: SiteConfig) => SiteConfig) => void
}

export function AdminPaymentSettings({ config, onConfigChange }: AdminPaymentSettingsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Configuracoes de Pagamento</h2>

      <div className="space-y-4">
        {/* Valores minimos e expiracao */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Valor Minimo para PIX Asaas (R$)</label>
            <input
              type="number"
              step="0.01"
              value={config.payment?.minValueForAsaas || 15}
              onChange={(e) => onConfigChange(prev => ({
                ...prev,
                payment: { ...prev.payment, minValueForAsaas: Number(e.target.value) }
              }))}
              className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Pedidos abaixo usam PIX manual</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Tempo de Expiracao PIX (min)</label>
            <input
              type="number"
              value={config.payment?.pixExpirationMinutes || 15}
              onChange={(e) => onConfigChange(prev => ({
                ...prev,
                payment: { ...prev.payment, pixExpirationMinutes: Number(e.target.value) }
              }))}
              className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Toggle PIX Manual */}
        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
          <div>
            <p className="font-medium text-foreground">PIX Manual</p>
            <p className="text-sm text-muted-foreground">Para pedidos abaixo do valor minimo</p>
          </div>
          <button
            onClick={() => onConfigChange(prev => ({
              ...prev,
              payment: { ...prev.payment, pixManualEnabled: !prev.payment?.pixManualEnabled }
            }))}
            className={`w-14 h-8 rounded-full transition-all ${
              config.payment?.pixManualEnabled ? "bg-primary" : "bg-secondary"
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                config.payment?.pixManualEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Toggle PIX Asaas */}
        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
          <div>
            <p className="font-medium text-foreground">PIX Asaas Automatico</p>
            <p className="text-sm text-muted-foreground">Para pedidos acima do valor minimo</p>
          </div>
          <button
            onClick={() => onConfigChange(prev => ({
              ...prev,
              payment: { ...prev.payment, pixAsaasEnabled: !prev.payment?.pixAsaasEnabled }
            }))}
            className={`w-14 h-8 rounded-full transition-all ${
              config.payment?.pixAsaasEnabled ? "bg-primary" : "bg-secondary"
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                config.payment?.pixAsaasEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Carteira PIX Manual - Nova funcionalidade */}
        {config.payment?.pixManualEnabled && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <AdminPixWallet />
          </div>
        )}
      </div>
    </div>
  )
}
