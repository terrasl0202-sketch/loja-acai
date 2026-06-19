import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/supabase/service"
import { verifyStoreAdmin } from "@/lib/platform-auth"

/**
 * /api/platform/store-mutate
 *
 * Escrita ADITIVA e AUTENTICADA por loja. Sempre:
 *  - valida a senha do admin DAQUELA loja (verifyStoreAdmin);
 *  - FORCA o store_id da loja (nunca confia em store_id do body);
 *  - roda com service role (RLS ativo, sem policy publica);
 *  - faz operacoes pontuais (insert/update/toggle), NUNCA apaga o catalogo.
 *
 * Acoes suportadas:
 *  product.create | product.update | product.toggle
 *  category.create | category.update
 *  neighborhood.create | neighborhood.update
 *  order.status
 *
 * NAO mexe em pagamento/webhook/Asaas.
 */
export const dynamic = "force-dynamic"
export const revalidate = 0
const noCache = { "Cache-Control": "no-store, no-cache, must-revalidate" }

function bad(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status, headers: noCache })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const storeId = Number(body?.storeId)
    const password = body?.password
    const action = String(body?.action || "")
    const payload = body?.payload || {}

    // 1) Autenticacao por loja
    const auth = await verifyStoreAdmin(storeId, password)
    if (!auth.ok) {
      return bad(auth.error || "Acesso negado", auth.status)
    }

    const supabase = getServiceClient()
    if (!supabase) return bad("Erro de conexao", 500)

    switch (action) {
      // ---------------- PRODUTOS ----------------
      case "product.create": {
        if (!payload.name || payload.price == null) return bad("Nome e preco obrigatorios")
        const row = {
          name: String(payload.name),
          description: payload.description || "",
          price: Number(payload.price),
          category: payload.category || "geral",
          category_id: payload.categoryId ?? null,
          image: payload.image || "",
          active: payload.active !== false,
          stock: payload.stock ?? 100,
          store_id: auth.store!.id, // FORCADO
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        const { data, error } = await supabase.from("products").insert(row).select().single()
        if (error) return bad(error.message, 500)
        return NextResponse.json({ success: true, product: data }, { headers: noCache })
      }
      case "product.update": {
        if (!payload.id) return bad("ID obrigatorio")
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (payload.name !== undefined) updates.name = payload.name
        if (payload.description !== undefined) updates.description = payload.description
        if (payload.price !== undefined) updates.price = Number(payload.price)
        if (payload.categoryId !== undefined) updates.category_id = payload.categoryId
        if (payload.image !== undefined) updates.image = payload.image
        if (payload.stock !== undefined) updates.stock = payload.stock
        if (payload.active !== undefined) updates.active = payload.active
        const { data, error } = await supabase
          .from("products")
          .update(updates)
          .eq("id", payload.id)
          .eq("store_id", auth.store!.id) // FORCADO
          .select()
          .single()
        if (error) return bad(error.message, 500)
        return NextResponse.json({ success: true, product: data }, { headers: noCache })
      }
      case "product.toggle": {
        if (!payload.id) return bad("ID obrigatorio")
        const { data, error } = await supabase
          .from("products")
          .update({ active: !!payload.active, updated_at: new Date().toISOString() })
          .eq("id", payload.id)
          .eq("store_id", auth.store!.id) // FORCADO
          .select()
          .single()
        if (error) return bad(error.message, 500)
        return NextResponse.json({ success: true, product: data }, { headers: noCache })
      }

      // ---------------- CATEGORIAS ----------------
      case "category.create": {
        if (!payload.name) return bad("Nome obrigatorio")
        const row = {
          name: String(payload.name),
          description: payload.description || "",
          icon: payload.icon || "utensils",
          image_url: payload.imageUrl || "",
          sort_order: payload.sortOrder ?? 0,
          active: payload.active !== false,
          store_id: auth.store!.id, // FORCADO
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        const { data, error } = await supabase.from("product_categories").insert(row).select().single()
        if (error) return bad(error.message, 500)
        return NextResponse.json({ success: true, category: data }, { headers: noCache })
      }
      case "category.update": {
        if (!payload.id) return bad("ID obrigatorio")
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (payload.name !== undefined) updates.name = payload.name
        if (payload.description !== undefined) updates.description = payload.description
        if (payload.icon !== undefined) updates.icon = payload.icon
        if (payload.imageUrl !== undefined) updates.image_url = payload.imageUrl
        if (payload.sortOrder !== undefined) updates.sort_order = payload.sortOrder
        if (payload.active !== undefined) updates.active = payload.active
        const { data, error } = await supabase
          .from("product_categories")
          .update(updates)
          .eq("id", payload.id)
          .eq("store_id", auth.store!.id) // FORCADO
          .select()
          .single()
        if (error) return bad(error.message, 500)
        return NextResponse.json({ success: true, category: data }, { headers: noCache })
      }

      // ---------------- BAIRROS ----------------
      case "neighborhood.create": {
        if (!payload.name) return bad("Nome obrigatorio")
        const row = {
          name: String(payload.name),
          delivery_fee: Number(payload.deliveryFee ?? payload.fee ?? 0),
          active: payload.active !== false,
          sort_order: payload.sortOrder ?? 0,
          store_id: auth.store!.id, // FORCADO
          created_at: new Date().toISOString(),
        }
        const { data, error } = await supabase.from("neighborhoods").insert(row).select().single()
        if (error) return bad(error.message, 500)
        return NextResponse.json({ success: true, neighborhood: data }, { headers: noCache })
      }
      case "neighborhood.update": {
        if (!payload.id) return bad("ID obrigatorio")
        const updates: Record<string, unknown> = {}
        if (payload.name !== undefined) updates.name = payload.name
        if (payload.deliveryFee !== undefined || payload.fee !== undefined)
          updates.delivery_fee = Number(payload.deliveryFee ?? payload.fee ?? 0)
        if (payload.active !== undefined) updates.active = payload.active
        if (payload.sortOrder !== undefined) updates.sort_order = payload.sortOrder
        const { data, error } = await supabase
          .from("neighborhoods")
          .update(updates)
          .eq("id", payload.id)
          .eq("store_id", auth.store!.id) // FORCADO
          .select()
          .single()
        if (error) return bad(error.message, 500)
        return NextResponse.json({ success: true, neighborhood: data }, { headers: noCache })
      }

      // ---------------- PEDIDOS ----------------
      case "order.status": {
        if (!payload.id || !payload.status) return bad("ID e status obrigatorios")
        const allowed = ["pending", "confirmed", "preparing", "delivering", "completed", "cancelled"]
        if (!allowed.includes(payload.status)) return bad("Status invalido")
        const { data, error } = await supabase
          .from("orders")
          .update({ status: payload.status })
          .eq("id", payload.id)
          .eq("store_id", auth.store!.id) // FORCADO
          .select()
          .single()
        if (error) return bad(error.message, 500)
        return NextResponse.json({ success: true, order: data }, { headers: noCache })
      }

      default:
        return bad("Acao desconhecida")
    }
  } catch (error) {
    console.error("[store-mutate] Erro:", error)
    return bad("Erro interno", 500)
  }
}
