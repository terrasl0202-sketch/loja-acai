"use client"

import { Plus, ChevronUp, ChevronDown, GripVertical, Eye, EyeOff, Trash2, AlertCircle } from "lucide-react"
import type { Product } from "@/lib/config-types"

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
