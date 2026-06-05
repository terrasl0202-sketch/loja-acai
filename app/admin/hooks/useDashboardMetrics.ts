"use client"

import { useMemo } from "react"
import type { Order } from "@/lib/config-types"
import { getRevenueOrders, getOrderTotal, isOrderConfirmed } from "../utils"

export interface DashboardMetrics {
  // Contagens
  totalOrders: number
  confirmedOrdersCount: number
  pendingOrdersCount: number
  cancelledOrdersCount: number
  
  // Faturamento por periodo
  revenueToday: number
  revenueYesterday: number
  revenueThisWeek: number
  revenueLastWeek: number
  revenueThisMonth: number
  revenueLastMonth: number
  
  // Pedidos por periodo
  ordersToday: number
  ordersYesterday: number
  ordersThisWeek: number
  ordersThisMonth: number
  
  // Metricas calculadas
  ticketMedio: number
  uniqueCustomers: number
  recurringCustomers: number
  
  // Faturamento por forma de pagamento
  revenuePixAutomatic: number
  revenuePixManual: number
  revenueDinheiro: number
  revenueCartao: number
  ordersPixAutomatic: number
  ordersPixManual: number
  ordersDinheiro: number
  ordersCartao: number
  
  // Pendente (aguardando pagamento)
  pendingRevenue: number
  
  // Top items
  topProduct: { name: string; qty: number; revenue: number } | null
  topNeighborhood: { name: string; orders: number; revenue: number } | null
  topPaymentMethod: { method: string; count: number } | null
  topCustomer: { name: string; phone: string; orders: number; revenue: number } | null
  
  // Grafico
  last7Days: Array<{ date: string; fullDate: string; orders: number; revenue: number }>
  last30Days: Array<{ date: string; fullDate: string; orders: number; revenue: number }>
  
  // Variacoes percentuais
  todayVsYesterday: number
  weekVsLastWeek: number
  monthVsLastMonth: number
  
  // Produtos e clientes top 10
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  topCustomers: Array<{ name: string; phone: string; orders: number; revenue: number }>
}

/**
 * Hook centralizado para todas as metricas do Dashboard
 * UNICA FONTE DE VERDADE - todos os componentes devem usar este hook
 * 
 * Usa as funcoes oficiais:
 * - getRevenueOrders() para filtrar pedidos confirmados
 * - getOrderTotal() para obter o total de cada pedido
 * - isOrderConfirmed() para verificar status
 */
