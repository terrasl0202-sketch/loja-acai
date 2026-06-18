"use client"

import { useState, useEffect } from "react"
import { 
  Store, 
  Plus, 
  Edit2, 
  Users, 
  Package, 
  ShoppingBag, 
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
  Building2,
  Globe,
  Mail,
  Phone,
  Calendar,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"

interface StoreData {
  id: number
  store_code: string
  slug: string
  store_name: string
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  plan: string
  status: string
  custom_domain: string | null
  subdomain: string | null
  logo_url: string | null
  created_at: string
  stats: {
    orders: number
    customers: number
    products: number
  }
}

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-gray-500/20 text-gray-400",
  plus: "bg-blue-500/20 text-blue-400",
  pro: "bg-purple-500/20 text-purple-400",
  elite: "bg-yellow-500/20 text-yellow-400",
}

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  active: { color: "text-green-500", icon: CheckCircle, label: "Ativa" },
  suspended: { color: "text-red-500", icon: XCircle, label: "Suspensa" },
  trial: { color: "text-blue-500", icon: Clock, label: "Trial" },
  cancelled: { color: "text-gray-500", icon: XCircle, label: "Cancelada" },
}

export default function PlatformPage() {
  const [stores, setStores] = useState<StoreData[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [sessionPassword, setSessionPassword] = useState("")
  const [error, setError] = useState("")
  
  // Modal de criar/editar loja
  const [showModal, setShowModal] = useState(false)
  const [editingStore, setEditingStore] = useState<StoreData | null>(null)
  const [formData, setFormData] = useState({
    store_name: "",
    slug: "",
    owner_name: "",
    owner_email: "",
    owner_phone: "",
    plan: "starter",
    status: "active"
  })
  const [saving, setSaving] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError("")
    
    try {
      const res = await fetch(`/api/platform/stores?password=${encodeURIComponent(password)}`)
      const data = await res.json()
      
      if (data.error) {
        setError(data.error)
        setLoading(false)
        return
      }
      
      setStores(data.stores || [])
      setSessionPassword(password)
      setAuthenticated(true)
    } catch {
      setError("Erro ao conectar")
    } finally {
      setLoading(false)
    }
  }

  const loadStores = async () => {
    try {
      const res = await fetch(`/api/platform/stores?password=${encodeURIComponent(sessionPassword)}`)
      const data = await res.json()
      if (data.stores) {
        setStores(data.stores)
      }
    } catch (error) {
      console.error("Erro ao carregar lojas:", error)
    }
  }

  const openCreateModal = () => {
    setEditingStore(null)
    setFormData({
      store_name: "",
      slug: "",
      owner_name: "",
      owner_email: "",
      owner_phone: "",
      plan: "starter",
      status: "active"
    })
    setShowModal(true)
  }

  const openEditModal = (store: StoreData) => {
    setEditingStore(store)
    setFormData({
      store_name: store.store_name,
      slug: store.slug,
      owner_name: store.owner_name || "",
      owner_email: store.owner_email || "",
      owner_phone: store.owner_phone || "",
      plan: store.plan,
      status: store.status
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingStore) {
        // Atualizar loja existente
        const res = await fetch("/api/platform/stores", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: sessionPassword,
            id: editingStore.id,
            store_name: formData.store_name,
            owner_name: formData.owner_name,
            owner_email: formData.owner_email,
            owner_phone: formData.owner_phone,
            plan: formData.plan,
            status: formData.status,
          })
        })
        const data = await res.json()
        if (data.error) {
          alert(data.error)
          return
        }
      } else {
        // Criar nova loja
        const res = await fetch("/api/platform/stores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: sessionPassword,
            ...formData
          })
        })
        const data = await res.json()
        if (data.error) {
          alert(data.error)
          return
        }
      }
      
      setShowModal(false)
      loadStores()
    } catch (error) {
      console.error("Erro ao salvar:", error)
      alert("Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    // Verificar se ja tem senha na sessao
    const saved = sessionStorage.getItem("platform_password")
    if (saved) {
      setPassword(saved)
      setSessionPassword(saved)
      setAuthenticated(true)
      fetch(`/api/platform/stores?password=${encodeURIComponent(saved)}`)
        .then(res => res.json())
        .then(data => {
          if (data.stores) {
            setStores(data.stores)
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionPassword) {
      sessionStorage.setItem("platform_password", sessionPassword)
    }
  }, [sessionPassword])

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-xl border border-border p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Platform Admin</h1>
                <p className="text-sm text-muted-foreground">Gerenciamento de lojas</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Senha da Plataforma</label>
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
            <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Platform Admin</h1>
              <p className="text-xs text-muted-foreground">{stores.length} lojas cadastradas</p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
          >
            <Plus className="w-4 h-4" />
            Nova Loja
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : stores.length === 0 ? (
          <div className="text-center py-12">
            <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma loja cadastrada</p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
            >
              Criar primeira loja
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => {
              const StatusIcon = STATUS_CONFIG[store.status]?.icon || CheckCircle
              return (
                <div
                  key={store.id}
                  className="bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Store className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{store.store_name}</h3>
                        <p className="text-xs text-muted-foreground">/{store.slug}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openEditModal(store)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${PLAN_COLORS[store.plan] || PLAN_COLORS.starter}`}>
                      <Crown className="w-3 h-3 inline mr-1" />
                      {store.plan.toUpperCase()}
                    </span>
                    <span className={`flex items-center gap-1 text-xs ${STATUS_CONFIG[store.status]?.color || "text-gray-500"}`}>
                      <StatusIcon className="w-3 h-3" />
                      {STATUS_CONFIG[store.status]?.label || store.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <ShoppingBag className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-sm font-bold text-foreground">{store.stats.orders}</p>
                      <p className="text-xs text-muted-foreground">Pedidos</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-sm font-bold text-foreground">{store.stats.customers}</p>
                      <p className="text-xs text-muted-foreground">Clientes</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <Package className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-sm font-bold text-foreground">{store.stats.products}</p>
                      <p className="text-xs text-muted-foreground">Produtos</p>
                    </div>
                  </div>

                  {store.owner_email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Mail className="w-3 h-3" />
                      {store.owner_email}
                    </div>
                  )}

                  {store.owner_phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Phone className="w-3 h-3" />
                      {store.owner_phone}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Criada em {new Date(store.created_at).toLocaleDateString("pt-BR")}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex gap-2">
                    <Link
                      href={`/loja/${store.slug}`}
                      className="flex-1 text-center py-2 rounded-lg bg-muted text-sm text-foreground hover:bg-muted/80 transition-colors"
                    >
                      <Globe className="w-4 h-4 inline mr-1" />
                      Ver Loja
                    </Link>
                    <Link
                      href={`/admin/${store.slug}`}
                      className="flex-1 text-center py-2 rounded-lg bg-primary/10 text-sm text-primary hover:bg-primary/20 transition-colors"
                    >
                      Admin
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal de criar/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-foreground mb-4">
              {editingStore ? "Editar Loja" : "Nova Loja"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Nome da Loja *</label>
                <input
                  type="text"
                  value={formData.store_name}
                  onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  className="w-full mt-1 px-4 py-2 rounded-lg bg-background border border-border text-foreground"
                  placeholder="Ex: Acai Premium"
                />
              </div>

              {!editingStore && (
                <div>
                  <label className="text-sm text-muted-foreground">Slug (URL) *</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    className="w-full mt-1 px-4 py-2 rounded-lg bg-background border border-border text-foreground"
                    placeholder="ex: acai-premium"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Aparecera em: /loja/{formData.slug || "slug"}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm text-muted-foreground">Nome do Proprietario</label>
                <input
                  type="text"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full mt-1 px-4 py-2 rounded-lg bg-background border border-border text-foreground"
                  placeholder="Ex: Joao Silva"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                  className="w-full mt-1 px-4 py-2 rounded-lg bg-background border border-border text-foreground"
                  placeholder="Ex: contato@loja.com"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Telefone</label>
                <input
                  type="tel"
                  value={formData.owner_phone}
                  onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                  className="w-full mt-1 px-4 py-2 rounded-lg bg-background border border-border text-foreground"
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Plano</label>
                <select
                  value={formData.plan}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                  className="w-full mt-1 px-4 py-2 rounded-lg bg-background border border-border text-foreground"
                >
                  <option value="starter">Starter</option>
                  <option value="plus">Plus</option>
                  <option value="pro">Pro</option>
                  <option value="elite">Elite</option>
                </select>
              </div>

              {editingStore && (
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full mt-1 px-4 py-2 rounded-lg bg-background border border-border text-foreground"
                  >
                    <option value="active">Ativa</option>
                    <option value="suspended">Suspensa</option>
                    <option value="trial">Trial</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.store_name || (!editingStore && !formData.slug)}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingStore ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
