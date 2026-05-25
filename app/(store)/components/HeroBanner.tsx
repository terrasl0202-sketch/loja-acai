"use client"

import Image from "next/image"
import { Zap, Snowflake, Award } from "lucide-react"

export function HeroBanner() {
  return (
    <section className="relative h-48 sm:h-56 overflow-hidden">
      <Image
        src="/acai-bowl.jpg"
        alt="Acai delicioso"
        fill
        className="object-cover scale-110 animate-fade-in"
        priority
      />
      {/* Multi-layer Premium Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-transparent to-primary/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
      
      {/* Decorative glow elements */}
      <div className="absolute top-6 right-6 w-40 h-40 bg-primary/15 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-0 left-0 w-56 h-32 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      
      <div className="absolute bottom-6 left-4 right-4">
        <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] tracking-tight leading-tight">
          Acai artesanal<br/>entregue geladinho
        </h2>
        <p className="text-white/50 text-xs mt-2 font-medium tracking-wide">Feito na hora com muito carinho</p>
        
        {/* Trust Badges Glass Premium */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/95 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
            <Zap className="w-3 h-3 text-amber-400 drop-shadow-glow" />
            Entrega rapida
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
