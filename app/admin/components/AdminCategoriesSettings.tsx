"use client"

import { useState, useEffect } from "react"
import { 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Trash2, 
  Loader2,
  Save,
  IceCream,
  Coffee,
  Pizza,
  Utensils,
  CupSoda,
  Cake,
  Sandwich,
  Salad,
  Soup,
  Cookie
} from "lucide-react"

// Icones disponiveis para categorias
const CATEGORY_ICONS = [
  { value: "ice-cream", label: "Sorvete/Acai", Icon: IceCream },
  { value: "coffee", label: "Cafe", Icon: Coffee },
  { value: "pizza", label: "Pizza", Icon: Pizza },
  { value: "utensils", label: "Restaurante", Icon: Utensils },
  { value: "cup-soda", label: "Bebidas", Icon: CupSoda },
  { value: "cake", label: "Sobremesas", Icon: Cake },
  { value: "sandwich", label: "Lanches", Icon: Sandwich },
  { value: "salad", label: "Saladas", Icon: Salad },
  { value: "soup", label: "Sopas", Icon: Soup },
  { value: "cookie", label: "Doces", Icon: Cookie },
]

interface Category {
  id: number
  name: string
  description: string
  icon: string
  imageUrl: string
  sortOrder: number
  active: boolean
}

interface AdminCategoriesSettingsProps {
  onSave?: () => void
}

export function AdminCategoriesSettings({ onSave }: AdminCategoriesSettingsProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Carregar categorias
  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('[AdminCategories] Erro ao carregar:', error)
    } finally {
      setLoading(false)
    }
  }

  // Adicionar nova categoria
  function handleAddCategory() {
    const newCategory: Category = {
      id: Date.now(), // ID temporario
      name: 'Nova Categoria',
      description: '',
      icon: 'utensils',
      imageUrl: '',
      sortOrder: categories.length + 1,
      active: true,
    }
    setCategories([...categories, newCategory])
    setExpandedId(newCategory.id)
    setHasChanges(true)
  }

  // Atualizar categoria
  function handleUpdateCategory(id: number, field: keyof Category, value: unknown) {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, [field]: value } : cat
    ))
    setHasChanges(true)
  }

  // Excluir categoria
  function handleDeleteCategory(id: number) {
    if (!confirm('Excluir esta categoria? Os produtos vinculados serao desvinculados.')) return
    setCategories(categories.filter(cat => cat.id !== id))
    setHasChanges(true)
  }

  // Mover categoria (reordenar)
  function handleMoveCategory(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= categories.length) return
    
    const newCategories = [...categories]
    const temp = newCategories[index]
    newCategories[index] = newCategories[newIndex]
    newCategories[newIndex] = temp
    
    // Atualizar sortOrder
    newCategories.forEach((cat, i) => {
      cat.sortOrder = i + 1
    })
    
    setCategories(newCategories)
    setHasChanges(true)
  }

  // Salvar todas as categorias
  async function handleSave() {
    setSaving(true)
    try {
      // Para cada categoria, fazer PUT ou POST
      for (const category of categories) {
        const isNew = category.id > 1000000000 // IDs temporarios sao timestamps
        
        if (isNew) {
          await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(category),
          })
        } else {
          await fetch('/api/categories', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(category),
          })
        }
      }
      
      // Recarregar para pegar IDs reais
      await fetchCategories()
      setHasChanges(false)
      onSave?.()
    } catch (error) {
      console.error('[AdminCategories] Erro ao salvar:', error)
      alert('Erro ao salvar categorias')
    } finally {
      setSaving(false)
    }
  }

  // Obter icone pelo nome
  function getIconComponent(iconName: string) {
    const iconConfig = CATEGORY_ICONS.find(i => i.value === iconName)
    return iconConfig?.Icon || Utensils
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Categorias</h3>
          <p className="text-sm text-muted-foreground">Organize seus produtos em categorias</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          )}
          <button
            onClick={handleAddCategory}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80"
          >
            <Plus className="w-4 h-4" />
            Nova Categoria
          </button>
        </div>
      </div>

      {/* Lista de categorias */}
      <div className="space-y-2">
        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma categoria criada. Clique em &quot;Nova Categoria&quot; para comecar.
          </div>
        ) : (
          categories.map((category, index) => {
            const IconComponent = getIconComponent(category.icon)
            const isExpanded = expandedId === category.id
            
            return (
              <div
                key={category.id}
                className={`border rounded-xl transition-all ${
                  isExpanded ? 'border-primary bg-card' : 'border-border bg-card/50'
                }`}
              >
                {/* Header da categoria */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : category.id)}
                >
                  {/* Icone */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    category.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium truncate ${
                      category.active ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {category.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Ordem: {category.sortOrder}
                    </p>
                  </div>
                  
                  {/* Acoes */}
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleMoveCategory(index, 'up')}
                      disabled={index === 0}
                      className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Mover para cima"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveCategory(index, 'down')}
                      disabled={index === categories.length - 1}
                      className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Mover para baixo"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleUpdateCategory(category.id, 'active', !category.active)}
                      className={`p-2 ${category.active ? 'text-emerald-500' : 'text-muted-foreground'}`}
                      title={category.active ? 'Desativar' : 'Ativar'}
                    >
                      {category.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 text-muted-foreground hover:text-red-500"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Conteudo expandido */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                    {/* Nome */}
                    <div>
                      <label className="text-xs text-muted-foreground">Nome da categoria</label>
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => handleUpdateCategory(category.id, 'name', e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ex: Acais, Sorvetes, Bebidas"
                      />
                    </div>
                    
                    {/* Descricao */}
                    <div>
                      <label className="text-xs text-muted-foreground">Descricao (opcional)</label>
                      <input
                        type="text"
                        value={category.description}
                        onChange={(e) => handleUpdateCategory(category.id, 'description', e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ex: Os melhores acais da regiao"
                      />
                    </div>
                    
                    {/* Icone */}
                    <div>
                      <label className="text-xs text-muted-foreground">Icone</label>
                      <div className="grid grid-cols-5 gap-2 mt-2">
                        {CATEGORY_ICONS.map(({ value, label, Icon }) => (
                          <button
                            key={value}
                            onClick={() => handleUpdateCategory(category.id, 'icon', value)}
                            className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                              category.icon === value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                            }`}
                            title={label}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-[10px] truncate w-full text-center">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
