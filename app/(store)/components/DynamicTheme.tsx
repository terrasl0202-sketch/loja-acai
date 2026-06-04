"use client"

import { useEffect, useState } from "react"
import { useStore } from "../providers/StoreProvider"

// Funcao para converter hex para HSL (mais compativel com CSS)
function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  if (!hex || !hex.startsWith('#')) return null
  
  hex = hex.replace('#', '')
  if (hex.length !== 6) return null
  
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

// Determina se uma cor e clara ou escura
function isLightColor(hex: string): boolean {
  if (!hex || !hex.startsWith('#')) return false
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

// Gera uma versao mais escura de uma cor
function darkenColor(hex: string, amount: number = 20): string {
  const hsl = hexToHSL(hex)
  if (!hsl) return hex
  const newL = Math.max(0, hsl.l - amount)
  return `hsl(${hsl.h}, ${hsl.s}%, ${newL}%)`
}

// Gera uma versao mais clara de uma cor
function lightenColor(hex: string, amount: number = 20): string {
  const hsl = hexToHSL(hex)
  if (!hsl) return hex
  const newL = Math.min(100, hsl.l + amount)
  return `hsl(${hsl.h}, ${hsl.s}%, ${newL}%)`
}

export function DynamicTheme() {
  const { siteConfig, isClient } = useStore()
  const [applied, setApplied] = useState(false)
  
  useEffect(() => {
    if (!isClient) return
    
    const colors = siteConfig.customization?.colors
    const theme = siteConfig.customization?.theme
    
    const root = document.documentElement
    
    // Aplica modo de tema (light/dark/auto)
    const applyThemeMode = (mode: 'light' | 'dark' | 'auto') => {
      root.classList.remove('light', 'dark')
      
      if (mode === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.add(prefersDark ? 'dark' : 'light')
      } else {
        root.classList.add(mode)
      }
    }
    
    // Aplica modo de tema
    if (theme?.mode) {
      applyThemeMode(theme.mode)
    } else {
      // Default: dark
      applyThemeMode('dark')
    }
    
    // Aplica cores customizadas via CSS variables
    if (colors) {
      // Primary
      if (colors.primary) {
        root.style.setProperty('--primary', colors.primary)
        root.style.setProperty('--ring', colors.primary)
        root.style.setProperty('--sidebar-primary', colors.primary)
        root.style.setProperty('--chart-1', colors.primary)
        
        // Primary foreground baseado na luminosidade
        const primaryFg = isLightColor(colors.primary) ? '#09090B' : '#FAFAFA'
        root.style.setProperty('--primary-foreground', primaryFg)
        root.style.setProperty('--sidebar-primary-foreground', primaryFg)
      }
      
      // Secondary
      if (colors.secondary) {
        root.style.setProperty('--secondary', colors.secondary)
        root.style.setProperty('--chart-2', colors.secondary)
        
        const secondaryFg = isLightColor(colors.secondary) ? '#09090B' : '#FAFAFA'
        root.style.setProperty('--secondary-foreground', secondaryFg)
      }
      
      // Accent
      if (colors.accent) {
        root.style.setProperty('--accent', colors.accent)
        root.style.setProperty('--chart-3', colors.accent)
        
        const accentFg = isLightColor(colors.accent) ? '#09090B' : '#FAFAFA'
        root.style.setProperty('--accent-foreground', accentFg)
      }
      
      // Background
      if (colors.background) {
        root.style.setProperty('--background', colors.background)
        root.style.setProperty('--sidebar', colors.background)
      }
      
      // Foreground
      if (colors.foreground) {
        root.style.setProperty('--foreground', colors.foreground)
        root.style.setProperty('--card-foreground', colors.foreground)
        root.style.setProperty('--popover-foreground', colors.foreground)
        root.style.setProperty('--sidebar-foreground', colors.foreground)
      }
      
      // Card
      if (colors.card) {
        root.style.setProperty('--card', colors.card)
        root.style.setProperty('--popover', colors.card)
        root.style.setProperty('--sidebar-accent', colors.card)
      }
      
      // Muted
      if (colors.muted) {
        root.style.setProperty('--muted', colors.muted)
        root.style.setProperty('--muted-foreground', colors.muted)
      }
      
      // Border
      if (colors.border) {
        root.style.setProperty('--border', colors.border)
        root.style.setProperty('--input', colors.border)
        root.style.setProperty('--sidebar-border', colors.border)
      }
    }
    
    // Aplica border radius
    if (theme?.borderRadius !== undefined) {
      const radius = typeof theme.borderRadius === 'number' ? theme.borderRadius : 16
      root.style.setProperty('--radius', `${radius}px`)
    }
    
    setApplied(true)
    
    // Listener para mudanca de preferencia do sistema (modo auto)
    if (theme?.mode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove('light', 'dark')
        root.classList.add(e.matches ? 'dark' : 'light')
      }
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [siteConfig.customization?.colors, siteConfig.customization?.theme, isClient])
  
  // Nao renderiza nada visualmente
  return null
}
