import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getStoreIdFromRequest } from "@/lib/api-store"
import { requireStoreAuth } from "@/lib/store-session"

/**
 * /api/pix-keys v2 - MULTIEMPRESA
 * Chaves PIX isoladas por loja.
 */

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey)
}

// GET - Listar chaves PIX da loja atual (DADO FINANCEIRO/PII -> exige sessao).
// A vitrine publica usa /api/pix-keys/active (sem PII sensivel), nao esta rota.
export async function GET(request: NextRequest) {
  const auth = await requireStoreAuth(request)
  if (!auth.ok) return auth.response!
  const storeId = auth.storeId
  console.log(`[pix-keys v2 GET] storeId: ${storeId}`)
  
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ keys: [] })
    }

    const { data, error } = await supabase
      .from("pix_manual_keys")
      .select("*")
      .eq("store_id", storeId) // Filtrar por loja
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao buscar chaves PIX:", error)
      if (error.message.includes("does not exist")) {
        return NextResponse.json({ keys: [] })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const keys = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      alias: row.alias || "Chave PIX",
      keyType: row.key_type || "telefone",
      keyValue: row.key_value || "",
      receiverName: row.receiver_name || "",
      city: row.city || "SAO PAULO",
      isActive: row.is_active || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({ keys, storeId })
  } catch (err) {
    console.error("Erro ao buscar chaves PIX:", err)
    return NextResponse.json({ keys: [] })
  }
}

// POST - Criar nova chave PIX para loja atual
export async function POST(request: NextRequest) {
  const auth = await requireStoreAuth(request)
  if (!auth.ok) return auth.response!
  const storeId = auth.storeId
  
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase nao configurado" }, { status: 500 })
    }

    const body = await request.json()
    const { alias, keyType, keyValue, receiverName, city, isActive } = body

    if (!keyValue) {
      return NextResponse.json({ error: "Chave PIX e obrigatoria" }, { status: 400 })
    }

    if (!receiverName) {
      return NextResponse.json({ error: "Nome do recebedor e obrigatorio" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("pix_manual_keys")
      .insert({
        alias: alias || "Chave PIX",
        key_type: keyType || "telefone",
        key_value: keyValue,
        receiver_name: receiverName,
        city: city || "SAO PAULO",
        is_active: isActive || false,
        store_id: storeId, // SEMPRE salvar store_id
      })
      .select()
      .single()

    if (error) {
      console.error("Erro ao criar chave PIX:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      storeId,
      key: {
        id: data.id,
        alias: data.alias,
        keyType: data.key_type,
        keyValue: data.key_value,
        receiverName: data.receiver_name,
        city: data.city,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    })
  } catch (err) {
    console.error("Erro ao criar chave PIX:", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// PUT - Atualizar chave PIX (verifica se pertence a loja)
export async function PUT(request: NextRequest) {
  const auth = await requireStoreAuth(request)
  if (!auth.ok) return auth.response!
  const storeId = auth.storeId
  
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase nao configurado" }, { status: 500 })
    }

    const body = await request.json()
    const { id, alias, keyType, keyValue, receiverName, city, isActive } = body

    if (!id) {
      return NextResponse.json({ error: "ID da chave e obrigatorio" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (alias !== undefined) updateData.alias = alias
    if (keyType !== undefined) updateData.key_type = keyType
    if (keyValue !== undefined) updateData.key_value = keyValue
    if (receiverName !== undefined) updateData.receiver_name = receiverName
    if (city !== undefined) updateData.city = city
    if (isActive !== undefined) updateData.is_active = isActive

    const { data, error } = await supabase
      .from("pix_manual_keys")
      .update(updateData)
      .eq("id", id)
      .eq("store_id", storeId) // Seguranca
      .select()
      .single()

    if (error) {
      console.error("Erro ao atualizar chave PIX:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      storeId,
      key: {
        id: data.id,
        alias: data.alias,
        keyType: data.key_type,
        keyValue: data.key_value,
        receiverName: data.receiver_name,
        city: data.city,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    })
  } catch (err) {
    console.error("Erro ao atualizar chave PIX:", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// DELETE - Excluir chave PIX (verifica se pertence a loja)
export async function DELETE(request: NextRequest) {
  const auth = await requireStoreAuth(request)
  if (!auth.ok) return auth.response!
  const storeId = auth.storeId
  
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase nao configurado" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID da chave e obrigatorio" }, { status: 400 })
    }

    const { error } = await supabase
      .from("pix_manual_keys")
      .delete()
      .eq("id", id)
      .eq("store_id", storeId) // Seguranca

    if (error) {
      console.error("Erro ao excluir chave PIX:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, storeId })
  } catch (err) {
    console.error("Erro ao excluir chave PIX:", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
