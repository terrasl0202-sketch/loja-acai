import { put, list, del } from "@vercel/blob"
import { NextResponse } from "next/server"
import { type SiteConfig, defaultConfig } from "@/lib/config-types"

const CONFIG_PREFIX = "pk-config-"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "PK1040CAH"

export async function GET(request: Request) {
  try {
    // Verificar senha para acesso admin (opcional)
    const url = new URL(request.url)
    const isAdmin = url.searchParams.get("admin") === "true"
    const password = url.searchParams.get("password")

    if (isAdmin && password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Tentar carregar config do Blob
    try {
      const { blobs } = await list({ prefix: CONFIG_PREFIX })
      
      console.log("[Config GET] Blobs encontrados:", blobs.length)
      
      if (blobs.length > 0) {
        // Pegar o blob mais recente
        const latestBlob = blobs.sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        )[0]
        
        console.log("[Config GET] Carregando de:", latestBlob.url)
        
        // Fazer fetch do conteudo usando a URL do blob
        const response = await fetch(latestBlob.url)
        if (response.ok) {
          const config = await response.json() as SiteConfig
          console.log("[Config GET] Config carregada com sucesso")
          return NextResponse.json({ success: true, config })
        }
      }
    } catch (e) {
      console.error("[Config GET] Erro ao buscar do Blob:", e)
    }

    console.log("[Config GET] Usando config padrao")
    return NextResponse.json({ success: true, config: defaultConfig })
  } catch (error) {
    console.error("[Config GET] Erro geral:", error)
    return NextResponse.json({ success: true, config: defaultConfig })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { password, config } = body

    console.log("[Config POST] Recebendo requisicao de salvamento")

    // Verificar senha
    if (password !== ADMIN_PASSWORD) {
      console.log("[Config POST] Senha incorreta")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validar config
    if (!config) {
      console.log("[Config POST] Config vazia")
      return NextResponse.json({ error: "Config is required" }, { status: 400 })
    }

    // Deletar configs antigas
    try {
      const { blobs } = await list({ prefix: CONFIG_PREFIX })
      console.log("[Config POST] Deletando", blobs.length, "configs antigas")
      for (const blob of blobs) {
        await del(blob.url)
      }
    } catch (e) {
      console.log("[Config POST] Erro ao deletar antigas (ignorando):", e)
    }

    // Salvar nova config com timestamp para garantir unicidade
    const timestamp = Date.now()
    const filename = `${CONFIG_PREFIX}${timestamp}.json`
    
    const blob = await put(filename, JSON.stringify(config, null, 2), {
      access: "public",
      contentType: "application/json",
    })

    console.log("[Config POST] Salvo com sucesso em:", blob.url)

    return NextResponse.json({ success: true, config, url: blob.url })
  } catch (error) {
    console.error("[Config POST] Erro ao salvar:", error)
    return NextResponse.json(
      { error: "Failed to save config", details: String(error) },
      { status: 500 }
    )
  }
}
