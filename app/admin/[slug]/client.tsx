"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Store,
  ArrowLeft,
  Loader2,
  ShoppingBag,
  Users,
  Package,
  DollarSign,
  LayoutGrid,
  MapPin,
  Plus,
  Pencil,
  Check,
  X,
} from "lucide-react"
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
  category_id?: number | null
}
interface CategoryRow {
  id: number
  name: string
  active: boolean
  sort_order?: number
}
interface NeighborhoodRow {
  id: number | string
  name: string
  delivery_fee: number
  active: boolean
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

type Tab = "dashboard" | "produtos" | "categorias" | "bairros" | "pedidos"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0)

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

const ORDER_STATUSES = [
  { value: "pending", label: "Aguardando" },
  { value: "confirmed", label: "Confirmado" },
  { value: "preparing", label: "Preparando" },
  { value: "delivering", label: "Saiu p/ Entrega" },
  { value: "completed", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
]

const statusLabel = (status: string, paymentStatus: string | null) => {
  const paid = paymentStatus === "confirmed" || paymentStatus === "paid" || paymentStatus === "pago"
  if (status === "pending" && !paid) return "Aguardando Pagamento"
  if (paid && status === "pending") return "Pago - Aguardando Preparo"
  return ORDER_STATUSES.find((s) => s.value === status)?.label || status
}

export default function AdminBySlugClient({ store }: { store: StoreData }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [pwd, setPwd] = useState("")
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<Tab>("dashboard")
  const [notice, setNotice] = useState("")

  const [stats, setStats] = useState<Stats>({ orders: 0, customers: 0, products: 0, revenue: 0 })
  const [products, setProducts] = useState<ProductRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])

  const loadStats = useCallback(
    async (password: string) => {
      setDataLoading(true)
      try {
        // Dados SEMPRE isolados por store_id (server-side, service role)
        const res = await fetch("/api/platform/store-stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, storeId: store.id }),
        })
        if (res.ok) {
          const json = await res.json()
          setStats(json.stats || { orders: 0, customers: 0, products: 0, revenue: 0 })
          setProducts(json.products || [])
          setOrders(json.orders || [])
          setCategories(json.categories || [])
          setNeighborhoods(json.neighborhoods || [])
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
      // Autenticacao POR LOJA (senha por loja, com fallback global transitorio)
      const res = await fetch("/api/platform/store-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, storeId: store.id }),
      })
      if (res.ok) {
        setAuthenticated(true)
        setPwd(password)
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
      setPwd(savedPwd)
      loadStats(savedPwd)
    }
  }, [store.slug, loadStats])

  // Helper de escrita (sempre autenticado + storeId forcado no servidor)
  const mutate = useCallback(
    async (action: string, payload: Record<string, unknown>) => {
      setNotice("")
      const res = await fetch("/api/platform/store-mutate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload, password: pwd, storeId: store.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        setNotice(json.error || "Erro ao salvar")
        return false
      }
      await loadStats(pwd)
      return true
    },
    [pwd, store.id, loadStats],
  )

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

  const tabs: { id: Tab; label: string; icon: typeof Store }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "produtos", label: "Produtos", icon: Package },
    { id: "categorias", label: "Categorias", icon: LayoutGrid },
    { id: "bairros", label: "Bairros", icon: MapPin },
    { id: "pedidos", label: "Pedidos", icon: ShoppingBag },
  ]

  return (
    <div className="min-h-screen bg-background">
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

      {/* Tabs */}
      <nav className="bg-card border-b border-border px-4 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4">
        {notice && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-500">
            {notice}
          </div>
        )}
        {dataLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando dados da loja...
          </div>
        )}

        {tab === "dashboard" && (
          <DashboardTab stats={stats} orders={orders} />
        )}
        {tab === "produtos" && (
          <ProductsTab products={products} categories={categories} mutate={mutate} />
        )}
        {tab === "categorias" && <CategoriesTab categories={categories} mutate={mutate} />}
        {tab === "bairros" && <NeighborhoodsTab neighborhoods={neighborhoods} mutate={mutate} />}
        {tab === "pedidos" && <OrdersTab orders={orders} mutate={mutate} />}
      </main>
    </div>
  )
}

