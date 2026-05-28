"use client"

import { useState } from "react"
import { ShoppingBag, Search, Trash2, Calendar, ChevronRight, ChevronDown, ClockIcon, CheckCircle2, ChefHat, Truck, PackageCheck, Ban, AlertCircle, FolderArchive } from "lucide-react"
import type { Order } from "@/lib/config-types"

type TabType = "store" | "products" | "banner" | "hours" | "payment" | "whatsapp" | "delivery" | "coupons" | "entregadores" | "orders-pending" | "orders-paid" | "orders-preparing" | "orders-delivering" | "orders-completed" | "orders-cancelled" | "orders-abandoned" | "orders-archived" | "reports"

interface AdminOrdersCardProps {
  activeTab: TabType
  searchInput: string
  dateFilter: "today" | "yesterday" | "week" | "month" | "all"
  searchQuery: string
  activeOrdersCount: number
  ordersPendingPayment: Order[]
  ordersPaidWaiting: Order[]
  ordersPreparing: Order[]
  ordersDelivering: Order[]
  ordersCompleted: Order[]
  ordersCancelled: Order[]
  ordersAbandoned: Order[]
  ordersArchived: Order[]
  onSearchInputChange: (value: string) => void
  onDateFilterChange: (value: "today" | "yesterday" | "week" | "month" | "all") => void
  onSearch: () => void
  onClearSearch: () => void
  onTabChange: (tab: TabType) => void
}

const statusItems = [
  { id: "orders-pending" as TabType, icon: ClockIcon, label: "Aguardando Pagamento", color: "text-yellow-500", bgBadge: "bg-yellow-500/20 text-yellow-400" },
  { id: "orders-paid" as TabType, icon: CheckCircle2, label: "Aguardando Preparo", color: "text-green-500", bgBadge: "bg-green-500/20 text-green-400" },
  { id: "orders-preparing" as TabType, icon: ChefHat, label: "Em Preparacao", color: "text-blue-500", bgBadge: "bg-blue-500/20 text-blue-400" },
  { id: "orders-delivering" as TabType, icon: Truck, label: "Saiu p/ Entrega", color: "text-purple-500", bgBadge: "bg-purple-500/20 text-purple-400" },
  { id: "orders-completed" as TabType, icon: PackageCheck, label: "Finalizados", color: "text-emerald-500", bgBadge: "bg-emerald-500/20 text-emerald-400" },
  { id: "orders-cancelled" as TabType, icon: Ban, label: "Cancelados", color: "text-red-500", bgBadge: "bg-red-500/20 text-red-400" },
  { id: "orders-abandoned" as TabType, icon: AlertCircle, label: "Abandonados", color: "text-orange-500", bgBadge: "bg-orange-500/20 text-orange-400" },
  { id: "orders-archived" as TabType, icon: FolderArchive, label: "Arquivados", color: "text-slate-400", bgBadge: "bg-slate-500/20 text-slate-400" },
]

