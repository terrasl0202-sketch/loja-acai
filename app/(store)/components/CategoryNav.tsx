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
  selectedCategory: number | null
  onSelectCategory: (categoryId: number | null) => void
  enabled?: boolean
}

export function CategoryNav({ selectedCategory, onSelectCategory, enabled = true }: CategoryNavProps) {
  // DEBUG - Verificar se componente monta
  if (typeof window !== 'undefined') {
    console.log('[v0] CategoryNav MONTANDO - enabled:', enabled)
  }
  
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  console.log('[v0] CategoryNav - enabled:', enabled)

  // Carregar categorias
  useEffect(() => {
    console.log('[v0] CategoryNav - useEffect, enabled:', enabled)
    if (!enabled) {
      setLoading(false)
      return
    }
    
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        console.log('[v0] CategoryNav - data recebida:', data)
        const activeCategories = data.filter((c: Category) => c.active)
        console.log('[v0] CategoryNav - categorias ativas:', activeCategories.length)
        setCategories(activeCategories)
      })
      .catch(err => console.error('[CategoryNav] Erro:', err))
      .finally(() => setLoading(false))
  }, [enabled])

  // Verificar setas de scroll
  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
        setShowLeftArrow(scrollLeft > 0)
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
      }
    }
    
    checkScroll()
    scrollRef.current?.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)
    
    return () => {
      scrollRef.current?.removeEventListener('scroll', checkScroll)
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
  if (!enabled || loading || categories.length === 0) {
    return null
  }

  return (
    <div className="relative py-4">
      {/* Seta esquerda */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-lg text-foreground hover:bg-secondary transition-all"
          aria-label="Scroll esquerda"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Container com scroll horizontal */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-1 scroll-smooth snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Botao "Todos" */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all duration-300 shrink-0 snap-start ${
            selectedCategory === null
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105"
              : "bg-card border border-border text-foreground hover:bg-secondary hover:border-primary/30"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="text-sm font-semibold">Todos</span>
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all duration-300 shrink-0 snap-start ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105"
                  : "bg-card border border-border text-foreground hover:bg-secondary hover:border-primary/30"
              }`}
            >
              {hasImage ? (
                <div className="w-5 h-5 rounded-md overflow-hidden relative flex-shrink-0">
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
              <span className="text-sm font-semibold">{category.name}</span>
            </button>
          )
        })}
      </div>

      {/* Seta direita */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-lg text-foreground hover:bg-secondary transition-all"
          aria-label="Scroll direita"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
      
      {/* Gradientes nas bordas */}
      {showLeftArrow && (
        <div className="absolute left-8 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      )}
      {showRightArrow && (
        <div className="absolute right-8 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      )}
    </div>
  )
}
