"use client"

import { useState, useEffect, useCallback } from "react"
import { Store, ArrowLeft, Loader2, ShoppingBag, Users, Package, DollarSign } from "lucide-react"
import Link from "next/link"

interface StoreData {
  id: number
  store_code: string
  slug: string
  store_name: string
  plan: string
  status: string
}

interface ProductRow {
  id: number
  name: string
  price: number
  active: boolean
  stock: number | null
}

interface OrderRow {
  id: number
  order_code: string | null
  customer_name: string
  customer_phone: string | null
  total: number
  status: string
  payment_status: string | null
  created_at: string
}

interface Stats {
  orders: number
  customers: number
  products: number
  revenue: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0)

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
  } catch {
    return iso
  }
}

const statusLabel = (status: string, paymentStatus: string | null) => {
  const paid = paymentStatus === "confirmed" || paymentStatus === "paid" || paymentStatus === "pago"
  if (status === "pending" && !paid) return "Aguardando Pagamento"
  if (paid && status === "pending") return "Pago - Aguardando Preparo"
  const map: Record<string, string> = {
    confirmed: "Confirmado",
    preparing: "Preparando",
    delivering: "Saiu para Entrega",
    completed: "Entregue",
    cancelled: "Cancelado",
  }
  return map[status] || status
}

export default function AdminBySlugClient({ store }: { store: StoreData }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setError] = useState("")
  const [stats, setStats] = useState<Stats>({ orders: 0, customers: 0, products: 0, revenue: 0 })
  const [products, setProducts] = useState<ProductRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])

  const loadStats = useCallback(
    async (pwd: string) => {
      setDataLoading(true)
      try {
        // Dados SEMPRE isolados por store_id (server-side, service role)
        const res = await fetch("/api/platform/store-stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: pwd, storeId: store.id }),
        })
        if (res.ok) {
          const json = await res.json()
          setStats(json.stats || { orders: 0, customers: 0, products: 0, revenue: 0 })
          setProducts(json.products || [])
          setOrders(json.orders || [])
        }
      } catch (err) {
        console.error("Erro ao carregar dados da loja:", err)
      } finally {
        setDataLoading(false)
      }
    },
    [store.id],
  )

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
        sessionStorage.setItem(`admin_pwd_${store.slug}`, password)
        loadStats(password)
      } else {
        setError("Senha incorreta")
      }
    } catch {
      setError("Erro ao autenticar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem(`admin_${store.slug}`)
    const savedPwd = sessionStorage.getItem(`admin_pwd_${store.slug}`)
    if (saved === "true" && savedPwd) {
      setAuthenticated(true)
      loadStats(savedPwd)
    }
  }, [store.slug, loadStats])

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

              {error && <p className="text-sm text-red-500">{error}</p>}

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
            {/* Voltar deve ir para a LOJA, nunca para /platform (painel master/superadmin) */}
            <Link
              href={`/loja/${store.slug}`}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Voltar para a loja"
            >
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
            <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.revenue)}</p>
          </div>
        </div>

        {dataLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando dados da loja...
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pedidos recentes */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold text-foreground">Pedidos Recentes</h2>
            </div>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum pedido ainda</p>
            ) : (
              <div className="divide-y divide-border">
                {orders.map((o) => (
                  <div key={o.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {o.customer_name || "Cliente"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {o.order_code || `#${o.id}`} · {formatDate(o.created_at)}
                      </p>
                      <span className="text-xs text-muted-foreground">{statusLabel(o.status, o.payment_status)}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground whitespace-nowrap">
                      {formatCurrency(Number(o.total))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Produtos */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-purple-500" />
              <h2 className="font-bold text-foreground">Produtos</h2>
            </div>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum produto cadastrado</p>
            ) : (
              <div className="divide-y divide-border">
                {products.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <span
                        className={`text-xs ${p.active ? "text-green-500" : "text-muted-foreground"}`}
                      >
                        {p.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-foreground whitespace-nowrap">
                      {formatCurrency(Number(p.price))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
