"use client"

import { Clock, Archive } from "lucide-react"
import type { SiteConfig } from "@/lib/config-types"

interface AdminHoursSettingsProps {
  config: SiteConfig
  onConfigChange: (updater: (prev: SiteConfig) => SiteConfig) => void
}

export function AdminHoursSettings({ config, onConfigChange }: AdminHoursSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          Configuracoes de Pedidos
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configuracoes de tempo para gerenciamento de pedidos
        </p>
      </div>

      {/* Aviso sobre horario */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
        <p className="text-sm text-blue-400">
          <strong>Nota:</strong> O horario de abertura/fechamento e status da loja sao configurados em{" "}
          <span className="font-semibold">Configuracoes da Loja</span>.
        </p>
      </div>

      <div className="space-y-4">
        {/* Pedido abandonado */}
        <div className="p-4 bg-card/50 border border-border rounded-xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Pedido Abandonado</h3>
              <p className="text-xs text-muted-foreground">Tempo para considerar um pedido como abandonado</p>
            </div>
          </div>
          
          <select
            value={config.storeHours?.abandonedOrderMinutes || 15}
            onChange={(e) => onConfigChange(prev => ({
              ...prev,
              storeHours: { ...prev.storeHours, abandonedOrderMinutes: Number(e.target.value) }
            }))}
            className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value={5}>5 minutos</option>
            <option value={10}>10 minutos</option>
            <option value={15}>15 minutos</option>
            <option value={30}>30 minutos</option>
            <option value={60}>1 hora</option>
            <option value={120}>2 horas</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Pedidos pendentes apos esse tempo aparecerao como abandonados no painel
          </p>
        </div>

        {/* Arquivamento automatico */}
        <div className="p-4 bg-card/50 border border-border rounded-xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-500">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Arquivamento Automatico</h3>
              <p className="text-xs text-muted-foreground">Arquivar automaticamente pedidos antigos</p>
            </div>
          </div>
          
          <select
            value={config.storeHours?.autoArchiveDays || 0}
            onChange={(e) => onConfigChange(prev => ({
              ...prev,
              storeHours: { ...prev.storeHours, autoArchiveDays: Number(e.target.value) }
            }))}
            className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value={0}>Nunca (manual)</option>
            <option value={7}>Apos 7 dias</option>
            <option value={15}>Apos 15 dias</option>
            <option value={30}>Apos 30 dias</option>
            <option value={60}>Apos 60 dias</option>
            <option value={90}>Apos 90 dias</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Pedidos finalizados ou cancelados serao arquivados automaticamente apos esse periodo
          </p>
        </div>
      </div>
    </div>
  )
}
