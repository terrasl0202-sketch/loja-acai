"use client"

import type { SiteConfig } from "@/lib/config-types"

interface AdminBannerSettingsProps {
  config: SiteConfig
  onConfigChange: (updater: (prev: SiteConfig) => SiteConfig) => void
}

export function AdminBannerSettings({ config, onConfigChange }: AdminBannerSettingsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Banner do Site</h2>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground">Texto Principal</label>
          <input
            type="text"
            value={config.banner?.mainText || ""}
            onChange={(e) => onConfigChange(prev => ({
              ...prev,
              banner: { ...prev.banner, mainText: e.target.value }
            }))}
            className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground">Texto Secundario</label>
          <input
            type="text"
            value={config.banner?.secondaryText || ""}
            onChange={(e) => onConfigChange(prev => ({
              ...prev,
              banner: { ...prev.banner, secondaryText: e.target.value }
            }))}
            className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
          <div>
            <p className="font-medium text-foreground">Promocao Ativa</p>
            <p className="text-sm text-muted-foreground">Mostrar banner de promocao</p>
          </div>
          <button
            onClick={() => onConfigChange(prev => ({
              ...prev,
              banner: { ...prev.banner, promoActive: !prev.banner?.promoActive }
            }))}
            className={`w-14 h-8 rounded-full transition-all ${
              config.banner?.promoActive ? "bg-primary" : "bg-secondary"
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                config.banner?.promoActive ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {config.banner?.promoActive && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Texto da Promocao</label>
              <input
                type="text"
                value={config.banner?.promoText || ""}
                onChange={(e) => onConfigChange(prev => ({
                  ...prev,
                  banner: { ...prev.banner, promoText: e.target.value }
                }))}
                placeholder="Ex: 20% OFF hoje!"
                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Preco Promocional (R$)</label>
              <input
                type="number"
                step="0.01"
                value={config.banner?.promoPrice || 0}
                onChange={(e) => onConfigChange(prev => ({
                  ...prev,
                  banner: { ...prev.banner, promoPrice: Number(e.target.value) }
                }))}
                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
