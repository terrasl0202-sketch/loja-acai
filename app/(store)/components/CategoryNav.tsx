"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { 
  IceCream, 
  Coffee, 
  Pizza, 
  Utensils, 
  CupSoda, 
  Cake, 
  Sandwich, 
  Salad, 
  Soup, 
  Cookie,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  UtensilsCrossed,
  Drumstick,
  Beef,
  Fish,
  Croissant,
  Cherry,
  Milk,
  Wine
} from "lucide-react"

// Mapeia nomes de icones para componentes
const ICON_MAP: Record<string, React.ElementType> = {
  "ice-cream": IceCream,
  "icecream": IceCream,
  "coffee": Coffee,
  "cafe": Coffee,
  "pizza": Pizza,
  "utensils": Utensils,
  "cup-soda": CupSoda,
  "bebida": CupSoda,
  "drink": CupSoda,
  "cake": Cake,
  "bolo": Cake,
  "sobremesa": Cake,
  "sandwich": Sandwich,
  "lanche": Sandwich,
  "salad": Salad,
  "salada": Salad,
  "soup": Soup,
  "sopa": Soup,
  "cookie": Cookie,
  "biscoito": Cookie,
  "acai": IceCream,
  "frango": Drumstick,
  "chicken": Drumstick,
  "carne": Beef,
  "meat": Beef,
  "peixe": Fish,
  "fish": Fish,
  "pao": Croissant,
  "bread": Croissant,
  "fruta": Cherry,
  "fruit": Cherry,
  "leite": Milk,
  "milk": Milk,
  "vinho": Wine,
  "wine": Wine,
  "restaurante": UtensilsCrossed,
  "restaurant": UtensilsCrossed,
}

interface Category {
  id: number
  name: string
  icon: string
  active: boolean
  image_url?: string
}

interface CategoryNavProps {
  categories: Category[]
  selectedCategory: number | null
  onSelectCategory: (categoryId: number | null) => void
  enabled?: boolean
}

export function CategoryNav({ categories, selectedCategory, onSelectCategory, enabled = true }: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  // Verificar setas de scroll
  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
        setShowLeftArrow(scrollLeft > 10)
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
      }
    }
    
    checkScroll()
    const el = scrollRef.current
    el?.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)
    
    return () => {
      el?.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [categories])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -150 : 150
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    }
  }

  const getIcon = (iconName: string) => {
    const normalized = iconName?.toLowerCase().replace(/[^a-z]/g, '') || ''
    return ICON_MAP[normalized] || ICON_MAP[iconName] || Utensils
  }

  // Nao mostrar se desabilitado ou nao tem categorias
  if (!enabled || categories.length === 0) {
    return null
  }

  return (
    <div className="relative py-3">
      {/* Seta esquerda */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full transition-all"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          aria-label="Scroll esquerda"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Container com scroll horizontal */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-1 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {/* Botao "Todos" */}
        <button
          onClick={() => onSelectCategory(null)}
          className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 shrink-0"
          style={selectedCategory === null ? {
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-foreground)',
          } : {
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="text-sm font-medium">Todos</span>
        </button>

        {/* Categorias */}
        {categories.map((category) => {
          const IconComponent = getIcon(category.icon)
          const isSelected = selectedCategory === category.id
          const hasImage = category.image_url
          
          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 shrink-0"
              style={isSelected ? {
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
              } : {
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            >
              {hasImage ? (
                <div className="w-5 h-5 rounded-full overflow-hidden relative flex-shrink-0">
                  <Image
                    src={category.image_url!}
                    alt={category.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <IconComponent className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          )
        })}
      </div>

      {/* Seta direita */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full transition-all"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          aria-label="Scroll direita"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
      
      {/* CSS para esconder scrollbar */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
