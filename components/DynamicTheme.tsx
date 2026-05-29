"use client"

import { StoreCustomization, defaultCustomization } from "@/lib/config-types"

interface DynamicThemeProps {
  customization?: StoreCustomization | null
}

// Converte hex para HSL para compatibilidade com Tailwind
function hexToHsl(hex: string): string {
  // Remove # se existir
  hex = hex.replace("#", "")
  
  // Converte para RGB
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

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

export function DynamicTheme({ customization }: DynamicThemeProps) {
  // Usar defaults se nao houver customizacao
  const config = customization || defaultCustomization

  // Gerar CSS vars
  const cssVars = `
    :root {
      --primary: ${hexToHsl(config.colors.primary)};
      --primary-foreground: 0 0% 100%;
      --secondary: ${hexToHsl(config.colors.secondary)};
      --secondary-foreground: 0 0% 100%;
      --accent: ${hexToHsl(config.colors.accent)};
      --accent-foreground: 0 0% 0%;
      --background: ${hexToHsl(config.colors.background)};
      --foreground: ${hexToHsl(config.colors.foreground)};
      --card: ${hexToHsl(config.colors.card)};
      --card-foreground: ${hexToHsl(config.colors.foreground)};
      --muted: ${hexToHsl(config.colors.muted)};
      --muted-foreground: ${hexToHsl(config.colors.muted)};
      --border: ${hexToHsl(config.colors.border)};
      --input: ${hexToHsl(config.colors.border)};
      --ring: ${hexToHsl(config.colors.primary)};
      --radius: ${config.theme.borderRadius / 16}rem;
    }
  `

  return <style dangerouslySetInnerHTML={{ __html: cssVars }} />
}

// Funcao helper para buscar customizacao no servidor
export async function getCustomization(): Promise<StoreCustomization | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000"
    
    const res = await fetch(`${baseUrl}/api/customization`, {
      next: { revalidate: 60 }, // Cache por 1 minuto
    })
    
    if (!res.ok) return null
    
    const data = await res.json()
    return data.customization || null
  } catch {
    return null
  }
}
