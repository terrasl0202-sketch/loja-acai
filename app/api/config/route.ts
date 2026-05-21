import { put, get } from "@vercel/blob"
import { NextResponse } from "next/server"
import { type SiteConfig, defaultConfig } from "@/lib/config-types"

const CONFIG_PATHNAME = "site-config.json"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pk2024admin"

export async function GET(request: Request) {
  try {
    // Verificar senha para acesso admin
    const url = new URL(request.url)
    const isAdmin = url.searchParams.get("admin") === "true"
    const password = url.searchParams.get("password")

    if (isAdmin && password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Tentar carregar config do Blob
    try {
      const result = await get(CONFIG_PATHNAME, { access: "private" })
      
      if (result) {
        const text = await new Response(result.stream).text()
        const config = JSON.parse(text) as SiteConfig
        return NextResponse.json({ success: true, config })
      }
    } catch {
      // Config nao existe ainda, retornar padrao
    }

    return NextResponse.json({ success: true, config: defaultConfig })
  } catch (error) {
    console.error("[Config] Erro ao carregar:", error)
    return NextResponse.json({ success: true, config: defaultConfig })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { password, config } = body

    // Verificar senha
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validar config
    if (!config) {
      return NextResponse.json({ error: "Config is required" }, { status: 400 })
    }

    // Salvar no Blob
    const blob = await put(CONFIG_PATHNAME, JSON.stringify(config, null, 2), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
    })

    console.log("[Config] Salvo com sucesso:", blob.pathname)

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error("[Config] Erro ao salvar:", error)
    return NextResponse.json(
      { error: "Failed to save config" },
      { status: 500 }
    )
  }
}
