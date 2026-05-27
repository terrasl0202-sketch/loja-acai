"use client"

import type { SiteConfig } from "@/lib/config-types"

interface AdminHoursSettingsProps {
  config: SiteConfig
  onConfigChange: (updater: (prev: SiteConfig) => SiteConfig) => void
}

export function AdminHoursSettings({ config, onConfigChange }: AdminHoursSettingsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Horario de Funcionamento</h2>

      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Horario de Abertura</label>
            <input
              type="time"
              value={config.storeHours?.openTime || "08:00"}
              onChange={(e) => onConfigChange(prev => ({
                ...prev,
                storeHours: { ...prev.storeHours, openTime: e.target.value }
              }))}
              className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Horario de Fechamento</label>
            <input
              type="time"
              value={config.storeHours?.closeTime || "22:00"}
              onChange={(e) => onConfigChange(prev => ({
                ...prev,
                storeHours: { ...prev.storeHours, closeTime: e.target.value }
              }))}
              className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground">Mensagem quando Fechado</label>
          <textarea
            value={config.storeHours?.closedMessage || ""}
            onChange={(e) => onConfigChange(prev => ({
              ...prev,
              storeHours: { ...prev.storeHours, closedMessage: e.target.value }
            }))}
            rows={3}
            className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div className="pt-4 border-t border-border">
          <label className="text-sm text-muted-foreground">Tempo para considerar pedido abandonado</label>
          <select
            value={config.storeHours?.abandonedOrderMinutes || 15}
            onChange={(e) => onConfigChange(prev => ({
              ...prev,
              storeHours: { ...prev.storeHours, abandonedOrderMinutes: Number(e.target.value) }
            }))}
            className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value={5}>5 minutos</option>
            <option value={10}>10 minutos</option>
            <option value={15}>15 minutos</option>
            <option value={30}>30 minutos</option>
            <option value={60}>1 hora</option>
            <option value={120}>2 horas</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">Pedidos pendentes apos esse tempo aparecerao como abandonados</p>
        </div>

        {/* Arquivamento automatico */}
        <div>
          <label className="text-sm font-medium text-foreground">Arquivar automaticamente pedidos antigos</label>
          <select
            value={config.storeHours?.autoArchiveDays || 0}
            onChange={(e) => onConfigChange(prev => ({
              ...prev,
              storeHours: { ...prev.storeHours, autoArchiveDays: Number(e.target.value) }
            }))}
            className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value={0}>Nunca (manual)</option>
            <option value={7}>Apos 7 dias</option>
            <option value={15}>Apos 15 dias</option>
            <option value={30}>Apos 30 dias</option>
            <option value={60}>Apos 60 dias</option>
            <option value={90}>Apos 90 dias</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">Pedidos finalizados/cancelados serao arquivados automaticamente apos esse periodo</p>
        </div>
      </div>
    </div>
  )
}
