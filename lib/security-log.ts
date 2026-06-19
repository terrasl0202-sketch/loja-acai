/**
 * Logs de seguranca estruturados (Hardening final).
 *
 * Centraliza o registro de eventos sensiveis para auditoria/observabilidade:
 * tentativas de login invalidas, acessos cross-tenant, sessoes expiradas,
 * tokens internos invalidos e bloqueios por rate limit.
 *
 * Os logs sao prefixados com "[security]" para facilitar filtros/alertas. NUNCA
 * registramos segredos, PINs, senhas, tokens ou PII completa (telefones sao
 * mascarados). Mantemos apenas o necessario para investigar abusos.
 */

export type SecurityEvent =
  | "login_invalid"          // senha/PIN incorretos
  | "login_blocked"          // bloqueio por rate limit no login
  | "cross_tenant"           // sessao/recurso de uma loja usado em outra
  | "session_expired"        // cookie de sessao expirado/invalido
  | "internal_token_invalid" // chamada interna sem token valido
  | "rate_limited"           // bloqueio generico por rate limit
  | "auth_denied"            // acesso negado a recurso protegido

interface SecurityLogFields {
  ip?: string | null
  storeId?: number | string | null
  route?: string | null
  detail?: string | null
  // identificador (telefone/usuario) que sera mascarado antes de logar
  subject?: string | null
}

/** Mascara um telefone/identificador para nao vazar PII nos logs. */
function maskSubject(v: string | null | undefined): string {
  const s = String(v ?? "").trim()
  if (!s) return "-"
  const digits = s.replace(/\D/g, "")
  if (digits.length >= 4) {
    return `***${digits.slice(-4)}`
  }
  return "***"
}

export function logSecurityEvent(event: SecurityEvent, fields: SecurityLogFields = {}): void {
  const payload = {
    event,
    ts: new Date().toISOString(),
    ip: fields.ip || "-",
    storeId: fields.storeId ?? "-",
    route: fields.route || "-",
    subject: fields.subject ? maskSubject(fields.subject) : undefined,
    detail: fields.detail || undefined,
  }
  // Console estruturado; em producao e capturado pelos logs da Vercel.
  console.warn(`[security] ${event}`, JSON.stringify(payload))
}

/** Extrai o IP do cliente a partir dos headers padrao de proxy. */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  return request.headers.get("x-real-ip") || "0.0.0.0"
}
