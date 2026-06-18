"use client"

import { Plus, Trash2, Tag, Truck, Percent, DollarSign, Gift } from "lucide-react"
import type { Coupon } from "@/lib/config-types"

interface AdminCouponsSettingsProps {
  coupons: Coupon[]
  onAddCoupon: () => void
  onUpdateCoupon: (id: string, field: keyof Coupon, value: Coupon[keyof Coupon]) => void
  onRemoveCoupon: (id: string) => void
}

// Helper para gerar preview do cupom
function getCouponPreview(coupon: Coupon): string {
  const minText = coupon.minimumOrder > 0 ? ` em pedidos acima de R$${coupon.minimumOrder.toFixed(2)}` : ''
  
  switch (coupon.type) {
    case 'percentage':
      return `${coupon.value}% de desconto${minText}`
    case 'fixed':
      return `R$${coupon.value.toFixed(2)} de desconto${minText}`
    case 'free_shipping':
      return `Frete gratis${minText}`
    case 'shipping_discount':
      if (coupon.shippingDiscountType === 'percentage') {
        return `${coupon.shippingDiscountValue || 0}% de desconto no frete${minText}`
      }
      return `R$${(coupon.shippingDiscountValue || 0).toFixed(2)} de desconto no frete${minText}`
    default:
      return 'Cupom de desconto'
  }
}

// Helper para icone do tipo
function getTypeIcon(type: string) {
  switch (type) {
    case 'percentage':
      return <Percent className="w-4 h-4" />
    case 'fixed':
      return <DollarSign className="w-4 h-4" />
    case 'free_shipping':
      return <Gift className="w-4 h-4" />
    case 'shipping_discount':
      return <Truck className="w-4 h-4" />
    default:
      return <Tag className="w-4 h-4" />
  }
}

