"use client"

import { Check } from "lucide-react"

interface ToastProps {
  message: string
}

export function Toast({ message }: ToastProps) {
  return (
    <div className="toast animate-toast-in">
      <span className="text-sm font-medium text-foreground">{message}</span>
    </div>
  )
}

interface AddToCartToastProps {
  productName?: string
}

export function AddToCartToast({ productName }: AddToCartToastProps) {
  return (
    <div className="toast animate-toast-in flex items-center gap-2">
      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
        <Check className="w-3.5 h-3.5 text-primary" />
      </div>
      <span className="text-sm font-medium text-foreground">+1 adicionado</span>
    </div>
  )
}
