"use client"

import { Check, ShoppingCart, AlertCircle } from "lucide-react"

interface ToastProps {
  message: string
  type?: "success" | "error" | "info"
}

export function Toast({ message, type = "info" }: ToastProps) {
  const iconMap = {
    success: <Check className="w-4 h-4 text-green-400" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
    info: <Check className="w-4 h-4 text-primary" />
  }
  
  const bgMap = {
    success: "bg-green-500/15 border-green-500/30",
    error: "bg-red-500/15 border-red-500/30",
    info: "bg-card border-border"
  }
  
  return (
    <div className={`toast animate-toast-in flex items-center gap-3 ${bgMap[type]}`}>
      <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center shrink-0">
        {iconMap[type]}
      </div>
      <span className="text-sm font-medium text-foreground">{message}</span>
    </div>
  )
}

interface AddToCartToastProps {
  productName?: string
}

export function AddToCartToast({ productName }: AddToCartToastProps) {
  return (
    <div className="toast animate-toast-in flex items-center gap-3 bg-primary/10 border-primary/30">
      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
        <ShoppingCart className="w-4 h-4 text-primary" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-bold text-foreground">Adicionado ao carrinho</span>
        {productName && (
          <span className="text-xs text-muted-foreground line-clamp-1">{productName}</span>
        )}
      </div>
    </div>
  )
}
