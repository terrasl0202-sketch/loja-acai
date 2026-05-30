"use client"

import Image from "next/image"
import { Snowflake, Award, Clock, Star, Truck, Heart, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import type { CustomizationHero } from "@/lib/config-types"

interface BannerData {
  mainText?: string
  secondaryText?: string
  promoActive?: boolean
  promoPrice?: number
  promoText?: string
  imageUrl?: string
}

interface CarouselBanner {
  id: number
  imageUrl: string
  title: string
  subtitle: string
  linkUrl: string
  active: boolean
}

interface HeroBannerProps {
  storeName: string
  storeSlogan?: string
  banner?: BannerData | null
  coverImageUrl?: string
  hero?: CustomizationHero
  carouselBanners?: CarouselBanner[]
}

// Mapeia nome do icone para componente
function getIcon(iconName: string) {
  const icons: Record<string, typeof Clock> = {
    clock: Clock,
    snowflake: Snowflake,
    award: Award,
    star: Star,
    truck: Truck,
    heart: Heart,
  }
  return icons[iconName] || Clock
}

export function HeroBanner({ storeName, storeSlogan, banner, coverImageUrl, hero, carouselBanners = [] }: HeroBannerProps) {
  const [imageError, setImageError] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  
  const displayName = storeName || 'Delivery'
  const displaySlogan = storeSlogan || ''
  
  // Filtra apenas banners ativos com imagem
  const activeBanners = carouselBanners.filter(b => b.active && b.imageUrl)
  const hasCarousel = activeBanners.length > 1
  
  // Autoplay do carousel
  useEffect(() => {
    if (!hasCarousel || isPaused) return
    
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % activeBanners.length)
    }, 5000) // 5 segundos por slide
    
    return () => clearInterval(interval)
  }, [hasCarousel, isPaused, activeBanners.length])
  
  // Navegacao manual
  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index)
  }, [])
  
  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % activeBanners.length)
  }, [activeBanners.length])
  
  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + activeBanners.length) % activeBanners.length)
  }, [activeBanners.length])
  
  // Usa dados do hero customizado se disponivel, senao usa banner legacy
  const heroTitle = hero?.title || banner?.mainText || ''
  const heroSubtitle = hero?.subtitle || banner?.secondaryText || displaySlogan
  
  // Badges do hero - usa valores customizados ou defaults
  const badge1 = hero?.badge1 || { text: "30-45 min", icon: "clock", enabled: true }
  const badge2 = hero?.badge2 || { text: "Geladinho", icon: "snowflake", enabled: true }
  const badge3 = hero?.badge3 || { text: "Premium", icon: "award", enabled: true }
  
  // Icones dinamicos
  const Icon1 = getIcon(badge1.icon)
  const Icon2 = getIcon(badge2.icon)
  const Icon3 = getIcon(badge3.icon)
  
  // Determina imagem a usar
  // Se tem carousel ativo, usa a imagem do slide atual
  // Senao usa a logica antiga (coverImageUrl > banner.imageUrl > fallback)
  const getImageUrl = () => {
    if (activeBanners.length > 0) {
      return activeBanners[currentSlide]?.imageUrl || ''
    }
    const primaryImage = coverImageUrl || banner?.imageUrl || ""
    const fallbackImage = "/acai-bowl.jpg"
    return (imageError || !primaryImage) ? fallbackImage : primaryImage
  }
  
  const imageUrl = getImageUrl()
  const isExternalUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
  
  // Titulo/Subtitulo do slide atual (se carousel) ou do hero
  const currentTitle = activeBanners.length > 0 
    ? activeBanners[currentSlide]?.title || heroTitle
    : heroTitle
  const currentSubtitle = activeBanners.length > 0 
    ? activeBanners[currentSlide]?.subtitle || heroSubtitle
    : heroSubtitle
  
  return (
    <section 
      className="relative h-56 sm:h-72 overflow-hidden rounded-3xl mx-3 mt-3 shadow-2xl shadow-black/30"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Imagem de fundo com transicao suave */}
      <div className="absolute inset-0 transition-opacity duration-700">
        {isExternalUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <Image
            src={imageUrl}
            alt={displayName}
            fill
            className="object-cover transition-transform duration-1000 hover:scale-105"
            priority
            onError={() => setImageError(true)}
          />
        )}
      </div>
      
      {/* Overlay premium cinematografico */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent mix-blend-overlay" />
      
      {/* Borda interna premium */}
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/15" />
      <div className="absolute inset-[1px] rounded-3xl ring-1 ring-inset ring-black/20" />
      
      {/* Setas de navegacao (apenas se carousel) */}
      {hasCarousel && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white/80 hover:bg-black/50 hover:text-white transition-all opacity-0 group-hover:opacity-100 sm:opacity-100"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white/80 hover:bg-black/50 hover:text-white transition-all opacity-0 group-hover:opacity-100 sm:opacity-100"
            aria-label="Proximo slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
      
      {/* Conteudo do banner */}
      <div className="absolute bottom-6 left-6 right-6">
        {currentTitle && (
          <h2 className="text-3xl sm:text-4xl font-black text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] tracking-tight leading-tight transition-all duration-500">
            {currentTitle.split(' ').slice(0, 2).join(' ')}<br/>{currentTitle.split(' ').slice(2).join(' ')}
          </h2>
        )}
        {currentSubtitle && (
          <p className="text-white/90 text-sm mt-2 font-medium drop-shadow-lg transition-all duration-500">{currentSubtitle}</p>
        )}
        
        {banner?.promoActive && banner?.promoText && activeBanners.length === 0 && (
          <div className="mt-4">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-5 py-2.5 rounded-2xl shadow-xl shadow-orange-500/30 animate-pulse-glow">
              {banner.promoText}
              {(banner.promoPrice ?? 0) > 0 && ` - R$ ${(banner.promoPrice ?? 0).toFixed(2).replace('.', ',')}`}
            </span>
          </div>
        )}
        
        {/* Indicadores do carousel */}
        {hasCarousel && (
          <div className="flex items-center gap-2 mt-4">
            {activeBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentSlide
                    ? "w-6 h-2 bg-white"
                    : "w-2 h-2 bg-white/50 hover:bg-white/70"
                }`}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        )}
        
        {/* Badges dinamicos (mostra apenas se nao tem carousel ou se o slide atual nao tem titulo) */}
        {(activeBanners.length === 0 || !activeBanners[currentSlide]?.title) && (
          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            {badge1.enabled && badge1.text && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 shadow-lg">
                <Icon1 className="w-4 h-4 text-amber-400" />
                {badge1.text}
              </span>
            )}
            {badge2.enabled && badge2.text && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 shadow-lg">
                <Icon2 className="w-4 h-4 text-cyan-400" />
                {badge2.text}
              </span>
            )}
            {badge3.enabled && badge3.text && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 shadow-lg">
                <Icon3 className="w-4 h-4 text-yellow-400" />
                {badge3.text}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
