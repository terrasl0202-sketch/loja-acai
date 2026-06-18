"use client"

import type { SiteConfig } from "@/lib/config-types"

interface AdminWhatsappSettingsProps {
  config: SiteConfig
  onConfigChange: (updater: (prev: SiteConfig) => SiteConfig) => void
}

export function AdminWhatsappSettings({ config, onConfigChange }: AdminWhatsappSettingsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Configuracoes do WhatsApp</h2>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground">Numero do WhatsApp</label>
          <input
            type="text"
            value={config.whatsapp?.number || ""}
            onChange={(e) => onConfigChange(prev => ({
              ...prev,
              whatsapp: { ...prev.whatsapp, number: e.target.value }
            }))}
            placeholder="5511999999999"
            className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">Formato: codigo do pais + DDD + numero</p>
        </div>

        <div>
          <label className="text-sm text-muted-foreground">Mensagem Padrao</label>
          <textarea
            value={config.whatsapp?.defaultMessage || ""}
            onChange={(e) => onConfigChange(prev => ({
              ...prev,
              whatsapp: { ...prev.whatsapp, defaultMessage: e.target.value }
            }))}
            rows={3}
            className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground">Mensagem para Comprovante</label>
          <textarea
            value={config.whatsapp?.receiptMessage || ""}
            onChange={(e) => onConfigChange(prev => ({
              ...prev,
              whatsapp: { ...prev.whatsapp, receiptMessage: e.target.value }
            }))}
            rows={2}
            placeholder="Envie o comprovante do PIX por aqui."
            className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
          <div>
            <p className="font-medium text-foreground">Botao de Suporte</p>
            <p className="text-sm text-muted-foreground">Mostrar botao de ajuda no site</p>
          </div>
          <button
            onClick={() => onConfigChange(prev => ({
              ...prev,
              whatsapp: { ...prev.whatsapp, supportEnabled: !prev.whatsapp?.supportEnabled }
            }))}
            className={`w-14 h-8 rounded-full transition-all ${
              config.whatsapp?.supportEnabled ? "bg-primary" : "bg-secondary"
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                config.whatsapp?.supportEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
