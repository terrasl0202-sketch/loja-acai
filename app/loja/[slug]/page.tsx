import { notFound } from "next/navigation"
import { getServiceClient } from "@/lib/supabase/service"
import Storefront from "@/app/page"

interface PageProps {
  params: Promise<{ slug: string }>
}

// Resolve a loja pelo SLUG (autoritativo). Slug invalido => 404, NUNCA cai na PK.
async function getStore(slug: string) {
  const supabase = getServiceClient()
  if (!supabase) return null

  const { data: store, error } = await supabase
    .from("stores")
    .select("id, slug, store_name, status")
    .eq("slug", slug)
    .single()

  if (error || !store) return null
  return store
}

export default async function LojaPage({ params }: PageProps) {
  const { slug } = await params
  const store = await getStore(slug)

  // Loja inexistente ou cancelada => 404 (sem fallback para a loja principal)
  if (!store || store.status === "cancelled") {
    notFound()
  }

  // Loja suspensa => aviso dedicado
  if (store.status === "suspended") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Loja Temporariamente Indisponivel</h1>
          <p className="text-muted-foreground">Esta loja esta temporariamente fora do ar. Tente novamente mais tarde.</p>
        </div>
      </div>
    )
  }

  // Renderiza o MESMO storefront premium da PK, porem em modo MULTI-LOJA:
  // todas as chamadas /api/* sao escopadas pelo slug (header x-store-slug),
  // entao logo, banner, cores, slogan, produtos, PIX manual, entrega, cupom,
  // etc. vem da loja correta. Sem storeSlug, o "/" continua sendo a PK.
  return (
    <Storefront
      storeSlug={store.slug}
      storeName={store.store_name}
      storeBasePath={`/loja/${store.slug}`}
    />
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = getServiceClient()

  if (!supabase) {
    return { title: "Loja", description: "Pedidos online" }
  }

  const { data: store } = await supabase
    .from("stores")
    .select("store_name")
    .eq("slug", slug)
    .single()

  return {
    title: store?.store_name || "Loja",
    description: `Pedidos online - ${store?.store_name || "Loja"}`,
  }
}
