import crypto from "crypto"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getStoreIdFromRequest, INVALID_STORE_ID } from "@/lib/api-store"
import { verifyStoreAdmin } from "@/lib/platform-auth"
import { getClientIp, logSecurityEvent } from "@/lib/security-log"

/**
 * Sessao de ADMIN POR LOJA via cookie httpOnly assinado (HMAC-SHA256).
 *
 * Objetivo de seguranca:
 *  - O login (/api/admin/auth) valida a senha da loja (verifyStoreAdmin) e
 *    emite um cookie assinado contendo APENAS { storeId, exp }.
 *  - As rotas de dados validam o cookie e conferem que session.storeId ===
 *    store_id resolvido pelo slug/host. Assim, a sessao da Loja A nunca acessa
 *    dados da Loja B (mesmo que o atacante troque o x-store-slug).
 *  - Nunca expoe service role nem senha ao frontend. Cookie httpOnly => nao
 *    acessivel por JS. Assinatura impede forja.
 *
 * Hardening final: a assinatura usa um SESSION_SECRET DEDICADO (env var), nao
 * mais ADMIN_PASSWORD. Isso desacopla a chave criptografica da senha de admin
 * (a senha pode mudar sem invalidar a infra, e o segredo pode rotacionar sem
 * tocar na senha). Se SESSION_SECRET faltar, caimos para ADMIN_PASSWORD apenas
 * como ultima rede de seguranca (com aviso), para nao derrubar o login em caso
 * de env nao propagada.
 */

const COOKIE_NAME = "store_admin_session"
const SESSION_TTL_MS = 1000 * 60 * 60 * 12 // 12 horas
const PEPPER = "pkgostosuras::session::v1"

function getSecret(): string {
  const dedicated = process.env.SESSION_SECRET
  if (dedicated && dedicated.length >= 16) return `${PEPPER}:${dedicated}`
  console.warn("[security] SESSION_SECRET ausente/curto; usando fallback transitorio")
  return `${PEPPER}:${process.env.ADMIN_PASSWORD || "fallback-secret"}`
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
}

interface SessionData {
  storeId: number
  exp: number
}

/**
 * Serializa e assina a sessao. Formato: base64url(json).hmac
 */
export function createSessionToken(storeId: number): string {
  const data: SessionData = { storeId, exp: Date.now() + SESSION_TTL_MS }
  const json = JSON.stringify(data)
  const b64 = Buffer.from(json).toString("base64url")
  return `${b64}.${sign(b64)}`
}

/**
 * Verifica assinatura + expiracao. Retorna a sessao ou null.
 * Usa comparacao em tempo constante para a assinatura.
 */
export function verifySessionToken(token: string | undefined | null): SessionData | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null
  const [b64, sig] = token.split(".")
  if (!b64 || !sig) return null

  const expected = sign(b64)
  // timingSafeEqual exige buffers do mesmo tamanho
  if (sig.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null

  try {
    const data = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as SessionData
    if (!data || typeof data.storeId !== "number" || typeof data.exp !== "number") return null
    if (Date.now() > data.exp) {
      // Assinatura valida porem expirada: sinal util para observabilidade.
      logSecurityEvent("session_expired", { storeId: data.storeId, route: "store-session", detail: "admin" })
      return null
    }
    if (data.storeId <= 0) return null
    return data
  } catch {
    return null
  }
}

/** Le a sessao a partir dos cookies do request. */
export function getSessionFromRequest(request: NextRequest | Request): SessionData | null {
  // NextRequest tem .cookies; Request comum nao -> parse manual do header.
  const anyReq = request as NextRequest
  let token: string | undefined
  if (anyReq.cookies && typeof anyReq.cookies.get === "function") {
    token = anyReq.cookies.get(COOKIE_NAME)?.value
  } else {
    const cookieHeader = request.headers.get("cookie") || ""
    const match = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE_NAME}=`))
    token = match?.split("=")[1]
  }
  return verifySessionToken(token)
}

/** Aplica o cookie de sessao numa resposta (login). */
export function setSessionCookie(response: NextResponse, storeId: number): void {
  response.cookies.set(COOKIE_NAME, createSessionToken(storeId), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
}

/** Remove o cookie de sessao (logout). */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}

export interface RequireStoreAuthResult {
  ok: boolean
  storeId: number
  status: number
  error?: string
  response?: NextResponse
}

/**
 * Guard principal das rotas de dados do admin.
 *
 * Regras:
 *  1. Resolve o store_id alvo pelo slug/host (NUNCA por store_id do cliente).
 *  2. Exige sessao valida (cookie assinado e nao expirado).
 *  3. Exige que session.storeId === storeId alvo (anti cross-tenant).
 *
 * Em qualquer falha retorna { ok:false, response } com 401, pronto para
 * `if (!auth.ok) return auth.response`.
 */
export async function requireStoreAuth(request: NextRequest | Request): Promise<RequireStoreAuthResult> {
  const targetStoreId = await getStoreIdFromRequest(request)

  if (!targetStoreId || targetStoreId === INVALID_STORE_ID || targetStoreId <= 0) {
    return {
      ok: false,
      storeId: targetStoreId,
      status: 400,
      error: "Contexto de loja invalido",
      response: NextResponse.json({ success: false, error: "Contexto de loja invalido" }, { status: 400 }),
    }
  }

  const session = getSessionFromRequest(request)

  // Fallback transitorio: alem do cookie de sessao, aceitamos a senha da loja
  // enviada via header x-admin-password ou query ?password=. Isso mantem
  // compatibilidade com chamadas que ainda nao migraram para o cookie, SEM
  // afrouxar a seguranca: a senha e validada contra o HASH da loja alvo
  // (verifyStoreAdmin), entao continua sendo por loja e cross-tenant-safe.
  if (!session) {
    const url = new URL(request.url)
    const password =
      request.headers.get("x-admin-password") || url.searchParams.get("password") || undefined
    if (password) {
      const result = await verifyStoreAdmin(targetStoreId, password)
      if (result.ok) {
        return { ok: true, storeId: targetStoreId, status: 200 }
      }
    }
    return {
      ok: false,
      storeId: targetStoreId,
      status: 401,
      error: "Nao autenticado",
      response: NextResponse.json({ success: false, error: "Nao autenticado" }, { status: 401 }),
    }
  }

  if (session.storeId !== targetStoreId) {
    // Sessao de outra loja tentando acessar esta loja -> cross-tenant negado.
    logSecurityEvent("cross_tenant", {
      ip: getClientIp(request),
      route: new URL(request.url).pathname,
      storeId: session.storeId,
      detail: `sessao da loja ${session.storeId} tentou acessar loja ${targetStoreId}`,
    })
    return {
      ok: false,
      storeId: targetStoreId,
      status: 403,
      error: "Acesso negado a esta loja",
      response: NextResponse.json({ success: false, error: "Acesso negado a esta loja" }, { status: 403 }),
    }
  }

  return { ok: true, storeId: targetStoreId, status: 200 }
}
