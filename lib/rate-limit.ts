import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"
import { NextResponse } from "next/server"
import { getClientIp, logSecurityEvent, type SecurityEvent } from "@/lib/security-log"

/**
 * Rate limiting distribuido com Upstash Redis (Hardening final).
 *
 * Por que Redis e nao memoria: em serverless (Vercel) cada invocacao pode rodar
 * em uma instancia diferente e efemera. Um contador em memoria nao e
 * compartilhado entre instancias, entao nao protege de forma confiavel. O
 * Upstash Redis e um store compartilhado e persistente -> rate limit real.
 *
 * Usamos janela deslizante (sliding window). As chaves sao escopadas por
 * "acao + identificador" (ex.: IP, ou IP+loja, ou telefone) para isolar abusos.
 *
 * Failure mode: se o Redis estiver indisponivel, fazemos "fail-open" (permite a
 * requisicao) para NUNCA derrubar checkout/login por causa do limitador. O
 * evento e logado para observabilidade.
 */

let redis: Redis | null = null
function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    console.warn("[security] Upstash Redis nao configurado; rate limit desativado (fail-open)")
    return null
  }
  redis = new Redis({ url, token })
  return redis
}

// Cache de limiters por configuracao para reutilizar entre invocacoes quentes.
const limiterCache = new Map<string, Ratelimit>()

function getLimiter(prefix: string, limit: number, windowSec: number): Ratelimit | null {
  const r = getRedis()
  if (!r) return null
  const key = `${prefix}:${limit}:${windowSec}`
  let limiter = limiterCache.get(key)
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: `rl:${prefix}`,
      analytics: false,
    })
    limiterCache.set(key, limiter)
  }
  return limiter
}

export interface RateLimitOptions {
  /** Rotulo curto da acao protegida (compoe a chave e os logs). Ex.: "admin-login". */
  action: string
  /** Identificador do solicitante (IP, telefone, etc). */
  identifier: string
  /** Numero maximo de requisicoes na janela. */
  limit: number
  /** Tamanho da janela em segundos. */
  windowSec: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  limit: number
}

/**
 * Verifica o rate limit. Retorna success=false quando excedido. Fail-open se o
 * Redis nao estiver disponivel.
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const limiter = getLimiter(opts.action, opts.limit, opts.windowSec)
  if (!limiter) {
    return { success: true, remaining: opts.limit, limit: opts.limit }
  }
  try {
    const res = await limiter.limit(opts.identifier)
    return { success: res.success, remaining: res.remaining, limit: opts.limit }
  } catch (e) {
    console.warn("[security] Falha no rate limit (fail-open):", (e as Error).message)
    return { success: true, remaining: opts.limit, limit: opts.limit }
  }
}

/**
 * Helper de alto nivel: aplica rate limit por IP (e opcionalmente sufixo extra
 * como loja/telefone). Retorna uma NextResponse 429 pronta quando bloqueado, ou
 * null quando liberado. Loga o bloqueio como evento de seguranca.
 */
export async function enforceRateLimit(
  request: Request,
  params: {
    action: string
    limit: number
    windowSec: number
    /** sufixo extra para a chave: telefone, storeId, etc. */
    extraKey?: string | number | null
    /** evento de seguranca a logar quando bloqueado (default: rate_limited). */
    event?: SecurityEvent
    storeId?: number | string | null
  },
): Promise<NextResponse | null> {
  const ip = getClientIp(request)
  const identifier = params.extraKey != null ? `${ip}:${params.extraKey}` : ip
  const result = await checkRateLimit({
    action: params.action,
    identifier,
    limit: params.limit,
    windowSec: params.windowSec,
  })
  if (!result.success) {
    logSecurityEvent(params.event || "rate_limited", {
      ip,
      route: params.action,
      storeId: params.storeId ?? null,
      detail: `limite ${params.limit}/${params.windowSec}s excedido`,
    })
    return NextResponse.json(
      { error: "Muitas requisicoes. Tente novamente em instantes.", success: false },
      { status: 429, headers: { "Retry-After": String(params.windowSec) } },
    )
  }
  return null
}
