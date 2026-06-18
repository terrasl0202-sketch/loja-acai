"use client"

import { useState, useEffect } from "react"
import { Store, ArrowLeft, Loader2, ShoppingBag, Users, Package, DollarSign, Settings, Plus } from "lucide-react"
import Link from "next/link"

interface StoreData {
  id: number
  store_code: string
  slug: string
  store_name: string
  plan: string
  status: string
}

export default function AdminBySlugClient({ store }: { store: StoreData }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [stats, setStats] = useState({
    orders: 0,
    customers: 0,
    products: 0,
    revenue: 0
  })

  const handleLogin = async () => {
    setLoading(true)
    setError("")

    try {
      // Validacao server-side: a senha nunca e comparada no client
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        setAuthenticated(true)
        sessionStorage.setItem(`admin_${store.slug}`, "true")
        loadStats()
      } else {
        setError("Senha incorreta")
      }
    } catch {
      setError("Erro ao autenticar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // TODO: Criar API para buscar stats por store_id
      // Por enquanto, mostra valores zerados
    } catch (error) {
      console.error("Erro ao carregar stats:", error)
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem(`admin_${store.slug}`)
    if (saved === "true") {
      setAuthenticated(true)
      loadStats()
    }
  }, [store.slug])

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-xl border border-border p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Admin - {store.store_name}</h1>
                <p className="text-sm text-muted-foreground">/{store.slug}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full mt-1 px-4 py-3 rounded-lg bg-background border border-border text-foreground"
                  placeholder="Digite a senha"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <button
                onClick={handleLogin}
                disabled={loading || !password}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Entrar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/platform" className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{store.store_name}</h1>
              <p className="text-xs text-muted-foreground">/{store.slug}</p>
            </div>
          </div>

          <Link
            href={`/loja/${store.slug}`}
            target="_blank"
            className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            Ver Loja
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-4">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Pedidos</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.orders}</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Clientes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.customers}</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Produtos</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.products}</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Faturamento</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.revenue)}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="font-bold text-foreground mb-4">Acoes Rapidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button className="p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-center">
              <Plus className="w-6 h-6 text-primary mx-auto mb-2" />
              <span className="text-sm text-foreground">Novo Produto</span>
            </button>
            <button className="p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-center">
              <ShoppingBag className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <span className="text-sm text-foreground">Ver Pedidos</span>
            </button>
            <button className="p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-center">
              <Users className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <span className="text-sm text-foreground">Ver Clientes</span>
            </button>
            <button className="p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-center">
              <Settings className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <span className="text-sm text-foreground">Configuracoes</span>
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-sm text-yellow-600">
            <strong>Fase 3.0 - Fundacao:</strong> Este admin por loja esta em desenvolvimento. 
            Na proxima fase, todas as funcionalidades do admin principal serao replicadas aqui com filtro por store_id.
          </p>
        </div>
      </main>
    </div>
  )
}
