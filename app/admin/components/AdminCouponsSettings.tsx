"use client"

import { Plus, Trash2, Tag } from "lucide-react"
import type { Coupon } from "@/lib/config-types"

interface AdminCouponsSettingsProps {
  coupons: Coupon[]
  onAddCoupon: () => void
  onUpdateCoupon: (id: string, field: keyof Coupon, value: Coupon[keyof Coupon]) => void
  onRemoveCoupon: (id: string) => void
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
        <h2 className="text-xl font-bold text-foreground">Cupons de Desconto</h2>
        <button
          onClick={onAddCoupon}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl transition-all hover:brightness-110"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <div className="space-y-3">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className={`p-4 rounded-xl border ${
              coupon.active ? "border-border bg-secondary/30" : "border-border/50 bg-secondary/10 opacity-60"
            }`}
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Codigo</label>
                <input
                  type="text"
                  value={coupon.code}
                  onChange={(e) => onUpdateCoupon(coupon.id, "code", e.target.value.toUpperCase())}
                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tipo</label>
                <select
                  value={coupon.type}
                  onChange={(e) => onUpdateCoupon(coupon.id, "type", e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                >
                  <option value="percentage">Porcentagem</option>
                  <option value="fixed">Valor Fixo</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Valor {coupon.type === "percentage" ? "(%)" : "(R$)"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={coupon.value}
                  onChange={(e) => onUpdateCoupon(coupon.id, "value", Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Pedido Minimo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={coupon.minimumOrder}
                  onChange={(e) => onUpdateCoupon(coupon.id, "minimumOrder", Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => onUpdateCoupon(coupon.id, "active", !coupon.active)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    coupon.active
                      ? "bg-green-600/20 text-green-500"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {coupon.active ? "Ativo" : "Inativo"}
                </button>
                <button
                  onClick={() => onRemoveCoupon(coupon.id)}
                  className="p-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {coupons.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum cupom cadastrado</p>
            <p className="text-sm">Clique em Adicionar para criar um cupom</p>
          </div>
        )}
      </div>
    </div>
  )
}
