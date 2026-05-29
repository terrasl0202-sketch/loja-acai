"use client"

import { useState } from "react"
import { Eye, Monitor, Smartphone, Tablet, RefreshCw, ExternalLink } from "lucide-react"
import { StoreCustomization } from "@/lib/config-types"

interface PreviewTabProps {
  customization: StoreCustomization
}

type DeviceType = "desktop" | "tablet" | "mobile"

const DEVICE_SIZES: Record<DeviceType, { width: string; label: string; icon: React.ReactNode }> = {
  desktop: { width: "100%", label: "Desktop", icon: <Monitor className="w-4 h-4" /> },
  tablet: { width: "768px", label: "Tablet", icon: <Tablet className="w-4 h-4" /> },
  mobile: { width: "375px", label: "Mobile", icon: <Smartphone className="w-4 h-4" /> },
}

export function PreviewTab({ customization }: PreviewTabProps) {
  const [device, setDevice] = useState<DeviceType>("desktop")
  const [refreshKey, setRefreshKey] = useState(0)

  // Gerar CSS vars para o preview
  const generateCssVars = () => {
    const { colors, theme } = customization
    return `
      --primary: ${colors.primary};
      --secondary: ${colors.secondary};
      --accent: ${colors.accent};
      --background: ${colors.background};
      --foreground: ${colors.foreground};
      --card: ${colors.card};
      --muted: ${colors.muted};
      --border: ${colors.border};
      --radius: ${theme.borderRadius}px;
    `
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleOpenInNewTab = () => {
    window.open("/", "_blank")
  }

  return (
    <div className="space-y-4">
      {/* Header do Preview */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Preview ao Vivo
          </h3>
          <p className="text-sm text-muted-foreground">Visualize as alteracoes em tempo real</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de dispositivo */}
          <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg">
            {(Object.entries(DEVICE_SIZES) as [DeviceType, typeof DEVICE_SIZES[DeviceType]][]).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setDevice(key)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  device === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {value.icon}
                <span className="hidden sm:inline">{value.label}</span>
              </button>
            ))}
          </div>

          {/* Botoes de acao */}
          <button
            onClick={handleRefresh}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            title="Atualizar preview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            title="Abrir em nova aba"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nota sobre preview */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400">
        <strong>Nota:</strong> O preview mostra como as cores ficara na loja. Para ver todas as alteracoes, salve e abra a loja em nova aba.
      </div>

      {/* Area do Preview */}
      <div className="relative bg-secondary/30 rounded-xl border border-border overflow-hidden" style={{ minHeight: "500px" }}>
        {/* Container do iframe */}
        <div 
          className="mx-auto transition-all duration-300 bg-background"
          style={{ 
            width: DEVICE_SIZES[device].width,
            maxWidth: "100%",
          }}
        >
          {/* Preview estatico com cores aplicadas */}
          <div 
            className="p-4 min-h-[500px]"
            style={{
              backgroundColor: customization.colors.background,
              color: customization.colors.foreground,
            }}
          >
            {/* Header simulado */}
            <div 
              className="p-4 mb-4 flex items-center justify-between"
              style={{ 
                backgroundColor: customization.colors.card,
                borderRadius: customization.theme.borderRadius,
                borderWidth: 1,
                borderColor: customization.colors.border,
              }}
            >
              <div className="flex items-center gap-3">
                {customization.identity.logoUrl ? (
                  <img 
                    src={customization.identity.logoUrl} 
                    alt="Logo" 
                    className="w-10 h-10 object-contain"
                    style={{ borderRadius: customization.theme.borderRadius / 2 }}
                  />
                ) : (
                  <div 
                    className="w-10 h-10 flex items-center justify-center text-white font-bold"
                    style={{ 
                      backgroundColor: customization.colors.primary,
                      borderRadius: customization.theme.borderRadius / 2,
                    }}
                  >
                    L
                  </div>
                )}
                <div>
                  <div className="font-bold" style={{ color: customization.colors.foreground }}>
                    Sua Loja
                  </div>
                  <div className="text-xs" style={{ color: customization.colors.muted }}>
                    Acai Premium
                  </div>
                </div>
              </div>
              <div 
                className="p-2 flex items-center gap-1 text-white"
                style={{ 
                  backgroundColor: customization.colors.primary,
                  borderRadius: customization.theme.borderRadius / 2,
                }}
              >
                <span className="text-sm font-medium">0</span>
              </div>
            </div>

            {/* Banner simulado */}
            <div 
              className="p-6 mb-4 text-center"
              style={{ 
                background: `linear-gradient(135deg, ${customization.colors.primary}40, ${customization.colors.secondary}40)`,
                borderRadius: customization.theme.borderRadius,
              }}
            >
              <div 
                className="text-2xl font-bold mb-2"
                style={{ color: customization.colors.foreground }}
              >
                Bem-vindo!
              </div>
              <div 
                className="text-sm"
                style={{ color: customization.colors.muted }}
              >
                Os melhores produtos para voce
              </div>
            </div>

            {/* Produtos simulados */}
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i}
                  style={{ 
                    backgroundColor: customization.colors.card,
                    borderRadius: customization.theme.borderRadius,
                    borderWidth: 1,
                    borderColor: customization.colors.border,
                    boxShadow: customization.theme.cardsShadow ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                  }}
                >
                  <div 
                    className="aspect-square"
                    style={{ 
                      backgroundColor: customization.colors.border,
                      borderTopLeftRadius: customization.theme.borderRadius,
                      borderTopRightRadius: customization.theme.borderRadius,
                    }}
                  />
                  <div className="p-3">
                    <div 
                      className="font-medium text-sm mb-1"
                      style={{ color: customization.colors.foreground }}
                    >
                      Produto {i}
                    </div>
                    <div 
                      className="text-lg font-bold"
                      style={{ color: customization.colors.primary }}
                    >
                      R$ 19,90
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Botao flutuante simulado */}
            <div 
              className="fixed bottom-4 right-4 px-4 py-3 text-white font-medium flex items-center gap-2"
              style={{ 
                backgroundColor: customization.colors.primary,
                borderRadius: customization.theme.borderRadius,
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              Ver Carrinho
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
