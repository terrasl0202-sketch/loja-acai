"use client"

import { type ReactNode } from "react"
import { StoreProvider } from "./StoreProvider"
import { CustomerProvider } from "./CustomerProvider"
import { CartProvider } from "./CartProvider"
import { type SiteConfig, defaultConfig } from "@/lib/config-types"

interface StoreProvidersProps {
  children: ReactNode
  initialConfig?: SiteConfig
  products?: Array<{ id: number; name: string; price: number }>
}

export function StoreProviders({ 
  children, 
  initialConfig = defaultConfig,
  products = []
}: StoreProvidersProps) {
  return (
    <StoreProvider>
      <CustomerProvider>
        <CartProvider products={products}>
          {children}
        </CartProvider>
      </CustomerProvider>
    </StoreProvider>
  )
}
