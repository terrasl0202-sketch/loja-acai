"use client"

import { Zap, Store, Package, Image as ImageIcon, Clock, Truck, CreditCard, MessageCircle, Tag, Users2, BarChart3, Palette, LayoutGrid } from "lucide-react"

type TabType = "store" | "products" | "categories" | "banner" | "hours" | "payment" | "whatsapp" | "delivery" | "coupons" | "entregadores" | "customization" | "orders-pending" | "orders-paid" | "orders-preparing" | "orders-delivering" | "orders-completed" | "orders-cancelled" | "orders-abandoned" | "orders-archived" | "reports"

interface AdminQuickSettingsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

const settingsItems = [
  { id: "store" as TabType, icon: Store, label: "Loja" },
  { id: "products" as TabType, icon: Package, label: "Produtos" },
  { id: "categories" as TabType, icon: LayoutGrid, label: "Categorias" },
  { id: "banner" as TabType, icon: ImageIcon, label: "Banner" },
  { id: "hours" as TabType, icon: Clock, label: "Horario" },
  { id: "delivery" as TabType, icon: Truck, label: "Entrega" },
  { id: "payment" as TabType, icon: CreditCard, label: "Pagamento" },
  { id: "whatsapp" as TabType, icon: MessageCircle, label: "WhatsApp" },
  { id: "coupons" as TabType, icon: Tag, label: "Cupons" },
  { id: "entregadores" as TabType, icon: Users2, label: "Entregadores" },
  { id: "customization" as TabType, icon: Palette, label: "Personalizacao" },
  { id: "reports" as TabType, icon: BarChart3, label: "Relatorios" },
]

export function AdminQuickSettings({ activeTab, onTabChange }: AdminQuickSettingsProps) {
  return (
    <div className="bg-[#12121c]/80 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-yellow-500" />
        <h3 className="text-white font-bold text-sm">Configuracoes Rapidas</h3>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {settingsItems.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all active:scale-95 ${
              activeTab === tab.id
                ? "bg-purple-600/20 border border-purple-500/30"
                : "bg-[#1a1a2e] border border-white/5 hover:bg-[#252538]"
            }`}
          >
            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? "text-purple-400" : "text-gray-400"}`} />
            <span className={`text-[10px] font-medium ${activeTab === tab.id ? "text-purple-300" : "text-gray-400"}`}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
