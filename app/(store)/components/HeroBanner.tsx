"use client"

import Image from "next/image"
import { Snowflake, Award, Clock } from "lucide-react"
import { useState } from "react"

interface BannerData {
  mainText?: string
  secondaryText?: string
  promoActive?: boolean
  promoPrice?: number
  promoText?: string
  imageUrl?: string
}

interface HeroBannerProps {
  storeName: string
  storeSlogan?: string
  banner?: BannerData | null
  coverImageUrl?: string
}

export function HeroBanner({ storeName, storeSlogan, banner, coverImageUrl }: HeroBannerProps) {
  const [imageError, setImageError] = useState(false)
  const displayName = storeName || 'Delivery'
  const displaySlogan = storeSlogan || ''
  
  // Usa dados do banner via props (fonte unica de verdade)
  const bannerMainText = banner?.mainText || ''
  const bannerSecondaryText = banner?.secondaryText || displaySlogan
  
  // Prioridade: coverImageUrl (customization) > banner.imageUrl > fallback
  // Se der erro no carregamento, usa fallback
  const primaryImage = coverImageUrl || banner?.imageUrl || ""
  const fallbackImage = "/acai-bowl.jpg"
  const imageUrl = (imageError || !primaryImage) ? fallbackImage : primaryImage
  
  // Verifica se e URL externa
  const isExternalUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
  
  return (
    <section className="relative h-56 sm:h-72 overflow-hidden rounded-3xl mx-3 mt-3 shadow-2xl shadow-black/30">
      {/* Imagem de fundo - usando img nativo para URLs externas para evitar bloqueios */}
      {isExternalUrl ? (
        <img
          src={imageUrl}
          alt={displayName}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 hover:scale-110"
          onError={() => setImageError(true)}
        />
      ) : (
        <Image
          src={imageUrl}
          alt={displayName}
          fill
          className="object-cover transition-transform duration-1000 hover:scale-110"
          priority
          onError={() => setImageError(true)}
        />
      )}
      
      {/* Overlay premium cinematografico */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent mix-blend-overlay" />
      
      {/* Borda interna premium */}
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/15" />
      <div className="absolute inset-[1px] rounded-3xl ring-1 ring-inset ring-black/20" />
      
      {/* Conteudo do banner */}
      <div className="absolute bottom-6 left-6 right-6">
        <h2 className="text-3xl sm:text-4xl font-black text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] tracking-tight leading-tight">
          {bannerMainText.split(' ').slice(0, 2).join(' ')}<br/>{bannerMainText.split(' ').slice(2).join(' ')}
        </h2>
        <p className="text-white/90 text-sm mt-2 font-medium drop-shadow-lg">{bannerSecondaryText}</p>
        
        {banner?.promoActive && banner?.promoText && (
          <div className="mt-4">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-5 py-2.5 rounded-2xl shadow-xl shadow-orange-500/30 animate-pulse-glow">
              {banner.promoText}
              {(banner.promoPrice ?? 0) > 0 && ` - R$ ${(banner.promoPrice ?? 0).toFixed(2).replace('.', ',')}`}
            </span>
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-2.5 mt-5">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 shadow-lg">
            <Clock className="w-4 h-4 text-amber-400" />
            30-45 min
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 shadow-lg">
            <Snowflake className="w-4 h-4 text-cyan-400" />
            Geladinho
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 shadow-lg">
            <Award className="w-4 h-4 text-yellow-400" />
            Premium
          </span>
        </div>
      </div>
    </section>
  )
}
