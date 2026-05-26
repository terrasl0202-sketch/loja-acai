"use client"

import { brandConfig, getBrandWhatsAppUrl } from "@/lib/brand-config"
import { MessageCircle, Instagram, Mail } from "lucide-react"

export function StoreFooter() {
  const { name, whatsappFormatted, instagram, email, address } = brandConfig
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="border-t border-border mt-8 pb-24">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Logo e info */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-foreground mb-1">{name}</h3>
          <p className="text-sm text-muted-foreground">{brandConfig.slogan}</p>
        </div>
        
        {/* Contato */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <a
            href={getBrandWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-green-500/15 text-green-400 rounded-xl text-sm font-medium hover:bg-green-500/25 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {whatsappFormatted}
          </a>
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
        
        {/* Endereco */}
        {address && (
          <p className="text-center text-xs text-muted-foreground mb-6">{address}</p>
        )}
        
        {/* Copyright */}
        <div className="text-center pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            {currentYear} {name}. Todos os direitos reservados.
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-2 tracking-wider">
            DEVELOPED BY <span className="font-semibold text-foreground/50">AILTON</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
