"use client"

import { useState } from "react"
import { 
  Grape, 
  Utensils, 
  Beef, 
  Pizza, 
  IceCreamCone, 
  Coffee,
  Check,
  AlertTriangle,
  Loader2,
  Palette
} from "lucide-react"
import { STORE_TEMPLATES, StoreTemplate, applyTemplate } from "@/lib/templates"
import { StoreCustomization } from "@/lib/config-types"
import { toast } from "sonner"

interface TemplatesTabProps {
  customization: StoreCustomization
  onApplyTemplate: (newCustomization: StoreCustomization) => void
}

// Mapeamento de icones
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "grape": Grape,
  "utensils": Utensils,
  "beef": Beef,
  "pizza": Pizza,
  "ice-cream-cone": IceCreamCone,
  "coffee": Coffee,
}

export function TemplatesTab({ customization, onApplyTemplate }: TemplatesTabProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<StoreTemplate | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [applying, setApplying] = useState(false)

  // Tema ativo vem do customization (persistido no banco)
  const activeTemplateId = customization.theme?.activeTemplateId

  const handleSelectTemplate = (template: StoreTemplate) => {
    // Se clicar no tema ja ativo, mostra toast e nao faz nada
    if (activeTemplateId === template.id) {
      toast.info("Este tema ja esta aplicado.")
      return
    }
    
    setSelectedTemplate(template)
    setShowConfirm(true)
  }

  const handleConfirmApply = async () => {
    if (!selectedTemplate) return
    
    setApplying(true)
    
    // Aplicar template e incluir o activeTemplateId no theme
    const newCustomization = applyTemplate(customization, selectedTemplate)
    newCustomization.theme.activeTemplateId = selectedTemplate.id
    
    // Simular pequeno delay para feedback visual
    await new Promise(resolve => setTimeout(resolve, 500))
    
    onApplyTemplate(newCustomization)
    setApplying(false)
    setShowConfirm(false)
    setSelectedTemplate(null)
    
    toast.success(`Template "${selectedTemplate.name}" aplicado! Clique em Salvar para confirmar.`)
  }

  const handleCancelApply = () => {
    setShowConfirm(false)
    setSelectedTemplate(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Palette className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Templates Profissionais</h3>
          <p className="text-sm text-muted-foreground">
            Aplique um template para configurar rapidamente as cores e textos da sua loja
          </p>
        </div>
      </div>

      {/* Indicador de tema ativo */}
      {activeTemplateId && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
          <Check className="w-4 h-4" />
          <span className="text-sm">
            Tema ativo: <strong>{STORE_TEMPLATES.find(t => t.id === activeTemplateId)?.name || activeTemplateId}</strong>
          </span>
        </div>
      )}

      {/* Grid de Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STORE_TEMPLATES.map((template) => {
          const IconComponent = ICON_MAP[template.icon] || Palette
          const isActive = activeTemplateId === template.id
          
          return (
            <div
              key={template.id}
              className={`relative overflow-hidden rounded-xl border-2 transition-all cursor-pointer group ${
                isActive 
                  ? "border-green-500 bg-green-500/5 ring-2 ring-green-500/20" 
                  : "border-border bg-card hover:border-primary/50 hover:bg-card/80"
              }`}
              onClick={() => !applying && handleSelectTemplate(template)}
            >
              {/* Preview de Cores */}
              <div className="h-20 relative overflow-hidden">
                <div 
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${template.previewColors.primary} 0%, ${template.previewColors.secondary} 50%, ${template.previewColors.accent} 100%)`
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                
                {/* Icone */}
                <div className="absolute bottom-2 left-3">
                  <div 
                    className="p-2 rounded-lg shadow-lg"
                    style={{ backgroundColor: template.previewColors.primary }}
                  >
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                </div>
                
                {/* Badge de tema atual (permanente) */}
                {isActive && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-green-500 rounded-full text-white text-xs font-medium shadow-lg">
                    <Check className="w-3 h-3" />
                    Tema Atual
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  {template.name}
                  {isActive && (
                    <span className="text-xs text-green-500">(Ativo)</span>
                  )}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                
                {/* Preview de cores em circulos */}
                <div className="flex gap-1.5 mt-3">
                  <div 
                    className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: template.previewColors.primary }}
                    title="Cor primaria"
                  />
                  <div 
                    className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: template.previewColors.secondary }}
                    title="Cor secundaria"
                  />
                  <div 
                    className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: template.previewColors.accent }}
                    title="Cor de destaque"
                  />
                </div>
              </div>

              {/* Hover overlay - diferente para tema ativo */}
              <div className={`absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'bg-green-900/50' : ''}`}>
                <span className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  isActive 
                    ? 'bg-green-500 text-white'
                    : 'bg-primary text-primary-foreground'
                }`}>
                  {isActive ? 'Tema Atual' : 'Aplicar Template'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-yellow-500 mb-1">O que sera alterado</p>
          <ul className="text-muted-foreground space-y-1">
            <li>Cores do tema (primaria, secundaria, destaque)</li>
            <li>Textos do Hero Banner (titulo, subtitulo, badges)</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Seus produtos, pedidos, categorias e demais configuracoes permanecerao intactos.
          </p>
        </div>
      </div>

      {/* Modal de Confirmacao */}
      {showConfirm && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header com preview */}
            <div 
              className="h-24 relative"
              style={{
                background: `linear-gradient(135deg, ${selectedTemplate.previewColors.primary} 0%, ${selectedTemplate.previewColors.secondary} 50%, ${selectedTemplate.previewColors.accent} 100%)`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
              <div className="absolute bottom-4 left-4">
                <div 
                  className="p-3 rounded-xl shadow-lg"
                  style={{ backgroundColor: selectedTemplate.previewColors.primary }}
                >
                  {(() => {
                    const Icon = ICON_MAP[selectedTemplate.icon] || Palette
                    return <Icon className="w-6 h-6 text-white" />
                  })()}
                </div>
              </div>
            </div>

            {/* Conteudo */}
            <div className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-2">
                Aplicar template {selectedTemplate.name}?
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                As cores e textos do Hero serao atualizados. Voce precisara clicar em Salvar para confirmar as alteracoes.
              </p>

              {/* Botoes */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelApply}
                  disabled={applying}
                  className="flex-1 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmApply}
                  disabled={applying}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {applying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Aplicar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
