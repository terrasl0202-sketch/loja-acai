import crypto from "crypto"

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
  return `${PEPPER}:${process.env.ADMIN_PASSWORD || "fallback-secret"}`
}

export function getInternalToken(): string {
  return crypto.createHmac("sha256", getSecret()).update(LABEL).digest("hex")
}

export function verifyInternalToken(request: Request): boolean {
  const received = request.headers.get(INTERNAL_TOKEN_HEADER)
  if (!received) return false
  const expected = getInternalToken()
  if (received.length !== expected.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  } catch {
    return false
  }
}
