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
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border shadow-xl shadow-black/10">
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex items-center gap-3 min-w-0 flex-1">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={displayName} 
                className="h-10 w-10 rounded-xl object-cover shadow-lg shadow-primary/20 flex-shrink-0"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-black text-primary truncate">
                {displayName}
              </h1>
              {displaySubtitle && (
                <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase truncate">
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
              className="relative p-2 bg-primary rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/40 active:scale-95 shadow-md shadow-primary/30"
            >
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-accent text-accent-foreground text-[10px] font-black min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center shadow-md ring-2 ring-card animate-[pulse_2s_ease-in-out_infinite]">
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
