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
    <section className="relative h-52 sm:h-64 overflow-hidden rounded-b-3xl mx-2">
      {/* Imagem de fundo - usando img nativo para URLs externas para evitar bloqueios */}
      {isExternalUrl ? (
        <img
          src={imageUrl}
          alt={displayName}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          onError={() => setImageError(true)}
        />
      ) : (
        <Image
          src={imageUrl}
          alt={displayName}
          fill
          className="object-cover transition-transform duration-700 hover:scale-105"
          priority
          onError={() => setImageError(true)}
        />
      )}
      
      {/* Overlay premium inteligente - escurece apenas embaixo para texto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
      
      {/* Borda interna sutil */}
      <div className="absolute inset-0 rounded-b-3xl ring-1 ring-inset ring-white/10" />
      
      {/* Conteudo do banner */}
      <div className="absolute bottom-5 left-5 right-5">
        <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] tracking-tight leading-tight">
          {bannerMainText.split(' ').slice(0, 2).join(' ')}<br/>{bannerMainText.split(' ').slice(2).join(' ')}
        </h2>
        <p className="text-white/80 text-sm mt-1.5 font-medium drop-shadow-md">{bannerSecondaryText}</p>
        
        {banner?.promoActive && banner?.promoText && (
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 rounded-full shadow-lg shadow-orange-500/25">
              {banner.promoText}
              {(banner.promoPrice ?? 0) > 0 && ` - R$ ${(banner.promoPrice ?? 0).toFixed(2).replace('.', ',')}`}
            </span>
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            30-45 min
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
            <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
            Geladinho
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
            <Award className="w-3.5 h-3.5 text-yellow-400" />
            Premium
          </span>
        </div>
      </div>
    </section>
  )
}
