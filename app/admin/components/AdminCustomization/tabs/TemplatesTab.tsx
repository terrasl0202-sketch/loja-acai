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
  const [applied, setApplied] = useState<string | null>(null)

  const handleSelectTemplate = (template: StoreTemplate) => {
    setSelectedTemplate(template)
    setShowConfirm(true)
  }

  const handleConfirmApply = async () => {
    if (!selectedTemplate) return
    
    setApplying(true)
    
    // Aplicar template
    const newCustomization = applyTemplate(customization, selectedTemplate)
    
    // Simular pequeno delay para feedback visual
    await new Promise(resolve => setTimeout(resolve, 500))
    
    onApplyTemplate(newCustomization)
    setApplied(selectedTemplate.id)
    setApplying(false)
    setShowConfirm(false)
    setSelectedTemplate(null)
    
    // Limpar feedback apos 3 segundos
    setTimeout(() => setApplied(null), 3000)
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

      {/* Feedback de sucesso */}
      {applied && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
          <Check className="w-4 h-4" />
          <span className="text-sm">Template aplicado com sucesso! Salve as alteracoes para confirmar.</span>
        </div>
      )}

      {/* Grid de Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STORE_TEMPLATES.map((template) => {
          const IconComponent = ICON_MAP[template.icon] || Palette
          const isApplied = applied === template.id
          
          return (
            <div
              key={template.id}
              className={`relative overflow-hidden rounded-xl border transition-all cursor-pointer group ${
                isApplied 
                  ? "border-green-500 bg-green-500/5" 
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
                
                {/* Badge de aplicado */}
                {isApplied && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-green-500 rounded-full text-white text-xs font-medium">
                    <Check className="w-3 h-3" />
                    Aplicado
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h4 className="font-semibold text-foreground mb-1">{template.name}</h4>
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

              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm">
                  Aplicar Template
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
