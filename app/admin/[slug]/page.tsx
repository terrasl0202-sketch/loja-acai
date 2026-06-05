import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminBySlugClient from "./client"

interface PageProps {
  params: Promise<{ slug: string }>
}

// Buscar dados da loja no servidor
async function getStoreData(slug: string) {
  const supabase = await createClient()
  
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

  return store
}

export default async function AdminBySlugPage({ params }: PageProps) {
  const { slug } = await params
  
  // Se for main, redirecionar para /admin
  if (slug === "main" || slug === "pkgostosuras") {
    redirect("/admin")
  }
  
  const store = await getStoreData(slug)

  if (!store) {
    notFound()
  }

  return <AdminBySlugClient store={store} />
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  
  if (!supabase) {
    return { title: "Admin - Loja" }
  }
  
  const { data: store } = await supabase
    .from("stores")
    .select("store_name")
    .eq("slug", slug)
    .single()

  return {
    title: `Admin - ${store?.store_name || "Loja"}`,
  }
}
