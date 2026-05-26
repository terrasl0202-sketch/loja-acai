"use client"

import { AlertCircle } from "lucide-react"

interface OrderBlockedBannerProps {
  onNewOrder: () => void
}

export function OrderBlockedBanner({ onNewOrder }: OrderBlockedBannerProps) {
  return (
    <div className="relative bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-5 overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="flex items-start gap-4 relative">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <p className="text-amber-400 font-black text-sm">Pedido bloqueado</p>
          <p className="text-muted-foreground text-xs mt-1">
            Para alterar itens ou bairro, cancele este pedido e comece um novo.
          </p>
          <button
            onClick={onNewOrder}
            className="mt-3 px-5 py-2.5 bg-gradient-to-r from-amber-500/20 to-amber-500/10 text-amber-400 rounded-xl text-sm font-bold hover:from-amber-500/30 hover:to-amber-500/20 transition-all border border-amber-500/30 active:scale-[0.98]"
          >
            Fazer novo pedido
          </button>
        </div>
      </div>
    </div>
  )
}
