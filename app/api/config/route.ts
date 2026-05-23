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
  const startTime = Date.now()
  
  try {
    // Verificar senha para acesso admin (opcional)
    const url = new URL(request.url)
    const isAdmin = url.searchParams.get("admin") === "true"
    const password = url.searchParams.get("password")

    if (isAdmin && password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Tentar carregar config do Blob
    console.log("[Config GET] Iniciando busca no Blob...")
    
    const { blobs } = await list({ prefix: CONFIG_PREFIX })
    console.log("[Config GET] list() retornou", blobs.length, "blobs")
    
    if (blobs.length === 0) {
      console.log("[Config GET] Nenhum blob encontrado - retornando defaultConfig")
      return NextResponse.json({ 
        success: true, 
        config: defaultConfig,
        source: "default-no-blobs"
      }, { headers: noCacheHeaders })
    }
    
    // Pegar o blob mais recente
    const sortedBlobs = blobs.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )
    const latestBlob = sortedBlobs[0]
    
    console.log("[Config GET] Blob mais recente:", latestBlob.pathname)
    console.log("[Config GET] uploadedAt:", latestBlob.uploadedAt)
    console.log("[Config GET] URL:", latestBlob.url)
    
    // Usar head() para pegar downloadUrl
    const blobInfo = await head(latestBlob.url)
    console.log("[Config GET] head() retornou downloadUrl:", blobInfo.downloadUrl ? "SIM" : "NAO")
    
    if (!blobInfo.downloadUrl) {
      console.error("[Config GET] ERRO: downloadUrl nao disponivel")
      return NextResponse.json({ 
        success: true, 
        config: defaultConfig,
        source: "default-no-downloadUrl"
      }, { headers: noCacheHeaders })
    }
    
    // Fazer fetch na downloadUrl
    const response = await fetch(blobInfo.downloadUrl)
    console.log("[Config GET] fetch() status:", response.status)
    
    if (!response.ok) {
      console.error("[Config GET] ERRO: fetch falhou com status", response.status)
      return NextResponse.json({ 
        success: true, 
        config: defaultConfig,
        source: "default-fetch-failed"
      }, { headers: noCacheHeaders })
    }
    
    const text = await response.text()
    console.log("[Config GET] Conteudo recebido, tamanho:", text.length, "bytes")
    
    if (!text || text.trim() === "") {
      console.error("[Config GET] ERRO: conteudo vazio")
      return NextResponse.json({ 
        success: true, 
        config: defaultConfig,
        source: "default-empty-content"
      }, { headers: noCacheHeaders })
    }
    
    const config = JSON.parse(text) as SiteConfig
    
    const elapsed = Date.now() - startTime
    console.log("[Config GET] SUCESSO em", elapsed, "ms")
    console.log("[Config GET] produtos:", config.products?.length || 0)
    console.log("[Config GET] bairros:", config.delivery?.neighborhoodFees?.length || 0)
    
    return NextResponse.json({ 
      success: true, 
      config,
      source: "blob"
    }, { headers: noCacheHeaders })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[Config GET] ERRO GERAL:", errorMessage)
    return NextResponse.json({ 
      success: true, 
      config: defaultConfig,
      source: "default-error",
      error: errorMessage
    }, { headers: noCacheHeaders })
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
