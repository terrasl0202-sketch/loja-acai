"use client"

import { Clock } from "lucide-react"
import type { SiteConfig } from "@/lib/config-types"

interface StoreClosedBannerProps {
  siteConfig: SiteConfig
}

export function StoreClosedBanner({ siteConfig }: StoreClosedBannerProps) {
  return (
    <div className="mx-4 mt-5 p-5 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-purple-500/5 border border-orange-500/20 rounded-2xl backdrop-blur-sm shadow-xl shadow-red-500/5">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500/20 to-red-500/10 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/20">
            <Clock className="w-7 h-7 text-orange-400" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold text-orange-400">
            Estamos fechados no momento
          </h3>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Voltaremos em breve
          </p>
        </div>
        {siteConfig.storeHours?.closedMessage && (
          <p className="text-sm text-muted-foreground">
            {siteConfig.storeHours.closedMessage}
          </p>
        )}
        <div className="pt-3 border-t border-orange-500/10">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">Horario de funcionamento</p>
          <p className="text-sm font-semibold text-foreground/90">
            {siteConfig.storeHours?.openTime || "18:00"} as {siteConfig.storeHours?.closeTime || "23:30"}
          </p>
        </div>
      </div>
    </div>
  )
}
