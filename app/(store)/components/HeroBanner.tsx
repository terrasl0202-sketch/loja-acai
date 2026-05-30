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
    <section className="relative h-48 sm:h-56 overflow-hidden">
      {/* Imagem de fundo - usando img nativo para URLs externas para evitar bloqueios */}
      {isExternalUrl ? (
        <img
          src={imageUrl}
          alt={displayName}
          className="absolute inset-0 w-full h-full object-cover scale-105"
          onError={() => setImageError(true)}
        />
      ) : (
        <Image
          src={imageUrl}
          alt={displayName}
          fill
          className="object-cover scale-105"
          priority
          onError={() => setImageError(true)}
        />
      )}
      
      {/* Overlay suave - apenas para legibilidade do texto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
      
      {/* Efeitos decorativos sutis */}
      <div className="absolute top-6 right-6 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-40 h-24 bg-primary/5 rounded-full blur-3xl" />
      
      {/* Conteudo do banner */}
      <div className="absolute bottom-6 left-4 right-4">
        <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-tight leading-tight">
          {bannerMainText.split(' ').slice(0, 2).join(' ')}<br/>{bannerMainText.split(' ').slice(2).join(' ')}
        </h2>
        <p className="text-white/70 text-xs mt-2 font-medium tracking-wide drop-shadow-md">{bannerSecondaryText}</p>
        
        {banner?.promoActive && banner?.promoText && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 rounded-full shadow-lg animate-pulse">
              {banner.promoText}
              {(banner.promoPrice ?? 0) > 0 && ` - R$ ${(banner.promoPrice ?? 0).toFixed(2).replace('.', ',')}`}
            </span>
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/95 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
            <Clock className="w-3 h-3 text-amber-400" />
            30-45 min
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/95 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
            <Snowflake className="w-3 h-3 text-cyan-400" />
            Geladinho
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/95 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
            <Award className="w-3 h-3 text-primary" />
            Premium
          </span>
        </div>
      </div>
    </section>
  )
}
