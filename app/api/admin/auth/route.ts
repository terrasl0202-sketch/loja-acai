import { NextResponse } from "next/server"
import { verifyAdminForRequest } from "@/lib/platform-auth"
import { setSessionCookie, clearSessionCookie } from "@/lib/store-session"
import { enforceRateLimit } from "@/lib/rate-limit"
import { getClientIp, logSecurityEvent } from "@/lib/security-log"

export async function POST(request: Request) {
  try {
    // Hardening: rate limit por IP para conter brute-force de senha admin.
    // 10 tentativas por minuto por IP.
    const limited = await enforceRateLimit(request, {
      action: "admin-login",
      limit: 10,
      windowSec: 60,
      event: "login_blocked",
    })
    if (limited) return limited

    const { password } = await request.json()

    // Valida a senha contra a LOJA do request (resolvida por x-store-slug, que o
    // admin injeta; sem slug => loja principal). Senha por loja com hash; a senha
    // global so funciona para a loja principal enquanto ela nao tiver hash.
    const auth = await verifyAdminForRequest(request, password)

    if (auth.ok) {
      // Emite cookie httpOnly assinado amarrado AO store_id desta loja. As rotas
      // de dados validam que session.storeId === store_id resolvido pelo slug.
      const response = NextResponse.json({ success: true })
      setSessionCookie(response, auth.storeId)
      return response
    }

    logSecurityEvent("login_invalid", {
      ip: getClientIp(request),
      route: "admin-login",
      detail: "senha admin incorreta",
    })
    return NextResponse.json({ success: false, error: "Senha incorreta" }, { status: 401 })
  } catch (error) {
    console.error("[Auth] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

// Logout: limpa o cookie de sessao.
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  clearSessionCookie(response)
  return response
}
