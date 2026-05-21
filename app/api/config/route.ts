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

    console.log("[Config POST] Iniciando salvamento...")

    // Verificar senha
    if (password !== ADMIN_PASSWORD) {
      console.log("[Config POST] Senha incorreta")
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 })
    }

    // Validar config
    if (!config) {
      console.log("[Config POST] Config vazia")
      return NextResponse.json({ error: "Config vazia" }, { status: 400 })
    }

    // Salvar nova config com timestamp
    const timestamp = Date.now()
    const filename = `${CONFIG_PREFIX}${timestamp}.json`
    
    console.log("[Config POST] Salvando arquivo:", filename)
    
    const blob = await put(filename, JSON.stringify(config, null, 2), {
      access: "public",
      contentType: "application/json",
    })

    console.log("[Config POST] Arquivo salvo:", blob.url)

    // Limpar configs antigas (em background, sem bloquear)
    list({ prefix: CONFIG_PREFIX }).then(async ({ blobs }) => {
      const oldBlobs = blobs
        .filter(b => b.url !== blob.url)
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        .slice(1) // manter apenas a mais recente além da atual
      
      for (const oldBlob of oldBlobs) {
        try {
          await del(oldBlob.url)
          console.log("[Config POST] Deletado antigo:", oldBlob.pathname)
        } catch (e) {
          // ignorar erro de delete
        }
      }
    }).catch(() => {})

    return NextResponse.json({ success: true, config, url: blob.url })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[Config POST] ERRO:", errorMessage)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
