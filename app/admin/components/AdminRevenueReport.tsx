"use client"

import { BarChart3, TrendingUp, TrendingDown } from "lucide-react"
import type { Order } from "@/lib/config-types"

interface AdminRevenueReportProps {
  ordersCompleted: Order[]
  ordersCancelled: Order[]
}

export function AdminRevenueReport({ ordersCompleted, ordersCancelled }: AdminRevenueReportProps) {
  // Calcular metricas
  const todayOrders = ordersCompleted.filter(o => {
    const d = new Date(o.createdAt)
    return d.toDateString() === new Date().toDateString()
  })
  const yesterdayOrders = ordersCompleted.filter(o => {
    const d = new Date(o.createdAt)
    const y = new Date()
    y.setDate(y.getDate() - 1)
    return d.toDateString() === y.toDateString()
  })
  const todayRev = todayOrders.reduce((s, o) => s + (o.total || 0), 0)
  const yestRev = yesterdayOrders.reduce((s, o) => s + (o.total || 0), 0)
  const revChange = yestRev > 0 ? ((todayRev - yestRev) / yestRev * 100).toFixed(0) : "0"
  const ordChange = yesterdayOrders.length > 0 ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length * 100).toFixed(0) : "0"
  const todayTicket = todayOrders.length > 0 ? todayRev / todayOrders.length : 0
  const yestTicket = yesterdayOrders.length > 0 ? yestRev / yesterdayOrders.length : 0
  const ticketChange = yestTicket > 0 ? ((todayTicket - yestTicket) / yestTicket * 100).toFixed(0) : "0"
  const todayCanc = ordersCancelled.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length
  const yestCanc = ordersCancelled.filter(o => {
    const y = new Date(); y.setDate(y.getDate() - 1)
    return new Date(o.createdAt).toDateString() === y.toDateString()
  }).length
  const cancChange = yestCanc > 0 ? ((todayCanc - yestCanc) / yestCanc * 100).toFixed(0) : "0"

  // Dados do grafico ultimos 7 dias
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dayOrds = ordersCompleted.filter(o => new Date(o.createdAt).toDateString() === d.toDateString())
    return {
      label: i === 6 ? 'Hoje' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      rev: dayOrds.reduce((s, o) => s + (o.total || 0), 0)
    }
  })
  const maxRev = Math.max(...days.map(d => d.rev), 100)

  return (
    <div className="bg-[#12121c]/80 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-500" />
          <h3 className="text-white font-bold text-sm">Relatorio de Faturamento</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 px-3 py-1.5 bg-[#1a1a2e] rounded-lg border border-white/5">Hoje</span>
        </div>
      </div>

      {/* Metricas com indicadores vs ontem */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-[#1a1a2e] rounded-xl p-3 border border-white/5">
          <p className="text-[10px] text-gray-500 mb-1">Faturamento</p>
          <p className="text-sm font-bold text-green-400">R$ {todayRev.toFixed(2).replace('.', ',')}</p>
          <p className={`text-[9px] flex items-center gap-0.5 ${Number(revChange) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {Number(revChange) >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {revChange}% vs ontem
          </p>
        </div>
        <div className="bg-[#1a1a2e] rounded-xl p-3 border border-white/5">
          <p className="text-[10px] text-gray-500 mb-1">Pedidos</p>
          <p className="text-sm font-bold text-white">{todayOrders.length}</p>
          <p className={`text-[9px] flex items-center gap-0.5 ${Number(ordChange) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {Number(ordChange) >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {ordChange}% vs ontem
          </p>
        </div>
        <div className="bg-[#1a1a2e] rounded-xl p-3 border border-white/5">
          <p className="text-[10px] text-gray-500 mb-1">Ticket Medio</p>
          <p className="text-sm font-bold text-purple-400">R$ {todayTicket.toFixed(2).replace('.', ',')}</p>
          <p className={`text-[9px] flex items-center gap-0.5 ${Number(ticketChange) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {Number(ticketChange) >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {ticketChange}% vs ontem
          </p>
        </div>
        <div className="bg-[#1a1a2e] rounded-xl p-3 border border-white/5">
          <p className="text-[10px] text-gray-500 mb-1">Cancelados</p>
          <p className="text-sm font-bold text-red-400">{todayCanc}</p>
          <p className={`text-[9px] flex items-center gap-0.5 ${Number(cancChange) <= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {Number(cancChange) <= 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <TrendingUp className="w-2.5 h-2.5" />}
            {Math.abs(Number(cancChange))}% vs ontem
          </p>
        </div>
      </div>

      {/* Grafico Ultimos 7 dias */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-white/5">
        <p className="text-xs text-gray-400 mb-4">Faturamento - Ultimos 7 dias</p>
        <div className="relative h-32">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3].map(i => <div key={i} className="border-t border-white/5 w-full" />)}
          </div>
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[8px] text-gray-500 pr-2">
            <span>R$ {maxRev.toFixed(0)}</span>
            <span>R$ {(maxRev * 0.66).toFixed(0)}</span>
            <span>R$ {(maxRev * 0.33).toFixed(0)}</span>
            <span>R$ 0</span>
          </div>
          <svg className="absolute inset-0 ml-10" viewBox="0 0 260 128" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`M 0 ${128 - (days[0].rev / maxRev) * 128} ${days.map((d, i) => `L ${(i / 6) * 260} ${128 - (d.rev / maxRev) * 128}`).join(' ')} L 260 128 L 0 128 Z`} fill="url(#chartGrad)" />
            <path d={`M 0 ${128 - (days[0].rev / maxRev) * 128} ${days.map((d, i) => `L ${(i / 6) * 260} ${128 - (d.rev / maxRev) * 128}`).join(' ')}`} fill="none" stroke="rgb(139, 92, 246)" strokeWidth="2" />
            {days.map((d, i) => (
              <circle key={i} cx={(i / 6) * 260} cy={128 - (d.rev / maxRev) * 128} r="4" fill="rgb(139, 92, 246)" stroke="#1a1a2e" strokeWidth="2" />
            ))}
          </svg>
          <div className="absolute bottom-0 left-10 right-0 flex justify-between text-[8px] text-gray-500 translate-y-5">
            {days.map((d, i) => <span key={i} className={i === 6 ? "text-purple-400 font-medium" : ""}>{d.label}</span>)}
          </div>
        </div>
      </div>
    </div>
  )
}
