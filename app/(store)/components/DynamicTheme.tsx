"use client"

import { useEffect, useState } from "react"
import { useStore } from "../providers/StoreProvider"

// Funcao para converter hex para HSL
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
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

// Calcula luminancia relativa (WCAG)
function getLuminance(hex: string): number {
  if (!hex || !hex.startsWith('#')) return 0
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

// Determina cor de texto com contraste WCAG AA (4.5:1)
function getContrastColor(bgHex: string): string {
  const luminance = getLuminance(bgHex)
  // Se luminancia > 0.179, a cor e clara, usar texto escuro
  return luminance > 0.179 ? '#09090B' : '#FAFAFA'
}

// Gera cor muted baseada na cor de fundo
function getMutedColor(bgHex: string): string {
  const hsl = hexToHSL(bgHex)
  if (!hsl) return '#71717A'
  const luminance = getLuminance(bgHex)
  // Se fundo escuro, muted mais claro. Se fundo claro, muted mais escuro.
  const newL = luminance > 0.179 ? Math.max(30, hsl.l - 40) : Math.min(70, hsl.l + 40)
  return `hsl(${hsl.h}, ${Math.max(5, hsl.s - 30)}%, ${newL}%)`
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
    applyThemeMode(theme?.mode || 'dark')
    
    // Aplica cores customizadas via CSS variables
    if (colors) {
      // Primary com contraste automatico
      if (colors.primary) {
        root.style.setProperty('--primary', colors.primary)
        root.style.setProperty('--ring', colors.primary)
        root.style.setProperty('--sidebar-primary', colors.primary)
        root.style.setProperty('--chart-1', colors.primary)
        root.style.setProperty('--primary-foreground', getContrastColor(colors.primary))
        root.style.setProperty('--sidebar-primary-foreground', getContrastColor(colors.primary))
      }
      
      // Secondary com contraste automatico
      if (colors.secondary) {
        root.style.setProperty('--secondary', colors.secondary)
        root.style.setProperty('--chart-2', colors.secondary)
        root.style.setProperty('--secondary-foreground', getContrastColor(colors.secondary))
      }
      
      // Accent com contraste automatico
      if (colors.accent) {
        root.style.setProperty('--accent', colors.accent)
        root.style.setProperty('--chart-3', colors.accent)
        root.style.setProperty('--accent-foreground', getContrastColor(colors.accent))
      }
      
      // Background e derivados
      if (colors.background) {
        root.style.setProperty('--background', colors.background)
        root.style.setProperty('--sidebar', colors.background)
      }
      
      // Foreground (texto principal)
      if (colors.foreground) {
        root.style.setProperty('--foreground', colors.foreground)
        root.style.setProperty('--sidebar-foreground', colors.foreground)
      } else if (colors.background) {
        // Auto-derivar foreground do background
        const autoFg = getContrastColor(colors.background)
        root.style.setProperty('--foreground', autoFg)
        root.style.setProperty('--sidebar-foreground', autoFg)
      }
      
      // Card com contraste automatico
      if (colors.card) {
        root.style.setProperty('--card', colors.card)
        root.style.setProperty('--popover', colors.card)
        root.style.setProperty('--sidebar-accent', colors.card)
        root.style.setProperty('--card-foreground', getContrastColor(colors.card))
        root.style.setProperty('--popover-foreground', getContrastColor(colors.card))
        root.style.setProperty('--sidebar-accent-foreground', getContrastColor(colors.card))
      }
      
      // Muted com contraste automatico
      if (colors.muted) {
        root.style.setProperty('--muted', colors.muted)
        root.style.setProperty('--muted-foreground', getContrastColor(colors.muted))
      } else if (colors.background) {
        // Auto-derivar muted do background
        const autoMuted = getMutedColor(colors.background)
        root.style.setProperty('--muted', autoMuted)
        root.style.setProperty('--muted-foreground', getContrastColor(colors.background))
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
      const radiusMap: Record<string, string> = {
        'none': '0px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        'full': '9999px'
      }
      const radius = typeof theme.borderRadius === 'string' 
        ? radiusMap[theme.borderRadius] || '16px'
        : `${theme.borderRadius}px`
      root.style.setProperty('--radius', radius)
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
  
  return null
}
