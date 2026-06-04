"use client"

import { Store, Facebook, Instagram, MessageCircle, MapPin, FileText, Clock, Phone } from "lucide-react"
import { CustomizationSocial, CustomizationIdentity } from "@/lib/config-types"

// TikTok icon component
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  )
}

interface InfoTabProps {
  social: CustomizationSocial
  identity: CustomizationIdentity
  onUpdateSocial: (updates: Partial<CustomizationSocial>) => void
  onUpdateIdentity: (updates: Partial<CustomizationIdentity>) => void
}

export function InfoTab({ social, identity, onUpdateSocial, onUpdateIdentity }: InfoTabProps) {
  return (
    <div className="space-y-8">
      {/* Dados da Loja */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            Dados da Loja
          </h3>
          <p className="text-sm text-muted-foreground">Informacoes basicas exibidas na loja</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Nome da Loja */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nome da Loja</label>
            <input
              type="text"
              value={identity.storeName || ''}
              onChange={(e) => onUpdateIdentity({ storeName: e.target.value })}
              placeholder="Ex: Acai da Terra"
              className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Subtitulo */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Subtitulo</label>
            <input
              type="text"
              value={identity.subtitle || ''}
              onChange={(e) => onUpdateIdentity({ subtitle: e.target.value })}
              placeholder="Ex: Delivery de Acai Premium"
              className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Slogan */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Slogan</label>
          <input
            type="text"
            value={identity.slogan || ''}
            onChange={(e) => onUpdateIdentity({ slogan: e.target.value })}
            placeholder="Ex: O melhor acai da cidade"
            className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Contato */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Contato
          </h3>
          <p className="text-sm text-muted-foreground">WhatsApp e endereco da loja</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* WhatsApp */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-500" />
              WhatsApp
            </label>
            <input
              type="text"
              value={social.whatsapp || ''}
              onChange={(e) => onUpdateSocial({ whatsapp: e.target.value })}
              placeholder="5511999999999"
              className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground">Formato: 5511999999999 (com codigo do pais)</p>
          </div>

          {/* Endereco */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" />
              Endereco
            </label>
            <input
              type="text"
              value={social.address || ''}
              onChange={(e) => onUpdateSocial({ address: e.target.value })}
              placeholder="Rua Principal, 123 - Centro"
              className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Redes Sociais */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Instagram className="w-5 h-5 text-primary" />
            Redes Sociais
          </h3>
          <p className="text-sm text-muted-foreground">Links para suas redes sociais</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Instagram */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Instagram className="w-4 h-4 text-pink-500" />
              Instagram
            </label>
            <input
              type="text"
              value={social.instagram || ''}
              onChange={(e) => onUpdateSocial({ instagram: e.target.value })}
              placeholder="@sualoja"
              className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Facebook */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Facebook className="w-4 h-4 text-blue-500" />
              Facebook
            </label>
            <input
              type="text"
              value={social.facebook || ''}
              onChange={(e) => onUpdateSocial({ facebook: e.target.value })}
              placeholder="facebook.com/sualoja"
              className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* TikTok */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <TikTokIcon className="w-4 h-4" />
              TikTok
            </label>
            <input
              type="text"
              value={social.tiktok || ''}
              onChange={(e) => onUpdateSocial({ tiktok: e.target.value })}
              placeholder="@sualoja"
              className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Horario de Funcionamento */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Horario de Funcionamento
          </h3>
          <p className="text-sm text-muted-foreground">Exibido no rodape da loja</p>
        </div>

        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-400">
          <strong>Nota:</strong> O horario de abertura/fechamento e controlado na aba Configuracoes da Loja, junto com o status aberto/fechado.
        </div>
      </div>

      {/* Politica de Entrega */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Politica de Entrega
          </h3>
          <p className="text-sm text-muted-foreground">Informacoes sobre entrega exibidas no checkout</p>
        </div>

        <textarea
          value={social.deliveryPolicy || ''}
          onChange={(e) => onUpdateSocial({ deliveryPolicy: e.target.value })}
          placeholder="Ex: Entregas de segunda a sabado, das 10h as 22h. Tempo estimado de 30 a 45 minutos."
          rows={3}
          className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>

      {/* Texto do Rodape */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Texto do Rodape
          </h3>
          <p className="text-sm text-muted-foreground">Texto adicional exibido no rodape da loja</p>
        </div>

        <textarea
          value={social.footerText || ''}
          onChange={(e) => onUpdateSocial({ footerText: e.target.value })}
          placeholder="Ex: Acai premium feito com frutas selecionadas da Amazonia. Produtos 100% naturais."
          rows={3}
          className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />

        {/* Preview do rodape */}
        {social.footerText && (
          <div className="p-4 bg-card/50 border border-border rounded-xl">
            <p className="text-sm text-muted-foreground mb-2">Preview do rodape:</p>
            <div className="p-3 bg-background rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                {social.footerText}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
