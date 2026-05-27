"use client"

import { Archive, ShoppingBag, CheckCircle2, DollarSign, Clock as ClockIcon, TrendingUp, Users } from "lucide-react"
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
  onCleanupDuplicates: () => void
  onShowArchiveConfirm: () => void
  getTopProducts: () => TopProduct[]
  getTopCustomers: () => TopCustomer[]
  formatCurrency: (value: number) => string
}

export function AdminReportsSettings({
  reportStats,
  onCleanupDuplicates,
  onShowArchiveConfirm,
  getTopProducts,
  getTopCustomers,
  formatCurrency,
}: AdminReportsSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Relatorios</h2>
        <div className="flex gap-2">
          <button
            onClick={onCleanupDuplicates}
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

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-muted-foreground text-sm">Total Pedidos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{reportStats.totalOrders}</p>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-muted-foreground text-sm">Pedidos Confirmados</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{reportStats.confirmedOrders.length}</p>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-muted-foreground text-sm">Faturamento Confirmado</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(reportStats.confirmedRevenue)}</p>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <ClockIcon className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-muted-foreground text-sm">Pendente</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{formatCurrency(reportStats.pendingRevenue)}</p>
        </div>
      </div>

      {/* Por forma de pagamento - SOMENTE CONFIRMADOS */}
      <div className="bg-card p-6 rounded-xl border border-border">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Faturamento por Forma de Pagamento
          <span className="text-xs text-muted-foreground font-normal">(inclui historico)</span>
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-foreground">PIX Automatico</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{formatCurrency(reportStats.pixAutomatic.reduce((s, o) => s + o.total, 0) + reportStats.historicalPixAuto)}</p>
              <p className="text-xs text-muted-foreground">{reportStats.pixAutomatic.length} atuais{reportStats.historicalPixAuto > 0 ? ` + historico` : ``}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-foreground">PIX Manual</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{formatCurrency(reportStats.pixManual.reduce((s, o) => s + o.total, 0) + reportStats.historicalPixManual)}</p>
              <p className="text-xs text-muted-foreground">{reportStats.pixManual.length} atuais{reportStats.historicalPixManual > 0 ? ` + historico` : ``}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-foreground">Dinheiro</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{formatCurrency(reportStats.dinheiro.reduce((s, o) => s + o.total, 0) + reportStats.historicalDinheiro)}</p>
              <p className="text-xs text-muted-foreground">{reportStats.dinheiro.length} atuais{reportStats.historicalDinheiro > 0 ? ` + historico` : ``}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-foreground">Cartao</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{formatCurrency(reportStats.cartao.reduce((s, o) => s + o.total, 0) + reportStats.historicalCartao)}</p>
              <p className="text-xs text-muted-foreground">{reportStats.cartao.length} atuais{reportStats.historicalCartao > 0 ? ` + historico` : ``}</p>
            </div>
          </div>

          {/* Total geral confirmado */}
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20 mt-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span className="text-foreground font-semibold">Total Confirmado</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary text-lg">{formatCurrency(reportStats.confirmedRevenue)}</p>
              <p className="text-xs text-muted-foreground">{reportStats.confirmedOrders.length} atuais{reportStats.historicalCount > 0 ? ` + ${reportStats.historicalCount} historico` : ``}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Produtos mais vendidos */}
      <div className="bg-card p-6 rounded-xl border border-border">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Produtos Mais Vendidos
        </h3>
        <div className="space-y-2">
          {getTopProducts().length > 0 ? (
            getTopProducts().map((product, index) => (
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
            <p className="text-center text-muted-foreground py-4">Nenhuma venda confirmada ainda</p>
          )}
        </div>
      </div>

      {/* Clientes que mais compraram */}
      <div className="bg-card p-6 rounded-xl border border-border">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Clientes que Mais Compraram
        </h3>
        <div className="space-y-2">
          {getTopCustomers().length > 0 ? (
            getTopCustomers().map((customer, index) => (
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
            <p className="text-center text-muted-foreground py-4">Nenhum cliente ainda</p>
          )}
        </div>
      </div>
    </div>
  )
}
