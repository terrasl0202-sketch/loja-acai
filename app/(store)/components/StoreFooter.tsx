"use client"

import { MessageCircle, Instagram } from "lucide-react"

interface StoreFooterProps {
  storeName?: string
  slogan?: string
  whatsapp?: string
  instagram?: string
  address?: string
}

export function StoreFooter({ storeName, slogan, whatsapp, instagram, address }: StoreFooterProps) {
  const currentYear = new Date().getFullYear()

  // Formata numero de WhatsApp para exibicao
  const whatsappFormatted = whatsapp 
    ? whatsapp.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '($2) $3-$4')
    : ''

  return (
    <footer className="border-t border-border mt-8 pb-24">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Logo e info */}
        <div className="text-center mb-6">
          {storeName && <h3 className="text-lg font-bold text-foreground mb-1">{storeName}</h3>}
          {slogan && <p className="text-sm text-muted-foreground">{slogan}</p>}
        </div>
        
        {/* Contato - so mostra se houver dados */}
        {(whatsapp || instagram) && (
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Ola ${storeName || ''}!`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-500/15 text-green-400 rounded-xl text-sm font-medium hover:bg-green-500/25 transition-colors"
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
                className="flex items-center gap-2 px-4 py-2 bg-pink-500/15 text-pink-400 rounded-xl text-sm font-medium hover:bg-pink-500/25 transition-colors"
              >
                <Instagram className="w-4 h-4" />
                {instagram}
              </a>
            )}
          </div>
        )}
        
        {/* Endereco - so mostra se houver */}
        {address && (
          <p className="text-center text-xs text-muted-foreground mb-6">{address}</p>
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