// ---------------- DASHBOARD ----------------
function DashboardTab({ stats, orders }: { stats: Stats; orders: OrderRow[] }) {
  const cards = [
    { icon: ShoppingBag, color: "text-blue-500", label: "Pedidos", value: String(stats.orders) },
    { icon: Users, color: "text-green-500", label: "Clientes", value: String(stats.customers) },
    { icon: Package, color: "text-purple-500", label: "Produtos", value: String(stats.products) },
    { icon: DollarSign, color: "text-yellow-500", label: "Faturamento", value: formatCurrency(stats.revenue) },
  ]
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`w-5 h-5 ${c.color}`} />
              <span className="text-sm text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="font-bold text-foreground mb-4">Pedidos Recentes</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum pedido ainda</p>
        ) : (
          <div className="divide-y divide-border">
            {orders.slice(0, 10).map((o) => (
              <div key={o.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{o.customer_name || "Cliente"}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.order_code || `#${o.id}`} · {formatDate(o.created_at)} · {statusLabel(o.status, o.payment_status)}
                  </p>
                </div>
                <span className="text-sm font-bold text-foreground whitespace-nowrap">
                  {formatCurrency(Number(o.total))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ---------------- PRODUTOS ----------------
function ProductsTab({
  products,
  categories,
  mutate,
}: {
  products: ProductRow[]
  categories: CategoryRow[]
  mutate: (action: string, payload: Record<string, unknown>) => Promise<boolean>
}) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editPrice, setEditPrice] = useState("")

  const create = async () => {
    if (!name || !price) return
    setSaving(true)
    const ok = await mutate("product.create", {
      name,
      price: Number(price),
      categoryId: categoryId ? Number(categoryId) : null,
    })
    setSaving(false)
    if (ok) {
      setName("")
      setPrice("")
      setCategoryId("")
    }
  }

  const saveEdit = async (id: number) => {
    await mutate("product.update", { id, name: editName, price: Number(editPrice) })
    setEditId(null)
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Produto
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do produto"
            className="sm:col-span-2 px-3 py-2 rounded-lg bg-background border border-border text-foreground"
          />
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Preço (ex: 15.90)"
            inputMode="decimal"
            className="px-3 py-2 rounded-lg bg-background border border-border text-foreground"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-background border border-border text-foreground"
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={create}
          disabled={saving || !name || !price}
          className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Adicionar
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="font-bold text-foreground mb-4">Produtos da Loja ({products.length})</h2>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum produto cadastrado</p>
        ) : (
          <div className="divide-y divide-border">
            {products.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                {editId === p.id ? (
                  <div className="flex flex-1 gap-2 items-center">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 rounded bg-background border border-border text-foreground text-sm"
                    />
                    <input
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      inputMode="decimal"
                      className="w-24 px-2 py-1 rounded bg-background border border-border text-foreground text-sm"
                    />
                    <button onClick={() => saveEdit(p.id)} className="p-1 text-green-500" aria-label="Salvar">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditId(null)} className="p-1 text-muted-foreground" aria-label="Cancelar">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <span className={`text-xs ${p.active ? "text-green-500" : "text-muted-foreground"}`}>
                        {p.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-foreground whitespace-nowrap">
                        {formatCurrency(Number(p.price))}
                      </span>
                      <button
                        onClick={() => mutate("product.toggle", { id: p.id, active: !p.active })}
                        className={`text-xs px-2 py-1 rounded ${p.active ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}
                      >
                        {p.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => {
                          setEditId(p.id)
                          setEditName(p.name)
                          setEditPrice(String(p.price))
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        aria-label="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------- CATEGORIAS ----------------
function CategoriesTab({
  categories,
  mutate,
}: {
  categories: CategoryRow[]
  mutate: (action: string, payload: Record<string, unknown>) => Promise<boolean>
}) {
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")

  const create = async () => {
    if (!name) return
    setSaving(true)
    const ok = await mutate("category.create", { name, sortOrder: categories.length })
    setSaving(false)
    if (ok) setName("")
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova Categoria
        </h2>
        <div className="flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da categoria"
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground"
          />
          <button
            onClick={create}
            disabled={saving || !name}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="font-bold text-foreground mb-4">Categorias ({categories.length})</h2>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma categoria cadastrada</p>
        ) : (
          <div className="divide-y divide-border">
            {categories.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                {editId === c.id ? (
                  <div className="flex flex-1 gap-2 items-center">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 rounded bg-background border border-border text-foreground text-sm"
                    />
                    <button
                      onClick={async () => {
                        await mutate("category.update", { id: c.id, name: editName })
                        setEditId(null)
                      }}
                      className="p-1 text-green-500"
                      aria-label="Salvar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditId(null)} className="p-1 text-muted-foreground" aria-label="Cancelar">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => mutate("category.update", { id: c.id, active: !c.active })}
                        className={`text-xs px-2 py-1 rounded ${c.active ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}
                      >
                        {c.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => {
                          setEditId(c.id)
                          setEditName(c.name)
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        aria-label="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------- BAIRROS ----------------
function NeighborhoodsTab({
  neighborhoods,
  mutate,
}: {
  neighborhoods: NeighborhoodRow[]
  mutate: (action: string, payload: Record<string, unknown>) => Promise<boolean>
}) {
  const [name, setName] = useState("")
  const [fee, setFee] = useState("")
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | string | null>(null)
  const [editFee, setEditFee] = useState("")

  const create = async () => {
    if (!name) return
    setSaving(true)
    const ok = await mutate("neighborhood.create", {
      name,
      deliveryFee: Number(fee) || 0,
      sortOrder: neighborhoods.length,
    })
    setSaving(false)
    if (ok) {
      setName("")
      setFee("")
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Bairro / Taxa
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do bairro"
            className="sm:col-span-2 px-3 py-2 rounded-lg bg-background border border-border text-foreground"
          />
          <input
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="Taxa (ex: 5.00)"
            inputMode="decimal"
            className="px-3 py-2 rounded-lg bg-background border border-border text-foreground"
          />
        </div>
        <button
          onClick={create}
          disabled={saving || !name}
          className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Adicionar
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="font-bold text-foreground mb-4">Bairros ({neighborhoods.length})</h2>
        {neighborhoods.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum bairro cadastrado</p>
        ) : (
          <div className="divide-y divide-border">
            {neighborhoods.map((n) => (
              <div key={n.id} className="py-3 flex items-center justify-between gap-3">
                {editId === n.id ? (
                  <div className="flex flex-1 gap-2 items-center">
                    <span className="text-sm text-foreground flex-1 truncate">{n.name}</span>
                    <input
                      value={editFee}
                      onChange={(e) => setEditFee(e.target.value)}
                      inputMode="decimal"
                      className="w-24 px-2 py-1 rounded bg-background border border-border text-foreground text-sm"
                    />
                    <button
                      onClick={async () => {
                        await mutate("neighborhood.update", { id: n.id, deliveryFee: Number(editFee) || 0 })
                        setEditId(null)
                      }}
                      className="p-1 text-green-500"
                      aria-label="Salvar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditId(null)} className="p-1 text-muted-foreground" aria-label="Cancelar">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">{n.name}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-foreground whitespace-nowrap">
                        {formatCurrency(Number(n.delivery_fee))}
                      </span>
                      <button
                        onClick={() => {
                          setEditId(n.id)
                          setEditFee(String(n.delivery_fee))
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        aria-label="Editar taxa"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------- PEDIDOS ----------------
function OrdersTab({
  orders,
  mutate,
}: {
  orders: OrderRow[]
  mutate: (action: string, payload: Record<string, unknown>) => Promise<boolean>
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h2 className="font-bold text-foreground mb-4">Pedidos da Loja ({orders.length})</h2>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhum pedido ainda</p>
      ) : (
        <div className="divide-y divide-border">
          {orders.map((o) => (
            <div key={o.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{o.customer_name || "Cliente"}</p>
                <p className="text-xs text-muted-foreground">
                  {o.order_code || `#${o.id}`} · {formatDate(o.created_at)} · {formatCurrency(Number(o.total))}
                </p>
                <span className="text-xs text-muted-foreground">{statusLabel(o.status, o.payment_status)}</span>
              </div>
              <select
                value={ORDER_STATUSES.some((s) => s.value === o.status) ? o.status : ""}
                onChange={(e) => mutate("order.status", { id: o.id, status: e.target.value })}
                className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
              >
                <option value="" disabled>
                  Alterar status
                </option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
