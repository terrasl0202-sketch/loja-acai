"use client"

import { ShoppingCart, User, Star, Package, LogOut } from "lucide-react"
import type { Customer } from "@/lib/config-types"

interface StoreHeaderProps {
  storeName: string
  storeSubtitle?: string
  logoUrl?: string
  customer: Customer | null
  showProfileMenu: boolean
  cartItemsCount: number
  onToggleProfileMenu: () => void
  onCloseProfileMenu: () => void
  onToggleCart: () => void
  onOpenMyAccount: () => void
  onOpenMyOrders: () => void
  onLogout: () => void
  onOpenLogin: () => void
}

export function StoreHeader({
  storeName,
  storeSubtitle,
  logoUrl,
  customer,
  showProfileMenu,
  cartItemsCount,
  onToggleProfileMenu,
  onCloseProfileMenu,
  onToggleCart,
  onOpenMyAccount,
  onOpenMyOrders,
  onLogout,
  onOpenLogin
}: StoreHeaderProps) {
  // Dados vem via props do page.tsx (fonte unica de verdade)
  const displayName = storeName || ''
  const displaySubtitle = storeSubtitle || ''

  return (
    <header className="sticky top-0 z-50 glass-header transition-all duration-300">
      <div className="max-w-lg mx-auto px-4 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex items-center gap-3.5 min-w-0 flex-1">
            {logoUrl ? (
              <div className="relative flex-shrink-0">
                <img 
                  src={logoUrl} 
                  alt={displayName} 
                  className="h-14 w-14 rounded-2xl object-cover ring-2 ring-border/50 transition-all duration-300 hover:scale-105 hover:ring-primary/50"
                />
                <div className="absolute inset-0 rounded-2xl shadow-xl shadow-black/20" />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-foreground truncate tracking-tight">
                {displayName}
              </h1>
              {displaySubtitle && (
                <p className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase truncate mt-0.5">
                  {displaySubtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Icone de Perfil/Conta */}
            <div className="relative">
              <button
                onClick={onToggleProfileMenu}
                className={`p-2.5 rounded-xl transition-all duration-300 ${
                  customer 
                    ? "bg-primary/15 text-primary hover:bg-primary/25 shadow-lg shadow-primary/20 ring-1 ring-primary/30" 
                    : "bg-card text-foreground hover:bg-card/80 hover:text-primary border border-border"
                }`}
              >
                <User className="w-5 h-5" />
                {customer?.isVip && (
                  <Star className="absolute -top-0.5 -right-0.5 w-3 h-3 text-yellow-500 fill-yellow-500" />
                )}
              </button>
              
              {/* Menu dropdown */}
              {showProfileMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={onCloseProfileMenu}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-card rounded-xl border border-border shadow-xl z-50 overflow-hidden">
                    {customer ? (
                      <>
                        <div className="p-3 border-b border-border bg-card">
                          <p className="font-medium text-foreground flex items-center gap-2">
                            {customer.name}
                            {customer.isVip && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-600 px-1.5 py-0.5 rounded">VIP</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{customer.phone}</p>
                        </div>
                        <div className="py-1 bg-card">
                          <button
                            onClick={onOpenMyAccount}
                            className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-primary/10 flex items-center gap-3"
                          >
                            <User className="w-4 h-4" />
                            Minha Conta
                          </button>
                          <button
                            onClick={onOpenMyOrders}
                            className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-primary/10 flex items-center gap-3"
                          >
                            <Package className="w-4 h-4" />
                            Meus Pedidos
                          </button>
                          <button
                            onClick={onLogout}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-3"
                          >
                            <LogOut className="w-4 h-4" />
                            Sair
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="py-1 bg-card">
                        <button
                          onClick={onOpenLogin}
                          className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-primary/10 flex items-center gap-3"
                        >
                          <User className="w-4 h-4" />
                          Entrar / Criar Conta
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* Carrinho */}
            <button
              onClick={onToggleCart}
              className="relative p-2.5 bg-primary rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 glow-soft"
            >
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-[10px] font-black min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center shadow-lg ring-2 ring-card animate-scaleIn">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
