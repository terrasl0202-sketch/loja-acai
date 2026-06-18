"use client"

import { useState } from "react"
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
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [logoError, setLogoError] = useState(false)
  
  const displayName = storeName || ''
  const displaySubtitle = storeSubtitle || ''

  return (
    <header 
      className="sticky top-0 z-50 transition-all duration-300"
      style={{ 
        backgroundColor: 'var(--card)', 
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex items-center gap-3 min-w-0 flex-1">
            {logoUrl && !logoError ? (
              <div className="relative flex-shrink-0">
                {!logoLoaded && (
                  <div className="h-12 w-12 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
                )}
                <img 
                  src={logoUrl} 
                  alt={displayName} 
                  className={`h-12 w-12 rounded-xl object-cover transition-all duration-300 ${
                    logoLoaded ? 'opacity-100' : 'opacity-0 absolute'
                  }`}
                  style={{ border: '1px solid var(--border)' }}
                  onLoad={() => setLogoLoaded(true)}
                  onError={() => { setLogoError(true); setLogoLoaded(true); }}
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold truncate" style={{ color: 'var(--foreground)' }}>
                {displayName}
              </h1>
              {displaySubtitle && (
                <p className="text-xs font-medium truncate mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  {displaySubtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Icone de Perfil/Conta */}
            <div className="relative">
              <button
                onClick={onToggleProfileMenu}
                className="p-2 rounded-xl transition-all duration-200"
                style={customer ? {
                  backgroundColor: 'color-mix(in oklch, var(--primary) 15%, transparent)',
                  color: 'var(--primary)',
                  border: '1px solid color-mix(in oklch, var(--primary) 30%, transparent)'
                } : {
                  backgroundColor: 'var(--card)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)'
                }}
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
                  <div 
                    className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl z-50 overflow-hidden"
                    style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                  >
                    {customer ? (
                      <>
                        <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
                          <p className="font-medium flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                            {customer.name}
                            {customer.isVip && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-600 px-1.5 py-0.5 rounded">VIP</span>
                            )}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{customer.phone}</p>
                        </div>
                        <div className="py-1">
                          <button
                            onClick={onOpenMyAccount}
                            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors hover:bg-primary/10"
                            style={{ color: 'var(--foreground)' }}
                          >
                            <User className="w-4 h-4" />
                            Minha Conta
                          </button>
                          <button
                            onClick={onOpenMyOrders}
                            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors hover:bg-primary/10"
                            style={{ color: 'var(--foreground)' }}
                          >
                            <Package className="w-4 h-4" />
                            Meus Pedidos
                          </button>
                          <button
                            onClick={onLogout}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-500 flex items-center gap-3 transition-colors hover:bg-red-500/10"
                          >
                            <LogOut className="w-4 h-4" />
                            Sair
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="py-1">
                        <button
                          onClick={onOpenLogin}
                          className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors hover:bg-primary/10"
                          style={{ color: 'var(--foreground)' }}
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
              className="relative p-2 rounded-xl transition-all duration-200"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemsCount > 0 && (
                <span 
                  className="absolute -top-1.5 -right-1.5 text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
                >
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
