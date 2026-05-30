"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Palette, 
  Sun, 
  Layout, 
  Sparkles, 
  Info, 
  CreditCard, 
  Eye,
  Loader2,
  Save,
  RotateCcw,
  Image,
  Images,
  Layers
} from "lucide-react"
import { StoreCustomization, defaultCustomization } from "@/lib/config-types"
import { IdentityTab } from "./tabs/IdentityTab"
import { ThemeTab } from "./tabs/ThemeTab"
import { LayoutTab } from "./tabs/LayoutTab"
import { ElementsTab } from "./tabs/ElementsTab"
import { InfoTab } from "./tabs/InfoTab"
import { PaymentsTab } from "./tabs/PaymentsTab"
import { PreviewTab } from "./tabs/PreviewTab"
import { HeroTab } from "./tabs/HeroTab"
import { BannersTab } from "./tabs/BannersTab"
import { TemplatesTab } from "./tabs/TemplatesTab"

type CustomizationTab = "templates" | "identity" | "theme" | "hero" | "banners" | "layout" | "elements" | "info" | "payments" | "preview"

const TABS: { id: CustomizationTab; label: string; icon: React.ReactNode }[] = [
  { id: "templates", label: "Templates", icon: <Layers className="w-4 h-4" /> },
  { id: "identity", label: "Identidade", icon: <Palette className="w-4 h-4" /> },
  { id: "theme", label: "Temas", icon: <Sun className="w-4 h-4" /> },
  { id: "hero", label: "Hero", icon: <Image className="w-4 h-4" /> },
  { id: "banners", label: "Banners", icon: <Images className="w-4 h-4" /> },
  { id: "layout", label: "Layout", icon: <Layout className="w-4 h-4" /> },
  { id: "elements", label: "Elementos", icon: <Sparkles className="w-4 h-4" /> },
  { id: "info", label: "Informacoes", icon: <Info className="w-4 h-4" /> },
  { id: "payments", label: "Pagamentos", icon: <CreditCard className="w-4 h-4" /> },
  { id: "preview", label: "Preview", icon: <Eye className="w-4 h-4" /> },
]

interface AdminCustomizationProps {
  onSave?: () => void
}

export function AdminCustomization({ onSave }: AdminCustomizationProps) {
  const [activeTab, setActiveTab] = useState<CustomizationTab>("templates")
  const [customization, setCustomization] = useState<StoreCustomization>(defaultCustomization)
  const [originalCustomization, setOriginalCustomization] = useState<StoreCustomization>(defaultCustomization)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Carregar configuracoes
  const loadCustomization = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/customization")
      const data = await res.json()
      
      if (data.customization) {
        setCustomization(data.customization)
        setOriginalCustomization(data.customization)
      }
    } catch (err) {
      console.error("Erro ao carregar customizacao:", err)
      setError("Erro ao carregar configuracoes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCustomization()
  }, [loadCustomization])

  // Detectar mudancas
  useEffect(() => {
    const changed = JSON.stringify(customization) !== JSON.stringify(originalCustomization)
    setHasChanges(changed)
  }, [customization, originalCustomization])

  // Salvar configuracoes
  const saveCustomization = async () => {
    try {
      setSaving(true)
      setError("")
      
      const res = await fetch("/api/customization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customization }),
      })

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setOriginalCustomization(customization)
      setSuccess("Configuracoes salvas com sucesso!")
      onSave?.()
      
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  // Resetar para original
  const resetCustomization = () => {
    setCustomization(originalCustomization)
  }

  // Atualizar secao especifica
  const updateSection = <K extends keyof StoreCustomization>(
    section: K,
    updates: Partial<StoreCustomization[K]>
  ) => {
    setCustomization(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates,
      },
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Personalizacao Premium</h2>
          <p className="text-sm text-muted-foreground">Configure a aparencia da sua loja</p>
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={resetCustomization}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Desfazer
            </button>
          )}
          <button
            onClick={saveCustomization}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar
          </button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-500">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-500">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteudo da aba */}
      <div className="min-h-[400px]">
        {activeTab === "templates" && (
          <TemplatesTab
            customization={customization}
            onApplyTemplate={(newCustomization) => {
              setCustomization(newCustomization)
              setHasChanges(true)
            }}
          />
        )}
        {activeTab === "identity" && (
          <IdentityTab
            identity={customization.identity}
            colors={customization.colors}
            storeName=""
            onUpdateIdentity={(updates) => updateSection("identity", updates)}
            onUpdateColors={(updates) => updateSection("colors", updates)}
          />
        )}
        {activeTab === "theme" && (
          <ThemeTab
            theme={customization.theme}
            onUpdate={(updates) => updateSection("theme", updates)}
          />
        )}
        {activeTab === "hero" && customization.hero && (
          <HeroTab
            hero={customization.hero}
            onUpdate={(updates) => updateSection("hero", updates)}
          />
        )}
        {activeTab === "banners" && (
          <BannersTab />
        )}
        {activeTab === "layout" && (
          <LayoutTab
            theme={customization.theme}
            onUpdate={(updates) => updateSection("theme", updates)}
          />
        )}
        {activeTab === "elements" && (
          <ElementsTab
            elements={customization.elements}
            onUpdate={(updates) => updateSection("elements", updates)}
          />
        )}
        {activeTab === "info" && (
          <InfoTab
            social={customization.social}
            onUpdate={(updates) => updateSection("social", updates)}
          />
        )}
        {activeTab === "payments" && (
          <PaymentsTab
            gateways={customization.gateways}
            onUpdate={(updates) => updateSection("gateways", updates)}
          />
        )}
        {activeTab === "preview" && (
          <PreviewTab customization={customization} />
        )}
      </div>
    </div>
  )
}
