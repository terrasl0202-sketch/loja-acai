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
  X,
  Loader2,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { type SiteConfig, type Product, defaultConfig } from "@/lib/config-types"

type TabType = "products" | "banner" | "hours" | "payment" | "whatsapp"

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [config, setConfig] = useState<SiteConfig>(defaultConfig)
  const [activeTab, setActiveTab] = useState<TabType>("products")
  const [sessionPassword, setSessionPassword] = useState("")

  // Carregar config ao autenticar
  useEffect(() => {
    if (isAuthenticated && sessionPassword) {
      loadConfig()
    }
  }, [isAuthenticated, sessionPassword])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/config?admin=true&password=${encodeURIComponent(sessionPassword)}`)
      const data = await res.json()
      if (data.success && data.config) {
        setConfig(data.config)
      }
    } catch (error) {
      console.error("Erro ao carregar config:", error)
    } finally {
      setLoading(false)
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
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error) {
      console.error("Erro ao salvar:", error)
    } finally {
      setSaving(false)
    }
  }

  // Funcoes de edicao de produtos
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
        },
      ],
    }))
  }

  const removeProduct = (id: number) => {
    setConfig(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== id),
    }))
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
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Painel Admin</h1>
              <p className="text-xs text-muted-foreground">P.K Gostosuras</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl transition-all hover:brightness-110 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Salvando..." : saveSuccess ? "Salvo!" : "Salvar"}
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

      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-[250px_1fr] gap-6">
            {/* Sidebar - Tabs */}
            <nav className="space-y-2">
              {[
                { id: "products" as TabType, icon: Package, label: "Produtos" },
                { id: "banner" as TabType, icon: ImageIcon, label: "Banner" },
                { id: "hours" as TabType, icon: Clock, label: "Horario" },
                { id: "payment" as TabType, icon: CreditCard, label: "Pagamento" },
                { id: "whatsapp" as TabType, icon: MessageCircle, label: "WhatsApp" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-card hover:bg-secondary text-foreground"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}

              <Link
                href="/"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-card hover:bg-secondary text-foreground transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                Ver Loja
              </Link>
            </nav>

            {/* Content */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              {/* Produtos */}
              {activeTab === "products" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Produtos</h2>
                    <button
                      onClick={addProduct}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl transition-all hover:brightness-110"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </button>
                  </div>

                  <div className="space-y-4">
                    {config.products.map((product) => (
                      <div
                        key={product.id}
                        className={`p-4 rounded-xl border ${
                          product.active ? "border-border bg-secondary/30" : "border-border/50 bg-secondary/10 opacity-60"
                        }`}
                      >
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                              value={product.price}
                              onChange={(e) => updateProduct(product.id, "price", Number(e.target.value))}
                              className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
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
                              className="p-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="text-xs text-muted-foreground">Descricao</label>
                          <input
                            type="text"
                            value={product.description}
                            onChange={(e) => updateProduct(product.id, "description", e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
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
                        value={config.banner.mainText}
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
                        value={config.banner.secondaryText}
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
                          banner: { ...prev.banner, promoActive: !prev.banner.promoActive }
                        }))}
                        className={`w-14 h-8 rounded-full transition-all ${
                          config.banner.promoActive ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                            config.banner.promoActive ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Horario */}
              {activeTab === "hours" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-foreground">Horario de Funcionamento</h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                      <div>
                        <p className="font-medium text-foreground">Loja Aberta</p>
                        <p className="text-sm text-muted-foreground">Abrir ou fechar a loja manualmente</p>
                      </div>
                      <button
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          storeHours: { ...prev.storeHours, isOpen: !prev.storeHours.isOpen }
                        }))}
                        className={`w-14 h-8 rounded-full transition-all ${
                          config.storeHours.isOpen ? "bg-green-600" : "bg-destructive"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                            config.storeHours.isOpen ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Horario de Abertura</label>
                        <input
                          type="time"
                          value={config.storeHours.openTime}
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
                          value={config.storeHours.closeTime}
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
                        value={config.storeHours.closedMessage}
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

              {/* Pagamento */}
              {activeTab === "payment" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-foreground">Configuracoes de Pagamento</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Valor Minimo para PIX Asaas (R$)</label>
                      <input
                        type="number"
                        value={config.payment.minValueForAsaas}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          payment: { ...prev.payment, minValueForAsaas: Number(e.target.value) }
                        }))}
                        className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Pedidos abaixo desse valor usarao PIX manual
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                      <div>
                        <p className="font-medium text-foreground">PIX Manual</p>
                        <p className="text-sm text-muted-foreground">Para pedidos abaixo do valor minimo</p>
                      </div>
                      <button
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          payment: { ...prev.payment, pixManualEnabled: !prev.payment.pixManualEnabled }
                        }))}
                        className={`w-14 h-8 rounded-full transition-all ${
                          config.payment.pixManualEnabled ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                            config.payment.pixManualEnabled ? "translate-x-7" : "translate-x-1"
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
                          payment: { ...prev.payment, pixAsaasEnabled: !prev.payment.pixAsaasEnabled }
                        }))}
                        className={`w-14 h-8 rounded-full transition-all ${
                          config.payment.pixAsaasEnabled ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                            config.payment.pixAsaasEnabled ? "translate-x-7" : "translate-x-1"
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
                            value={config.pixManual.key}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              pixManual: { ...prev.pixManual, key: e.target.value }
                            }))}
                            className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Chave PIX Completa (com +55)</label>
                          <input
                            type="text"
                            value={config.pixManual.keyFull}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              pixManual: { ...prev.pixManual, keyFull: e.target.value }
                            }))}
                            className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Nome do Recebedor</label>
                          <input
                            type="text"
                            value={config.pixManual.receiverName}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              pixManual: { ...prev.pixManual, receiverName: e.target.value }
                            }))}
                            className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                        value={config.whatsapp.number}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, number: e.target.value }
                        }))}
                        placeholder="5511999999999"
                        className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Formato: codigo do pais + DDD + numero (sem espacos ou tracos)
                      </p>
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Mensagem Padrao</label>
                      <textarea
                        value={config.whatsapp.defaultMessage}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, defaultMessage: e.target.value }
                        }))}
                        rows={3}
                        className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>
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
