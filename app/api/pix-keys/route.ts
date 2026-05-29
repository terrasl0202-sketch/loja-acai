import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// GET - Listar todas as chaves PIX
export async function GET() {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ keys: [] })
    }

    const { data, error } = await supabase
      .from("pix_manual_keys")
      .select("*")
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

    return NextResponse.json({ keys })
  } catch (err) {
    console.error("Erro ao buscar chaves PIX:", err)
    return NextResponse.json({ keys: [] })
  }
}

// POST - Criar nova chave PIX
export async function POST(request: NextRequest) {
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
      })
      .select()
      .single()

    if (error) {
      console.error("Erro ao criar chave PIX:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
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

// PUT - Atualizar chave PIX
export async function PUT(request: NextRequest) {
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
      .select()
      .single()

    if (error) {
      console.error("Erro ao atualizar chave PIX:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
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

// DELETE - Excluir chave PIX
export async function DELETE(request: NextRequest) {
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

    if (error) {
      console.error("Erro ao excluir chave PIX:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Erro ao excluir chave PIX:", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
