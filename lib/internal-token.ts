import crypto from "crypto"
import { logSecurityEvent } from "@/lib/security-log"

/**
 * Token interno server-to-server (Fase de Seguranca 2).
 *
 * Usado para autorizar chamadas internas confiaveis entre rotas do proprio
 * backend (ex.: /api/orders/confirm e o webhook Asaas chamando
 * /api/gamification/check). Como nao ha sessao de usuario nessas chamadas,
 * provamos a origem confiavel com um token HMAC estavel derivado do segredo do
 * servidor. O frontend NUNCA recebe esse token (httpOnly nao se aplica: ele
 * simplesmente nao e exposto a nenhuma resposta).
 */

const PEPPER = "pkgostosuras::internal-call::v1"
const LABEL = "internal-reward-call"
export const INTERNAL_TOKEN_HEADER = "x-internal-token"

function getSecret(): string {
  // Hardening final: usa INTERNAL_TOKEN_SECRET dedicado. Fallback transitorio
  // para ADMIN_PASSWORD apenas se a env var faltar.
  const dedicated = process.env.INTERNAL_TOKEN_SECRET
  if (dedicated && dedicated.length >= 16) return `${PEPPER}:${dedicated}`
  console.warn("[security] INTERNAL_TOKEN_SECRET ausente/curto; usando fallback transitorio")
  return `${PEPPER}:${process.env.ADMIN_PASSWORD || "fallback-secret"}`
}

export function getInternalToken(): string {
  return crypto.createHmac("sha256", getSecret()).update(LABEL).digest("hex")
}

export function verifyInternalToken(request: Request): boolean {
  const received = request.headers.get(INTERNAL_TOKEN_HEADER)
  // Sem header: caminho normal (chamada de cliente/admin, nao interna). Nao loga.
  if (!received) return false
  const expected = getInternalToken()
  let ok = false
  if (received.length === expected.length) {
    try {
      ok = crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected))
    } catch {
      ok = false
    }
  }
  // Header presente porem invalido => suspeito (adulteracao/replay). Loga.
  if (!ok) {
    logSecurityEvent("internal_token_invalid", {
      route: new URL(request.url).pathname,
      detail: "x-internal-token presente porem invalido",
    })
  }
  return ok
}
