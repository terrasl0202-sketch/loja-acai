"use client"

import { useMemo } from "react"
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
  Package
} from "lucide-react"
import type { Order } from "@/lib/config-types"

interface AdminDashboardProps {
  orders: Order[]
  formatCurrency: (value: number) => string
}

export function AdminDashboard({ orders, formatCurrency }: AdminDashboardProps) {
  // Calcula metricas
  const metrics = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Filtra apenas pedidos confirmados
    const confirmedOrders = orders.filter(o => 
      o.paymentStatus === 'confirmed'
    )

    // Pedidos por periodo
    const ordersToday = confirmedOrders.filter(o => new Date(o.createdAt) >= today)
    const ordersYesterday = confirmedOrders.filter(o => {
      const d = new Date(o.createdAt)
      return d >= yesterday && d < today
    })
    const ordersThisWeek = confirmedOrders.filter(o => new Date(o.createdAt) >= weekStart)
    const ordersLastWeek = confirmedOrders.filter(o => {
      const d = new Date(o.createdAt)
      return d >= lastWeekStart && d < weekStart
    })
    const ordersThisMonth = confirmedOrders.filter(o => new Date(o.createdAt) >= monthStart)
    const ordersLastMonth = confirmedOrders.filter(o => {
      const d = new Date(o.createdAt)
      return d >= lastMonthStart && d <= lastMonthEnd
    })

    // Faturamento
    const revenueToday = ordersToday.reduce((sum, o) => sum + o.total, 0)
    const revenueYesterday = ordersYesterday.reduce((sum, o) => sum + o.total, 0)
    const revenueThisWeek = ordersThisWeek.reduce((sum, o) => sum + o.total, 0)
    const revenueLastWeek = ordersLastWeek.reduce((sum, o) => sum + o.total, 0)
    const revenueThisMonth = ordersThisMonth.reduce((sum, o) => sum + o.total, 0)
    const revenueLastMonth = ordersLastMonth.reduce((sum, o) => sum + o.total, 0)

    // Ticket medio
    const ticketMedio = confirmedOrders.length > 0 
      ? confirmedOrders.reduce((sum, o) => sum + o.total, 0) / confirmedOrders.length 
      : 0

    // Clientes unicos (por telefone)
    const uniqueCustomers = new Set(confirmedOrders.map(o => o.customerPhone)).size
    
    // Clientes recorrentes (mais de 1 pedido)
    const customerCounts: Record<string, number> = {}
    confirmedOrders.forEach(o => {
      customerCounts[o.customerPhone] = (customerCounts[o.customerPhone] || 0) + 1
    })
    const recurringCustomers = Object.values(customerCounts).filter(c => c > 1).length

    // Produto mais vendido
    const productCounts: Record<string, { name: string, qty: number, revenue: number }> = {}
    confirmedOrders.forEach(o => {
      // items pode ser string (JSON) ou itemsDetailed pode ser array
      const itemsArray = o.itemsDetailed || (typeof o.items === 'string' ? JSON.parse(o.items || '[]') : [])
      itemsArray.forEach((item: { name: string; quantity: number; price: number }) => {
        if (!productCounts[item.name]) {
          productCounts[item.name] = { name: item.name, qty: 0, revenue: 0 }
        }
        productCounts[item.name].qty += item.quantity
        productCounts[item.name].revenue += item.price * item.quantity
      })
    })
    const topProduct = Object.values(productCounts).sort((a, b) => b.qty - a.qty)[0] || null

    // Bairro que mais compra
    const neighborhoodCounts: Record<string, { name: string, orders: number, revenue: number }> = {}
    confirmedOrders.forEach(o => {
      const bairro = o.neighborhood || 'Retirada'
      if (!neighborhoodCounts[bairro]) {
        neighborhoodCounts[bairro] = { name: bairro, orders: 0, revenue: 0 }
      }
      neighborhoodCounts[bairro].orders++
      neighborhoodCounts[bairro].revenue += o.total
    })
    const topNeighborhood = Object.values(neighborhoodCounts).sort((a, b) => b.orders - a.orders)[0] || null

    // Forma de pagamento mais utilizada
    const paymentCounts: Record<string, number> = {}
    confirmedOrders.forEach(o => {
      const method = o.paymentMethod || 'Nao informado'
      paymentCounts[method] = (paymentCounts[method] || 0) + 1
    })
    const topPayment = Object.entries(paymentCounts).sort((a, b) => b[1] - a[1])[0] || null

    // Dados para grafico dos ultimos 7 dias
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
      const dayOrders = confirmedOrders.filter(o => {
        const d = new Date(o.createdAt)
        return d.toDateString() === date.toDateString()
      })
      return {
        date: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, o) => sum + o.total, 0)
      }
    })

    return {
      ordersToday: ordersToday.length,
      ordersYesterday: ordersYesterday.length,
      ordersThisWeek: ordersThisWeek.length,
      ordersLastWeek: ordersLastWeek.length,
      ordersThisMonth: ordersThisMonth.length,
      ordersLastMonth: ordersLastMonth.length,
      revenueToday,
      revenueYesterday,
      revenueThisWeek,
      revenueLastWeek,
      revenueThisMonth,
      revenueLastMonth,
      ticketMedio,
      uniqueCustomers,
      recurringCustomers,
      topProduct,
      topNeighborhood,
      topPayment,
      last7Days
    }
  }, [orders])

  // Calcula variacao percentual
  const getVariation = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const todayVsYesterday = getVariation(metrics.revenueToday, metrics.revenueYesterday)
  const weekVsLastWeek = getVariation(metrics.revenueThisWeek, metrics.revenueLastWeek)
  const monthVsLastMonth = getVariation(metrics.revenueThisMonth, metrics.revenueLastMonth)

  // Maior valor dos ultimos 7 dias para escala do grafico
  const maxRevenue = Math.max(...metrics.last7Days.map(d => d.revenue), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-4 h-4" />
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Cards de Faturamento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hoje */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            {todayVsYesterday !== 0 && (
              <div className={`flex items-center gap-1 text-xs font-medium ${todayVsYesterday > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {todayVsYesterday > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(todayVsYesterday)}%
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1">Faturamento Hoje</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(metrics.revenueToday)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{metrics.ordersToday} pedidos</p>
        </div>

        {/* Semana */}
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 p-4 rounded-2xl border border-blue-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            {weekVsLastWeek !== 0 && (
              <div className={`flex items-center gap-1 text-xs font-medium ${weekVsLastWeek > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {weekVsLastWeek > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(weekVsLastWeek)}%
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1">Semana</p>
          <p className="text-2xl font-bold text-blue-400">{formatCurrency(metrics.revenueThisWeek)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{metrics.ordersThisWeek} pedidos</p>
        </div>

        {/* Mes */}
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 p-4 rounded-2xl border border-purple-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            {monthVsLastMonth !== 0 && (
              <div className={`flex items-center gap-1 text-xs font-medium ${monthVsLastMonth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {monthVsLastMonth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(monthVsLastMonth)}%
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1">Este Mes</p>
          <p className="text-2xl font-bold text-purple-400">{formatCurrency(metrics.revenueThisMonth)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{metrics.ordersThisMonth} pedidos</p>
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

      {/* Grafico dos ultimos 7 dias */}
      <div className="bg-card p-6 rounded-2xl border border-border">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Ultimos 7 Dias
        </h3>
        <div className="flex items-end justify-between gap-2 h-32">
          {metrics.last7Days.map((day, i) => (
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
      </div>

      {/* Cards de Insights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pedidos Hoje */}
        <div className="bg-card p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Pedidos Hoje</p>
          <p className="text-2xl font-bold text-foreground">{metrics.ordersToday}</p>
        </div>

        {/* Clientes */}
        <div className="bg-card p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-pink-500/20 rounded-xl">
              <Users className="w-5 h-5 text-pink-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Clientes Recorrentes</p>
          <p className="text-2xl font-bold text-foreground">{metrics.recurringCustomers}</p>
          <p className="text-[10px] text-muted-foreground mt-1">de {metrics.uniqueCustomers} total</p>
        </div>

        {/* Produto Top */}
        <div className="bg-card p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/20 rounded-xl">
              <Award className="w-5 h-5 text-orange-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Mais Vendido</p>
          {metrics.topProduct ? (
            <>
              <p className="text-sm font-bold text-foreground truncate">{metrics.topProduct.name}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{metrics.topProduct.qty}x vendidos</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">-</p>
          )}
        </div>

        {/* Bairro Top */}
        <div className="bg-card p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-500/20 rounded-xl">
              <MapPin className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Bairro Destaque</p>
          {metrics.topNeighborhood ? (
            <>
              <p className="text-sm font-bold text-foreground truncate">{metrics.topNeighborhood.name}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{metrics.topNeighborhood.orders} pedidos</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">-</p>
          )}
        </div>
      </div>

      {/* Forma de Pagamento */}
      {metrics.topPayment && (
        <div className="bg-card p-4 rounded-2xl border border-border flex items-center gap-4">
          <div className="p-3 bg-green-500/20 rounded-xl">
            <CreditCard className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pagamento Preferido</p>
            <p className="text-lg font-bold text-foreground">{metrics.topPayment[0]}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-bold text-green-400">{metrics.topPayment[1]}</p>
            <p className="text-xs text-muted-foreground">pedidos</p>
          </div>
        </div>
      )}
    </div>
  )
}
