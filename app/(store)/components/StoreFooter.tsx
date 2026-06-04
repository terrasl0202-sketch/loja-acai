"use client"

import Image from "next/image"
import { MessageCircle, Instagram, Facebook, MapPin, Clock, Phone, Mail, ExternalLink } from "lucide-react"

// TikTok icon (nao existe no lucide)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  )
}

interface StoreFooterProps {
  storeName?: string
  slogan?: string
  logoUrl?: string
  whatsapp?: string
  instagram?: string
  facebook?: string
  tiktok?: string
  address?: string
  openTime?: string
  closeTime?: string
  footerText?: string
  deliveryPolicy?: string
}

export function StoreFooter({ 
  storeName, 
  slogan, 
  logoUrl,
  whatsapp, 
  instagram,
  facebook,
  tiktok,
  address,
  openTime,
  closeTime,
  footerText,
  deliveryPolicy
}: StoreFooterProps) {
  const currentYear = new Date().getFullYear()

  // Formata numero de WhatsApp para exibicao
  const whatsappFormatted = whatsapp 
    ? whatsapp.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '($2) $3-$4')
    : ''
    
  // Verifica se tem horario configurado
  const hasHours = openTime && closeTime
  
  // Verifica se tem redes sociais
  const hasSocial = whatsapp || instagram || facebook || tiktok
  
  // Se nao tem nenhum dado, mostra footer minimo
  const hasContent = storeName || slogan || hasSocial || address || hasHours

  return (
    <footer className="border-t border-border mt-8 pb-24 bg-gradient-to-b from-card/50 to-card">
      <div className="max-w-lg mx-auto px-4 py-8">
        {hasContent && (
          <>
            {/* Logo e info */}
            <div className="text-center mb-8">
              {/* Logo */}
              {logoUrl && (
                <div className="flex justify-center mb-4">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-card border border-border shadow-lg">
                    <Image
                      src={logoUrl}
                      alt={storeName || 'Logo'}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
              
              {storeName && (
                <h3 className="text-xl font-bold text-foreground mb-1">{storeName}</h3>
              )}
              {slogan && (
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">{slogan}</p>
              )}
            </div>
            
            {/* Redes Sociais - Grid Premium */}
            {hasSocial && (
              <div className="grid grid-cols-2 gap-2 mb-8">
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Ola ${storeName || ''}!`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-500 rounded-2xl transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-green-400/70 font-medium">WhatsApp</p>
                      <p className="text-sm font-semibold truncate">{whatsappFormatted}</p>
                    </div>
                  </a>
                )}
                {instagram && (
                  <a
                    href={`https://instagram.com/${instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-pink-500 rounded-2xl transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Instagram className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-pink-400/70 font-medium">Instagram</p>
                      <p className="text-sm font-semibold truncate">{instagram.startsWith('@') ? instagram : `@${instagram}`}</p>
                    </div>
                  </a>
                )}
                {facebook && (
                  <a
                    href={`https://facebook.com/${facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-500 rounded-2xl transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Facebook className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-400/70 font-medium">Facebook</p>
                      <p className="text-sm font-semibold truncate">Seguir</p>
                    </div>
                  </a>
                )}
                {tiktok && (
                  <a
                    href={`https://tiktok.com/@${tiktok.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 text-foreground rounded-2xl transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-foreground/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <TikTokIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">TikTok</p>
                      <p className="text-sm font-semibold truncate">{tiktok.startsWith('@') ? tiktok : `@${tiktok}`}</p>
                    </div>
                  </a>
                )}
              </div>
            )}
            
            {/* Informacoes da Loja - Cards Premium */}
            <div className="space-y-3 mb-8">
              {/* Endereco */}
              {address && (
                <div className="flex items-start gap-3 px-4 py-3 bg-card border border-border rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">Endereco</p>
                    <p className="text-sm text-foreground">{address}</p>
                  </div>
                </div>
              )}
              
              {/* Horario */}
              {hasHours && (
                <div className="flex items-start gap-3 px-4 py-3 bg-card border border-border rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">Horario de Funcionamento</p>
                    <p className="text-sm text-foreground font-medium">
                      {openTime} as {closeTime}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Politica de Entrega */}
            {deliveryPolicy && (
              <div className="mb-8 p-4 bg-muted/30 rounded-2xl border border-border">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Politica de Entrega</h4>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {deliveryPolicy}
                </p>
              </div>
            )}
            
            {/* Texto customizado */}
            {footerText && (
              <p className="text-center text-sm text-muted-foreground mb-8 px-4">
                {footerText}
              </p>
            )}
          </>
        )}
        
        {/* Copyright - Elegante */}
        <div className="text-center pt-6 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            {currentYear} <span className="font-semibold text-foreground">{storeName || 'Delivery'}</span>
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            Todos os direitos reservados
          </p>
          <div className="mt-4 pt-4 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground/40 tracking-widest uppercase">
              Powered by <span className="font-bold text-primary/60">Ailton Tech</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
