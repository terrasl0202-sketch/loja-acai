"use client"

import { Layout, Grid3X3, Square, CircleDot } from "lucide-react"
import { CustomizationTheme, LayoutType, BannerHeight } from "@/lib/config-types"

interface LayoutTabProps {
  theme: CustomizationTheme
  onUpdate: (updates: Partial<CustomizationTheme>) => void
}

const LAYOUT_OPTIONS: { id: LayoutType; label: string; description: string }[] = [
  { id: "classic", label: "Classico", description: "Layout tradicional e familiar" },
  { id: "modern", label: "Moderno", description: "Design contemporaneo e limpo" },
  { id: "premium", label: "Premium", description: "Elegante e sofisticado" },
  { id: "minimal", label: "Minimalista", description: "Simples e focado" },
]

const BANNER_HEIGHT_OPTIONS: { id: BannerHeight; label: string; height: string }[] = [
  { id: "small", label: "Pequeno", height: "h-32" },
  { id: "medium", label: "Medio", height: "h-48" },
  { id: "large", label: "Grande", height: "h-64" },
]

const BORDER_RADIUS_OPTIONS = [
  { value: 4, label: "Sutil" },
  { value: 8, label: "Suave" },
  { value: 12, label: "Medio" },
  { value: 16, label: "Arredondado" },
  { value: 24, label: "Muito arredondado" },
]

export function LayoutTab({ theme, onUpdate }: LayoutTabProps) {
  return (
    <div className="space-y-8">
      {/* Tipo de Layout */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Layout className="w-5 h-5 text-primary" />
            Tipo de Layout
          </h3>
          <p className="text-sm text-muted-foreground">Escolha o estilo geral da loja</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {LAYOUT_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => onUpdate({ layoutType: option.id })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                theme.layoutType === option.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 bg-card/50"
              }`}
            >
              <h4 className="font-semibold text-foreground">{option.label}</h4>
              <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Arredondamento dos Cards */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CircleDot className="w-5 h-5 text-primary" />
            Arredondamento
          </h3>
          <p className="text-sm text-muted-foreground">Define o arredondamento dos cards e botoes</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          {BORDER_RADIUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onUpdate({ borderRadius: option.value })}
              className={`px-4 py-3 border-2 transition-all ${
                theme.borderRadius === option.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
              style={{ borderRadius: option.value }}
            >
              <span className="text-sm font-medium text-foreground">{option.label}</span>
              <span className="text-xs text-muted-foreground ml-2">{option.value}px</span>
            </button>
          ))}
        </div>

        {/* Preview do arredondamento */}
        <div className="p-4 bg-secondary/30 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground mb-3">Preview</p>
          <div className="flex gap-4 items-center">
            <div
              className="w-24 h-24 bg-primary/20 border border-primary/30 flex items-center justify-center"
              style={{ borderRadius: theme.borderRadius }}
            >
              <span className="text-xs text-foreground">Card</span>
            </div>
            <div
              className="px-6 py-3 bg-primary text-primary-foreground text-sm font-medium"
              style={{ borderRadius: Math.min(theme.borderRadius, 12) }}
            >
              Botao
            </div>
            <div
              className="px-4 py-2 bg-secondary text-foreground text-sm border border-border"
              style={{ borderRadius: Math.min(theme.borderRadius, 8) }}
            >
              Input
            </div>
          </div>
        </div>
      </div>

      {/* Sombras */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Square className="w-5 h-5 text-primary" />
            Sombras
          </h3>
          <p className="text-sm text-muted-foreground">Ativar ou desativar sombras nos cards</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => onUpdate({ cardsShadow: true })}
            className={`flex-1 p-4 rounded-xl border-2 transition-all ${
              theme.cardsShadow
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="w-16 h-16 mx-auto mb-3 bg-card rounded-lg shadow-lg" style={{ borderRadius: theme.borderRadius }} />
            <h4 className="font-medium text-foreground text-center">Com sombras</h4>
          </button>
          <button
            onClick={() => onUpdate({ cardsShadow: false })}
            className={`flex-1 p-4 rounded-xl border-2 transition-all ${
              !theme.cardsShadow
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="w-16 h-16 mx-auto mb-3 bg-card rounded-lg border border-border" style={{ borderRadius: theme.borderRadius }} />
            <h4 className="font-medium text-foreground text-center">Sem sombras</h4>
          </button>
        </div>
      </div>

      {/* Altura do Banner */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-primary" />
            Altura do Banner
          </h3>
          <p className="text-sm text-muted-foreground">Define a altura do banner principal</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {BANNER_HEIGHT_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => onUpdate({ bannerHeight: option.id })}
              className={`p-4 rounded-xl border-2 transition-all ${
                theme.bannerHeight === option.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className={`w-full ${option.height} bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg mb-3`} />
              <h4 className="font-medium text-foreground text-center">{option.label}</h4>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