export function AdminOrdersCard({
  activeTab,
  searchInput,
  dateFilter,
  searchQuery,
  activeOrdersCount,
  ordersPendingPayment,
  ordersPaidWaiting,
  ordersPreparing,
  ordersDelivering,
  ordersCompleted,
  ordersCancelled,
  ordersAbandoned,
  ordersArchived,
  onSearchInputChange,
  onDateFilterChange,
  onSearch,
  onClearSearch,
  onTabChange,
}: AdminOrdersCardProps) {
  // Estado para controlar qual aba esta expandida (submenu)
  const [expandedTab, setExpandedTab] = useState<TabType | null>(null)

  const getBadgeCount = (id: TabType): number => {
    switch (id) {
      case "orders-pending": return ordersPendingPayment.length
      case "orders-paid": return ordersPaidWaiting.length
      case "orders-preparing": return ordersPreparing.length
      case "orders-delivering": return ordersDelivering.length
      case "orders-completed": return ordersCompleted.length
      case "orders-cancelled": return ordersCancelled.length
      case "orders-abandoned": return ordersAbandoned.length
      case "orders-archived": return ordersArchived.length
      default: return 0
    }
  }

  const getOrdersForTab = (id: TabType): Order[] => {
    switch (id) {
      case "orders-pending": return ordersPendingPayment
      case "orders-paid": return ordersPaidWaiting
      case "orders-preparing": return ordersPreparing
      case "orders-delivering": return ordersDelivering
      case "orders-completed": return ordersCompleted
      case "orders-cancelled": return ordersCancelled
      case "orders-abandoned": return ordersAbandoned
      case "orders-archived": return ordersArchived
      default: return []
    }
  }

  const handleTabClick = (tabId: TabType) => {
    // Toggle expandir/recolher
    if (expandedTab === tabId) {
      setExpandedTab(null)
    } else {
      setExpandedTab(tabId)
      onTabChange(tabId) // Tambem atualiza a aba ativa para detalhes
    }
  }

  const formatOrderCode = (order: Order): string => {
    return order.orderCode || order.id?.toString().slice(-8) || 'N/A'
  }

  return (
    <div className="bg-[#12121c]/80 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
      {/* Header do bloco Pedidos */}
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-white font-bold">Pedidos</h2>
            <p className="text-[10px] text-gray-500">Clique para expandir</p>
          </div>
        </div>
        <span className="text-xs text-gray-500">Toque para ver lista</span>
      </div>

      {/* Busca e Filtros */}
      <div className="p-4 space-y-3 border-b border-white/5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar pedido..."
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#1a1a2e] border border-white/5 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
          </div>
          <button
            onClick={onSearch}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white font-medium text-sm rounded-xl hover:bg-purple-500 transition-all"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={onClearSearch}
            className="flex items-center gap-2 px-3 py-2.5 bg-[#1a1a2e] text-gray-300 font-medium text-sm rounded-xl hover:bg-[#252538] transition-all border border-white/5"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Filtro por periodo */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value as typeof dateFilter)}
            className="flex-1 px-3 py-2.5 text-sm bg-[#1a1a2e] border border-white/5 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 appearance-none cursor-pointer"
          >
            <option value="all">Todos os periodos</option>
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
          </select>
        </div>
        {searchQuery && (
          <p className="text-xs text-center text-gray-500">
            {activeOrdersCount > 0 ? `${activeOrdersCount} pedido(s) encontrado(s)` : "Nenhum pedido encontrado"}
          </p>
        )}
      </div>

      {/* Status dos Pedidos - MENU EXPANSIVEL */}
      <div className="p-2">
        {statusItems.map((tab) => {
          const isExpanded = expandedTab === tab.id
          const orders = getOrdersForTab(tab.id)
          const count = getBadgeCount(tab.id)
          
          return (
            <div key={tab.id} className="mb-1">
              {/* Botao da Aba */}
              <button
                onClick={() => handleTabClick(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  isExpanded
                    ? "bg-primary/20 border border-primary/30"
                    : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <tab.icon className={`w-5 h-5 ${tab.color}`} />
                  <span className="text-white font-medium text-sm">{tab.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${tab.bgBadge}`}>
                    {count}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>
              
              {/* Lista de Pedidos Expandida */}
              {isExpanded && (
                <div className="mt-1 ml-2 mr-2 mb-2 p-2 bg-[#1a1a2e]/50 rounded-xl border border-white/5 max-h-[300px] overflow-y-auto">
                  {orders.length === 0 ? (
                    <p className="text-xs text-center text-gray-500 py-4">Nenhum pedido</p>
                  ) : (
                    <div className="space-y-2">
                      {orders.slice(0, 10).map((order) => (
                        <div
                          key={order.id}
                          onClick={() => onTabChange(tab.id)}
                          className="p-3 bg-[#12121c] rounded-lg border border-white/5 cursor-pointer hover:border-primary/30 transition-all"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono text-primary">#{formatOrderCode(order).slice(-8).toUpperCase()}</span>
                            <span className="text-[10px] text-gray-500">
                              {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-sm text-white font-medium truncate">{order.customerName}</p>
                          <p className="text-xs text-gray-400 truncate">{order.customerPhone}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-emerald-400 font-bold">R$ {order.total?.toFixed(2)}</span>
                            <span className="text-[10px] text-gray-500">{order.paymentMethod}</span>
                          </div>
                        </div>
                      ))}
                      {orders.length > 10 && (
                        <p className="text-xs text-center text-primary py-2 cursor-pointer hover:underline" onClick={() => onTabChange(tab.id)}>
                          Ver todos os {orders.length} pedidos
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
