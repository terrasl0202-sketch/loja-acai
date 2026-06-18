import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
    if (!ADMIN_PASSWORD) {
      console.error("[Auth] ADMIN_PASSWORD nao configurada")
      return NextResponse.json({ success: false, error: "Autenticacao indisponivel" }, { status: 503 })
    }

    const { password } = await request.json()

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: "Senha incorreta" }, { status: 401 })
  } catch (error) {
    console.error("[Auth] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
