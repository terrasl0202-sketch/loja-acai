"use client"

import { MapPin, Home as HomeIcon, Clock, Truck } from "lucide-react"
import type { DeliveryType } from "../../types"

interface DeliveryTypeSelectorProps {
  deliveryType: DeliveryType
  onSelect: (type: DeliveryType) => void
  deliveryEnabled: boolean
  pickupEnabled: boolean
  deliveryFee: number
  estimatedTime?: string
  isDisabled?: boolean
}

export function DeliveryTypeSelector({
  deliveryType,
  onSelect,
  deliveryEnabled,
  pickupEnabled,
  deliveryFee,
  estimatedTime,
  isDisabled = false
}: DeliveryTypeSelectorProps) {
  return (
    <section className={`premium-card rounded-2xl p-5 animate-scale-in ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`} style={{ animationDelay: '0.1s' }}>
      <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Truck className="w-4 h-4 text-primary" />
        </div>
        Tipo de Entrega
      </h3>
      
      {/* Segmented Control Premium */}
      <div className="bg-secondary/30 backdrop-blur-sm rounded-2xl p-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          {deliveryEnabled && (
            <button
              onClick={() => !isDisabled && onSelect("entrega")}
              disabled={isDisabled}
              className={`relative py-4 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2.5 ${
                deliveryType === "entrega"
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 glow-primary"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Entrega</span>
              {deliveryFee > 0 && deliveryType !== "entrega" && (
                <span className="text-[10px] opacity-60">(+R${deliveryFee})</span>
              )}
            </button>
          )}
          {pickupEnabled && (
            <button
              onClick={() => !isDisabled && onSelect("retirada")}
              disabled={isDisabled}
              className={`relative py-4 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2.5 ${
                deliveryType === "retirada"
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 glow-primary"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              <span>Retirada</span>
            </button>
          )}
        </div>
      </div>
      
      {deliveryType === "entrega" && estimatedTime && (
        <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1.5 bg-secondary/30 py-2 rounded-lg">
          <Clock className="w-3.5 h-3.5" />
          Tempo estimado: <span className="text-foreground font-medium">{estimatedTime}</span>
        </p>
      )}
    </section>
  )
}