export function useDashboardMetrics(orders: Order[]): DashboardMetrics {
  return useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // === PEDIDOS FILTRADOS ===
    // Pedidos que entram no faturamento (confirmados e nao cancelados)
    const revenueOrders = getRevenueOrders(orders)
    
    // Pedidos confirmados (para exibicao)
    const confirmedOrders = orders.filter(isOrderConfirmed)
    
    // Pedidos pendentes (aguardando pagamento)
    const pendingOrders = orders.filter(o => o.status === 'pending')
    
    // Pedidos cancelados
    const cancelledOrders = orders.filter(o => o.status === 'cancelled')

    // === PEDIDOS POR PERIODO ===
    const ordersToday = revenueOrders.filter(o => new Date(o.createdAt) >= today)
    const ordersYesterday = revenueOrders.filter(o => {
      const d = new Date(o.createdAt)
      return d >= yesterday && d < today
    })
    const ordersThisWeek = revenueOrders.filter(o => new Date(o.createdAt) >= weekStart)
    const ordersLastWeek = revenueOrders.filter(o => {
      const d = new Date(o.createdAt)
      return d >= lastWeekStart && d < weekStart
    })
    const ordersThisMonth = revenueOrders.filter(o => new Date(o.createdAt) >= monthStart)
    const ordersLastMonth = revenueOrders.filter(o => {
      const d = new Date(o.createdAt)
      return d >= lastMonthStart && d <= lastMonthEnd
    })

    // === FATURAMENTO POR PERIODO ===
    const revenueToday = ordersToday.reduce((sum, o) => sum + getOrderTotal(o), 0)
    const revenueYesterday = ordersYesterday.reduce((sum, o) => sum + getOrderTotal(o), 0)
    const revenueThisWeek = ordersThisWeek.reduce((sum, o) => sum + getOrderTotal(o), 0)
    const revenueLastWeek = ordersLastWeek.reduce((sum, o) => sum + getOrderTotal(o), 0)
    const revenueThisMonth = ordersThisMonth.reduce((sum, o) => sum + getOrderTotal(o), 0)
    const revenueLastMonth = ordersLastMonth.reduce((sum, o) => sum + getOrderTotal(o), 0)

    // === TICKET MEDIO ===
    const ticketMedio = revenueOrders.length > 0 
      ? revenueOrders.reduce((sum, o) => sum + getOrderTotal(o), 0) / revenueOrders.length 
      : 0

    // === CLIENTES ===
    const uniqueCustomers = new Set(revenueOrders.map(o => o.customerPhone)).size
    const customerCounts: Record<string, number> = {}
    revenueOrders.forEach(o => {
      customerCounts[o.customerPhone] = (customerCounts[o.customerPhone] || 0) + 1
    })
    const recurringCustomers = Object.values(customerCounts).filter(c => c > 1).length

    // === FATURAMENTO POR FORMA DE PAGAMENTO ===
    const pixAutomaticOrders = revenueOrders.filter(o => o.isPixAutomatic || o.paymentMethod === "PIX Asaas")
    const pixManualOrders = revenueOrders.filter(o => o.paymentMethod === "PIX Manual" || (o.paymentMethod === "PIX" && !o.isPixAutomatic))
    const dinheiroOrders = revenueOrders.filter(o => o.paymentMethod === "Dinheiro")
    const cartaoOrders = revenueOrders.filter(o => o.paymentMethod === "Cartao" || o.paymentMethod === "Cartão")

    // === PENDENTE ===
    const pendingRevenue = pendingOrders.reduce((sum, o) => sum + getOrderTotal(o), 0)

    // === PRODUTO MAIS VENDIDO ===
    const productCounts: Record<string, { name: string; qty: number; revenue: number }> = {}
    revenueOrders.forEach(o => {
      const itemsArray = o.itemsDetailed || (typeof o.items === 'string' ? JSON.parse(o.items || '[]') : [])
      itemsArray.forEach((item: { name?: string; productName?: string; quantity?: number; price?: number }) => {
        const name = item.name || item.productName || 'Produto'
        const qty = item.quantity || 1
        const price = item.price || 0
        if (!productCounts[name]) {
          productCounts[name] = { name, qty: 0, revenue: 0 }
        }
        productCounts[name].qty += qty
        productCounts[name].revenue += price * qty
      })
    })
    const topProducts = Object.values(productCounts)
      .filter(p => p.name && typeof p.name === 'string' && p.qty > 0)
      .sort((a, b) => b.qty - a.qty)
    const topProduct = topProducts[0] || null

    // === BAIRRO DESTAQUE ===
    const neighborhoodCounts: Record<string, { name: string; orders: number; revenue: number }> = {}
    revenueOrders.forEach(o => {
      const bairro = o.neighborhood || 'Retirada'
      if (!neighborhoodCounts[bairro]) {
        neighborhoodCounts[bairro] = { name: bairro, orders: 0, revenue: 0 }
      }
      neighborhoodCounts[bairro].orders++
      neighborhoodCounts[bairro].revenue += getOrderTotal(o)
    })
    const topNeighborhood = Object.values(neighborhoodCounts).sort((a, b) => b.orders - a.orders)[0] || null

    // === FORMA DE PAGAMENTO PREFERIDA ===
    const paymentCounts: Record<string, number> = {}
    revenueOrders.forEach(o => {
      const method = o.paymentMethod || 'Nao informado'
      paymentCounts[method] = (paymentCounts[method] || 0) + 1
    })
    const topPaymentEntry = Object.entries(paymentCounts).sort((a, b) => b[1] - a[1])[0]
    const topPaymentMethod = topPaymentEntry ? { method: topPaymentEntry[0], count: topPaymentEntry[1] } : null

    // === CLIENTE QUE MAIS COMPROU ===
    const customerStats: Record<string, { name: string; phone: string; orders: number; revenue: number }> = {}
    revenueOrders.forEach(o => {
      const key = o.customerPhone || 'sem-telefone'
      if (!customerStats[key]) {
        customerStats[key] = { name: o.customerName, phone: o.customerPhone, orders: 0, revenue: 0 }
      }
      customerStats[key].orders++
      customerStats[key].revenue += getOrderTotal(o)
    })
    const topCustomers = Object.values(customerStats).sort((a, b) => b.revenue - a.revenue)
    const topCustomer = topCustomers[0] || null

    // === GRAFICO ULTIMOS 7 DIAS ===
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
      const dayOrders = revenueOrders.filter(o => {
        const d = new Date(o.createdAt)
        return d.toDateString() === date.toDateString()
      })
      return {
        date: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        fullDate: date.toLocaleDateString('pt-BR'),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, o) => sum + getOrderTotal(o), 0)
      }
    })

    // === GRAFICO ULTIMOS 30 DIAS ===
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today.getTime() - (29 - i) * 24 * 60 * 60 * 1000)
      const dayOrders = revenueOrders.filter(o => {
        const d = new Date(o.createdAt)
        return d.toDateString() === date.toDateString()
      })
      return {
        date: date.toLocaleDateString('pt-BR', { day: '2-digit' }),
        fullDate: date.toLocaleDateString('pt-BR'),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, o) => sum + getOrderTotal(o), 0)
      }
    })

    // === VARIACOES PERCENTUAIS ===
    const getVariation = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    return {
      // Contagens
      totalOrders: orders.length,
      confirmedOrdersCount: confirmedOrders.length,
      pendingOrdersCount: pendingOrders.length,
      cancelledOrdersCount: cancelledOrders.length,
      
      // Faturamento por periodo
      revenueToday,
      revenueYesterday,
      revenueThisWeek,
      revenueLastWeek,
      revenueThisMonth,
      revenueLastMonth,
      
      // Pedidos por periodo
      ordersToday: ordersToday.length,
      ordersYesterday: ordersYesterday.length,
      ordersThisWeek: ordersThisWeek.length,
      ordersThisMonth: ordersThisMonth.length,
      
      // Metricas calculadas
      ticketMedio,
      uniqueCustomers,
      recurringCustomers,
      
      // Faturamento por forma de pagamento
      revenuePixAutomatic: pixAutomaticOrders.reduce((sum, o) => sum + getOrderTotal(o), 0),
      revenuePixManual: pixManualOrders.reduce((sum, o) => sum + getOrderTotal(o), 0),
      revenueDinheiro: dinheiroOrders.reduce((sum, o) => sum + getOrderTotal(o), 0),
      revenueCartao: cartaoOrders.reduce((sum, o) => sum + getOrderTotal(o), 0),
      ordersPixAutomatic: pixAutomaticOrders.length,
      ordersPixManual: pixManualOrders.length,
      ordersDinheiro: dinheiroOrders.length,
      ordersCartao: cartaoOrders.length,
      
      // Pendente
      pendingRevenue,
      
      // Top items
      topProduct,
      topNeighborhood,
      topPaymentMethod,
      topCustomer,
      
      // Graficos
      last7Days,
      last30Days,
      
      // Variacoes
      todayVsYesterday: getVariation(revenueToday, revenueYesterday),
      weekVsLastWeek: getVariation(revenueThisWeek, revenueLastWeek),
      monthVsLastMonth: getVariation(revenueThisMonth, revenueLastMonth),
      
      // Top 10
      topProducts: topProducts.slice(0, 10).map(p => ({ name: p.name, quantity: p.qty, revenue: p.revenue })),
      topCustomers: topCustomers.slice(0, 10),
    }
  }, [orders])
}
