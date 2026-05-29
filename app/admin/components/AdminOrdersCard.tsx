"use client"

import { useState } from "react"
import { ShoppingBag, Search, Trash2, Calendar, ChevronRight, ChevronDown, ClockIcon, CheckCircle2, ChefHat, Truck, PackageCheck, Ban, AlertCircle, FolderArchive, Link2, Send, MessageCircle, X, Loader2, Users, Phone } from "lucide-react"
import type { Order, Entregador } from "@/lib/config-types"

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
  // Callbacks de acoes
  onConfirmPayment?: (order: Order) => void
  onStartPreparing?: (order: Order) => void
  onStartDelivery?: (order: Order) => void
  onFinishOrder?: (order: Order) => void
  onCancelOrder?: (order: Order) => void
  onCopyLink?: (order: Order) => void
  onSendLink?: (order: Order) => void
  onWhatsApp?: (order: Order) => void
  onRefresh?: () => void
  formatOrderItems?: (order: Order) => string
  getOrderCode?: (order: Order) => string
  // Props para entregadores
  entregadores?: Entregador[]
  onSelectEntregador?: (order: Order, entregador: Entregador) => void
}

const statusItems = [
  { id: "orders-pending" as TabType, icon: ClockIcon, label: "Aguardando Pagamento", color: "text-yellow-500", bgBadge: "bg-yellow-500/20 text-yellow-400", statusLabel: "Aguardando Pagamento" },
  { id: "orders-paid" as TabType, icon: CheckCircle2, label: "Aguardando Preparo", color: "text-green-500", bgBadge: "bg-green-500/20 text-green-400", statusLabel: "Pago - Aguardando Preparo" },
  { id: "orders-preparing" as TabType, icon: ChefHat, label: "Em Preparacao", color: "text-blue-500", bgBadge: "bg-blue-500/20 text-blue-400", statusLabel: "Em Preparacao" },
  { id: "orders-delivering" as TabType, icon: Truck, label: "Saiu p/ Entrega", color: "text-purple-500", bgBadge: "bg-purple-500/20 text-purple-400", statusLabel: "Saiu para Entrega" },
  { id: "orders-completed" as TabType, icon: PackageCheck, label: "Finalizados", color: "text-emerald-500", bgBadge: "bg-emerald-500/20 text-emerald-400", statusLabel: "Finalizado" },
  { id: "orders-cancelled" as TabType, icon: Ban, label: "Cancelados", color: "text-red-500", bgBadge: "bg-red-500/20 text-red-400", statusLabel: "Cancelado" },
  { id: "orders-abandoned" as TabType, icon: AlertCircle, label: "Abandonados", color: "text-orange-500", bgBadge: "bg-orange-500/20 text-orange-400", statusLabel: "Abandonado" },
  { id: "orders-archived" as TabType, icon: FolderArchive, label: "Arquivados", color: "text-slate-400", bgBadge: "bg-slate-500/20 text-slate-400", statusLabel: "Arquivado" },
]

