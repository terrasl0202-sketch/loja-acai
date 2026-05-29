"use client"

import { useState } from "react"
import { Upload, Image, Palette, X } from "lucide-react"
import { CustomizationIdentity, CustomizationColors } from "@/lib/config-types"

interface IdentityTabProps {
  identity: CustomizationIdentity
  colors: CustomizationColors
  storeName: string
  onUpdateIdentity: (updates: Partial<CustomizationIdentity>) => void
  onUpdateColors: (updates: Partial<CustomizationColors>) => void
}

// Cores predefinidas para selecao rapida
const PRESET_COLORS = [
  { name: "Roxo", value: "#a855f7" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#22c55e" },
  { name: "Vermelho", value: "#ef4444" },
  { name: "Laranja", value: "#f97316" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Ciano", value: "#06b6d4" },
  { name: "Amarelo", value: "#eab308" },
]

export function IdentityTab({ identity, colors, onUpdateIdentity, onUpdateColors }: IdentityTabProps) {
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  // Funcao para upload de imagem (placeholder - implementar com Vercel Blob)
  const handleImageUpload = async (
    file: File,
    type: "logo" | "favicon" | "cover"
  ) => {
    // TODO: Implementar upload real com Vercel Blob
    // Por enquanto, apenas mostra URL da imagem se for URL valida
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (type === "logo") {
        onUpdateIdentity({ logoUrl: dataUrl })
      } else if (type === "favicon") {
        onUpdateIdentity({ faviconUrl: dataUrl })
      } else {
        onUpdateIdentity({ coverImageUrl: dataUrl })
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-8">
      {/* Secao: Imagens */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Image className="w-5 h-5 text-primary" />
          Imagens da Loja
        </h3>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Logo */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Logo Principal</label>
            <div className="relative aspect-square bg-secondary/50 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors overflow-hidden">
              {identity.logoUrl ? (
                <>
                  <img
                    src={identity.logoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain p-4"
                  />
                  <button
                    onClick={() => onUpdateIdentity({ logoUrl: "" })}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center h-full cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Upload Logo</span>
                  <span className="text-xs text-muted-foreground/70">PNG, JPG</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, "logo")
                    }}
                  />
                </label>
              )}
            </div>
            <input
              type="text"
              value={identity.logoUrl}
              onChange={(e) => onUpdateIdentity({ logoUrl: e.target.value })}
              placeholder="Ou cole URL da imagem"
              className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Favicon */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Favicon</label>
            <div className="relative aspect-square bg-secondary/50 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors overflow-hidden">
              {identity.faviconUrl ? (
                <>
                  <img
                    src={identity.faviconUrl}
                    alt="Favicon"
                    className="w-full h-full object-contain p-4"
                  />
                  <button
                    onClick={() => onUpdateIdentity({ faviconUrl: "" })}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center h-full cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Upload Favicon</span>
                  <span className="text-xs text-muted-foreground/70">ICO, PNG 32x32</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, "favicon")
                    }}
                  />
                </label>
              )}
            </div>
            <input
              type="text"
              value={identity.faviconUrl}
              onChange={(e) => onUpdateIdentity({ faviconUrl: e.target.value })}
              placeholder="Ou cole URL da imagem"
              className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Cover */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Imagem de Capa</label>
            <div className="relative aspect-square bg-secondary/50 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors overflow-hidden">
              {identity.coverImageUrl ? (
                <>
                  <img
                    src={identity.coverImageUrl}
                    alt="Capa"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => onUpdateIdentity({ coverImageUrl: "" })}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center h-full cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Upload Capa</span>
                  <span className="text-xs text-muted-foreground/70">1200x600 recomendado</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, "cover")
                    }}
                  />
                </label>
              )}
            </div>
            <input
              type="text"
              value={identity.coverImageUrl}
              onChange={(e) => onUpdateIdentity({ coverImageUrl: e.target.value })}
              placeholder="Ou cole URL da imagem"
              className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Secao: Cores */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          Cores da Marca
        </h3>

        {/* Cores predefinidas */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Cores rapidas (cor principal)</label>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => onUpdateColors({ primary: color.value })}
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  colors.primary === color.value
                    ? "border-white ring-2 ring-primary scale-110"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* Grid de cores customizaveis */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <ColorInput
            label="Cor Principal"
            value={colors.primary}
            onChange={(v) => onUpdateColors({ primary: v })}
          />
          <ColorInput
            label="Cor Secundaria"
            value={colors.secondary}
            onChange={(v) => onUpdateColors({ secondary: v })}
          />
          <ColorInput
            label="Cor de Destaque"
            value={colors.accent}
            onChange={(v) => onUpdateColors({ accent: v })}
          />
          <ColorInput
            label="Cor de Fundo"
            value={colors.background}
            onChange={(v) => onUpdateColors({ background: v })}
          />
          <ColorInput
            label="Cor do Texto"
            value={colors.foreground}
            onChange={(v) => onUpdateColors({ foreground: v })}
          />
          <ColorInput
            label="Cor dos Cards"
            value={colors.card}
            onChange={(v) => onUpdateColors({ card: v })}
          />
          <ColorInput
            label="Cor Secundaria Texto"
            value={colors.muted}
            onChange={(v) => onUpdateColors({ muted: v })}
          />
          <ColorInput
            label="Cor das Bordas"
            value={colors.border}
            onChange={(v) => onUpdateColors({ border: v })}
          />
        </div>

        {/* Preview das cores */}
        <div className="p-4 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground mb-3">Preview das cores</p>
          <div className="flex gap-3">
            <div
              className="flex-1 h-20 rounded-lg flex items-center justify-center text-sm font-medium"
              style={{ backgroundColor: colors.primary, color: colors.foreground }}
            >
              Primaria
            </div>
            <div
              className="flex-1 h-20 rounded-lg flex items-center justify-center text-sm font-medium"
              style={{ backgroundColor: colors.secondary, color: colors.foreground }}
            >
              Secundaria
            </div>
            <div
              className="flex-1 h-20 rounded-lg flex items-center justify-center text-sm font-medium"
              style={{ backgroundColor: colors.accent, color: colors.background }}
            >
              Destaque
            </div>
            <div
              className="flex-1 h-20 rounded-lg flex items-center justify-center text-sm font-medium border"
              style={{ backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }}
            >
              Card
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente auxiliar para input de cor
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 text-sm bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
        />
      </div>
    </div>
  )
}
