import { notFound } from "next/navigation"
import { getServiceClient } from "@/lib/supabase/service"
import StorePageClient from "./client"

interface PageProps {
  params: Promise<{ slug: string }>
}

// Buscar dados da loja no servidor
async function getStoreData(slug: string) {
  const supabase = getServiceClient()
  
  if (!supabase) return null
  
  // Buscar loja pelo slug
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .single()
  
  if (storeError || !store) {
    return null
  }

  // Verificar status da loja
  if (store.status === "suspended") {
    return { store, suspended: true, settings: null, categories: [], products: [], banners: [] }
  }

  if (store.status === "cancelled") {
    return null
  }

  // Buscar configuracoes da loja
  const { data: settings } = await supabase
    .from("store_settings")
    .select("*")
    .eq("store_id", store.id)
    .single()

  // Buscar categorias com produtos
  const { data: categories } = await supabase
    .from("product_categories")
    .select("*")
    .eq("store_id", store.id)
    .eq("active", true)
    .order("sort_order", { ascending: true })

  // Buscar produtos
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", store.id)
    .eq("active", true)
    .order("name", { ascending: true })

  // Buscar banners
  const { data: banners } = await supabase
    .from("hero_banners")
    .select("*")
    .eq("store_id", store.id)
    .eq("active", true)
    .order("sort_order", { ascending: true })

  // Normalizar PRODUTOS para a forma que a vitrine espera.
  // A tabela usa colunas `image` (nao image_url), `active` e `stock` (nao in_stock).
  // Sem este mapeamento a vitrine lia in_stock=undefined => sempre "Indisponivel".
  const normalizedProducts = (products || []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    price: Number(p.price),
    image_url: p.image ?? p.image_url ?? null,
    category_id: p.category_id,
    // Disponivel quando ativo e com estoque (stock nulo = sem controle de estoque)
    in_stock: p.active !== false && (p.stock == null || Number(p.stock) > 0),
  }))

  // Normalizar CATEGORIAS (vitrine usa image_url; tabela pode ter image)
  const normalizedCategories = (categories || []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    image_url: c.image_url ?? c.image ?? null,
  }))

  return {
    store,
    settings: settings || null,
    categories: normalizedCategories,
    products: normalizedProducts,
    banners: banners || [],
    suspended: false
  }
}

export default async function LojaPage({ params }: PageProps) {
  const { slug } = await params
  const data = await getStoreData(slug)

  if (!data) {
    notFound()
  }

  if (data.suspended) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Loja Temporariamente Indisponivel</h1>
          <p className="text-muted-foreground">Esta loja esta temporariamente fora do ar. Tente novamente mais tarde.</p>
        </div>
      </div>
    )
  }

  return <StorePageClient data={data} />
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
