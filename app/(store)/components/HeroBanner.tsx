"use client"

import Image from "next/image"
import { Snowflake, Award, Clock } from "lucide-react"

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
  const displayName = storeName || 'Delivery'
  const displaySlogan = storeSlogan || ''
  
  // Usa dados do banner via props (fonte unica de verdade)
  const bannerMainText = banner?.mainText || ''
  const bannerSecondaryText = banner?.secondaryText || displaySlogan
  // Prioridade: coverImageUrl (customization) > banner.imageUrl > fallback
  const imageUrl = coverImageUrl || banner?.imageUrl || "/acai-bowl.jpg"
  
  return (
    <section className="relative h-48 sm:h-56 overflow-hidden">
      <Image
        src={imageUrl}
        alt={displayName}
        fill
        className="object-cover scale-110 animate-fade-in"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-transparent to-primary/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
      
      <div className="absolute top-6 right-6 w-40 h-40 bg-primary/15 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-0 left-0 w-56 h-32 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      
      <div className="absolute bottom-6 left-4 right-4">
        <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] tracking-tight leading-tight">
          {bannerMainText.split(' ').slice(0, 2).join(' ')}<br/>{bannerMainText.split(' ').slice(2).join(' ')}
        </h2>
        <p className="text-white/50 text-xs mt-2 font-medium tracking-wide">{bannerSecondaryText}</p>
        
        {banner?.promoActive && banner?.promoText && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 rounded-full shadow-lg animate-pulse">
              {banner.promoText}
              {(banner.promoPrice ?? 0) > 0 && ` - R$ ${(banner.promoPrice ?? 0).toFixed(2).replace('.', ',')}`}
            </span>
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/95 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
            <Clock className="w-3 h-3 text-amber-400 drop-shadow-glow" />
            30-45 min
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/95 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
            <Snowflake className="w-3 h-3 text-cyan-400 drop-shadow-glow" />
            Geladinho
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/95 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
            <Award className="w-3 h-3 text-primary drop-shadow-glow" />
            Premium
          </span>
        </div>
      </div>
    </section>
  )
}