export function AdminOrdersCard({
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
  onConfirmPayment,
  onStartPreparing,
  onStartDelivery,
  onFinishOrder,
  onCancelOrder,
  onCopyLink,
  onSendLink,
  onWhatsApp,
  onRefresh,
  formatOrderItems,
  getOrderCode,
  entregadores = [],
  onSelectEntregador,
}: AdminOrdersCardProps) {
  const [expandedTab, setExpandedTab] = useState<TabType | null>(null)
  // Estado para mostrar lista de entregadores para um pedido especifico
  const [showEntregadorList, setShowEntregadorList] = useState<string | null>(null)

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
    if (expandedTab === tabId) {
      setExpandedTab(null)
    } else {
      setExpandedTab(tabId)
      onTabChange(tabId)
    }
  }

  const formatCode = (order: Order): string => {
    if (getOrderCode) return getOrderCode(order)
    return order.orderCode || order.id?.toString().slice(-8) || 'N/A'
  }

  const formatItems = (order: Order): string => {
    if (formatOrderItems) return formatOrderItems(order)
    // items e sempre string conforme o tipo Order
    return order.items || 'Sem itens'
  }

  const isDelivery = (order: Order): boolean => {
    return order.deliveryType === "entrega" || (order.address !== undefined && order.address !== null && !order.address.includes("Retirada"))
  }

  return (
    <div className="bg-[#12121c]/80 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
      {/* Header */}
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
        {onRefresh && (
          <button onClick={onRefresh} className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 text-purple-400 font-medium text-xs rounded-xl hover:bg-purple-600/30 transition-all">
            <Loader2 className="w-3 h-3" /> Atualizar
          </button>
        )}
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
          <button onClick={onSearch} className="px-4 py-2.5 bg-purple-600 text-white text-sm rounded-xl hover:bg-purple-500 transition-all">
            <Search className="w-4 h-4" />
          </button>
          <button onClick={onClearSearch} className="px-3 py-2.5 bg-[#1a1a2e] text-gray-300 text-sm rounded-xl hover:bg-[#252538] border border-white/5">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

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
            {activeOrdersCount > 0 ? `${activeOrdersCount} pedido(s)` : "Nenhum pedido"}
          </p>
        )}
      </div>

      {/* Menu Expansivel */}
      <div className="p-2">
        {statusItems.map((tab) => {
          const isExpanded = expandedTab === tab.id
          const orders = getOrdersForTab(tab.id)
          const count = getBadgeCount(tab.id)
          
          return (
            <div key={tab.id} className="mb-1">
              <button
                onClick={() => handleTabClick(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  isExpanded ? "bg-primary/20 border border-primary/30" : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <tab.icon className={`w-5 h-5 ${tab.color}`} />
                  <span className="text-white font-medium text-sm">{tab.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${tab.bgBadge}`}>{count}</span>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </div>
              </button>
              
              {/* Cards Completos Expandidos */}
              {isExpanded && (
                <div className="mt-2 space-y-3 max-h-[600px] overflow-y-auto p-2">
                  {orders.length === 0 ? (
                    <p className="text-xs text-center text-gray-500 py-8">Nenhum pedido nesta categoria</p>
                  ) : (
                    orders.map((order) => (
                      <div key={order.id} className="p-4 bg-[#1a1a2e] rounded-xl border border-white/10">
                        {/* Header do Card */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-white text-sm">{formatCode(order)}</p>
                            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString("pt-BR")}</p>
                          </div>
                          <span className={`px-2.5 py-1 text-[10px] font-medium rounded-full ${tab.bgBadge}`}>
                            {tab.statusLabel}
                          </span>
                        </div>

                        {/* Info do Cliente */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-[10px] text-gray-500">Cliente</p>
                            <p className="text-sm text-white">{order.customerName}</p>
                            <p className="text-xs text-gray-400">{order.customerPhone}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500">Total</p>
                            <p className="text-lg font-bold text-emerald-400">R$ {order.total?.toFixed(2)}</p>
                            <p className="text-[10px] text-gray-500">{order.paymentMethod}</p>
                          </div>
                        </div>

                        {/* Itens */}
                        <div className="mb-3">
                          <p className="text-[10px] text-gray-500">Itens</p>
                          <p className="text-xs text-white">{formatItems(order)}</p>
                        </div>

                        {/* Endereco */}
                        {order.address && (
                          <div className="mb-3">
                            <p className="text-[10px] text-gray-500">Endereco</p>
                            <p className="text-xs text-white">{order.address}</p>
                            {order.neighborhood && <p className="text-[10px] text-gray-500">Bairro: {order.neighborhood}</p>}
                          </div>
                        )}

                        {/* Tipo de Entrega */}
                        <div className="mb-3">
                          <span className={`px-2 py-1 text-[10px] rounded-lg ${isDelivery(order) ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {isDelivery(order) ? 'Entrega' : 'Retirada'}
                          </span>
                        </div>

                        {/* Botoes de Acao */}
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                          {/* Link / Enviar Link / WhatsApp */}
                          {onCopyLink && (
                            <button onClick={() => onCopyLink(order)} className="flex items-center gap-1 px-3 py-2 text-xs bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30">
                              <Link2 className="w-3 h-3" /> Link
                            </button>
                          )}
                          {onSendLink && (
                            <button onClick={() => onSendLink(order)} className="flex items-center gap-1 px-3 py-2 text-xs bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30">
                              <Send className="w-3 h-3" /> Enviar
                            </button>
                          )}
                          {onWhatsApp && (
                            <button onClick={() => onWhatsApp(order)} className="flex items-center gap-1 px-3 py-2 text-xs bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30">
                              <MessageCircle className="w-3 h-3" /> WhatsApp
                            </button>
                          )}

                          {/* Acoes por Status */}
                          {tab.id === "orders-pending" && onConfirmPayment && (
                            <button onClick={() => onConfirmPayment(order)} className="flex items-center gap-1 px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-500">
                              <CheckCircle2 className="w-3 h-3" /> Confirmar Pagamento
                            </button>
                          )}

                          {tab.id === "orders-paid" && onStartPreparing && (
                            <button onClick={() => onStartPreparing(order)} className="flex items-center gap-1 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-500">
                              <ChefHat className="w-3 h-3" /> Iniciar Preparo
                            </button>
                          )}

                          {tab.id === "orders-preparing" && (
                            <>
                              {isDelivery(order) ? (
                                // ENTREGA - mostrar "Selecionar Entregador"
                                <div className="relative">
                                  <button 
                                    onClick={() => setShowEntregadorList(showEntregadorList === order.id ? null : order.id)} 
                                    className="flex items-center gap-1 px-3 py-2 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-500"
                                  >
                                    <Users className="w-3 h-3" /> Selecionar Entregador
                                  </button>
                                  
                                  {/* Lista de Entregadores */}
                                  {showEntregadorList === order.id && (
                                    <div className="absolute top-full left-0 mt-1 w-64 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                                      <div className="p-2 border-b border-white/5">
                                        <p className="text-xs text-gray-400 font-medium">Escolha um entregador:</p>
                                      </div>
                                      <div className="max-h-48 overflow-y-auto">
                                        {entregadores.length === 0 ? (
                                          <p className="p-3 text-xs text-gray-500 text-center">Nenhum entregador cadastrado</p>
                                        ) : (
                                          entregadores.filter(e => e.status === "ativo").map((entregador) => (
                                            <button
                                              key={entregador.id}
                                              onClick={() => {
                                                if (onSelectEntregador) {
                                                  onSelectEntregador(order, entregador)
                                                }
                                                setShowEntregadorList(null)
                                              }}
                                              className="w-full p-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                            >
                                              <p className="text-sm text-white font-medium">{entregador.nome}</p>
                                              <div className="flex items-center gap-2 mt-1">
                                                <Phone className="w-3 h-3 text-gray-500" />
                                                <span className="text-xs text-gray-400">{entregador.whatsapp}</span>
                                              </div>
                                              {(entregador.horarioInicio || entregador.horarioFim) && (
                                                <p className="text-xs text-gray-500 mt-1">{entregador.horarioInicio} - {entregador.horarioFim}</p>
                                              )}
                                            </button>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                // RETIRADA - mostrar "Finalizar Retirada"
                                onFinishOrder && (
                                  <button onClick={() => onFinishOrder(order)} className="flex items-center gap-1 px-3 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">
                                    <PackageCheck className="w-3 h-3" /> Finalizar Retirada
                                  </button>
                                )
                              )}
                            </>
                          )}

                          {tab.id === "orders-delivering" && onFinishOrder && (
                            <button onClick={() => onFinishOrder(order)} className="flex items-center gap-1 px-3 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">
                              <PackageCheck className="w-3 h-3" /> Finalizar Entrega
                            </button>
                          )}

                          {/* Cancelar */}
                          {onCancelOrder && !["orders-completed", "orders-cancelled", "orders-archived"].includes(tab.id) && (
                            <button onClick={() => onCancelOrder(order)} className="flex items-center gap-1 px-3 py-2 text-xs bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30">
                              <X className="w-3 h-3" /> Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    ))
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
