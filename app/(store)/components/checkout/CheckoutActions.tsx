"use client"

import { Send, Loader2 } from "lucide-react"
import { formatCurrency } from "../../utils"

interface CheckoutActionsProps {
  paymentMethod: string
  total: number
  isLoading: boolean
  isDisabled: boolean
  isOrderLocked: boolean
  onSubmit: () => void
  onSendWhatsApp: () => void
}

export function CheckoutActions({
  paymentMethod,
  total,
  isLoading,
  isDisabled,
  isOrderLocked,
  onSubmit,
  onSendWhatsApp
}: CheckoutActionsProps) {
  // Para PIX, o botao de gerar PIX so aparece se nao estiver locked
  // Para outros metodos, o botao de enviar WhatsApp aparece
  
  if (isOrderLocked && paymentMethod === "pix") {
    return null // Nao mostra botao de acao quando PIX ja foi gerado
  }

  if (paymentMethod === "pix") {
    return (
      <button
        onClick={onSubmit}
        disabled={isDisabled || isLoading}
        className={`premium-btn w-full py-5 bg-gradient-to-r from-primary via-primary to-accent text-primary-foreground font-black rounded-2xl flex items-center justify-center gap-3 transition-all relative overflow-hidden ${
          isDisabled || isLoading
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:shadow-2xl hover:shadow-primary/40 active:scale-[0.98] glow-primary'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>GERANDO PIX...</span>
          </>
        ) : (
          <>
            <span className="text-xl">💠</span>
            <span>GERAR PIX - {formatCurrency(total)}</span>
          </>
        )}
      </button>
    )
  }

  // Para dinheiro ou cartao - enviar pelo WhatsApp
  return (
    <button
      onClick={onSendWhatsApp}
      disabled={isDisabled}
      className={`premium-btn w-full py-5 bg-gradient-to-r from-green-500 to-green-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all relative overflow-hidden ${
        isDisabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:shadow-2xl hover:shadow-green-500/40 active:scale-[0.98]'
      }`}
    >
      <Send className="w-5 h-5" />
      <span>ENVIAR PEDIDO - {formatCurrency(total)}</span>
    </button>
  )
}
