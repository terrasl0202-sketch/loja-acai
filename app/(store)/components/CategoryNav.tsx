"use client"

import { useState, useEffect, useRef } from "react"
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
  LayoutGrid
} from "lucide-react"

// Mapeia nomes de icones para componentes
const ICON_MAP: Record<string, React.ElementType> = {
  "ice-cream": IceCream,
  "coffee": Coffee,
  "pizza": Pizza,
  "utensils": Utensils,
  "cup-soda": CupSoda,
  "cake": Cake,
  "sandwich": Sandwich,
  "salad": Salad,
  "soup": Soup,
  "cookie": Cookie,
}

interface Category {
  id: number
  name: string
  icon: string
  active: boolean
}

interface CategoryNavProps {
  selectedCategory: number | null
  onSelectCategory: (categoryId: number | null) => void
}

export function CategoryNav({ selectedCategory, onSelectCategory }: CategoryNavProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  // Carregar categorias
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        const activeCategories = data.filter((c: Category) => c.active)
        setCategories(activeCategories)
      })
      .catch(err => console.error('[CategoryNav] Erro:', err))
      .finally(() => setLoading(false))
  }, [])

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
    return ICON_MAP[iconName] || Utensils
  }

  // Nao mostrar se nao tem categorias
  if (loading || categories.length === 0) {
    return null
  }

  return (
    <div className="relative py-4">
      {/* Seta esquerda */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-card/90 backdrop-blur-sm border border-border rounded-full shadow-lg text-foreground hover:bg-card transition-all"
          aria-label="Scroll esquerda"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Container com scroll horizontal */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-1 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Botao "Todos" */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all shrink-0 ${
            selectedCategory === null
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-card border border-border text-foreground hover:bg-secondary"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="text-sm font-medium">Todos</span>
        </button>

        {/* Categorias */}
        {categories.map((category) => {
          const IconComponent = getIcon(category.icon)
          const isSelected = selectedCategory === category.id
          
          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all shrink-0 ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-card border border-border text-foreground hover:bg-secondary"
              }`}
            >
              <IconComponent className="w-4 h-4" />
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          )
        })}
      </div>

      {/* Seta direita */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-card/90 backdrop-blur-sm border border-border rounded-full shadow-lg text-foreground hover:bg-card transition-all"
          aria-label="Scroll direita"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
