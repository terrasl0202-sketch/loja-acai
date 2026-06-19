import { NextResponse } from "next/server"
import { verifyAdminForRequest } from "@/lib/platform-auth"
import { setSessionCookie, clearSessionCookie } from "@/lib/store-session"

export async function POST(request: Request) {
  try {
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