export function AdminCouponsSettings({
  coupons,
  onAddCoupon,
  onUpdateCoupon,
  onRemoveCoupon,
}: AdminCouponsSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Cupons de Desconto</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie cupons para produtos e frete</p>
        </div>
        <button
          onClick={onAddCoupon}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl transition-all hover:brightness-110"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <div className="space-y-4">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className={`p-4 rounded-xl border transition-all ${
              coupon.active ? "border-primary/30 bg-card" : "border-border/50 bg-secondary/10 opacity-60"
            }`}
          >
            {/* Preview do Cupom */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/50">
              <div className={`p-2 rounded-lg ${coupon.active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {getTypeIcon(coupon.type)}
              </div>
              <div className="flex-1">
                <p className="font-mono font-bold text-foreground">{coupon.code || 'CODIGO'}</p>
                <p className="text-sm text-muted-foreground">{getCouponPreview(coupon)}</p>
              </div>
              <button
                onClick={() => onUpdateCoupon(coupon.id, "active", !coupon.active)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  coupon.active
                    ? "bg-green-600/20 text-green-500 border border-green-500/30"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}
              >
                {coupon.active ? "Ativo" : "Inativo"}
              </button>
            </div>

            {/* Campos do Cupom */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Codigo */}
              <div>
                <label className="text-xs text-muted-foreground font-medium">Codigo do Cupom</label>
                <input
                  type="text"
                  value={coupon.code}
                  onChange={(e) => onUpdateCoupon(coupon.id, "code", e.target.value.toUpperCase())}
                  placeholder="CUPOM10"
                  className="w-full mt-1.5 px-3 py-2.5 bg-background/50 border border-border/50 rounded-xl text-foreground text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Tipo de Desconto */}
              <div>
                <label className="text-xs text-muted-foreground font-medium">Tipo de Desconto</label>
                <select
                  value={coupon.type}
                  onChange={(e) => {
                    onUpdateCoupon(coupon.id, "type", e.target.value)
                    // Reset campos relacionados ao mudar tipo
                    if (e.target.value === 'free_shipping') {
                      onUpdateCoupon(coupon.id, "value", 0)
                    }
                    if (e.target.value !== 'shipping_discount') {
                      onUpdateCoupon(coupon.id, "shippingDiscountType", undefined)
                      onUpdateCoupon(coupon.id, "shippingDiscountValue", undefined)
                    }
                  }}
                  className="w-full mt-1.5 px-3 py-2.5 bg-background/50 border border-border/50 rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="percentage">Porcentagem no Pedido</option>
                  <option value="fixed">Valor Fixo no Pedido</option>
                  <option value="free_shipping">Frete Gratis</option>
                  <option value="shipping_discount">Desconto no Frete</option>
                </select>
              </div>

              {/* Valor do Desconto (oculto para frete gratis) */}
              {coupon.type !== 'free_shipping' && coupon.type !== 'shipping_discount' && (
                <div>
                  <label className="text-xs text-muted-foreground font-medium">
                    Valor {coupon.type === "percentage" ? "(%)" : "(R$)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={coupon.value}
                    onChange={(e) => onUpdateCoupon(coupon.id, "value", Number(e.target.value))}
                    className="w-full mt-1.5 px-3 py-2.5 bg-background/50 border border-border/50 rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}

              {/* Campos para Desconto no Frete */}
              {coupon.type === 'shipping_discount' && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Tipo de Desconto no Frete</label>
                    <select
                      value={coupon.shippingDiscountType || 'fixed'}
                      onChange={(e) => onUpdateCoupon(coupon.id, "shippingDiscountType", e.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 bg-background/50 border border-border/50 rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="fixed">Valor Fixo (R$)</option>
                      <option value="percentage">Porcentagem (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">
                      Desconto {coupon.shippingDiscountType === 'percentage' ? '(%)' : '(R$)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={coupon.shippingDiscountValue || 0}
                      onChange={(e) => onUpdateCoupon(coupon.id, "shippingDiscountValue", Number(e.target.value))}
                      className="w-full mt-1.5 px-3 py-2.5 bg-background/50 border border-border/50 rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </>
              )}

              {/* Info para Frete Gratis */}
              {coupon.type === 'free_shipping' && (
                <div className="sm:col-span-2">
                  <div className="mt-1.5 px-3 py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <p className="text-sm text-green-500 flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      Este cupom zera 100% da taxa de entrega
                    </p>
                  </div>
                </div>
              )}

              {/* Pedido Minimo */}
              <div>
                <label className="text-xs text-muted-foreground font-medium">Pedido Minimo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={coupon.minimumOrder}
                  onChange={(e) => onUpdateCoupon(coupon.id, "minimumOrder", Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full mt-1.5 px-3 py-2.5 bg-background/50 border border-border/50 rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-muted-foreground mt-1">0 = sem minimo</p>
              </div>

              {/* Botao Remover */}
              <div className="flex items-end">
                <button
                  onClick={() => onRemoveCoupon(coupon.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-all text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover
                </button>
              </div>
            </div>
          </div>
        ))}

        {coupons.length === 0 && (
          <div className="text-center py-12 bg-card/50 rounded-2xl border border-dashed border-border">
            <Tag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-foreground font-medium">Nenhum cupom cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">Clique em Adicionar para criar um cupom</p>
          </div>
        )}
      </div>

      {/* Dicas */}
      <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
        <h3 className="text-sm font-medium text-foreground mb-2">Tipos de Cupom</h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li className="flex items-center gap-2"><Percent className="w-3 h-3" /> <strong>Porcentagem:</strong> Desconto % no valor dos produtos</li>
          <li className="flex items-center gap-2"><DollarSign className="w-3 h-3" /> <strong>Valor Fixo:</strong> Desconto em R$ no valor dos produtos</li>
          <li className="flex items-center gap-2"><Gift className="w-3 h-3" /> <strong>Frete Gratis:</strong> Zera 100% da taxa de entrega</li>
          <li className="flex items-center gap-2"><Truck className="w-3 h-3" /> <strong>Desconto no Frete:</strong> Desconto % ou R$ na taxa de entrega</li>
        </ul>
      </div>
    </div>
  )
}
