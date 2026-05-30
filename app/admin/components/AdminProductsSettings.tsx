"use client"

import { useState, useEffect } from "react"
import { Plus, ChevronUp, ChevronDown, GripVertical, Eye, EyeOff, Trash2, AlertCircle, Tag, Star, Sparkles, Flame, Zap, LayoutGrid } from "lucide-react"
import type { Product } from "@/lib/config-types"

// Tipos de badge disponiveis
const BADGE_TYPES = [
  { value: "mais_vendido", label: "Mais Vendido", icon: Star },
  { value: "promocao", label: "Promocao", icon: Tag },
  { value: "novidade", label: "Novidade", icon: Sparkles },
  { value: "otimo_preco", label: "Otimo Preco", icon: Tag },
  { value: "destaque", label: "Destaque", icon: Flame },
  { value: "personalizado", label: "Personalizado", icon: Zap },
]

interface Category {
  id: number
  name: string
  icon: string
  active: boolean
}

interface AdminProductsSettingsProps {
  products: Product[]
  expandedProduct: number | null
  onExpandedProductChange: (id: number | null) => void
  onAddProduct: () => void
  onUpdateProduct: (id: number, field: keyof Product, value: string | number | boolean) => void
  onRemoveProduct: (id: number) => void
  onMoveProduct: (id: number, direction: "up" | "down") => void
}

export function AdminProductsSettings({
  products,
  expandedProduct,
  onExpandedProductChange,
  onAddProduct,
  onUpdateProduct,
  onRemoveProduct,
  onMoveProduct,
}: AdminProductsSettingsProps) {
  const [categories, setCategories] = useState<Category[]>([])
  
  // Carregar categorias
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data.filter((c: Category) => c.active)))
      .catch(err => console.error('[AdminProducts] Erro ao carregar categorias:', err))
  }, [])

  const sortedProducts = [...products].sort((a, b) => (a.order || 0) - (b.order || 0))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Produtos ({products.length})</h2>
        <button
          onClick={onAddProduct}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl transition-all hover:brightness-110"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <div className="space-y-3">
        {sortedProducts.map((product, index) => (
          <div
            key={product.id}
            className={`rounded-xl border transition-all ${
              product.active 
                ? product.outOfStock 
                  ? "border-yellow-500/30 bg-yellow-500/5" 
                  : "border-border bg-secondary/30" 
                : "border-border/50 bg-secondary/10 opacity-60"
            }`}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => onExpandedProductChange(expandedProduct === product.id ? null : product.id)}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onMoveProduct(product.id, "up") }}
                    disabled={index === 0}
                    className="p-0.5 hover:bg-secondary rounded disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onMoveProduct(product.id, "down") }}
                    disabled={index === sortedProducts.length - 1}
                    className="p-0.5 hover:bg-secondary rounded disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    R$ {product.price.toFixed(2)} - Estoque: {product.stock}
                    {product.outOfStock && <span className="text-yellow-400 ml-2">(Esgotado)</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  product.active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                }`}>
                  {product.active ? "Ativo" : "Inativo"}
                </span>
                {expandedProduct === product.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>

            {/* Expanded Content */}
            {expandedProduct === product.id && (
              <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Nome</label>
                    <input
                      type="text"
                      value={product.name}
                      onChange={(e) => onUpdateProduct(product.id, "name", e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Preco (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={product.price}
                      onChange={(e) => onUpdateProduct(product.id, "price", Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground">Descricao</label>
                  <input
                    type="text"
                    value={product.description}
                    onChange={(e) => onUpdateProduct(product.id, "description", e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Categoria
                  </label>
                  <select
                    value={(product as Product & { categoryId?: number }).categoryId || ""}
                    onChange={(e) => onUpdateProduct(product.id, "categoryId" as keyof Product, e.target.value ? Number(e.target.value) : null as unknown as number)}
                    className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Estoque</label>
                    <input
                      type="number"
                      value={product.stock}
                      onChange={(e) => onUpdateProduct(product.id, "stock", Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => onUpdateProduct(product.id, "outOfStock", !product.outOfStock)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                        product.outOfStock
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <AlertCircle className="w-4 h-4" />
                      {product.outOfStock ? "Esgotado" : "Disponivel"}
                    </button>
                  </div>
                </div>

                {/* Secao: Exibicao no Card */}
                <div className="pt-4 border-t border-border space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    Exibicao no Card
                  </h4>
                  
                  {/* Badge/Selo */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={product.badgeEnabled || false}
                        onChange={(e) => onUpdateProduct(product.id, "badgeEnabled", e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">Mostrar selo/badge</span>
                    </label>
                    
                    {product.badgeEnabled && (
                      <div className="grid sm:grid-cols-2 gap-3 pl-6">
                        <div>
                          <label className="text-xs text-muted-foreground">Texto do selo</label>
                          <input
                            type="text"
                            value={product.badgeText || ""}
                            onChange={(e) => onUpdateProduct(product.id, "badgeText", e.target.value)}
                            placeholder="Ex: Mais vendido"
                            className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Tipo do selo</label>
                          <select
                            value={product.badgeType || "mais_vendido"}
                            onChange={(e) => onUpdateProduct(product.id, "badgeType", e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {BADGE_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs text-muted-foreground">Cor personalizada (opcional)</label>
                          <div className="flex gap-2 mt-1">
                            <input
                              type="color"
                              value={product.badgeColor || "#F59E0B"}
                              onChange={(e) => onUpdateProduct(product.id, "badgeColor", e.target.value)}
                              className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                            />
                            <input
                              type="text"
                              value={product.badgeColor || ""}
                              onChange={(e) => onUpdateProduct(product.id, "badgeColor", e.target.value)}
                              placeholder="#F59E0B"
                              className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Texto de Porcao */}
                  <div className="space-y-3 pt-3 border-t border-border/50">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={product.showServingText || false}
                        onChange={(e) => onUpdateProduct(product.id, "showServingText", e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">Mostrar texto de porcao/tamanho</span>
                    </label>
                    
                    {product.showServingText && (
                      <div className="pl-6">
                        <label className="text-xs text-muted-foreground">Texto</label>
                        <input
                          type="text"
                          value={product.servingText || ""}
                          onChange={(e) => onUpdateProduct(product.id, "servingText", e.target.value)}
                          placeholder="Ex: Serve 1 pessoa, 500ml, 1 litro"
                          className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => onUpdateProduct(product.id, "active", !product.active)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                      product.active
                        ? "bg-green-600/20 text-green-500"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {product.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {product.active ? "Ativo" : "Inativo"}
                  </button>
                  <button
                    onClick={() => onRemoveProduct(product.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition-colors text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
