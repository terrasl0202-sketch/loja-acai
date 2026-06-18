"use client"

import { useState } from "react"
import { Archive, ShoppingBag, CheckCircle2, DollarSign, Clock as ClockIcon, TrendingUp, Users, Loader2, AlertTriangle, X } from "lucide-react"
import type { Order } from "@/lib/config-types"

interface ReportStats {
  totalOrders: number
  confirmedOrders: Order[]
  confirmedRevenue: number
  pendingRevenue: number
  pixAutomatic: Order[]
  pixManual: Order[]
  dinheiro: Order[]
  cartao: Order[]
  historicalPixAuto: number
  historicalPixManual: number
  historicalDinheiro: number
  historicalCartao: number
  historicalCount: number
}

interface TopProduct {
  name: string
  quantity: number
  revenue: number
}

interface TopCustomer {
  name: string
  phone: string
  orders: number
  revenue: number
}

interface AdminReportsSettingsProps {
  reportStats: ReportStats
  onCleanupDuplicates: () => Promise<void>
  onShowArchiveConfirm: () => void
  getTopProducts: () => TopProduct[]
  getTopCustomers: () => TopCustomer[]
  formatCurrency: (value: number) => string
}

// Modal de confirmacao
function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText,
  loading 
}: { 
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText: string
  loading: boolean
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full shadow-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-500/20 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Empty state padrao
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <p>{message}</p>
    </div>
  )
}

export function AdminReportsSettings({
  reportStats,
  onCleanupDuplicates,
  onShowArchiveConfirm,
  getTopProducts,
  getTopCustomers,
  formatCurrency,
}: AdminReportsSettingsProps) {
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false)
  const [duplicateLoading, setDuplicateLoading] = useState(false)

  const handleCleanupDuplicates = async () => {
    setDuplicateLoading(true)
    try {
      await onCleanupDuplicates()
    } finally {
      setDuplicateLoading(false)
      setShowDuplicateConfirm(false)
    }
  }

  const topProducts = getTopProducts()
  const topCustomers = getTopCustomers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-foreground">Relatorios</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDuplicateConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 font-medium rounded-xl transition-all hover:bg-yellow-500/30 text-sm"
            title="Remove pedidos duplicados e corrige inconsistencias"
          >
            Limpar Duplicatas
          </button>
          <button
            onClick={onShowArchiveConfirm}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 font-medium rounded-xl transition-all hover:bg-red-500/30"
          >
            <Archive className="w-4 h-4" />
            Limpar Relatorios
          </button>
        </div>
      </div>

      {/* Cards de resumo - SEMPRE renderizar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-muted-foreground text-sm">Total Pedidos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{reportStats.totalOrders || 0}</p>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-muted-foreground text-sm">Confirmados</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{reportStats.confirmedOrders?.length || 0}</p>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-muted-foreground text-sm">Faturamento</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(reportStats.confirmedRevenue || 0)}</p>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <ClockIcon className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-muted-foreground text-sm">Pendente</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{formatCurrency(reportStats.pendingRevenue || 0)}</p>
        </div>
      </div>

      {/* Por forma de pagamento - SEMPRE renderizar */}
      <div className="bg-card p-6 rounded-xl border border-border">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Faturamento por Forma de Pagamento
          <span className="text-xs text-muted-foreground font-normal">(pedidos confirmados)</span>
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-foreground">PIX Automatico</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{formatCurrency((reportStats.pixAutomatic?.reduce((s, o) => s + o.total, 0) || 0) + (reportStats.historicalPixAuto || 0))}</p>
              <p className="text-xs text-muted-foreground">{reportStats.pixAutomatic?.length || 0} pedidos</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-foreground">PIX Manual</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{formatCurrency((reportStats.pixManual?.reduce((s, o) => s + o.total, 0) || 0) + (reportStats.historicalPixManual || 0))}</p>
              <p className="text-xs text-muted-foreground">{reportStats.pixManual?.length || 0} pedidos</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-foreground">Dinheiro</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{formatCurrency((reportStats.dinheiro?.reduce((s, o) => s + o.total, 0) || 0) + (reportStats.historicalDinheiro || 0))}</p>
              <p className="text-xs text-muted-foreground">{reportStats.dinheiro?.length || 0} pedidos</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-foreground">Cartao</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{formatCurrency((reportStats.cartao?.reduce((s, o) => s + o.total, 0) || 0) + (reportStats.historicalCartao || 0))}</p>
              <p className="text-xs text-muted-foreground">{reportStats.cartao?.length || 0} pedidos</p>
            </div>
          </div>

          {/* Total geral confirmado */}
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20 mt-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span className="text-foreground font-semibold">Total Confirmado</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary text-lg">{formatCurrency(reportStats.confirmedRevenue || 0)}</p>
              <p className="text-xs text-muted-foreground">
                {(reportStats.confirmedOrders?.length || 0) + (reportStats.historicalCount || 0)} pedidos total
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Produtos mais vendidos - SEMPRE renderizar */}
      <div className="bg-card p-6 rounded-xl border border-border">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Produtos Mais Vendidos
        </h3>
        <div className="space-y-2">
          {topProducts && topProducts.length > 0 ? (
            topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-primary/20 text-primary text-sm font-bold rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-foreground">{product.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">{product.quantity}x</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(product.revenue)}</p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState message="Nenhum produto vendido ainda" />
          )}
        </div>
      </div>

      {/* Clientes que mais compraram - SEMPRE renderizar */}
      <div className="bg-card p-6 rounded-xl border border-border">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Clientes que Mais Compraram
        </h3>
        <div className="space-y-2">
          {topCustomers && topCustomers.length > 0 ? (
            topCustomers.map((customer, index) => (
              <div key={customer.phone || customer.name} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-primary/20 text-primary text-sm font-bold rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-foreground font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">{customer.orders} pedidos</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(customer.revenue)}</p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState message="Nenhum cliente ainda" />
          )}
        </div>
      </div>

      {/* Modal de confirmacao para limpar duplicatas */}
      <ConfirmModal
        isOpen={showDuplicateConfirm}
        onClose={() => setShowDuplicateConfirm(false)}
        onConfirm={handleCleanupDuplicates}
        title="Limpar Duplicatas"
        description="Esta acao vai remover pedidos duplicados (mesmo cliente, mesmo valor, criados em menos de 5 minutos). Esta acao nao pode ser desfeita."
        confirmText="Confirmar Limpeza"
        loading={duplicateLoading}
      />
    </div>
  )
}
