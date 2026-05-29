"use client"

import { Sparkles, Award, Zap, Clock, Eye, EyeOff, Star, Tag } from "lucide-react"
import { CustomizationElements } from "@/lib/config-types"

interface ElementsTabProps {
  elements: CustomizationElements
  onUpdate: (updates: Partial<CustomizationElements>) => void
}

export function ElementsTab({ elements, onUpdate }: ElementsTabProps) {
  return (
    <div className="space-y-8">
      {/* Badges de Produtos */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Selos nos Produtos
          </h3>
          <p className="text-sm text-muted-foreground">Ativar ou desativar selos de destaque</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ToggleCard
            icon={<Star className="w-5 h-5" />}
            title="Mais Vendido"
            description="Mostra selo nos produtos mais vendidos"
            active={elements.showBestsellerBadge}
            onToggle={() => onUpdate({ showBestsellerBadge: !elements.showBestsellerBadge })}
            badgePreview={
              <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                MAIS VENDIDO
              </span>
            }
          />
          <ToggleCard
            icon={<Tag className="w-5 h-5" />}
            title="Promocao"
            description="Mostra selo em produtos com desconto"
            active={elements.showPromoBadge}
            onToggle={() => onUpdate({ showPromoBadge: !elements.showPromoBadge })}
            badgePreview={
              <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                PROMO
              </span>
            }
          />
          <ToggleCard
            icon={<Zap className="w-5 h-5" />}
            title="Novo"
            description="Mostra selo em produtos novos"
            active={elements.showNewBadge}
            onToggle={() => onUpdate({ showNewBadge: !elements.showNewBadge })}
            badgePreview={
              <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
                NOVO
              </span>
            }
          />
        </div>
      </div>

      {/* Secoes da Loja */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Secoes da Loja
          </h3>
          <p className="text-sm text-muted-foreground">Escolha quais secoes exibir</p>
        </div>

        <div className="space-y-3">
          <ToggleRow
            title="Banner Promocional"
            description="Exibe o banner no topo da loja"
            active={elements.showPromoBanner}
            onToggle={() => onUpdate({ showPromoBanner: !elements.showPromoBanner })}
          />
          <ToggleRow
            title="Secao Mais Vendidos"
            description="Mostra produtos mais vendidos em destaque"
            active={elements.showBestsellersSection}
            onToggle={() => onUpdate({ showBestsellersSection: !elements.showBestsellersSection })}
          />
          <ToggleRow
            title="Secao Destaques"
            description="Mostra produtos em destaque"
            active={elements.showFeaturedSection}
            onToggle={() => onUpdate({ showFeaturedSection: !elements.showFeaturedSection })}
          />
          <ToggleRow
            title="Categorias"
            description="Exibe navegacao por categorias"
            active={elements.showCategories}
            onToggle={() => onUpdate({ showCategories: !elements.showCategories })}
          />
          <ToggleRow
            title="Avaliacoes"
            description="Mostra estrelas de avaliacao"
            active={elements.showReviews}
            onToggle={() => onUpdate({ showReviews: !elements.showReviews })}
          />
          <ToggleRow
            title="Descricoes dos Produtos"
            description="Exibe descricao abaixo do nome"
            active={elements.showDescriptions}
            onToggle={() => onUpdate({ showDescriptions: !elements.showDescriptions })}
          />
        </div>
      </div>

      {/* Mensagem Promocional */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Mensagem Promocional
          </h3>
          <p className="text-sm text-muted-foreground">Exibe uma faixa promocional no topo</p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={elements.promoMessage}
            onChange={(e) => onUpdate({ promoMessage: e.target.value })}
            placeholder="Ex: Frete gratis acima de R$ 50 | Cupom PROMO10"
            className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          
          {elements.promoMessage && (
            <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-medium rounded-lg">
              {elements.promoMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente auxiliar para toggle em card
function ToggleCard({
  icon,
  title,
  description,
  active,
  onToggle,
  badgePreview,
}: {
  icon: React.ReactNode
  title: string
  description: string
  active: boolean
  onToggle: () => void
  badgePreview?: React.ReactNode
}) {
  return (
    <button
      onClick={onToggle}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        active
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/50 bg-card/50"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
          {icon}
        </div>
        {badgePreview}
      </div>
      <h4 className="font-medium text-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </button>
  )
}

// Componente auxiliar para toggle em linha
function ToggleRow({
  title,
  description,
  active,
  onToggle,
}: {
  title: string
  description: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-card/50 border border-border rounded-xl">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
          {active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </div>
        <div>
          <h4 className="font-medium text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          active ? "bg-primary" : "bg-secondary"
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            active ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  )
}
