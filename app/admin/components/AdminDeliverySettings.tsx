"use client"

import { Plus, Trash2 } from "lucide-react"
import type { SiteConfig, NeighborhoodFee } from "@/lib/config-types"

interface AdminDeliverySettingsProps {
  config: SiteConfig
  onConfigChange: (updater: (prev: SiteConfig) => SiteConfig) => void
  onAddNeighborhoodFee: () => void
  onUpdateNeighborhoodFee: (index: number, field: keyof NeighborhoodFee, value: string | number | boolean) => void
  onRemoveNeighborhoodFee: (index: number) => void
}

export function AdminDeliverySettings({
  config,
  onConfigChange,
  onAddNeighborhoodFee,
  onUpdateNeighborhoodFee,
  onRemoveNeighborhoodFee,
}: AdminDeliverySettingsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Configuracoes de Entrega</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
          <div>
            <p className="font-medium text-foreground">Entrega Habilitada</p>
            <p className="text-sm text-muted-foreground">Permitir entregas</p>
          </div>
          <button
            onClick={() => onConfigChange(prev => ({
              ...prev,
              delivery: { ...prev.delivery, enabled: !prev.delivery?.enabled }
            }))}
            className={`w-14 h-8 rounded-full transition-all ${
              config.delivery?.enabled ? "bg-primary" : "bg-secondary"
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                config.delivery?.enabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
          <div>
            <p className="font-medium text-foreground">Retirada no Local</p>
            <p className="text-sm text-muted-foreground">Permitir retirada</p>
          </div>
          <button
            onClick={() => onConfigChange(prev => ({
              ...prev,
              delivery: { ...prev.delivery, pickupEnabled: !prev.delivery?.pickupEnabled }
            }))}
            className={`w-14 h-8 rounded-full transition-all ${
              config.delivery?.pickupEnabled ? "bg-primary" : "bg-secondary"
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                config.delivery?.pickupEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Taxa Padrao (R$)</label>
            <input
              type="number"
              step="0.01"
              value={config.delivery?.defaultFee || 0}
              onChange={(e) => onConfigChange(prev => ({
                ...prev,
                delivery: { ...prev.delivery, defaultFee: Number(e.target.value) }
              }))}
              className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Pedido Minimo (R$)</label>
            <input
              type="number"
              step="0.01"
              value={config.delivery?.minimumOrder || 0}
              onChange={(e) => onConfigChange(prev => ({
                ...prev,
                delivery: { ...prev.delivery, minimumOrder: Number(e.target.value) }
              }))}
              className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Tempo Estimado</label>
            <input
              type="text"
              value={config.delivery?.estimatedTime || ""}
              onChange={(e) => onConfigChange(prev => ({
                ...prev,
                delivery: { ...prev.delivery, estimatedTime: e.target.value }
              }))}
              placeholder="30-45 min"
              className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="p-4 bg-secondary/30 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-foreground">Taxas por Bairro</p>
            <button
              onClick={onAddNeighborhoodFee}
              className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>
          <div className="space-y-2">
            {(config.delivery?.neighborhoodFees || []).map((fee, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fee.active !== false}
                  onChange={(e) => onUpdateNeighborhoodFee(index, "active", e.target.checked)}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                  title="Ativo"
                />
                <input
                  type="text"
                  value={fee.name}
                  onChange={(e) => onUpdateNeighborhoodFee(index, "name", e.target.value)}
                  placeholder="Nome do bairro"
                  className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                />
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={fee.fee}
                    onChange={(e) => onUpdateNeighborhoodFee(index, "fee", Number(e.target.value))}
                    className="w-20 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                    placeholder="Taxa"
                  />
                </div>
                <button
                  onClick={() => onRemoveNeighborhoodFee(index)}
                  className="p-2 text-destructive hover:bg-destructive/20 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {(config.delivery?.neighborhoodFees || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhum bairro cadastrado</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">Marque a caixa para ativar o bairro no checkout</p>
          </div>
        </div>
      </div>
    </div>
  )
}
