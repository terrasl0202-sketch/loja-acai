import { put, list } from "@vercel/blob"
import { NextResponse } from "next/server"
import { type SiteConfig, defaultConfig } from "@/lib/config-types"

const CONFIG_FILENAME = "site-config.json"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "PK1040CAH"

export async function GET(request: Request) {
  try {
    // Verificar senha para acesso admin
    const url = new URL(request.url)
    const isAdmin = url.searchParams.get("admin") === "true"
    const password = url.searchParams.get("password")

    if (isAdmin && password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Tentar carregar config do Blob usando list para encontrar o arquivo
    try {
      const { blobs } = await list({ prefix: CONFIG_FILENAME })
      
      if (blobs.length > 0) {
        // Pegar o blob mais recente
        const latestBlob = blobs.sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        )[0]
        
        // Fazer fetch do conteudo usando a URL do blob
        const response = await fetch(latestBlob.url)
        if (response.ok) {
          const config = await response.json() as SiteConfig
          return NextResponse.json({ success: true, config })
        }
      }
    } catch (e) {
      console.error("[Config] Erro ao buscar do Blob:", e)
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

    // Salvar no Blob (public para poder fazer fetch da URL)
    const blob = await put(CONFIG_FILENAME, JSON.stringify(config, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    })

    console.log("[Config] Salvo com sucesso:", blob.url)

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error("[Config] Erro ao salvar:", error)
    return NextResponse.json(
      { error: "Failed to save config" },
      { status: 500 }
    )
  }
}
