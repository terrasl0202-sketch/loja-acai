import { NextResponse } from "next/server"
import { verifyAdminForRequest } from "@/lib/platform-auth"

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    // Valida a senha contra a LOJA do request (resolvida por x-store-slug, que o
    // admin injeta; sem slug => loja principal). Senha por loja com hash; a senha
    // global so funciona para a loja principal enquanto ela nao tiver hash.
    const auth = await verifyAdminForRequest(request, password)

    if (auth.ok) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: "Senha incorreta" }, { status: 401 })
  } catch (error) {
    console.error("[Auth] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
