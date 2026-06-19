import crypto from "crypto"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getSessionFromRequest as getAdminSessionFromRequest } from "@/lib/store-session"

/**
 * Sessao de CLIENTE FINAL por loja via cookie httpOnly assinado (HMAC-SHA256).
 *
 * Objetivo de seguranca (Fase de Seguranca 2):
 *  - O login por PIN (/api/customers action:login|register) valida o PIN e
 *    emite um cookie assinado contendo APENAS { storeId, customerId, phone, exp }.
 *  - As rotas sensiveis de cliente (historico de pedidos, saldo premium, status
 *    VIP) so retornam PII/financeiro quando ha sessao valida cujo storeId E
 *    phone/customerId batem com o recurso solicitado. Sem isso, retornam
 *    payload minimo (found:false) ou 401.
 *  - Nunca confia em store_id/telefone crus do cliente como autorizacao.
 *  - Cookie httpOnly => nao acessivel por JS. Assinatura impede forja.
 *
 * O segredo reaproveita ADMIN_PASSWORD (ja presente no ambiente) com um pepper
 * dedicado e DISTINTO do da sessao admin, para que um token de cliente nunca
 * seja aceito como token de admin (e vice-versa).
 */

const COOKIE_NAME = "store_customer_session"
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 dias
const PEPPER = "pkgostosuras::customer-session::v1"

function getSecret(): string {
  return `${PEPPER}:${process.env.ADMIN_PASSWORD || "fallback-secret"}`
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
}

function onlyDigits(v: string | number | null | undefined): string {
  return String(v ?? "").replace(/\D/g, "")
}

export interface CustomerSessionData {
  storeId: number
  customerId: number
  phone: string
  exp: number
}

export function createCustomerSessionToken(storeId: number, customerId: number, phone: string): string {
  const data: CustomerSessionData = {
    storeId,
    customerId,
    phone: onlyDigits(phone),
    exp: Date.now() + SESSION_TTL_MS,
  }
  const b64 = Buffer.from(JSON.stringify(data)).toString("base64url")
  return `${b64}.${sign(b64)}`
}

export function verifyCustomerSessionToken(token: string | undefined | null): CustomerSessionData | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null
  const [b64, sig] = token.split(".")
  if (!b64 || !sig) return null

  const expected = sign(b64)
  if (sig.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null

  try {
    const data = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as CustomerSessionData
    if (!data || typeof data.storeId !== "number" || typeof data.customerId !== "number") return null
    if (typeof data.exp !== "number" || Date.now() > data.exp) return null
    if (data.storeId <= 0 || data.customerId <= 0) return null
    return data
  } catch {
    return null
  }
}

export function getCustomerSessionFromRequest(request: NextRequest | Request): CustomerSessionData | null {
  const anyReq = request as NextRequest
  let token: string | undefined
  if (anyReq.cookies && typeof anyReq.cookies.get === "function") {
    token = anyReq.cookies.get(COOKIE_NAME)?.value
  } else {
    const cookieHeader = request.headers.get("cookie") || ""
    const match = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE_NAME}=`))
    token = match?.split("=")[1]
  }
  return verifyCustomerSessionToken(token)
}

export function setCustomerSessionCookie(
  response: NextResponse,
  storeId: number,
  customerId: number,
  phone: string,
): void {
  response.cookies.set(COOKIE_NAME, createCustomerSessionToken(storeId, customerId, phone), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
}

export function clearCustomerSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}

/**
 * Autoriza acesso a dados de um cliente DESTA loja.
 *
 * Retorna true quando:
 *  - existe sessao de cliente valida cujo storeId === storeId alvo E
 *    (phone bate OU customerId bate); OU
 *  - existe sessao de ADMIN valida da mesma loja (requireStoreAuth ja garante
 *    o cross-tenant, aqui apenas conferimos storeId).
 *
 * Nunca usa store_id/telefone do request como prova de identidade.
 */
export function isCustomerAuthorized(
  request: NextRequest | Request,
  storeId: number,
  opts: { phone?: string | null; customerId?: number | null },
): boolean {
  if (!storeId || storeId <= 0) return false

  // Admin da propria loja pode acessar (suporte / painel).
  const admin = getAdminSessionFromRequest(request)
  if (admin && admin.storeId === storeId) return true

  const session = getCustomerSessionFromRequest(request)
  if (!session) return false
  if (session.storeId !== storeId) return false

  const reqPhone = onlyDigits(opts.phone)
  if (reqPhone) {
    // Compara por sufixo para tolerar mascara/DDI, mas exige >= 10 digitos.
    const a = session.phone
    if (a && reqPhone.length >= 10 && (a === reqPhone || a.endsWith(reqPhone) || reqPhone.endsWith(a))) {
      return true
    }
  }

  if (opts.customerId != null) {
    const cid = typeof opts.customerId === "string" ? parseInt(opts.customerId) : opts.customerId
    if (cid && session.customerId === cid) return true
  }

  return false
}
