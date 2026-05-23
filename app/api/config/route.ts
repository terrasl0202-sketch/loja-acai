import { put, list, del, head } from "@vercel/blob"
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
      console.log("[Config GET] Blobs encontrados:", blobs.length)
      
      if (blobs.length > 0) {
        // Pegar o blob mais recente
        const latestBlob = blobs.sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        )[0]
        
        console.log("[Config GET] Blob mais recente:", latestBlob.pathname, "uploadedAt:", latestBlob.uploadedAt)
        
        // Usar head() para pegar downloadUrl (funciona com blobs privados)
        const blobInfo = await head(latestBlob.url)
        const downloadUrl = blobInfo.downloadUrl
        
        // Fazer fetch na downloadUrl
        const response = await fetch(downloadUrl)
        console.log("[Config GET] Fetch status:", response.status)
        
        if (response.ok) {
          const text = await response.text()
          const config = JSON.parse(text) as SiteConfig
          
          console.log("[Config GET] Config carregada - produtos:", config.products?.length, "bairros:", config.delivery?.neighborhoodFees?.length)
          
          // REMOVIDO: Nao sobrescrever produtos reais com defaults
          // Retornar config real diretamente
          return NextResponse.json({ success: true, config }, { headers: noCacheHeaders })
        } else {
          console.log("[Config GET] Fetch falhou:", response.status, response.statusText)
        }
      } else {
        console.log("[Config GET] Nenhum blob encontrado, usando defaultConfig")
      }
    } catch (e) {
      console.error("[Config GET] Erro ao buscar do Blob:", e)
    }

    // Apenas usar defaultConfig se realmente nao houver dados
    console.log("[Config GET] Retornando defaultConfig (fallback)")
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

    console.log("[Config POST] Salvando config - produtos:", config.products?.length, "bairros:", config.delivery?.neighborhoodFees?.length)

    // Salvar nova config com timestamp (private access)
    const timestamp = Date.now()
    const filename = `${CONFIG_PREFIX}${timestamp}.json`
    
    const blob = await put(filename, JSON.stringify(config, null, 2), {
      access: "private",
      contentType: "application/json",
    })

    console.log("[Config POST] Blob salvo:", blob.pathname, "URL:", blob.url)

    // Limpar configs antigas (manter apenas o mais recente)
    try {
      const { blobs } = await list({ prefix: CONFIG_PREFIX })
      const oldBlobs = blobs.filter(b => b.url !== blob.url)
      
      console.log("[Config POST] Limpando", oldBlobs.length, "blobs antigos")
      
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
