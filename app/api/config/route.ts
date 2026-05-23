import { put, list, del, get } from "@vercel/blob"
import { NextResponse } from "next/server"
import { type SiteConfig, defaultConfig } from "@/lib/config-types"

const CONFIG_PREFIX = "pk-config-"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "PK1040CAH"

// Evitar cache
export const dynamic = "force-dynamic"
export const revalidate = 0

// Headers para evitar cache
const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
}

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
      
      if (blobs.length > 0) {
        // Pegar o blob mais recente
        const latestBlob = blobs.sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        )[0]
        
        // Usar get() para blobs privados - METODO QUE FUNCIONAVA
        const result = await get(latestBlob.pathname, { access: "private" })
        
        if (result && result.stream) {
          const text = await new Response(result.stream).text()
          const config = JSON.parse(text) as SiteConfig
          
          // Retornar config real - NAO sobrescrever com defaults
          return NextResponse.json({ success: true, config }, { headers: noCacheHeaders })
        }
      }
    } catch (e) {
      console.error("[Config GET] Erro ao buscar do Blob:", e)
    }

    // Apenas usar defaultConfig se realmente nao houver dados salvos
    return NextResponse.json({ success: true, config: defaultConfig }, { headers: noCacheHeaders })
  } catch (error) {
    console.error("[Config GET] Erro geral:", error)
    return NextResponse.json({ success: true, config: defaultConfig }, { headers: noCacheHeaders })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { password, config } = body

    // Verificar senha
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 })
    }

    // Validar config
    if (!config) {
      return NextResponse.json({ error: "Config vazia" }, { status: 400 })
    }

    // Salvar nova config com timestamp (private access)
    const timestamp = Date.now()
    const filename = `${CONFIG_PREFIX}${timestamp}.json`
    
    const blob = await put(filename, JSON.stringify(config, null, 2), {
      access: "private",
      contentType: "application/json",
    })

    // Limpar configs antigas (manter apenas o mais recente)
    try {
      const { blobs } = await list({ prefix: CONFIG_PREFIX })
      const oldBlobs = blobs.filter(b => b.url !== blob.url)
      
      for (const oldBlob of oldBlobs) {
        try {
          await del(oldBlob.url)
        } catch {
          // ignorar erro de delete
        }
      }
    } catch (e) {
      console.error("[Config POST] Erro ao limpar blobs antigos:", e)
    }

    return NextResponse.json({ success: true, config })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[Config POST] ERRO:", errorMessage)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
