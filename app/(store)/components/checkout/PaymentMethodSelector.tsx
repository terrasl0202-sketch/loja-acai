"use client"

import { CreditCard, Clock } from "lucide-react"

interface PaymentMethodSelectorProps {
  selectedMethod: string
  onSelect: (method: string) => void
  isLocked?: boolean
  isInCooldown?: boolean
  cooldownLeft?: number
  onResetPixState?: () => void
}

export function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  isLocked = false,
  isInCooldown = false,
  cooldownLeft = 0,
  onResetPixState
}: PaymentMethodSelectorProps) {
  const handleSelect = (method: string) => {
    onSelect(method)
    if (!isInCooldown && onResetPixState) {
      onResetPixState()
    }
  }

  if (isLocked) {
    return null
  }

  return (
    <section className="premium-card rounded-2xl p-5 space-y-5 animate-scale-in" style={{ animationDelay: '0.2s' }}>
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-primary" />
        </div>
        Forma de Pagamento
      </h3>
      
      {/* Payment Options Premium */}
      <div className="grid grid-cols-3 gap-3">
        {/* PIX Card */}
        <button
          onClick={() => handleSelect("pix")}
          className={`relative py-5 px-3 rounded-2xl text-center font-bold transition-all duration-300 flex flex-col items-center gap-2 overflow-hidden group ${
            selectedMethod === "pix"
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20 border-2 border-primary/50 scale-[1.02]"
              : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-border/40 hover:border-primary/40"
          }`}
        >
          <span className="text-2xl relative">💠</span>
          <span className="text-sm relative font-bold">Pix</span>
          <span className={`text-[10px] relative font-medium ${selectedMethod === "pix" ? 'text-primary-foreground/90' : 'text-foreground/50'}`}>
            Pagamento automatico
          </span>
        </button>
        
        {/* Dinheiro Card */}
        <button
          onClick={() => handleSelect("dinheiro")}
          className={`relative py-5 px-3 rounded-2xl text-center font-bold transition-all duration-300 flex flex-col items-center gap-2 ${
            selectedMethod === "dinheiro"
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20 border-2 border-primary/50 scale-[1.02]"
              : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-border/40 hover:border-primary/40"
          }`}
        >
          <span className="text-2xl">💵</span>
          <span className="text-sm font-bold">Dinheiro</span>
          <span className={`text-[10px] font-medium ${selectedMethod === "dinheiro" ? 'text-primary-foreground/90' : 'text-foreground/50'}`}>
            Pagamento na entrega
          </span>
        </button>
        
        {/* Cartao Card */}
        <button
          onClick={() => handleSelect("cartao")}
          className={`relative py-5 px-3 rounded-2xl text-center font-bold transition-all duration-300 flex flex-col items-center gap-2 ${
            selectedMethod === "cartao"
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20 border-2 border-primary/50 scale-[1.02]"
              : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-border/40 hover:border-primary/40"
          }`}
        >
          <span className="text-2xl">💳</span>
          <span className="text-sm font-bold">Cartao</span>
          <span className={`text-[10px] font-medium ${selectedMethod === "cartao" ? 'text-primary-foreground/90' : 'text-foreground/50'}`}>
            Pagamento na entrega
          </span>
        </button>
      </div>

      {/* Card de cooldown */}
      {isInCooldown && (
        <div className="relative bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <p className="text-amber-400 text-sm text-center relative flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            Novo PIX automatico em:{" "}
            <span className="font-mono font-black text-base bg-amber-500/20 px-2 py-0.5 rounded-lg">
              {Math.floor(cooldownLeft / 60).toString().padStart(2, '0')}:{(cooldownLeft % 60).toString().padStart(2, '0')}
            </span>
          </p>
        </div>
      )}
    </section>
  )
}
