import { NextRequest, NextResponse } from "next/server"
import { verifyStoreAdmin } from "@/lib/platform-auth"

/**
 * /api/platform/store-auth
 *
 * Valida a senha do admin de UMA loja (senha por loja, com fallback global
 * transitorio). Server-side, service role, RLS ativo. A senha vai no body
 * (nunca na query string) e nunca volta ao client.
 */
export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = { "Cache-Control": "no-store, no-cache, must-revalidate" }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const storeId = Number(body?.storeId)
    const password = body?.password

    const result = await verifyStoreAdmin(storeId, password)

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || "Acesso negado" },
        { status: result.status, headers: noCacheHeaders },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        store: {
          id: result.store!.id,
          slug: result.store!.slug,
          name: result.store!.store_name,
        },
      },
      { headers: noCacheHeaders },
    )
  } catch (error) {
    console.error("[store-auth] Erro:", error)
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500, headers: noCacheHeaders })
  }
}
