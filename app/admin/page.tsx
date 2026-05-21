"use client"

import { useState, useEffect } from "react"
import { 
  Lock, 
  LogOut, 
  Package, 
  Image as ImageIcon, 
  Clock, 
  CreditCard, 
  MessageCircle, 
  Save, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff,
  Check,
  Loader2,
  ArrowLeft,
  Store,
  Truck,
  Tag,
  ShoppingBag,
  GripVertical,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import Link from "next/link"
import { type SiteConfig, type Product, type Coupon, type Order, type NeighborhoodFee, defaultConfig } from "@/lib/config-types"

type TabType = "store" | "products" | "banner" | "hours" | "payment" | "whatsapp" | "delivery" | "coupons" | "orders"

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [config, setConfig] = useState<SiteConfig>(defaultConfig)
  const [activeTab, setActiveTab] = useState<TabType>("store")
  const [sessionPassword, setSessionPassword] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null)

  useEffect(() => {
    if (isAuthenticated && sessionPassword) {
      loadConfig()
      loadOrders()
    }
  }, [isAuthenticated, sessionPassword])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/config?admin=true&password=${encodeURIComponent(sessionPassword)}`)
      const data = await res.json()
      if (data.success && data.config) {
        // Merge with defaults for new fields
        setConfig({ ...defaultConfig, ...data.config })
      }
    } catch (error) {
      console.error("Erro ao carregar config:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async () => {
    try {
      const res = await fetch(`/api/orders?password=${encodeURIComponent(sessionPassword)}`)
      const data = await res.json()
      if (data.success && data.orders) {
        setOrders(data.orders)
      }
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError("")
    setLoading(true)

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (data.success) {
        setIsAuthenticated(true)
        setSessionPassword(password)
        setPassword("")
      } else {
        setAuthError("Senha incorreta")
      }
    } catch {
      setAuthError("Erro ao autenticar")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setSessionPassword("")
    setConfig(defaultConfig)
    setOrders([])
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sessionPassword, config }),
      })

      const data = await res.json()

      if (data.success) {
        setSaveSuccess(true)
        await loadConfig()
        setTimeout(() => setSaveSuccess(false), 5000)
      } else {
        alert("Erro ao salvar: " + (data.error || "Erro desconhecido"))
      }
    } catch (error) {
      console.error("Erro ao salvar:", error)
      alert("Erro ao salvar configuracoes")
    } finally {
      setSaving(false)
    }
  }

  const updateProduct = (id: number, field: keyof Product, value: string | number | boolean) => {
    setConfig(prev => ({
      ...prev,
      products: prev.products.map(p => 
        p.id === id ? { ...p, [field]: value } : p
      ),
    }))
  }

  const addProduct = () => {
    const newId = Math.max(...config.products.map(p => p.id), 0) + 1
    const newOrder = Math.max(...config.products.map(p => p.order || 0), 0) + 1
    setConfig(prev => ({
      ...prev,
      products: [
        ...prev.products,
        {
          id: newId,
          name: "Novo Produto",
          price: 10,
          description: "Descricao do produto",
          active: true,
          stock: 100,
          outOfStock: false,
          order: newOrder,
        },
      ],
    }))
  }

  const removeProduct = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      setConfig(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== id),
      }))
    }
  }

  const moveProduct = (id: number, direction: "up" | "down") => {
    const products = [...config.products].sort((a, b) => (a.order || 0) - (b.order || 0))
    const index = products.findIndex(p => p.id === id)
    if ((direction === "up" && index === 0) || (direction === "down" && index === products.length - 1)) return
    
    const newIndex = direction === "up" ? index - 1 : index + 1
    const temp = products[index].order
    products[index].order = products[newIndex].order
    products[newIndex].order = temp
    
    setConfig(prev => ({ ...prev, products }))
  }

  const addCoupon = () => {
    const newCoupon: Coupon = {
      id: `coupon-${Date.now()}`,
      code: "NOVO10",
      type: "percentage",
      value: 10,
      active: true,
      minimumOrder: 0,
    }
    setConfig(prev => ({
      ...prev,
      coupons: [...(prev.coupons || []), newCoupon],
    }))
  }

  const updateCoupon = (id: string, field: keyof Coupon, value: string | number | boolean) => {
    setConfig(prev => ({
      ...prev,
      coupons: (prev.coupons || []).map(c => 
        c.id === id ? { ...c, [field]: value } : c
      ),
    }))
  }

  const removeCoupon = (id: string) => {
    setConfig(prev => ({
      ...prev,
      coupons: (prev.coupons || []).filter(c => c.id !== id),
    }))
  }

  const addNeighborhoodFee = () => {
    const newFee: NeighborhoodFee = { name: "Novo Bairro", fee: 5 }
    setConfig(prev => ({
      ...prev,
      delivery: {
        ...prev.delivery,
        neighborhoodFees: [...(prev.delivery?.neighborhoodFees || []), newFee],
      },
    }))
  }

  const updateNeighborhoodFee = (index: number, field: keyof NeighborhoodFee, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      delivery: {
        ...prev.delivery,
        neighborhoodFees: (prev.delivery?.neighborhoodFees || []).map((f, i) => 
          i === index ? { ...f, [field]: value } : f
        ),
      },
    }))
  }

  const removeNeighborhoodFee = (index: number) => {
    setConfig(prev => ({
      ...prev,
      delivery: {
        ...prev.delivery,
        neighborhoodFees: (prev.delivery?.neighborhoodFees || []).filter((_, i) => i !== index),
      },
    }))
  }

  const updateOrderStatus = async (orderId: string, status: Order["status"]) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sessionPassword, orderId, status }),
      })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      }
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error)
    }
  }

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "received": return "bg-blue-500/20 text-blue-400"
      case "preparing": return "bg-yellow-500/20 text-yellow-400"
      case "delivering": return "bg-purple-500/20 text-purple-400"
      case "completed": return "bg-green-500/20 text-green-400"
      case "cancelled": return "bg-red-500/20 text-red-400"
      default: return "bg-gray-500/20 text-gray-400"
    }
  }

  const getStatusLabel = (status: Order["status"]) => {
    switch (status) {
      case "received": return "Recebido"
      case "preparing": return "Preparando"
      case "delivering": return "Saiu p/ Entrega"
      case "completed": return "Finalizado"
      case "cancelled": return "Cancelado"
      default: return status
    }
  }

  // Tela de Login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl p-8 shadow-xl border border-border">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Area Admin</h1>
              <p className="text-muted-foreground mt-2">Digite a senha para acessar</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              {authError && (
                <p className="text-destructive text-sm text-center">{authError}</p>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Entrar
                  </>
                )}
              </button>
            </form>

            <Link 
              href="/" 
              className="flex items-center justify-center gap-2 mt-6 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para a loja
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Painel Admin
  const sortedProducts = [...config.products].sort((a, b) => (a.order || 0) - (b.order || 0))

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Painel Admin</h1>
              <p className="text-xs text-muted-foreground">{config.storeName || "P.K Gostosuras"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 font-medium rounded-xl transition-all disabled:opacity-50 ${
                saveSuccess 
                  ? "bg-green-600 text-white" 
                  : "bg-primary text-primary-foreground hover:brightness-110"
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Salvando..." : saveSuccess ? "MUDANCAS SALVAS COM SUCESSO" : "Salvar"}
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Success Banner */}
      {saveSuccess && (
        <div className="bg-green-600 text-white py-3 text-center font-medium animate-in slide-in-from-top">
          MUDANCAS SALVAS COM SUCESSO
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-[280px_1fr] gap-6">
            {/* Sidebar - Tabs */}
            <nav className="space-y-2">
              {[
                { id: "store" as TabType, icon: Store, label: "Loja" },
                { id: "products" as TabType, icon: Package, label: "Produtos" },
                { id: "banner" as TabType, icon: ImageIcon, label: "Banner" },
                { id: "hours" as TabType, icon: Clock, label: "Horario" },
                { id: "delivery" as TabType, icon: Truck, label: "Entrega" },
                { id: "payment" as TabType, icon: CreditCard, label: "Pagamento" },
                { id: "whatsapp" as TabType, icon: MessageCircle, label: "WhatsApp" },
                { id: "coupons" as TabType, icon: Tag, label: "Cupons" },
                { id: "orders" as TabType, icon: ShoppingBag, label: "Pedidos", badge: orders.filter(o => o.status === "received").length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-card hover:bg-secondary text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </div>
                  {tab.badge && tab.badge > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}

              <div className="pt-4 border-t border-border">
                <Link
                  href="/"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-card hover:bg-secondary text-foreground transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Ver Loja
                </Link>
              </div>
            </nav>

            {/* Content */}
            <div className="bg-card rounded-2xl p-6 border border-border min-h-[600px]">
              
              {/* Loja */}
              {activeTab === "store" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-foreground">Configuracoes da Loja</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Nome da Loja</label>
                      <input
                        type="text"
                        value={config.storeName || ""}
                        onChange={(e) => setConfig(prev => ({ ...prev, storeName: e.target.value }))}
                        className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                      <div>
                        <p className="font-medium text-foreground">Status da Loja</p>
                        <p className="text-sm text-muted-foreground">
                          {config.storeHours?.isOpen ? "Loja esta ABERTA" : "Loja esta FECHADA"}
                        </p>
                      </div>
                      <button
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          storeHours: { ...prev.storeHours, isOpen: !prev.storeHours?.isOpen }
                        }))}
                        className={`w-14 h-8 rounded-full transition-all ${
                          config.storeHours?.isOpen ? "bg-green-600" : "bg-destructive"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                            config.storeHours?.isOpen ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                      <div>
                        <p className="font-medium text-foreground">Controle Manual</p>
                        <p className="text-sm text-muted-foreground">Ignorar horario automatico</p>
                      </div>
                      <button
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          storeHours: { ...prev.storeHours, manualControl: !prev.storeHours?.manualControl }
                        }))}
                        className={`w-14 h-8 rounded-full transition-all ${
                          config.storeHours?.manualControl ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                            config.storeHours?.manualControl ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground">Dica</p>
                          <p className="text-sm text-muted-foreground">
                            Com controle manual ativado, a loja fica aberta/fechada conforme o botao acima, independente do horario configurado.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Produtos */}
              {activeTab === "products" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Produtos ({config.products.length})</h2>
                    <button
                      onClick={addProduct}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl transition-all hover:brightness-110"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </button>
                  </div>

                  <div className="space-y-3">
                    {sortedProducts.map((product, index) => (
                      <div
                        key={product.id}
                        className={`rounded-xl border transition-all ${
                          product.active 
                            ? product.outOfStock 
                              ? "border-yellow-500/30 bg-yellow-500/5" 
                              : "border-border bg-secondary/30" 
                            : "border-border/50 bg-secondary/10 opacity-60"
                        }`}
                      >
                        {/* Header */}
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer"
                          onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); moveProduct(product.id, "up") }}
                                disabled={index === 0}
                                className="p-0.5 hover:bg-secondary rounded disabled:opacity-30"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); moveProduct(product.id, "down") }}
                                disabled={index === sortedProducts.length - 1}
                                className="p-0.5 hover:bg-secondary rounded disabled:opacity-30"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-foreground">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                R$ {product.price.toFixed(2)} - Estoque: {product.stock}
                                {product.outOfStock && <span className="text-yellow-400 ml-2">(Esgotado)</span>}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              product.active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                            }`}>
                              {product.active ? "Ativo" : "Inativo"}
                            </span>
                            {expandedProduct === product.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedProduct === product.id && (
                          <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs text-muted-foreground">Nome</label>
                                <input
                                  type="text"
                                  value={product.name}
                                  onChange={(e) => updateProduct(product.id, "name", e.target.value)}
                                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Preco (R$)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={product.price}
                                  onChange={(e) => updateProduct(product.id, "price", Number(e.target.value))}
                                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-xs text-muted-foreground">Descricao</label>
                              <input
                                type="text"
                                value={product.description}
                                onChange={(e) => updateProduct(product.id, "description", e.target.value)}
                                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs text-muted-foreground">Estoque</label>
                                <input
                                  type="number"
                                  value={product.stock}
                                  onChange={(e) => updateProduct(product.id, "stock", Number(e.target.value))}
                                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                              </div>
                              <div className="flex items-end gap-2">
                                <button
                                  onClick={() => updateProduct(product.id, "outOfStock", !product.outOfStock)}
                                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                                    product.outOfStock
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : "bg-secondary text-muted-foreground"
                                  }`}
                                >
                                  <AlertCircle className="w-4 h-4" />
                                  {product.outOfStock ? "Esgotado" : "Disponivel"}
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-border">
                              <button
                                onClick={() => updateProduct(product.id, "active", !product.active)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                                  product.active
                                    ? "bg-green-600/20 text-green-500"
                                    : "bg-secondary text-muted-foreground"
                                }`}
                              >
                                {product.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                {product.active ? "Ativo" : "Inativo"}
                              </button>
                              <button
                                onClick={() => removeProduct(product.id)}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition-colors text-sm font-medium"
                              >
                                <Trash2 className="w-4 h-4" />
                                Excluir
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Banner */}
              {activeTab === "banner" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-foreground">Banner do Site</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Texto Principal</label>
                      <input
                        type="text"
                        value={config.banner?.mainText || ""}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          banner: { ...prev.banner, mainText: e.target.value }
                        }))}
                        className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Texto Secundario</label>
                      <input
                        type="text"
                        value={config.banner?.secondaryText || ""}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          banner: { ...prev.banner, secondaryText: e.target.value }
                        }))}
                        className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                      <div>
                        <p className="font-medium text-foreground">Promocao Ativa</p>
                        <p className="text-sm text-muted-foreground">Mostrar banner de promocao</p>
                      </div>
                      <button
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          banner: { ...prev.banner, promoActive: !prev.banner?.promoActive }
                        }))}
                        className={`w-14 h-8 rounded-full transition-all ${
                          config.banner?.promoActive ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                            config.banner?.promoActive ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {config.banner?.promoActive && (
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Texto da Promocao</label>
                          <input
                            type="text"
                            value={config.banner?.promoText || ""}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              banner: { ...prev.banner, promoText: e.target.value }
                            }))}
                            placeholder="Ex: 20% OFF hoje!"
                            className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Preco Promocional (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={config.banner?.promoPrice || 0}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              banner: { ...prev.banner, promoPrice: Number(e.target.value) }
                            }))}
                            className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Horario */}
              {activeTab === "hours" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-foreground">Horario de Funcionamento</h2>

                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Horario de Abertura</label>
                        <input
                          type="time"
                          value={config.storeHours?.openTime || "08:00"}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            storeHours: { ...prev.storeHours, openTime: e.target.value }
                          }))}
                          className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Horario de Fechamento</label>
                        <input
                          type="time"
                          value={config.storeHours?.closeTime || "22:00"}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            storeHours: { ...prev.storeHours, closeTime: e.target.value }
                          }))}
                          className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Mensagem quando Fechado</label>
                      <textarea
                        value={config.storeHours?.closedMessage || ""}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          storeHours: { ...prev.storeHours, closedMessage: e.target.value }
                        }))}
                        rows={3}
                        className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Entrega */}
              {activeTab === "delivery" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-foreground">Configuracoes de Entrega</h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                      <div>
                        <p className="font-medium text-foreground">Entrega Habilitada</p>
                        <p className="text-sm text-muted-foreground">Permitir entregas</p>
                      </div>
                      <button
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          delivery: { ...prev.delivery, enabled: !prev.delivery?.enabled }
                        }))}
                        className={`w-14 h-8 rounded-full transition-all ${
                          config.delivery?.enabled ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                            config.delivery?.enabled ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                      <div>
                        <p className="font-medium text-foreground">Retirada no Local</p>
                        <p className="text-sm text-muted-foreground">Permitir retirada</p>
                      </div>
                      <button
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          delivery: { ...prev.delivery, pickupEnabled: !prev.delivery?.pickupEnabled }
                        }))}
                        className={`w-14 h-8 rounded-full transition-all ${
                          config.delivery?.pickupEnabled ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                            config.delivery?.pickupEnabled ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Taxa Padrao (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={config.delivery?.defaultFee || 0}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            delivery: { ...prev.delivery, defaultFee: Number(e.target.value) }
                          }))}
                          className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Pedido Minimo (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={config.delivery?.minimumOrder || 0}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            delivery: { ...prev.delivery, minimumOrder: Number(e.target.value) }
                          }))}
                          className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Tempo Estimado</label>
                        <input
                          type="text"
                          value={config.delivery?.estimatedTime || ""}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            delivery: { ...prev.delivery, estimatedTime: e.target.value }
                          }))}
                          placeholder="30-45 min"
                          className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-secondary/30 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-medium text-foreground">Taxas por Bairro</p>
                        <button
                          onClick={addNeighborhoodFee}
                          className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-lg"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(config.delivery?.neighborhoodFees || []).map((fee, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={fee.name}
                              onChange={(e) => updateNeighborhoodFee(index, "name", e.target.value)}
                              placeholder="Nome do bairro"
                              className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={fee.fee}
                              onChange={(e) => updateNeighborhoodFee(index, "fee", Number(e.target.value))}
                              className="w-24 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                            />
                            <button
                              onClick={() => removeNeighborhoodFee(index)}
                              className="p-2 text-destructive hover:bg-destructive/20 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {(config.delivery?.neighborhoodFees || []).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">Nenhuma taxa por bairro configurada</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pagamento */}
              {activeTab === "payment" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-foreground">Configuracoes de Pagamento</h2>

                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Valor Minimo para PIX Asaas (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={config.payment?.minValueForAsaas || 15}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            payment: { ...prev.payment, minValueForAsaas: Number(e.target.value) }
                          }))}
                          className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Pedidos abaixo usam PIX manual</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Tempo de Expiracao PIX (min)</label>
                        <input
                          type="number"
                          value={config.payment?.pixExpirationMinutes || 15}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            payment: { ...prev.payment, pixExpirationMinutes: Number(e.target.value) }
                          }))}
                          className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                      <div>
                        <p className="font-medium text-foreground">PIX Manual</p>
                        <p className="text-sm text-muted-foreground">Para pedidos abaixo do valor minimo</p>
                      </div>
                      <button
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          payment: { ...prev.payment, pixManualEnabled: !prev.payment?.pixManualEnabled }
                        }))}
                        className={`w-14 h-8 rounded-full transition-all ${
                          config.payment?.pixManualEnabled ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                            config.payment?.pixManualEnabled ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                      <div>
                        <p className="font-medium text-foreground">PIX Asaas Automatico</p>
                        <p className="text-sm text-muted-foreground">Para pedidos acima do valor minimo</p>
                      </div>
                      <button
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          payment: { ...prev.payment, pixAsaasEnabled: !prev.payment?.pixAsaasEnabled }
                        }))}
                        className={`w-14 h-8 rounded-full transition-all ${
                          config.payment?.pixAsaasEnabled ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                            config.payment?.pixAsaasEnabled ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                      <h3 className="font-medium text-foreground mb-3">Dados do PIX Manual</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Chave PIX</label>
                          <input
                            type="text"
                            value={config.pixManual?.key || ""}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              pixManual: { ...prev.pixManual, key: e.target.value }
                            }))}
                            className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Chave PIX Completa (com +55)</label>
                          <input
                            type="text"
                            value={config.pixManual?.keyFull || ""}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              pixManual: { ...prev.pixManual, keyFull: e.target.value }
                            }))}
                            className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Nome do Recebedor</label>
                          <input
                            type="text"
                            value={config.pixManual?.receiverName || ""}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              pixManual: { ...prev.pixManual, receiverName: e.target.value }
                            }))}
                            className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* WhatsApp */}
              {activeTab === "whatsapp" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-foreground">Configuracoes do WhatsApp</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Numero do WhatsApp</label>
                      <input
                        type="text"
                        value={config.whatsapp?.number || ""}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, number: e.target.value }
                        }))}
                        placeholder="5511999999999"
                        className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Formato: codigo do pais + DDD + numero</p>
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Mensagem Padrao</label>
                      <textarea
                        value={config.whatsapp?.defaultMessage || ""}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, defaultMessage: e.target.value }
                        }))}
                        rows={3}
                        className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Mensagem para Comprovante</label>
                      <textarea
                        value={config.whatsapp?.receiptMessage || ""}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, receiptMessage: e.target.value }
                        }))}
                        rows={2}
                        placeholder="Envie o comprovante do PIX por aqui."
                        className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                      <div>
                        <p className="font-medium text-foreground">Botao de Suporte</p>
                        <p className="text-sm text-muted-foreground">Mostrar botao de ajuda no site</p>
                      </div>
                      <button
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, supportEnabled: !prev.whatsapp?.supportEnabled }
                        }))}
                        className={`w-14 h-8 rounded-full transition-all ${
                          config.whatsapp?.supportEnabled ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                            config.whatsapp?.supportEnabled ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Cupons */}
              {activeTab === "coupons" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Cupons de Desconto</h2>
                    <button
                      onClick={addCoupon}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl transition-all hover:brightness-110"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(config.coupons || []).map((coupon) => (
                      <div
                        key={coupon.id}
                        className={`p-4 rounded-xl border ${
                          coupon.active ? "border-border bg-secondary/30" : "border-border/50 bg-secondary/10 opacity-60"
                        }`}
                      >
                        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                          <div>
                            <label className="text-xs text-muted-foreground">Codigo</label>
                            <input
                              type="text"
                              value={coupon.code}
                              onChange={(e) => updateCoupon(coupon.id, "code", e.target.value.toUpperCase())}
                              className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm font-mono uppercase"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Tipo</label>
                            <select
                              value={coupon.type}
                              onChange={(e) => updateCoupon(coupon.id, "type", e.target.value)}
                              className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                            >
                              <option value="percentage">Porcentagem</option>
                              <option value="fixed">Valor Fixo</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">
                              Valor {coupon.type === "percentage" ? "(%)" : "(R$)"}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={coupon.value}
                              onChange={(e) => updateCoupon(coupon.id, "value", Number(e.target.value))}
                              className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Pedido Minimo (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={coupon.minimumOrder}
                              onChange={(e) => updateCoupon(coupon.id, "minimumOrder", Number(e.target.value))}
                              className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <button
                              onClick={() => updateCoupon(coupon.id, "active", !coupon.active)}
                              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                                coupon.active
                                  ? "bg-green-600/20 text-green-500"
                                  : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              {coupon.active ? "Ativo" : "Inativo"}
                            </button>
                            <button
                              onClick={() => removeCoupon(coupon.id)}
                              className="p-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(config.coupons || []).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum cupom cadastrado</p>
                        <p className="text-sm">Clique em Adicionar para criar um cupom</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pedidos */}
              {activeTab === "orders" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Pedidos ({orders.length})</h2>
                    <button
                      onClick={loadOrders}
                      className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground font-medium rounded-xl transition-all hover:bg-secondary/80"
                    >
                      <Loader2 className="w-4 h-4" />
                      Atualizar
                    </button>
                  </div>

                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 rounded-xl border border-border bg-secondary/30"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-foreground">{order.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleString("pt-BR")}
                            </p>
                          </div>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Cliente</p>
                            <p className="text-sm text-foreground">{order.customerName}</p>
                            <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-lg font-bold text-foreground">
                              R$ {order.total.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">{order.paymentMethod}</p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground">Itens</p>
                          <p className="text-sm text-foreground">{order.items}</p>
                        </div>

                        {order.address && (
                          <div className="mb-3">
                            <p className="text-xs text-muted-foreground">Endereco</p>
                            <p className="text-sm text-foreground">{order.address}</p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                          {(["received", "preparing", "delivering", "completed", "cancelled"] as Order["status"][]).map((status) => (
                            <button
                              key={status}
                              onClick={() => updateOrderStatus(order.id, status)}
                              disabled={order.status === status}
                              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                                order.status === status
                                  ? getStatusColor(status)
                                  : "bg-secondary text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {getStatusLabel(status)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {orders.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum pedido ainda</p>
                        <p className="text-sm">Os pedidos aparecerao aqui</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
