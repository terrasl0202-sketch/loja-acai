"use client"

import { Image, Clock, Snowflake, Award, Star, Truck, Heart, Eye, EyeOff } from "lucide-react"
import type { CustomizationHero, HeroBadge } from "@/lib/config-types"

interface HeroTabProps {
  hero: CustomizationHero
  onUpdate: (updates: Partial<CustomizationHero>) => void
}

// Icones disponiveis para badges do hero
const ICON_OPTIONS = [
  { value: "clock", label: "Relogio", icon: Clock },
  { value: "snowflake", label: "Gelo", icon: Snowflake },
  { value: "award", label: "Premio", icon: Award },
  { value: "star", label: "Estrela", icon: Star },
  { value: "truck", label: "Entrega", icon: Truck },
  { value: "heart", label: "Coracao", icon: Heart },
]

export function HeroTab({ hero, onUpdate }: HeroTabProps) {
  const updateBadge = (badgeKey: "badge1" | "badge2" | "badge3", updates: Partial<HeroBadge>) => {
    onUpdate({
      [badgeKey]: {
        ...hero[badgeKey],
        ...updates,
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Informacao */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <Image className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Banner Principal (Hero)</p>
            <p className="text-xs text-muted-foreground mt-1">
              Configure os textos e badges que aparecem no banner principal da loja.
              A imagem de fundo e definida na aba Identidade.
            </p>
          </div>
        </div>
      </div>

      {/* Textos principais */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Textos do Banner</h3>
        
        <div>
          <label className="text-xs text-muted-foreground">Titulo principal</label>
          <input
            type="text"
            value={hero.title || ""}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Ex: Acai Premium, Burgers Artesanais"
            className="w-full mt-1 px-3 py-2.5 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Deixe vazio para usar o texto do banner legacy</p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Subtitulo</label>
          <input
            type="text"
            value={hero.subtitle || ""}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Ex: Monte do seu jeito, Feitos na hora"
            className="w-full mt-1 px-3 py-2.5 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Deixe vazio para usar o slogan da loja</p>
        </div>
      </div>

      {/* Badges */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground">Badges do Banner</h3>
        <p className="text-xs text-muted-foreground -mt-2">Ate 3 badges podem ser exibidos no banner</p>

        {/* Badge 1 */}
        <BadgeEditor
          label="Badge 1"
          badge={hero.badge1}
          onUpdate={(updates) => updateBadge("badge1", updates)}
        />

        {/* Badge 2 */}
        <BadgeEditor
          label="Badge 2"
          badge={hero.badge2}
          onUpdate={(updates) => updateBadge("badge2", updates)}
        />

        {/* Badge 3 */}
        <BadgeEditor
          label="Badge 3"
          badge={hero.badge3}
          onUpdate={(updates) => updateBadge("badge3", updates)}
        />
      </div>

      {/* Preview simplificado */}
      <div className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground">Preview dos Badges</h3>
        <div className="flex flex-wrap gap-2 p-4 bg-black/50 rounded-xl">
          {hero.badge1.enabled && hero.badge1.text && (
            <BadgePreview badge={hero.badge1} />
          )}
          {hero.badge2.enabled && hero.badge2.text && (
            <BadgePreview badge={hero.badge2} />
          )}
          {hero.badge3.enabled && hero.badge3.text && (
            <BadgePreview badge={hero.badge3} />
          )}
          {!hero.badge1.enabled && !hero.badge2.enabled && !hero.badge3.enabled && (
            <p className="text-xs text-white/50">Nenhum badge ativo</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente para editar cada badge
function BadgeEditor({ 
  label, 
  badge, 
  onUpdate 
}: { 
  label: string
  badge: HeroBadge
  onUpdate: (updates: Partial<HeroBadge>) => void 
}) {
  const IconComponent = ICON_OPTIONS.find(opt => opt.value === badge.icon)?.icon || Clock

  return (
    <div className="p-4 bg-secondary/30 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconComponent className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <button
          onClick={() => onUpdate({ enabled: !badge.enabled })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            badge.enabled
              ? "bg-green-500/20 text-green-400"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {badge.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {badge.enabled ? "Ativo" : "Inativo"}
        </button>
      </div>

      {badge.enabled && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Texto</label>
            <input
              type="text"
              value={badge.text || ""}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Ex: 30-45 min"
              className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Icone</label>
            <select
              value={badge.icon || "clock"}
              onChange={(e) => onUpdate({ icon: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ICON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// Preview do badge
function BadgePreview({ badge }: { badge: HeroBadge }) {
  const IconComponent = ICON_OPTIONS.find(opt => opt.value === badge.icon)?.icon || Clock
  
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20">
      <IconComponent className="w-4 h-4 text-amber-400" />
      {badge.text}
    </span>
  )
}
