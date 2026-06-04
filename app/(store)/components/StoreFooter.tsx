"use client"

import { MessageCircle, Instagram, Facebook, MapPin, Clock } from "lucide-react"

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
  whatsapp?: string
  instagram?: string
  facebook?: string
  tiktok?: string
  address?: string
  openTime?: string
  closeTime?: string
  footerText?: string
}

export function StoreFooter({ 
  storeName, 
  slogan, 
  whatsapp, 
  instagram,
  facebook,
  tiktok,
  address,
  openTime,
  closeTime,
  footerText
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
    <footer className="border-t border-border mt-8 pb-24 bg-card/30">
      <div className="max-w-lg mx-auto px-4 py-8">
        {hasContent && (
          <>
            {/* Logo e info */}
            {(storeName || slogan) && (
              <div className="text-center mb-6">
                {storeName && <h3 className="text-lg font-bold text-foreground mb-1">{storeName}</h3>}
                {slogan && <p className="text-sm text-muted-foreground">{slogan}</p>}
              </div>
            )}
            
            {/* Redes Sociais */}
            {hasSocial && (
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Ola ${storeName || ''}!`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-500/15 text-green-500 rounded-xl text-sm font-medium hover:bg-green-500/25 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {whatsappFormatted}
                  </a>
                )}
                {instagram && (
                  <a
                    href={`https://instagram.com/${instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-pink-500/15 text-pink-500 rounded-xl text-sm font-medium hover:bg-pink-500/25 transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                    {instagram.startsWith('@') ? instagram : `@${instagram}`}
                  </a>
                )}
                {facebook && (
                  <a
                    href={`https://facebook.com/${facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/15 text-blue-500 rounded-xl text-sm font-medium hover:bg-blue-500/25 transition-colors"
                  >
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </a>
                )}
                {tiktok && (
                  <a
                    href={`https://tiktok.com/@${tiktok.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-foreground/10 text-foreground rounded-xl text-sm font-medium hover:bg-foreground/20 transition-colors"
                  >
                    <TikTokIcon className="w-4 h-4" />
                    TikTok
                  </a>
                )}
              </div>
            )}
            
            {/* Informacoes adicionais */}
            <div className="flex flex-col items-center gap-2 text-center mb-6">
              {/* Endereco */}
              {address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{address}</span>
                </div>
              )}
              
              {/* Horario */}
              {hasHours && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>Aberto das {openTime} as {closeTime}</span>
                </div>
              )}
            </div>
            
            {/* Texto customizado */}
            {footerText && (
              <p className="text-center text-xs text-muted-foreground mb-6">
                {footerText}
              </p>
            )}
          </>
        )}
        
        {/* Copyright */}
        <div className="text-center pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            {currentYear} {storeName || 'Delivery'}. Todos os direitos reservados.
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-2 tracking-wider">
            DEVELOPED BY <span className="font-semibold text-foreground/50">AILTON</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
