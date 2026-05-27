"use client"

import type { SiteConfig } from "@/lib/config-types"

interface AdminPaymentSettingsProps {
  config: SiteConfig
  onConfigChange: (updater: (prev: SiteConfig) => SiteConfig) => void
}

export function AdminPaymentSettings({ config, onConfigChange }: AdminPaymentSettingsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Configuracoes de Pagamento</h2>

      <div className="space-y-4">
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

        <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
          <h3 className="font-medium text-foreground mb-3">Dados do PIX Manual</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Chave PIX</label>
              <input
                type="text"
                value={config.pixManual?.key || ""}
                onChange={(e) => onConfigChange(prev => ({
                  ...prev,
                  pixManual: { ...prev.pixManual, key: e.target.value }
                }))}
                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Chave PIX Completa (com +55)</label>
              <input
                type="text"
                value={config.pixManual?.keyFull || ""}
                onChange={(e) => onConfigChange(prev => ({
                  ...prev,
                  pixManual: { ...prev.pixManual, keyFull: e.target.value }
                }))}
                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nome do Recebedor</label>
              <input
                type="text"
                value={config.pixManual?.receiverName || ""}
                onChange={(e) => onConfigChange(prev => ({
                  ...prev,
                  pixManual: { ...prev.pixManual, receiverName: e.target.value }
                }))}
                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
