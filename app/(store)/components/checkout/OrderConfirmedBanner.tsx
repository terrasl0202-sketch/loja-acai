"use client"

import { Check } from "lucide-react"

interface OrderConfirmedBannerProps {
  onSendOrder: () => void
}

export function OrderConfirmedBanner({ onSendOrder }: OrderConfirmedBannerProps) {
  return (
    <>
      {/* Success Banner Premium */}
      <div className="relative bg-gradient-to-br from-green-500/15 via-green-500/10 to-green-500/5 border border-green-500/30 rounded-3xl p-8 text-center overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-green-500/40 animate-float">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-black text-green-400 mb-2">PAGAMENTO APROVADO</h3>
          <p className="text-green-400/70 text-sm">Seu pedido foi confirmado com sucesso!</p>
        </div>
      </div>

      {/* Send to WhatsApp Button Premium */}
      <button
        onClick={onSendOrder}
        className="premium-btn w-full py-5 bg-gradient-to-r from-green-500 to-green-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all hover:shadow-2xl hover:shadow-green-500/40 active:scale-[0.98] relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        <Check className="w-5 h-5 relative" />
        <span>ENVIAR PEDIDO CONFIRMADO</span>
      </button>
    </>
  )
}
