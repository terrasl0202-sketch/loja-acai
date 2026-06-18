"use client"

import { useState } from "react"
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  TrendingDown,
  Users, 
  MapPin,
  CreditCard,
  Calendar,
  Target,
  Award,
  XCircle,
  Clock,
  Archive,
  Loader2,
  AlertTriangle,
  X
} from "lucide-react"
import type { Order } from "@/lib/config-types"
import { useDashboardMetrics, type DashboardMetrics } from "../hooks/useDashboardMetrics"

type ChartPeriod = 'today' | 'week' | 'month' | 'year'

interface AdminDashboardProps {
  orders: Order[]
  formatCurrency: (value: number) => string
  onCleanupDuplicates: () => Promise<void>
  onShowArchiveConfirm: () => void
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

export function AdminDashboard({ orders, formatCurrency, onCleanupDuplicates, onShowArchiveConfirm }: AdminDashboardProps) {
  const metrics = useDashboardMetrics(orders)
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('week')
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

  // Dados do grafico baseado no periodo
  const chartData = chartPeriod === 'week' ? metrics.last7Days : metrics.last30Days.slice(-7)
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1)

  return (
    <div className="space-y-6">
      {/* Header com acoes */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDuplicateConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 text-yellow-400 font-medium rounded-xl transition-all hover:bg-yellow-500/30 text-sm"
          >
            Limpar Duplicatas
          </button>
          <button
            onClick={onShowArchiveConfirm}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 font-medium rounded-xl transition-all hover:bg-red-500/30 text-sm"
          >
            <Archive className="w-4 h-4" />
            Limpar Dados
          </button>
        </div>
      </div>

      {/* Cards de Faturamento - Linha Principal */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento Hoje */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            {metrics.todayVsYesterday !== 0 && (
              <div className={`flex items-center gap-1 text-xs font-medium ${metrics.todayVsYesterday > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {metrics.todayVsYesterday > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(metrics.todayVsYesterday)}%
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1">Faturamento Hoje</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(metrics.revenueToday)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{metrics.ordersToday} pedidos</p>
        </div>

        {/* Faturamento Mes */}
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 p-4 rounded-2xl border border-purple-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            {metrics.monthVsLastMonth !== 0 && (
              <div className={`flex items-center gap-1 text-xs font-medium ${metrics.monthVsLastMonth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {metrics.monthVsLastMonth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(metrics.monthVsLastMonth)}%
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1">Faturamento Mes</p>
          <p className="text-2xl font-bold text-purple-400">{formatCurrency(metrics.revenueThisMonth)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{metrics.ordersThisMonth} pedidos</p>
        </div>

        {/* Pedidos Confirmados */}
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 p-4 rounded-2xl border border-blue-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Pedidos Confirmados</p>
          <p className="text-2xl font-bold text-blue-400">{metrics.confirmedOrdersCount}</p>
          <p className="text-[10px] text-muted-foreground mt-1">de {metrics.totalOrders} total</p>
        </div>

        {/* Ticket Medio */}
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 p-4 rounded-2xl border border-amber-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-500/20 rounded-xl">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Ticket Medio</p>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(metrics.ticketMedio)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">por pedido</p>
        </div>
      </div>

      {/* Segunda linha de cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cancelados */}
        <div className="bg-card p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/20 rounded-xl">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Cancelados</p>
          <p className="text-2xl font-bold text-red-400">{metrics.cancelledOrdersCount}</p>
        </div>

        {/* Clientes Unicos */}
        <div className="bg-card p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-pink-500/20 rounded-xl">
              <Users className="w-5 h-5 text-pink-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Clientes Unicos</p>
          <p className="text-2xl font-bold text-foreground">{metrics.uniqueCustomers}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{metrics.recurringCustomers} recorrentes</p>
        </div>

        {/* Aguardando Pagamento */}
        <div className="bg-card p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/20 rounded-xl">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Aguardando Pagamento</p>
          <p className="text-2xl font-bold text-yellow-400">{formatCurrency(metrics.pendingRevenue)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{metrics.pendingOrdersCount} pedidos</p>
        </div>

        {/* Faturamento Semana */}
        <div className="bg-card p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-500/20 rounded-xl">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            </div>
            {metrics.weekVsLastWeek !== 0 && (
              <div className={`flex items-center gap-1 text-xs font-medium ml-auto ${metrics.weekVsLastWeek > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {metrics.weekVsLastWeek > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(metrics.weekVsLastWeek)}%
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1">Faturamento Semana</p>
          <p className="text-2xl font-bold text-cyan-400">{formatCurrency(metrics.revenueThisWeek)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{metrics.ordersThisWeek} pedidos</p>
        </div>
      </div>

      {/* Grafico */}
      <div className="bg-card p-6 rounded-2xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Vendas por Periodo
          </h3>
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
            {(['today', 'week', 'month'] as const).map(period => (
              <button
                key={period}
                onClick={() => setChartPeriod(period)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  chartPeriod === period 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {period === 'today' ? 'Hoje' : period === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Empty state elegante quando nao ha vendas */}
        {chartData.every(d => d.revenue === 0) ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma venda neste periodo</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Os dados aparecerao aqui quando houver vendas</p>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-2 h-32">
            {chartData.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full bg-primary/20 rounded-t-lg transition-all hover:bg-primary/30 relative group"
                  style={{ height: `${Math.max((day.revenue / maxRevenue) * 100, 4)}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-card px-2 py-1 rounded text-[10px] font-medium text-foreground border border-border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {formatCurrency(day.revenue)}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground capitalize">{day.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Faturamento por Forma de Pagamento */}
      <div className="bg-card p-6 rounded-2xl border border-border">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Faturamento por Forma de Pagamento
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-foreground">PIX Automatico</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{formatCurrency(metrics.revenuePixAutomatic)}</p>
              <p className="text-xs text-muted-foreground">{metrics.ordersPixAutomatic} pedidos</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-foreground">PIX Manual</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{formatCurrency(metrics.revenuePixManual)}</p>
              <p className="text-xs text-muted-foreground">{metrics.ordersPixManual} pedidos</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-foreground">Dinheiro</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{formatCurrency(metrics.revenueDinheiro)}</p>
              <p className="text-xs text-muted-foreground">{metrics.ordersDinheiro} pedidos</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-foreground">Cartao</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{formatCurrency(metrics.revenueCartao)}</p>
              <p className="text-xs text-muted-foreground">{metrics.ordersCartao} pedidos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Insights - Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Produto Mais Vendido */}
        <div className="bg-card p-4 rounded-2xl border border-border">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-orange-400" />
            Produto Mais Vendido
          </h4>
          {metrics.topProduct ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground">{metrics.topProduct.name}</p>
                <p className="text-sm text-muted-foreground">{metrics.topProduct.qty}x vendidos</p>
              </div>
              <p className="text-lg font-bold text-primary">{formatCurrency(metrics.topProduct.revenue)}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum produto vendido ainda</p>
          )}
        </div>

        {/* Cliente Destaque */}
        <div className="bg-card p-4 rounded-2xl border border-border">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-400" />
            Cliente que Mais Comprou
          </h4>
          {metrics.topCustomer ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground">{metrics.topCustomer.name}</p>
                <p className="text-sm text-muted-foreground">{metrics.topCustomer.orders} pedidos</p>
              </div>
              <p className="text-lg font-bold text-primary">{formatCurrency(metrics.topCustomer.revenue)}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum cliente ainda</p>
          )}
        </div>

        {/* Forma de Pagamento Preferida */}
        <div className="bg-card p-4 rounded-2xl border border-border">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-green-400" />
            Forma de Pagamento Preferida
          </h4>
          {metrics.topPaymentMethod ? (
            <div className="flex items-center justify-between">
              <p className="font-bold text-foreground">{metrics.topPaymentMethod.method}</p>
              <p className="text-lg font-bold text-primary">{metrics.topPaymentMethod.count} pedidos</p>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum dado ainda</p>
          )}
        </div>

        {/* Bairro Destaque */}
        <div className="bg-card p-4 rounded-2xl border border-border">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            Bairro com Mais Pedidos
          </h4>
          {metrics.topNeighborhood ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground">{metrics.topNeighborhood.name}</p>
                <p className="text-sm text-muted-foreground">{metrics.topNeighborhood.orders} pedidos</p>
              </div>
              <p className="text-lg font-bold text-primary">{formatCurrency(metrics.topNeighborhood.revenue)}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum dado ainda</p>
          )}
        </div>
      </div>

      {/* Top Produtos */}
      {metrics.topProducts.length > 0 && (
        <div className="bg-card p-6 rounded-2xl border border-border">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Top 10 Produtos
          </h3>
          <div className="space-y-2">
            {metrics.topProducts.map((product, index) => (
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
            ))}
          </div>
        </div>
      )}

      {/* Top Clientes */}
      {metrics.topCustomers.length > 0 && (
        <div className="bg-card p-6 rounded-2xl border border-border">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Top 10 Clientes
          </h3>
          <div className="space-y-2">
            {metrics.topCustomers.map((customer, index) => (
              <div key={customer.phone} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
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
            ))}
          </div>
        </div>
      )}

      {/* Modal de confirmacao */}
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
