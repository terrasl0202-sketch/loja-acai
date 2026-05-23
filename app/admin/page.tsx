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
  ChevronUp,
  BarChart3,
  DollarSign,
  Users,
  Users2,
  TrendingUp,
  Bell,
  BellOff,
  Archive,
  Copy,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  ClockIcon,
  ChefHat,
  PackageCheck,
  Ban,
  Search,
  X,
  Link2,
  ExternalLink,
  RotateCcw,
  FolderArchive
} from "lucide-react"
import Link from "next/link"
import { type SiteConfig, type Product, type Coupon, type Order, type NeighborhoodFee, type Entregador, defaultConfig } from "@/lib/config-types"

type TabType = "store" | "products" | "banner" | "hours" | "payment" | "whatsapp" | "delivery" | "coupons" | "entregadores" | "orders-pending" | "orders-paid" | "orders-preparing" | "orders-delivering" | "orders-completed" | "orders-cancelled" | "orders-abandoned" | "orders-archived" | "reports"

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
  const [financialHistory, setFinancialHistory] = useState<Array<{ id: string, total: number, paymentMethod: string, createdAt: string, confirmedAt?: string, deletedAt: string }>>([])
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [soundActivated, setSoundActivated] = useState(false)
  const [lastOrderIds, setLastOrderIds] = useState<Set<string>>(new Set())
  const [lastPaidIds, setLastPaidIds] = useState<Set<string>>(new Set())
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "week" | "month" | "all">("all")
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null)
  const [manualCopyText, setManualCopyText] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null)
  const [filtroEntregador, setFiltroEntregador] = useState<string>("todos")
  const [problemaEntregaOrderId, setProblemaEntregaOrderId] = useState<string | null>(null)
  const [problemaEntregaObs, setProblemaEntregaObs] = useState("")
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)
  const [manualEntregadorLink, setManualEntregadorLink] = useState<string | null>(null)
  const [archivedSearchInput, setArchivedSearchInput] = useState("")
  const [archivedSearchQuery, setArchivedSearchQuery] = useState("")
  const [confirmEntregador, setConfirmEntregador] = useState<{orderId: string, entregador: Entregador} | null>(null)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [selectedOrdersTab, setSelectedOrdersTab] = useState<TabType | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showDeleteMultiple, setShowDeleteMultiple] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showTabWarning, setShowTabWarning] = useState(false)
  const notificationAudioRef = { current: null as HTMLAudioElement | null }
  
  // Sessao persistente - verificar ao carregar
  useEffect(() => {
    const sessionData = localStorage.getItem("admin_session")
    if (sessionData) {
      try {
        const { password: savedPassword, expiry } = JSON.parse(sessionData)
        if (new Date().getTime() < expiry) {
          setSessionPassword(savedPassword)
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem("admin_session")
        }
      } catch {
        localStorage.removeItem("admin_session")
      }
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && sessionPassword) {
      loadConfig()
      loadOrders()
      
      // Polling para detectar novos pedidos a cada 30 segundos
      const pollInterval = setInterval(() => {
        loadOrdersWithNotification()
      }, 30000)
      
      return () => clearInterval(pollInterval)
    }
  }, [isAuthenticated, sessionPassword])

  // Notificacao sonora quando chegar novo pedido
  const playNotificationSound = () => {
    if (!soundEnabled || !soundActivated) return
    try {
      const audio = new Audio("/notification.mp3")
      audio.volume = 0.5
      audio.play().catch(() => {
        // Fallback: usar beep
        const ctx = new AudioContext()
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        oscillator.frequency.value = 800
        oscillator.type = "sine"
        gainNode.gain.value = 0.3
        oscillator.start()
        setTimeout(() => oscillator.stop(), 300)
      })
    } catch {
      console.log("Audio nao suportado")
    }
  }

  // Mostrar toast de notificacao
  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Ativar som (necessario interacao do usuario)
  const activateSound = () => {
    setSoundActivated(true)
    setSoundEnabled(true)
    // Tocar som de teste para confirmar ativacao
    try {
      const ctx = new AudioContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.value = 600
      oscillator.type = "sine"
      gainNode.gain.value = 0.2
      oscillator.start()
      setTimeout(() => oscillator.stop(), 150)
    } catch {
      // Ignorar erro
    }
    showToast("Som ativado!")
  }

  const loadOrdersWithNotification = async () => {
    try {
      const res = await fetch(`/api/orders?password=${encodeURIComponent(sessionPassword)}`, { cache: "no-store" })
      const data = await res.json()
      if (data.success && data.orders) {
        const newOrders = data.orders as Order[]
        
        // Verificar novos pedidos (IDs que nao existiam antes)
        const currentIds = new Set(newOrders.map(o => o.id))
        const newPedidos = newOrders.filter(o => !lastOrderIds.has(o.id))
        
        // Verificar pedidos com Pix confirmado que nao estavam pagos antes
        const currentPaidIds = new Set(
          newOrders
            .filter(o => o.paymentStatus === "confirmed" || o.confirmedAutomatically || o.paidAt)
            .map(o => o.id)
        )
        const newPaid = newOrders.filter(o => 
          (o.paymentStatus === "confirmed" || o.confirmedAutomatically || o.paidAt) && 
          !lastPaidIds.has(o.id)
        )
        
        // So notificar se ja temos dados anteriores (nao e primeira carga)
        if (lastOrderIds.size > 0) {
          // Novos pedidos criados
          if (newPedidos.length > 0) {
            playNotificationSound()
            showToast(`Novo pedido recebido! (${newPedidos[0].id})`)
          }
          // Pix confirmado
          else if (newPaid.length > 0 && lastPaidIds.size > 0) {
            playNotificationSound()
            showToast(`Pix confirmado! (${newPaid[0].id})`)
          }
        }
        
        setOrders(newOrders)
        setLastOrderIds(currentIds)
        setLastPaidIds(currentPaidIds)
      }
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error)
    }
  }

  // Solicitar permissao de notificacao
  useEffect(() => {
    if (isAuthenticated && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [isAuthenticated])

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
      const res = await fetch(`/api/orders?password=${encodeURIComponent(sessionPassword)}&includeHistory=true`)
      const data = await res.json()
      if (data.success && data.orders) {
        setOrders(data.orders)
      }
      if (data.financialHistory) {
        setFinancialHistory(data.financialHistory)
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
        // Salvar sessao por 1 hora
        const expiry = new Date().getTime() + (60 * 60 * 1000)
        localStorage.setItem("admin_session", JSON.stringify({ password, expiry }))
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
    localStorage.removeItem("admin_session")
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
        showToast("Erro ao salvar: " + (data.error || "Erro desconhecido"))
      }
    } catch (error) {
      console.error("Erro ao salvar:", error)
      showToast("Erro ao salvar configuracoes")
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
    setDeleteProductId(id)
  }

  const confirmDeleteProduct = () => {
    if (deleteProductId !== null) {
      setConfig(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== deleteProductId),
      }))
      showToast("Produto excluido")
      setDeleteProductId(null)
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
    const newFee: NeighborhoodFee = { name: "Novo Bairro", fee: 5, active: true }
    setConfig(prev => ({
      ...prev,
      delivery: {
        ...prev.delivery,
        neighborhoodFees: [...(prev.delivery?.neighborhoodFees || []), newFee],
      },
    }))
  }

  const updateNeighborhoodFee = (index: number, field: keyof NeighborhoodFee, value: string | number | boolean) => {
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
        // Atualizar localmente E recarregar do servidor para garantir sincronizacao
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
        // Recarregar do servidor apos 500ms para garantir consistencia
        setTimeout(() => loadOrders(), 500)
      }
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error)
    }
  }

  // Atribuir entregador ao pedido (SEM mudar status)
  const assignEntregador = async (orderId: string, entregador: Entregador) => {
  try {
  const res = await fetch("/api/orders", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
  password: sessionPassword,
  orderId,
  entregadorId: entregador.id,
  entregadorNome: entregador.nome,
  entregadorWhatsapp: entregador.whatsapp,
  }),
  })
  const data = await res.json()
  if (data.success) {
  setOrders(prev => prev.map(o => o.id === orderId ? {
  ...o,
  entregadorId: entregador.id,
  entregadorNome: entregador.nome,
  entregadorWhatsapp: entregador.whatsapp,
  } : o))
  showToast(`Entregador ${entregador.nome} selecionado`)
  }
  } catch (error) {
  console.error("Erro ao atribuir entregador:", error)
  }
  }
  
  // Remover entregador do pedido (salva no servidor)
  const removeEntregador = async (orderId: string) => {
  try {
  const res = await fetch("/api/orders", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
  password: sessionPassword,
  orderId,
  limparEntregador: true,
  }),
  })
  const data = await res.json()
  if (data.success) {
  setOrders(prev => prev.map(o => o.id === orderId ? {
  ...o,
  entregadorId: undefined,
  entregadorNome: undefined,
  entregadorWhatsapp: undefined,
  } : o))
  showToast("Entregador removido")
  }
  } catch (error) {
  console.error("Erro ao remover entregador:", error)
  }
  }
  
  // Excluir pedido individual
  const deleteSingleOrder = async (orderId: string) => {
    setDeleteLoading(true)
    try {
      const res = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sessionPassword, orderIds: [orderId] }),
      })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.filter(o => o.id !== orderId))
        showToast("Pedido excluido")
        setShowDeleteConfirm(null)
      } else {
        showToast(data.error || "Erro ao excluir")
      }
    } catch (error) {
      console.error("Erro ao excluir pedido:", error)
      showToast("Erro ao excluir pedido")
    } finally {
      setDeleteLoading(false)
    }
  }
  
  // Excluir multiplos pedidos
  const deleteMultipleOrders = async () => {
    if (selectedOrders.size === 0) return
    setDeleteLoading(true)
    try {
      const res = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sessionPassword, orderIds: Array.from(selectedOrders) }),
      })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.filter(o => !selectedOrders.has(o.id)))
        showToast(`${selectedOrders.size} pedido(s) excluido(s)`)
        setSelectedOrders(new Set())
        setShowDeleteMultiple(false)
      } else {
        showToast(data.error || "Erro ao excluir")
      }
    } catch (error) {
      console.error("Erro ao excluir pedidos:", error)
      showToast("Erro ao excluir pedidos")
    } finally {
      setDeleteLoading(false)
    }
  }
  
  // Toggle selecao de pedido
  const toggleOrderSelection = (orderId: string, tab: TabType) => {
    // Se ja tem pedidos selecionados em outra aba, mostrar aviso
    if (selectedOrdersTab && selectedOrdersTab !== tab && selectedOrders.size > 0) {
      setShowTabWarning(true)
      return
    }
    
    setSelectedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
        if (newSet.size === 0) {
          setSelectedOrdersTab(null)
        }
      } else {
        newSet.add(orderId)
        setSelectedOrdersTab(tab)
      }
      return newSet
    })
  }
  
  // Selecionar todos os pedidos de uma aba
  const selectAllOrders = (ordersList: Order[], tab: TabType) => {
    if (selectedOrdersTab && selectedOrdersTab !== tab && selectedOrders.size > 0) {
      setShowTabWarning(true)
      return
    }
    setSelectedOrders(new Set(ordersList.map(o => o.id)))
    setSelectedOrdersTab(tab)
  }
  
  // Desmarcar todos os pedidos
  const deselectAllOrders = () => {
    setSelectedOrders(new Set())
    setSelectedOrdersTab(null)
  }
  
  // Confirmar atribuicao de entregador
  const confirmAssignEntregador = async () => {
    if (!confirmEntregador) return
    await assignEntregador(confirmEntregador.orderId, confirmEntregador.entregador)
    setConfirmEntregador(null)
  }

  // Marcar pedido como saiu para entrega
  const marcarSaiuParaEntrega = async (orderId: string) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          password: sessionPassword, 
          orderId, 
          status: "delivering",
        }),
      })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { 
          ...o, 
          status: "delivering",
          saiuParaEntregaEm: new Date().toISOString(),
        } : o))
        showToast("Pedido saiu para entrega!")
        setTimeout(() => loadOrders(), 500)
      }
    } catch (error) {
      console.error("Erro ao marcar saiu para entrega:", error)
    }
  }

  // Gerar mensagem WhatsApp para entregador
  const generateEntregadorMessage = (order: Order): string => {
    const lines = [
      `*NOVO PEDIDO - ${order.id}*`,
      ``,
      `*Cliente:* ${order.customerName}`,
      `*Telefone:* ${order.customerPhone}`,
      ``,
    ]

    if (order.address) {
      lines.push(`*Endereco:*`)
      lines.push(order.address)
      if (order.neighborhood) lines.push(`Bairro: ${order.neighborhood}`)
      if (order.reference) lines.push(`Referencia: ${order.reference}`)
      // Link do Google Maps
      const enderecoCompleto = `${order.address}${order.neighborhood ? `, ${order.neighborhood}` : ""}`
      lines.push(``)
      lines.push(`*Google Maps:*`)
      lines.push(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}`)
      lines.push(``)
    }

    lines.push(`*Itens:*`)
    lines.push(order.items)
    lines.push(``)
    
    lines.push(`*Total:* R$ ${order.total.toFixed(2)}`)
    lines.push(`*Pagamento:* ${order.paymentMethod}`)
    
    if (order.observation) {
      lines.push(``)
      lines.push(`*Observacoes:* ${order.observation}`)
    }

    return lines.join("\n")
  }

  // Abrir WhatsApp do entregador com mensagem do pedido
  const sendOrderToEntregador = (order: Order, entregadorWhatsapp: string) => {
    const phone = normalizePhoneForWhatsApp(entregadorWhatsapp)
    const message = generateEntregadorMessage(order)
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank")
  }

  // Calcular tempo decorrido desde saida para entrega
  const calcularTempoEntrega = (saiuParaEntregaEm: string): { minutos: number; texto: string } => {
    const saiu = new Date(saiuParaEntregaEm).getTime()
    const agora = Date.now()
    const diffMs = agora - saiu
    const minutos = Math.floor(diffMs / 60000)
    
    if (minutos < 1) return { minutos: 0, texto: "Agora mesmo" }
    if (minutos === 1) return { minutos: 1, texto: "Ha 1 minuto" }
    if (minutos < 60) return { minutos, texto: `Ha ${minutos} minutos` }
    
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    if (horas === 1) return { minutos, texto: mins > 0 ? `Ha 1h ${mins}min` : "Ha 1 hora" }
    return { minutos, texto: mins > 0 ? `Ha ${horas}h ${mins}min` : `Ha ${horas} horas` }
  }

  // Registrar problema na entrega
  const registrarProblemaEntrega = async (orderId: string, observacao: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    const novoHistorico = [
      ...(order.historicoEntrega || []),
      { data: new Date().toISOString(), evento: "PROBLEMA", observacao }
    ]

    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          password: sessionPassword, 
          orderId,
          historicoEntrega: novoHistorico
        }),
      })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, historicoEntrega: novoHistorico } : o))
        showToast("Problema registrado")
        setProblemaEntregaOrderId(null)
        setProblemaEntregaObs("")
      }
    } catch (error) {
      console.error("Erro ao registrar problema:", error)
    }
  }

  // Voltar pedido para preparo (limpa entregador)
  const voltarParaPreparo = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    const novoHistorico = [
      ...(order.historicoEntrega || []),
      { data: new Date().toISOString(), evento: "RETORNOU_PREPARO", observacao: `Retornou do entregador: ${order.entregadorNome || "N/A"}` }
    ]

    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          password: sessionPassword, 
          orderId,
          status: "preparing",
          limparEntregador: true,
          historicoEntrega: novoHistorico
        }),
      })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { 
          ...o, 
          status: "preparing",
          entregadorId: undefined,
          entregadorNome: undefined,
          entregadorWhatsapp: undefined,
          saiuParaEntregaEm: undefined,
          historicoEntrega: novoHistorico
        } : o))
        showToast("Pedido voltou para preparo")
      }
    } catch (error) {
      console.error("Erro ao voltar para preparo:", error)
    }
  }

  // Filtro por data
  const filterByDate = (order: Order): boolean => {
    if (dateFilter === "all") return true
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Usar paidAt para pedidos confirmados, senao createdAt
    const isConfirmed = order.paymentStatus === "confirmed" || order.manuallyConfirmed || order.confirmedAutomatically || order.paidAt
    const dateStr = isConfirmed && order.paidAt ? order.paidAt : order.createdAt
    const orderDate = new Date(dateStr)
    
    switch (dateFilter) {
      case "today":
        return orderDate >= today
      case "yesterday":
        return orderDate >= yesterday && orderDate < today
      case "week":
        return orderDate >= weekStart
      case "month":
        return orderDate >= monthStart
      default:
        return true
    }
  }

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending": return "bg-yellow-500/20 text-yellow-400"
      case "confirmed": return "bg-blue-500/20 text-blue-400"
      case "preparing": return "bg-orange-500/20 text-orange-400"
      case "delivering": return "bg-purple-500/20 text-purple-400"
      case "completed": return "bg-green-500/20 text-green-400"
      case "cancelled": return "bg-red-500/20 text-red-400"
      default: return "bg-gray-500/20 text-gray-400"
    }
  }

  const getStatusLabel = (status: Order["status"]) => {
    switch (status) {
      case "pending": return "Pendente"
      case "confirmed": return "Confirmado"
      case "preparing": return "Preparando"
      case "delivering": return "Saiu p/ Entrega"
      case "completed": return "Finalizado"
      case "cancelled": return "Cancelado"
      default: return status
    }
  }

  const getPaymentStatusColor = (status: Order["paymentStatus"]) => {
    switch (status) {
      case "pending": return "bg-yellow-500/20 text-yellow-400"
      case "confirmed": return "bg-green-500/20 text-green-400"
      case "failed": return "bg-red-500/20 text-red-400"
      default: return "bg-gray-500/20 text-gray-400"
    }
  }

  const getPaymentStatusLabel = (status: Order["paymentStatus"]) => {
    switch (status) {
      case "pending": return "Aguardando"
      case "confirmed": return "Pago"
      case "failed": return "Falhou"
      default: return status
    }
  }

  // Funcao para normalizar texto (remover acentos e converter para minusculas)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
  }

  // Funcao para normalizar telefone para WhatsApp
  // REGRAS:
  // 1. Remove TUDO que nao for digito
  // 2. Se tiver 11 digitos (DDD + celular com 9), adiciona 55
  // 3. Se tiver 13 digitos e comecar com 55, mantem
  // 4. NAO altera ordem, NAO remove digitos, NAO troca DDD
  const normalizePhoneForWhatsApp = (phone: string): string => {
    // Passo 1: Remove tudo que nao for numero
    const digits = phone.replace(/\D/g, "")
    
    // Passo 2: Se tem exatamente 11 digitos, adiciona 55
    if (digits.length === 11) {
      return "55" + digits
    }
    
    // Passo 3: Se tem 13 digitos e comeca com 55, mantem
    if (digits.length === 13 && digits.startsWith("55")) {
      return digits
    }
    
    // Caso contrario, retorna apenas os digitos (para numeros ja formatados ou incorretos)
    return digits
  }

  // Calcular estatisticas de relatorios
  const activeOrders = orders.filter(o => {
    if (o.archived) return false
    
    // Aplicar filtro de data
    if (!filterByDate(o)) return false
    
    // Aplicar filtro de busca (so quando searchQuery tem valor - apos clicar em Buscar)
    if (searchQuery.trim()) {
      const query = normalizeText(searchQuery)
      
      // Buscar apenas nos campos especificos
      const normalizedId = normalizeText(o.id)
      const normalizedName = normalizeText(o.customerName)
      const normalizedPhone = o.customerPhone.replace(/\D/g, "")
      const normalizedAddress = o.address ? normalizeText(o.address) : ""
      const normalizedPayment = o.paymentMethod ? normalizeText(o.paymentMethod) : ""
      
      // Verificar correspondencia em cada campo
      const matchId = normalizedId.includes(query)
      const matchName = normalizedName.includes(query)
      const matchPhone = normalizedPhone.includes(query.replace(/\D/g, ""))
      const matchAddress = normalizedAddress.includes(query)
      const matchPayment = normalizedPayment.includes(query)
      
      return matchId || matchName || matchPhone || matchAddress || matchPayment
    }
    return true
  })
  
  // Funcao auxiliar para verificar se pedido esta confirmado
  const isOrderConfirmed = (o: Order) => 
    o.paymentStatus === "confirmed" || 
    o.manuallyConfirmed || 
    o.confirmedAutomatically || 
    o.paidAt ||
    o.status === "completed"

  // Calcular faturamento do historico (pedidos excluidos)
  const historicalRevenue = financialHistory.reduce((sum, h) => sum + h.total, 0)
  const historicalPixAuto = financialHistory.filter(h => h.paymentMethod === "PIX Asaas").reduce((s, h) => s + h.total, 0)
  const historicalPixManual = financialHistory.filter(h => h.paymentMethod === "PIX Manual" || h.paymentMethod === "PIX").reduce((s, h) => s + h.total, 0)
  const historicalDinheiro = financialHistory.filter(h => h.paymentMethod === "Dinheiro").reduce((s, h) => s + h.total, 0)
  const historicalCartao = financialHistory.filter(h => h.paymentMethod === "Cartao" || h.paymentMethod === "Cartão").reduce((s, h) => s + h.total, 0)
  
  const reportStats = {
    totalOrders: activeOrders.length + financialHistory.length,
    totalRevenue: activeOrders.reduce((sum, o) => sum + o.total, 0) + historicalRevenue,
    
    // Pedidos confirmados (para totais gerais)
    confirmedOrders: activeOrders.filter(isOrderConfirmed),
    
    // Por forma de pagamento - SOMENTE CONFIRMADOS (inclui historico)
    pixAutomatic: activeOrders.filter(o => (o.isPixAutomatic || o.paymentMethod === "PIX Asaas") && isOrderConfirmed(o)),
    pixManual: activeOrders.filter(o => (o.paymentMethod === "PIX Manual" || (o.paymentMethod === "PIX" && !o.isPixAutomatic)) && isOrderConfirmed(o)),
    dinheiro: activeOrders.filter(o => o.paymentMethod === "Dinheiro" && isOrderConfirmed(o)),
    cartao: activeOrders.filter(o => (o.paymentMethod === "Cartao" || o.paymentMethod === "Cartão") && isOrderConfirmed(o)),
    
    // Valores historicos (pedidos excluidos)
    historicalPixAuto,
    historicalPixManual,
    historicalDinheiro,
    historicalCartao,
    historicalRevenue,
    historicalCount: financialHistory.length,
    
    // Faturamento confirmado (inclui historico)
    confirmedRevenue: activeOrders
      .filter(isOrderConfirmed)
      .reduce((sum, o) => sum + o.total, 0) + historicalRevenue,
    
    // Faturamento pendente
    pendingRevenue: activeOrders
      .filter(o => !isOrderConfirmed(o) && o.status !== "cancelled")
      .reduce((sum, o) => sum + o.total, 0),
  }

  // Produtos mais vendidos (baseado nos itens dos pedidos confirmados)
  const getTopProducts = () => {
    const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {}
    
    activeOrders
      .filter(o => isOrderConfirmed(o))
      .forEach(order => {
        if (order.itemsDetailed && Array.isArray(order.itemsDetailed)) {
          order.itemsDetailed.forEach((item: { name?: string; productName?: string; quantity?: number; price?: number; subtotal?: number }) => {
            // Tentar obter nome do produto de diferentes campos
            const productName = item.name || item.productName || "Produto sem nome"
            const qty = item.quantity || 1
            const itemPrice = item.price || 0
            const itemRevenue = item.subtotal || (itemPrice * qty) || 0
            
            // Ignorar itens sem nome valido
            if (!productName || productName === "Produto sem nome" || typeof productName === "number") return
            
            const key = productName
            if (!productSales[key]) {
              productSales[key] = { name: productName, quantity: 0, revenue: 0 }
            }
            productSales[key].quantity += qty
            productSales[key].revenue += itemRevenue
          })
        }
      })
    
    return Object.values(productSales)
      .filter(p => p.name && typeof p.name === "string" && p.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
  }

  // Clientes que mais compraram
  const getTopCustomers = () => {
    const customerStats: Record<string, { name: string, phone: string, orders: number, revenue: number, lastOrder: string }> = {}
    
    activeOrders
      .filter(o => o.paymentStatus === "confirmed" || o.manuallyConfirmed)
      .forEach(order => {
        const key = order.customerPhone || order.customerName
        if (!customerStats[key]) {
          customerStats[key] = {
            name: order.customerName,
            phone: order.customerPhone,
            orders: 0,
            revenue: 0,
            lastOrder: order.createdAt
          }
        }
        customerStats[key].orders += 1
        customerStats[key].revenue += order.total
        if (order.createdAt > customerStats[key].lastOrder) {
          customerStats[key].lastOrder = order.createdAt
        }
      })
    
    return Object.values(customerStats)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10)
  }

  // ====== FILTROS DE PEDIDOS POR ABA ======
  
  // 1. PENDENTES DE CONFIRMACAO - pagamento nao confirmado
  const ordersPendingPayment = activeOrders.filter(o => 
    o.paymentStatus !== "confirmed" && 
    !o.manuallyConfirmed &&
    !o.confirmedAutomatically &&
    !o.paidAt &&
    !["preparing", "delivering", "completed", "cancelled"].includes(o.status)
  )

  // 2. PENDENTES DE PREPARACAO - pagamento confirmado, aguardando preparo
  const ordersPaidWaiting = activeOrders.filter(o => 
    (o.paymentStatus === "confirmed" || o.manuallyConfirmed || o.confirmedAutomatically || o.paidAt) &&
    o.status === "confirmed"
  )

  // 3. EM PREPARACAO
  const ordersPreparing = activeOrders.filter(o => o.status === "preparing")

  // 4. SAIU PARA ENTREGA
  const ordersDelivering = activeOrders.filter(o => o.status === "delivering")

  // 5. FINALIZADOS
  const ordersCompleted = activeOrders.filter(o => o.status === "completed")

  // 6. CANCELADOS
  const ordersCancelled = activeOrders.filter(o => o.status === "cancelled")
  
  // Tempo configurado para abandono (padrao 15 minutos)
  const abandonedMinutes = config.storeHours?.abandonedOrderMinutes || 15
  
  // Pedidos abandonados: pendentes ha mais de X minutos, nao cancelados, nao finalizados
  const ordersAbandoned = activeOrders.filter(o => {
    if (o.status === "cancelled" || o.status === "completed") return false
    if (isOrderConfirmed(o)) return false
    // Verificar se esta parado ha mais de X minutos
    const createdAt = new Date(o.createdAt).getTime()
    const now = Date.now()
    const minutesPassed = (now - createdAt) / (1000 * 60)
    return minutesPassed >= abandonedMinutes
  })
  
  // PEDIDOS ARQUIVADOS (com filtro de busca opcional)
  const ordersArchived = orders.filter(o => {
    if (!o.archived) return false
    
    // Aplicar filtro de busca se houver
    if (archivedSearchQuery.trim()) {
      const query = normalizeText(archivedSearchQuery)
      const normalizedId = normalizeText(o.id)
      const normalizedName = normalizeText(o.customerName)
      const normalizedPhone = o.customerPhone.replace(/\D/g, "")
      
      const matchId = normalizedId.includes(query)
      const matchName = normalizedName.includes(query)
      const matchPhone = normalizedPhone.includes(query.replace(/\D/g, ""))
      
      return matchId || matchName || matchPhone
    }
    
    return true
  })
  
  // Funcao para restaurar pedido arquivado
  const restaurarPedido = async (orderId: string) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          password: sessionPassword, 
          orderId, 
          archived: false
        }),
      })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, archived: false } : o))
        showToast("Pedido restaurado!")
      }
    } catch (error) {
      console.error("Erro ao restaurar pedido:", error)
    }
  }
  
  // Arquivamento automatico
  const autoArchiveOldOrders = async () => {
    const autoArchiveDays = config.storeHours?.autoArchiveDays || 0
    if (autoArchiveDays === 0) return // Nunca arquivar automaticamente
    
    const now = Date.now()
    const daysInMs = autoArchiveDays * 24 * 60 * 60 * 1000
    
    const ordersToArchive = orders.filter(o => {
      if (o.archived) return false
      if (o.status !== "completed" && o.status !== "cancelled") return false
      const createdAt = new Date(o.createdAt).getTime()
      return (now - createdAt) > daysInMs
    })
    
    if (ordersToArchive.length > 0) {
      for (const order of ordersToArchive) {
        await fetch("/api/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: sessionPassword, orderId: order.id, archived: true }),
        })
      }
      loadOrders()
    }
  }
  
  // Executar arquivamento automatico quando pedidos carregam
  useEffect(() => {
    if (isAuthenticated && orders.length > 0 && config.storeHours?.autoArchiveDays) {
      autoArchiveOldOrders()
    }
  }, [config.storeHours?.autoArchiveDays, orders.length])
  
  // Funcao para calcular tempo parado
  const getTimeSinceCreation = (createdAt: string) => {
    const created = new Date(createdAt).getTime()
    const now = Date.now()
    const minutes = Math.floor((now - created) / (1000 * 60))
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (hours < 24) return `${hours}h ${remainingMinutes}min`
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  
  // Funcao para cobrar no WhatsApp
  const chargeOnWhatsApp = (order: Order) => {
    const phone = normalizePhoneForWhatsApp(order.customerPhone)
    const message = encodeURIComponent(`Ola! Vimos que seu pedido na P.K Gostosuras ficou pendente. Deseja finalizar agora?`)
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank")
  }
  
  // Funcao para executar busca e navegar para aba correta
  const executeSearch = () => {
    setSearchQuery(searchInput)
    
    // Se houver busca, encontrar em qual aba o primeiro resultado esta
    if (searchInput.trim()) {
      const query = normalizeText(searchInput)
      
      // Buscar em todas as ordens (sem filtro de busca anterior)
      const matchingOrder = orders.find(o => {
        if (o.archived) return false
        
        const normalizedId = normalizeText(o.id)
        const normalizedName = normalizeText(o.customerName)
        const normalizedPhone = o.customerPhone.replace(/\D/g, "")
        const normalizedAddress = o.address ? normalizeText(o.address) : ""
        const normalizedPayment = o.paymentMethod ? normalizeText(o.paymentMethod) : ""
        
        const matchId = normalizedId.includes(query)
        const matchName = normalizedName.includes(query)
        const matchPhone = normalizedPhone.includes(query.replace(/\D/g, ""))
        const matchAddress = normalizedAddress.includes(query)
        const matchPayment = normalizedPayment.includes(query)
        
        return matchId || matchName || matchPhone || matchAddress || matchPayment
      })
      
      if (matchingOrder) {
        // Determinar em qual aba esse pedido esta
        const isPendingPayment = matchingOrder.paymentStatus !== "confirmed" && 
          !matchingOrder.manuallyConfirmed &&
          !matchingOrder.confirmedAutomatically &&
          !matchingOrder.paidAt &&
          !["preparing", "delivering", "completed", "cancelled"].includes(matchingOrder.status)
        
        const isPaidWaiting = (matchingOrder.paymentStatus === "confirmed" || matchingOrder.manuallyConfirmed || matchingOrder.confirmedAutomatically || matchingOrder.paidAt) &&
          matchingOrder.status === "confirmed"
        
        const isPreparing = matchingOrder.status === "preparing"
        const isDelivering = matchingOrder.status === "delivering"
        const isCompleted = matchingOrder.status === "completed"
        const isCancelled = matchingOrder.status === "cancelled"
        
        if (isPendingPayment) setActiveTab("orders-pending")
        else if (isPaidWaiting) setActiveTab("orders-paid")
        else if (isPreparing) setActiveTab("orders-preparing")
        else if (isDelivering) setActiveTab("orders-delivering")
        else if (isCompleted) setActiveTab("orders-completed")
        else if (isCancelled) setActiveTab("orders-cancelled")
      }
    }
  }

  // Atualizar status de pagamento manual
  const updatePaymentStatus = async (orderId: string, paymentStatus: Order["paymentStatus"], manuallyConfirmed: boolean) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sessionPassword, orderId, paymentStatus, manuallyConfirmed }),
      })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o =>
          o.id === orderId ? { ...o, paymentStatus, manuallyConfirmed, status: manuallyConfirmed ? "confirmed" : o.status, confirmedAt: manuallyConfirmed ? new Date().toISOString() : o.confirmedAt } : o
        ))
        // Recarregar do servidor apos 500ms para garantir consistencia
        setTimeout(() => loadOrders(), 500)
      }
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error)
    }
  }

  // Arquivar todos os pedidos (limpar relatorios)
  const archiveAllOrders = async () => {
    try {
      const res = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sessionPassword, action: "archive_all" }),
      })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => ({ ...o, archived: true })))
        setShowArchiveConfirm(false)
      }
    } catch (error) {
      console.error("Erro ao arquivar pedidos:", error)
    }
  }

  // Limpar pedidos duplicados/bugados
  const cleanupDuplicates = async () => {
    try {
      const res = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sessionPassword, action: "cleanup_duplicates" }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`Limpeza concluida: ${data.removedCount} duplicata(s) removida(s)`)
        loadOrders() // Recarregar lista
      }
    } catch (error) {
      console.error("Erro ao limpar duplicatas:", error)
      showToast("Erro ao limpar duplicatas")
    }
  }

  // Copiar dados do pedido com fallback robusto
  const copyOrderData = async (order: Order) => {
    const text = `Pedido: ${order.id}
Cliente: ${order.customerName}
Telefone: ${order.customerPhone}
Endereco: ${order.address || "N/A"}
Bairro: ${order.neighborhood || "N/A"}
Referencia: ${order.reference || "N/A"}
Itens: ${order.items}
Total: R$ ${order.total.toFixed(2)}
Pagamento: ${order.paymentMethod}
Status: ${getPaymentStatusLabel(order.paymentStatus)}`
    
    let copied = false
    
    // Tentar navigator.clipboard primeiro
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        copied = true
      } catch {
        copied = false
      }
    }
    
    // Fallback com textarea
    if (!copied) {
      try {
        const textarea = document.createElement("textarea")
        textarea.value = text
        textarea.style.position = "fixed"
        textarea.style.left = "-9999px"
        textarea.style.top = "-9999px"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const result = document.execCommand("copy")
        document.body.removeChild(textarea)
        copied = result
      } catch {
        copied = false
      }
    }
    
    if (copied) {
      setCopiedOrderId(order.id)
      setTimeout(() => setCopiedOrderId(null), 2000)
    } else {
      // Mostrar modal para copia manual
      setManualCopyText(text)
    }
  }

  // Abrir WhatsApp do cliente
  const openCustomerWhatsApp = (phone: string, message?: string) => {
    const cleanPhone = normalizePhoneForWhatsApp(phone)
    const defaultMessage = message || "Ola, seu pedido esta em preparacao!"
    const encodedMessage = encodeURIComponent(defaultMessage)
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, "_blank")
  }

  // Funcao robusta de copia que funciona em mobile e desktop
  const copyToClipboardRobust = async (text: string, onSuccess: () => void, onFallback: (text: string) => void) => {
    // Tentar clipboard API primeiro
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        onSuccess()
        return
      } catch {
        // Fallback abaixo
      }
    }
    
    // Fallback com textarea temporario
    try {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.left = "-9999px"
      textarea.style.top = "0"
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const success = document.execCommand("copy")
      document.body.removeChild(textarea)
      if (success) {
        onSuccess()
        return
      }
    } catch {
      // Fallback manual
    }
    
    // Se nada funcionou, mostrar caixa para copia manual
    onFallback(text)
  }

  // URL base publica oficial - SEMPRE usar esta funcao para links publicos
  const getPublicBaseUrl = () => "https://www.pkgostosuras.shop"

  // Gerar link de acompanhamento do pedido (usando dominio publico oficial)
  const getOrderTrackingLink = (orderId: string) => {
    return `${getPublicBaseUrl()}/pedido/${orderId}`
  }

  // Gerar link do painel do entregador (usando dominio publico oficial)
  const getEntregadorPanelLink = (token: string) => {
    return `${getPublicBaseUrl()}/entregador/${token}`
  }

  // Copiar link de acompanhamento
  const copyTrackingLink = async (orderId: string) => {
    const link = getOrderTrackingLink(orderId)
    try {
      await navigator.clipboard.writeText(link)
      setCopiedLinkId(orderId)
      showToast("Link copiado!")
      setTimeout(() => setCopiedLinkId(null), 2000)
    } catch {
      // Fallback para navegadores que nao suportam clipboard API
      setManualCopyText(link)
    }
  }

  // Enviar link de acompanhamento ao cliente via WhatsApp
  const sendTrackingLinkToCustomer = (order: Order) => {
    const link = getOrderTrackingLink(order.id)
    const phone = normalizePhoneForWhatsApp(order.customerPhone)
    const message = `Ola!\n\nAcompanhe seu pedido em tempo real:\n\n${link}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank")
  }

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
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
            {/* Botao de som */}
            <button
              onClick={() => {
                if (!soundActivated) {
                  activateSound()
                } else {
                  setSoundEnabled(!soundEnabled)
                }
              }}
              className={`p-2 rounded-xl transition-all ${
                soundEnabled && soundActivated
                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  : !soundActivated
                    ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 animate-pulse"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
              title={!soundActivated ? "Clique para ativar som" : soundEnabled ? "Som ativado" : "Som desativado"}
            >
              {soundEnabled && soundActivated ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </button>
            
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
                { id: "entregadores" as TabType, icon: Users2, label: "Entregadores" },
                { id: "reports" as TabType, icon: BarChart3, label: "Relatorios" },
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
                </button>
              ))}

              {/* Secao de Pedidos */}
              <div className="pt-4 mt-4 border-t border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide px-4 mb-2">Pedidos</p>

                {/* Campo de Busca de Pedidos */}
                <div className="px-4 mb-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Pesquisar pedido..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        executeSearch()
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={executeSearch}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
                    >
                      <Search className="w-3 h-3" />
                      Buscar
                    </button>
                    <button
                      onClick={() => {
                        setSearchInput("")
                        setSearchQuery("")
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all"
                    >
                      Limpar
                    </button>
                  </div>
                  {searchQuery && (
                    <p className="text-xs text-center text-muted-foreground">
                      {activeOrders.length > 0 
                        ? `${activeOrders.length} pedido(s) encontrado(s)`
                        : "Nenhum pedido encontrado"
                      }
                    </p>
                  )}

                  {/* Filtro por Data */}
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Filtrar por periodo:</p>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
                      className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="all">Todos</option>
                      <option value="today">Hoje</option>
                      <option value="yesterday">Ontem</option>
                      <option value="week">Esta semana</option>
                      <option value="month">Este mes</option>
                    </select>
                  </div>
                </div>

                {[
                  { id: "orders-pending" as TabType, icon: ClockIcon, label: "Aguardando Pagamento", badge: ordersPendingPayment.length, color: "text-yellow-400" },
                  { id: "orders-paid" as TabType, icon: CheckCircle2, label: "Aguardando Preparo", badge: ordersPaidWaiting.length, color: "text-green-400" },
                  { id: "orders-preparing" as TabType, icon: ChefHat, label: "Em Preparacao", badge: ordersPreparing.length, color: "text-blue-400" },
                  { id: "orders-delivering" as TabType, icon: Truck, label: "Saiu p/ Entrega", badge: ordersDelivering.length, color: "text-purple-400" },
  { id: "orders-completed" as TabType, icon: PackageCheck, label: "Finalizados", badge: ordersCompleted.length, color: "text-emerald-400" },
  { id: "orders-cancelled" as TabType, icon: Ban, label: "Cancelados", badge: ordersCancelled.length, color: "text-red-400" },
  { id: "orders-abandoned" as TabType, icon: AlertCircle, label: "Abandonados", badge: ordersAbandoned.length, color: "text-orange-400" },
  { id: "orders-archived" as TabType, icon: FolderArchive, label: "Arquivados", badge: ordersArchived.length, color: "text-slate-400" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all mb-1 ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-card hover:bg-secondary text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "" : tab.color}`} />
                      <span className="text-sm">{tab.label}</span>
                    </div>
                    {tab.badge > 0 && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        activeTab === tab.id 
                          ? "bg-primary-foreground/20 text-primary-foreground" 
                          : "bg-primary/20 text-primary"
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

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

                    <div className="pt-4 border-t border-border">
                      <label className="text-sm text-muted-foreground">Tempo para considerar pedido abandonado</label>
                      <select
                        value={config.storeHours?.abandonedOrderMinutes || 15}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          storeHours: { ...prev.storeHours, abandonedOrderMinutes: Number(e.target.value) }
                        }))}
                        className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value={5}>5 minutos</option>
                        <option value={10}>10 minutos</option>
                        <option value={15}>15 minutos</option>
                        <option value={30}>30 minutos</option>
                        <option value={60}>1 hora</option>
                        <option value={120}>2 horas</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">Pedidos pendentes apos esse tempo aparecerao como abandonados</p>
                    </div>
  
                    {/* Arquivamento automatico */}
                    <div>
                      <label className="text-sm font-medium text-foreground">Arquivar automaticamente pedidos antigos</label>
                      <select
                        value={config.storeHours?.autoArchiveDays || 0}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          storeHours: { ...prev.storeHours, autoArchiveDays: Number(e.target.value) }
                        }))}
                        className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value={0}>Nunca (manual)</option>
                        <option value={7}>Apos 7 dias</option>
                        <option value={15}>Apos 15 dias</option>
                        <option value={30}>Apos 30 dias</option>
                        <option value={60}>Apos 60 dias</option>
                        <option value={90}>Apos 90 dias</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">Pedidos finalizados/cancelados serao arquivados automaticamente apos esse periodo</p>
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
                        type="checkbox"
                        checked={fee.active !== false}
                        onChange={(e) => updateNeighborhoodFee(index, "active", e.target.checked)}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                        title="Ativo"
                      />
                      <input
                        type="text"
                        value={fee.name}
                        onChange={(e) => updateNeighborhoodFee(index, "name", e.target.value)}
                        placeholder="Nome do bairro"
                        className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-sm">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={fee.fee}
                          onChange={(e) => updateNeighborhoodFee(index, "fee", Number(e.target.value))}
                          className="w-20 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                          placeholder="Taxa"
                        />
                      </div>
                      <button
                        onClick={() => removeNeighborhoodFee(index)}
                        className="p-2 text-destructive hover:bg-destructive/20 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(config.delivery?.neighborhoodFees || []).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">Nenhum bairro cadastrado</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">Marque a caixa para ativar o bairro no checkout</p>
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

              {/* Entregadores */}
              {activeTab === "entregadores" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Entregadores ({(config.entregadores || []).length})</h2>
                    <button
                      onClick={() => {
                        const newToken = Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
                        const newEntregador: Entregador = {
                          id: `entregador-${Date.now()}`,
                          nome: "",
                          whatsapp: "",
                          status: "ativo",
                          disponibilidade: "disponivel",
                          horarioInicio: "08:00",
                          horarioFim: "22:00",
                          observacao: "",
                          pin: "",
                          token: newToken,
                        }
                        setConfig(prev => ({
                          ...prev,
                          entregadores: [...(prev.entregadores || []), newEntregador],
                        }))
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl transition-all hover:brightness-110"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(config.entregadores || []).map((entregador) => (
                      <div
                        key={entregador.id}
                        className={`p-4 rounded-xl border ${
                          entregador.status === "ativo" 
                            ? entregador.disponibilidade === "disponivel"
                              ? "border-green-500/30 bg-green-500/5"
                              : "border-yellow-500/30 bg-yellow-500/5"
                            : "border-border/50 bg-secondary/10 opacity-60"
                        }`}
                      >
                        <div className="grid gap-4">
                          {/* Linha 1: Nome e WhatsApp */}
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-muted-foreground">Nome do Entregador *</label>
                              <input
                                type="text"
                                value={entregador.nome}
                                onChange={(e) => {
                                  setConfig(prev => ({
                                    ...prev,
                                    entregadores: (prev.entregadores || []).map(ent =>
                                      ent.id === entregador.id ? { ...ent, nome: e.target.value } : ent
                                    ),
                                  }))
                                }}
                                placeholder="Ex: Joao Silva"
                                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">WhatsApp/Telefone *</label>
                              <input
                                type="text"
                                value={entregador.whatsapp}
                                onChange={(e) => {
                                  setConfig(prev => ({
                                    ...prev,
                                    entregadores: (prev.entregadores || []).map(ent =>
                                      ent.id === entregador.id ? { ...ent, whatsapp: e.target.value } : ent
                                    ),
                                  }))
                                }}
                                placeholder="Ex: 11999999999"
                                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          </div>

                          {/* Linha 2: Horarios */}
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-muted-foreground">Horario Inicial</label>
                              <input
                                type="time"
                                value={entregador.horarioInicio}
                                onChange={(e) => {
                                  setConfig(prev => ({
                                    ...prev,
                                    entregadores: (prev.entregadores || []).map(ent =>
                                      ent.id === entregador.id ? { ...ent, horarioInicio: e.target.value } : ent
                                    ),
                                  }))
                                }}
                                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Horario Final</label>
                              <input
                                type="time"
                                value={entregador.horarioFim}
                                onChange={(e) => {
                                  setConfig(prev => ({
                                    ...prev,
                                    entregadores: (prev.entregadores || []).map(ent =>
                                      ent.id === entregador.id ? { ...ent, horarioFim: e.target.value } : ent
                                    ),
                                  }))
                                }}
                                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          </div>

                          {/* Linha 3: Observacao */}
                          <div>
                            <label className="text-xs text-muted-foreground">Observacao Interna</label>
                            <input
                              type="text"
                              value={entregador.observacao}
                              onChange={(e) => {
                                setConfig(prev => ({
                                  ...prev,
                                  entregadores: (prev.entregadores || []).map(ent =>
                                    ent.id === entregador.id ? { ...ent, observacao: e.target.value } : ent
                                  ),
                                }))
                              }}
                              placeholder="Ex: Possui moto propria"
                              className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>

                          {/* Linha 4: PIN de Acesso */}
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-muted-foreground">PIN de Acesso (4 digitos)</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                value={entregador.pin || ""}
                                onChange={(e) => {
                                  const pin = e.target.value.replace(/\D/g, "").slice(0, 4)
                                  setConfig(prev => ({
                                    ...prev,
                                    entregadores: (prev.entregadores || []).map(ent =>
                                      ent.id === entregador.id ? { ...ent, pin } : ent
                                    ),
                                  }))
                                }}
                                placeholder="Ex: 1234"
                                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Token (automatico)</label>
                              <div className="flex gap-2 mt-1">
                                <input
                                  type="text"
                                  value={entregador.token || ""}
                                  readOnly
                                  className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-muted-foreground text-sm"
                                />
                                <button
                                  onClick={() => {
                                    const newToken = Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
                                    setConfig(prev => ({
                                      ...prev,
                                      entregadores: (prev.entregadores || []).map(ent =>
                                        ent.id === entregador.id ? { ...ent, token: newToken } : ent
                                      ),
                                    }))
                                  }}
                                  className="px-3 py-2 bg-secondary text-muted-foreground rounded-lg hover:bg-secondary/80 text-xs"
                                >
                                  Gerar
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Linha 5: Link do Painel */}
                          {entregador.token && entregador.pin && (
                            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                              <label className="text-xs text-blue-400 font-medium">Link do Painel do Entregador</label>
                              <p className="text-xs text-muted-foreground mt-1 break-all select-all">{getEntregadorPanelLink(entregador.token)}</p>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => {
                                    const link = getEntregadorPanelLink(entregador.token!)
                                    copyToClipboardRobust(
                                      link,
                                      () => showToast("Link copiado!"),
                                      (text) => setManualEntregadorLink(text)
                                    )
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-sm font-medium"
                                >
                                  <Link2 className="w-4 h-4" />
                                  Copiar Link
                                </button>
                                <button
                                  onClick={() => {
                                    const link = getEntregadorPanelLink(entregador.token!)
                                    const phone = normalizePhoneForWhatsApp(entregador.whatsapp)
                                    const message = `Ola ${entregador.nome}!\n\nAcesse seu painel de entregas:\n${link}\n\nSeu PIN: ${entregador.pin}`
                                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank")
                                  }}
                                  className="flex items-center justify-center gap-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 text-sm font-medium"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  Enviar
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Aviso se falta PIN ou Token */}
                          {entregador.token && !entregador.pin && (
                            <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                              <p className="text-xs text-yellow-400">Defina um PIN de 4 digitos para habilitar o painel do entregador</p>
                            </div>
                          )}

                          {/* Linha 4: Status, Disponibilidade e Acoes */}
                          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                            <button
                              onClick={() => {
                                setConfig(prev => ({
                                  ...prev,
                                  entregadores: (prev.entregadores || []).map(ent =>
                                    ent.id === entregador.id 
                                      ? { ...ent, status: ent.status === "ativo" ? "inativo" : "ativo" } 
                                      : ent
                                  ),
                                }))
                              }}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                entregador.status === "ativo"
                                  ? "bg-green-600/20 text-green-500"
                                  : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              {entregador.status === "ativo" ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              {entregador.status === "ativo" ? "Ativo" : "Inativo"}
                            </button>
                            
                            <button
                              onClick={() => {
                                setConfig(prev => ({
                                  ...prev,
                                  entregadores: (prev.entregadores || []).map(ent =>
                                    ent.id === entregador.id 
                                      ? { ...ent, disponibilidade: ent.disponibilidade === "disponivel" ? "indisponivel" : "disponivel" } 
                                      : ent
                                  ),
                                }))
                              }}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                entregador.disponibilidade === "disponivel"
                                  ? "bg-blue-600/20 text-blue-400"
                                  : "bg-orange-500/20 text-orange-400"
                              }`}
                            >
                              {entregador.disponibilidade === "disponivel" ? <CheckCircle2 className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />}
                              {entregador.disponibilidade === "disponivel" ? "Disponivel" : "Indisponivel"}
                            </button>

                            <button
                              onClick={() => {
                                const phone = normalizePhoneForWhatsApp(entregador.whatsapp)
                                if (phone) {
                                  window.open(`https://wa.me/${phone}`, "_blank")
                                }
                              }}
                              disabled={!entregador.whatsapp}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Phone className="w-4 h-4" />
                              WhatsApp
                            </button>

                            <button
                              onClick={() => {
                                setConfig(prev => ({
                                  ...prev,
                                  entregadores: (prev.entregadores || []).filter(ent => ent.id !== entregador.id),
                                }))
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition-colors text-sm font-medium ml-auto"
                            >
                              <Trash2 className="w-4 h-4" />
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(config.entregadores || []).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum entregador cadastrado</p>
                        <p className="text-sm">Clique em Adicionar para cadastrar um entregador</p>
                      </div>
                    )}
                  </div>

                  {/* Resumo */}
                  {(config.entregadores || []).length > 0 && (
                    <div className="mt-6 p-4 bg-secondary/30 rounded-xl">
                      <h3 className="text-sm font-medium text-foreground mb-2">Resumo</h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-foreground">
                            {(config.entregadores || []).filter(e => e.status === "ativo").length}
                          </p>
                          <p className="text-xs text-muted-foreground">Ativos</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-400">
                            {(config.entregadores || []).filter(e => e.status === "ativo" && e.disponibilidade === "disponivel").length}
                          </p>
                          <p className="text-xs text-muted-foreground">Disponiveis</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-orange-400">
                            {(config.entregadores || []).filter(e => e.status === "ativo" && e.disponibilidade === "indisponivel").length}
                          </p>
                          <p className="text-xs text-muted-foreground">Indisponiveis</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 1. Pedidos Pendentes de Confirmacao */}
              {activeTab === "orders-pending" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Aguardando Pagamento ({ordersPendingPayment.length})</h2>
                    <button
                      onClick={loadOrders}
                      className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground font-medium rounded-xl transition-all hover:bg-secondary/80"
                    >
                      <Loader2 className="w-4 h-4" />
                      Atualizar
                    </button>
                  </div>

                  <div className="space-y-3">
                    {ordersPendingPayment.map((order) => (
                      <div key={order.id} className="p-4 rounded-xl border border-border bg-secondary/30">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-foreground">{order.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleString("pt-BR")}
                            </p>
                          </div>
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400">
                            Aguardando Pagamento
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
                            <p className="text-lg font-bold text-foreground">R$ {order.total.toFixed(2)}</p>
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

                        {/* Botoes: Confirmar manualmente, Cancelar */}
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                          <button
                            onClick={() => updatePaymentStatus(order.id, "confirmed", true)}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Confirmar Pagamento
                          </button>
                          <button onClick={() => copyTrackingLink(order.id)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${copiedLinkId === order.id ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"}`}>
                            {copiedLinkId === order.id ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />} {copiedLinkId === order.id ? "Copiado!" : "Link"}
                          </button>
                          <button onClick={() => sendTrackingLinkToCustomer(order)} className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" /> Enviar Link
                          </button>
                          <button
                            onClick={() => updateOrderStatus(order.id, "cancelled")}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all flex items-center gap-2"
                          >
                            <Ban className="w-4 h-4" />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ))}

                    {ordersPendingPayment.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <ClockIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum pedido aguardando pagamento</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Aba de Relatorios */}
              {activeTab === "reports" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Relatorios</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={cleanupDuplicates}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 font-medium rounded-xl transition-all hover:bg-yellow-500/30 text-sm"
                        title="Remove pedidos duplicados e corrige inconsistencias"
                      >
                        Limpar Duplicatas
                      </button>
                      <button
                        onClick={() => setShowArchiveConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 font-medium rounded-xl transition-all hover:bg-red-500/30"
                      >
                        <Archive className="w-4 h-4" />
                        Limpar Relatorios
                      </button>
                    </div>
                  </div>

                  {/* Cards de resumo */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-card p-4 rounded-xl border border-border">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <ShoppingBag className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-muted-foreground text-sm">Total Pedidos</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{reportStats.totalOrders}</p>
                    </div>

                    <div className="bg-card p-4 rounded-xl border border-border">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-muted-foreground text-sm">Pedidos Confirmados</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-400">{reportStats.confirmedOrders.length}</p>
                    </div>

                    <div className="bg-card p-4 rounded-xl border border-border">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <DollarSign className="w-5 h-5 text-green-400" />
                        </div>
                        <span className="text-muted-foreground text-sm">Faturamento Confirmado</span>
                      </div>
                      <p className="text-2xl font-bold text-green-400">{formatCurrency(reportStats.confirmedRevenue)}</p>
                    </div>

                    <div className="bg-card p-4 rounded-xl border border-border">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                          <ClockIcon className="w-5 h-5 text-yellow-400" />
                        </div>
                        <span className="text-muted-foreground text-sm">Pendente</span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-400">{formatCurrency(reportStats.pendingRevenue)}</p>
                    </div>
                  </div>

                  {/* Por forma de pagamento - SOMENTE CONFIRMADOS */}
                  <div className="bg-card p-6 rounded-xl border border-border">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-primary" />
                      Faturamento por Forma de Pagamento
                      <span className="text-xs text-muted-foreground font-normal">(inclui historico)</span>
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-foreground">PIX Automatico</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">{formatCurrency(reportStats.pixAutomatic.reduce((s, o) => s + o.total, 0) + reportStats.historicalPixAuto)}</p>
                          <p className="text-xs text-muted-foreground">{reportStats.pixAutomatic.length} atuais{reportStats.historicalPixAuto > 0 ? ` + historico` : ``}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-foreground">PIX Manual</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">{formatCurrency(reportStats.pixManual.reduce((s, o) => s + o.total, 0) + reportStats.historicalPixManual)}</p>
                          <p className="text-xs text-muted-foreground">{reportStats.pixManual.length} atuais{reportStats.historicalPixManual > 0 ? ` + historico` : ``}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-foreground">Dinheiro</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">{formatCurrency(reportStats.dinheiro.reduce((s, o) => s + o.total, 0) + reportStats.historicalDinheiro)}</p>
                          <p className="text-xs text-muted-foreground">{reportStats.dinheiro.length} atuais{reportStats.historicalDinheiro > 0 ? ` + historico` : ``}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span className="text-foreground">Cartao</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">{formatCurrency(reportStats.cartao.reduce((s, o) => s + o.total, 0) + reportStats.historicalCartao)}</p>
                          <p className="text-xs text-muted-foreground">{reportStats.cartao.length} atuais{reportStats.historicalCartao > 0 ? ` + historico` : ``}</p>
                        </div>
                      </div>

                      {/* Total geral confirmado */}
                      <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20 mt-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                          <span className="text-foreground font-semibold">Total Confirmado</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary text-lg">{formatCurrency(reportStats.confirmedRevenue)}</p>
                          <p className="text-xs text-muted-foreground">{reportStats.confirmedOrders.length} atuais{reportStats.historicalCount > 0 ? ` + ${reportStats.historicalCount} historico` : ``}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Produtos mais vendidos */}
                  <div className="bg-card p-6 rounded-xl border border-border">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Produtos Mais Vendidos
                    </h3>
                    <div className="space-y-2">
                      {getTopProducts().length > 0 ? (
                        getTopProducts().map((product, index) => (
                          <div key={product.name} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-primary/20 text-primary text-sm font-bold rounded-full flex items-center justify-center">
                                {index + 1}
                              </span>
                              <span className="text-foreground">{product.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-foreground">{product.quantity}x</p>
                              <p className="text-xs text-muted-foreground">{formatCurrency(product.revenue)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-4">Nenhuma venda confirmada ainda</p>
                      )}
                    </div>
                  </div>

                  {/* Clientes que mais compraram */}
                  <div className="bg-card p-6 rounded-xl border border-border">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Clientes que Mais Compraram
                    </h3>
                    <div className="space-y-2">
                      {getTopCustomers().length > 0 ? (
                        getTopCustomers().map((customer, index) => (
                          <div key={customer.phone || customer.name} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-primary/20 text-primary text-sm font-bold rounded-full flex items-center justify-center">
                                {index + 1}
                              </span>
                              <div>
                                <p className="text-foreground font-medium">{customer.name}</p>
                                <p className="text-xs text-muted-foreground">{customer.phone}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-foreground">{customer.orders} pedidos</p>
                              <p className="text-xs text-muted-foreground">{formatCurrency(customer.revenue)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-4">Nenhum cliente ainda</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Pedidos Pagos - Aguardando Preparo */}
              {activeTab === "orders-paid" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Aguardando Preparo ({ordersPaidWaiting.length})</h2>
                    <button onClick={loadOrders} className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground font-medium rounded-xl transition-all hover:bg-secondary/80">
                      <Loader2 className="w-4 h-4" /> Atualizar
                    </button>
                  </div>

                  <div className="space-y-3">
                    {ordersPaidWaiting.map((order) => (
                      <div key={order.id} className="p-4 rounded-xl border border-border bg-secondary/30">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-foreground">{order.id}</p>
                            <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString("pt-BR")}</p>
                            {order.paidAt && <p className="text-xs text-green-400">Pago em: {new Date(order.paidAt).toLocaleString("pt-BR")}</p>}
                          </div>
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400">
                            {order.confirmedAutomatically ? "PIX Auto" : order.manuallyConfirmed ? "Manual" : "Pago"}
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
                            <p className="text-lg font-bold text-foreground">R$ {order.total.toFixed(2)}</p>
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
                          <button onClick={() => updateOrderStatus(order.id, "preparing")} className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all flex items-center gap-2">
                            <ChefHat className="w-4 h-4" /> Iniciar Preparo
                          </button>
                          <button onClick={() => copyOrderData(order)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${copiedOrderId === order.id ? "bg-green-500/20 text-green-400" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>
                            {copiedOrderId === order.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiedOrderId === order.id ? "Copiado!" : "Copiar"}
                          </button>
                          <button onClick={() => copyTrackingLink(order.id)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${copiedLinkId === order.id ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"}`}>
                            {copiedLinkId === order.id ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />} {copiedLinkId === order.id ? "Copiado!" : "Link"}
                          </button>
                          <button onClick={() => sendTrackingLinkToCustomer(order)} className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" /> Enviar Link
                          </button>
                          <button onClick={() => openCustomerWhatsApp(order.customerPhone)} className="px-4 py-2 text-sm font-medium rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all flex items-center gap-2">
                            <Phone className="w-4 h-4" /> WhatsApp
                          </button>
                          <button onClick={() => updateOrderStatus(order.id, "cancelled")} className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all flex items-center gap-2">
                            <Ban className="w-4 h-4" /> Cancelar
                          </button>
                        </div>
                      </div>
                    ))}

                    {ordersPaidWaiting.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum pedido aguardando preparo</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Pedidos em Preparacao */}
              {activeTab === "orders-preparing" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Em Preparacao ({ordersPreparing.length})</h2>
                    <button onClick={loadOrders} className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground font-medium rounded-xl transition-all hover:bg-secondary/80">
                      <Loader2 className="w-4 h-4" /> Atualizar
                    </button>
                  </div>

                  <div className="space-y-3">
                    {ordersPreparing.map((order) => (
                      <div key={order.id} className="p-4 rounded-xl border border-border bg-secondary/30">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-foreground">{order.id}</p>
                            <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString("pt-BR")}</p>
                          </div>
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">Em Preparacao</span>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Cliente</p>
                            <p className="text-sm text-foreground">{order.customerName}</p>
                            <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-lg font-bold text-foreground">R$ {order.total.toFixed(2)}</p>
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
                          {order.deliveryType === "entrega" ? (
                            <>
                              {/* Fluxo de entrega com entregador */}
                              {!order.entregadorId ? (
                                // Passo 1: Selecionar entregador
                                (() => {
                                  const entregadoresDisponiveis = (config.entregadores || []).filter(
                                    e => e.status === "ativo" && e.disponibilidade === "disponivel"
                                  )
                                  return entregadoresDisponiveis.length > 0 ? (
                                    <select
                                      onChange={(e) => {
                                        const entregador = entregadoresDisponiveis.find(ent => ent.id === e.target.value)
                                        if (entregador) {
                                          setConfirmEntregador({ orderId: order.id, entregador })
                                        }
                                      }}
                                      defaultValue=""
                                      className="px-3 py-2 text-sm font-medium rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                      <option value="" disabled>Selecionar Entregador</option>
                                      {entregadoresDisponiveis.map(ent => (
                                        <option key={ent.id} value={ent.id}>{ent.nome}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <button 
                                      onClick={() => updateOrderStatus(order.id, "delivering")} 
                                      className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all flex items-center gap-2"
                                    >
                                      <Truck className="w-4 h-4" /> Saiu p/ Entrega
                                    </button>
                                  )
                                })()
                              ) : (
                                // Passo 2 e 3: Entregador selecionado - mostrar acoes
                                <div className="flex flex-wrap gap-2 w-full">
                                  {/* Info do entregador selecionado */}
                                  <div className="w-full mb-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Users2 className="w-4 h-4 text-blue-400" />
                                      <span className="text-sm text-foreground font-medium">{order.entregadorNome}</span>
                                      <span className="text-xs text-muted-foreground">({order.entregadorWhatsapp})</span>
                                    </div>
                                    <button
                                      onClick={() => removeEntregador(order.id)}
                                      className="text-xs text-muted-foreground hover:text-red-400"
                                    >
                                      Trocar
                                    </button>
                                  </div>
                                  
                                  {/* Botao enviar dados ao entregador */}
                                  <button 
                                    onClick={() => sendOrderToEntregador(order, order.entregadorWhatsapp!)}
                                    className="px-4 py-2 text-sm font-medium rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all flex items-center gap-2"
                                  >
                                    <MessageCircle className="w-4 h-4" /> Enviar Dados ao Entregador
                                  </button>
                                  
                                  {/* Botao marcar como saiu para entrega */}
                                  <button 
                                    onClick={() => marcarSaiuParaEntrega(order.id)}
                                    className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all flex items-center gap-2"
                                  >
                                    <Truck className="w-4 h-4" /> Marcar Saiu p/ Entrega
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <button onClick={() => updateOrderStatus(order.id, "completed")} className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all flex items-center gap-2">
                              <PackageCheck className="w-4 h-4" /> Finalizar (Retirada)
                            </button>
                          )}
                          <button onClick={() => copyOrderData(order)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${copiedOrderId === order.id ? "bg-green-500/20 text-green-400" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>
                            {copiedOrderId === order.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiedOrderId === order.id ? "Copiado!" : "Copiar"}
                          </button>
                          <button onClick={() => copyTrackingLink(order.id)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${copiedLinkId === order.id ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"}`}>
                            {copiedLinkId === order.id ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />} {copiedLinkId === order.id ? "Copiado!" : "Link"}
                          </button>
                          <button onClick={() => sendTrackingLinkToCustomer(order)} className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" /> Enviar Link
                          </button>
                          <button onClick={() => openCustomerWhatsApp(order.customerPhone)} className="px-4 py-2 text-sm font-medium rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all flex items-center gap-2">
                            <Phone className="w-4 h-4" /> WhatsApp
                          </button>
                          <button onClick={() => updateOrderStatus(order.id, "cancelled")} className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all flex items-center gap-2">
                            <Ban className="w-4 h-4" /> Cancelar
                          </button>
                        </div>
                      </div>
                    ))}

                    {ordersPreparing.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum pedido em preparacao</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. Saiu para Entrega */}
              {activeTab === "orders-delivering" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-foreground">Saiu para Entrega ({ordersDelivering.length})</h2>
                    <div className="flex items-center gap-2">
                      {/* Filtro por entregador */}
                      <select
                        value={filtroEntregador}
                        onChange={(e) => setFiltroEntregador(e.target.value)}
                        className="px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="todos">Todos Entregadores</option>
                        {Array.from(new Set(ordersDelivering.map(o => o.entregadorId).filter(Boolean))).map(entId => {
                          const ent = (config.entregadores || []).find(e => e.id === entId)
                          return ent ? <option key={ent.id} value={ent.id}>{ent.nome}</option> : null
                        })}
                      </select>
                      <button onClick={loadOrders} className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground font-medium rounded-xl transition-all hover:bg-secondary/80">
                        <Loader2 className="w-4 h-4" /> Atualizar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {ordersDelivering
                      .filter(order => filtroEntregador === "todos" || order.entregadorId === filtroEntregador)
                      .map((order) => {
                        const tempoInfo = order.saiuParaEntregaEm ? calcularTempoEntrega(order.saiuParaEntregaEm) : null
                        const corTempo = tempoInfo 
                          ? tempoInfo.minutos > 40 ? "border-red-500/50 bg-red-500/5" 
                          : tempoInfo.minutos > 20 ? "border-yellow-500/50 bg-yellow-500/5" 
                          : "border-border bg-secondary/30"
                          : "border-border bg-secondary/30"
                        
                        return (
                          <div key={order.id} className={`p-4 rounded-xl border ${corTempo}`}>
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-bold text-foreground">{order.id}</p>
                                <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString("pt-BR")}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {tempoInfo && (
                                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                    tempoInfo.minutos > 40 ? "bg-red-500/20 text-red-400" :
                                    tempoInfo.minutos > 20 ? "bg-yellow-500/20 text-yellow-400" :
                                    "bg-purple-500/20 text-purple-400"
                                  }`}>
                                    {tempoInfo.texto}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4 mb-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Cliente</p>
                                <p className="text-sm text-foreground">{order.customerName}</p>
                                <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Total</p>
                                <p className="text-lg font-bold text-foreground">R$ {order.total.toFixed(2)}</p>
                              </div>
                            </div>

                            {order.address && (
                              <div className="mb-3 p-3 bg-purple-500/10 rounded-lg">
                                <p className="text-xs text-muted-foreground">Endereco de Entrega</p>
                                <p className="text-sm text-foreground font-medium">{order.address}</p>
                                {order.neighborhood && <p className="text-xs text-muted-foreground">Bairro: {order.neighborhood}</p>}
                                {order.reference && <p className="text-xs text-muted-foreground">Ref: {order.reference}</p>}
                              </div>
                            )}

                            {/* Informacoes do Entregador - Melhorado */}
                            {order.entregadorNome && (
                              <div className="mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                      <Users2 className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                      <p className="text-sm text-foreground font-medium">{order.entregadorNome}</p>
                                      {order.entregadorWhatsapp && (
                                        <p className="text-xs text-muted-foreground">{order.entregadorWhatsapp}</p>
                                      )}
                                      {order.saiuParaEntregaEm && (
                                        <p className="text-xs text-blue-400">
                                          Saiu as {new Date(order.saiuParaEntregaEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {order.entregadorWhatsapp && (
                                    <button
                                      onClick={() => sendOrderToEntregador(order, order.entregadorWhatsapp!)}
                                      className="px-3 py-2 text-xs font-medium rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all flex items-center gap-1"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                      Enviar Pedido
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Historico de problemas */}
                            {order.historicoEntrega && order.historicoEntrega.filter(h => h.evento === "PROBLEMA").length > 0 && (
                              <div className="mb-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                <p className="text-xs text-orange-400 font-medium mb-2">Problemas Registrados:</p>
                                {order.historicoEntrega.filter(h => h.evento === "PROBLEMA").map((h, i) => (
                                  <div key={i} className="text-xs text-muted-foreground">
                                    <span className="text-orange-400">{new Date(h.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                                    {" - "}{h.observacao}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Area de registro de problema */}
                            {problemaEntregaOrderId === order.id && (
                              <div className="mb-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                <p className="text-xs text-orange-400 font-medium mb-2">Registrar Problema:</p>
                                <input
                                  type="text"
                                  value={problemaEntregaObs}
                                  onChange={(e) => setProblemaEntregaObs(e.target.value)}
                                  placeholder="Descreva o problema..."
                                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 mb-2"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      if (problemaEntregaObs.trim()) {
                                        registrarProblemaEntrega(order.id, problemaEntregaObs.trim())
                                      }
                                    }}
                                    disabled={!problemaEntregaObs.trim()}
                                    className="px-3 py-1 text-xs font-medium rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 disabled:opacity-50"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setProblemaEntregaOrderId(null)
                                      setProblemaEntregaObs("")
                                    }}
                                    className="px-3 py-1 text-xs font-medium rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                              <button 
                                onClick={() => updateOrderStatus(order.id, "completed")} 
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all flex items-center gap-2"
                              >
                                <PackageCheck className="w-4 h-4" /> Cliente Recebeu
                              </button>
                              <button 
                                onClick={() => {
                                  setProblemaEntregaOrderId(order.id)
                                  setProblemaEntregaObs("")
                                }} 
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-all flex items-center gap-2"
                              >
                                <AlertCircle className="w-4 h-4" /> Problema
                              </button>
                              <button 
                                onClick={() => voltarParaPreparo(order.id)} 
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-all flex items-center gap-2"
                              >
                                <ChefHat className="w-4 h-4" /> Voltar Preparo
                              </button>
                              <button 
                                onClick={() => openCustomerWhatsApp(order.customerPhone, "Ola, sua entrega esta a caminho!")} 
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all flex items-center gap-2"
                              >
                                <Phone className="w-4 h-4" /> WhatsApp Cliente
                              </button>
                            </div>
                          </div>
                        )
                      })}

                    {ordersDelivering.filter(order => filtroEntregador === "todos" || order.entregadorId === filtroEntregador).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum pedido em entrega</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. Finalizados */}
              {activeTab === "orders-completed" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-xl font-bold text-foreground">Finalizados ({ordersCompleted.length})</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button 
                        onClick={() => selectAllOrders(ordersCompleted, "orders-completed")}
                        className="px-3 py-1.5 text-sm bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all"
                      >
                        Selecionar todos
                      </button>
                      {selectedOrders.size > 0 && selectedOrdersTab === "orders-completed" && (
                        <>
                          <button 
                            onClick={deselectAllOrders}
                            className="px-3 py-1.5 text-sm bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all"
                          >
                            Desmarcar
                          </button>
                          <button
                            onClick={() => setShowDeleteMultiple(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 font-medium rounded-xl transition-all hover:bg-red-500/30"
                          >
                            <Trash2 className="w-4 h-4" /> Excluir ({selectedOrders.size})
                          </button>
                        </>
                      )}
                      <button onClick={loadOrders} className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground font-medium rounded-xl transition-all hover:bg-secondary/80">
                        <Loader2 className="w-4 h-4" /> Atualizar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {ordersCompleted.map((order) => (
                      <div key={order.id} className="p-4 rounded-xl border border-border bg-secondary/30">
                        <div className="flex items-start gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(order.id)}
                            onChange={() => toggleOrderSelection(order.id, "orders-completed")}
                            className="w-5 h-5 mt-1 rounded border-border bg-input accent-primary"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-bold text-foreground">{order.id}</p>
                                <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString("pt-BR")}</p>
                              </div>
                              <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400">Finalizado</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Cliente</p>
                            <p className="text-sm font-medium text-foreground">{order.customerName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Telefone</p>
                            <p className="text-sm text-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {order.customerPhone}
                            </p>
                          </div>
                        </div>

                        {order.address && (
                          <div className="mb-3">
                            <p className="text-xs text-muted-foreground">Endereco</p>
                            <p className="text-sm text-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {order.address}
                              {order.neighborhood && ` - ${order.neighborhood}`}
                            </p>
                            {order.reference && (
                              <p className="text-xs text-yellow-400">Ref: {order.reference}</p>
                            )}
                          </div>
                        )}

                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground">Itens</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{order.items}</p>
                        </div>

                        {order.observation && (
                          <div className="mb-3 p-2 bg-yellow-500/10 rounded-lg">
                            <p className="text-xs text-yellow-400">Observacao</p>
                            <p className="text-sm text-foreground">{order.observation}</p>
                          </div>
                        )}

                        <div className="grid sm:grid-cols-3 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-lg font-bold text-primary">R$ {order.total.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pagamento</p>
                            <p className="text-sm text-foreground">{order.paymentMethod}</p>
                          </div>
                          {order.entregadorNome && (
                            <div>
                              <p className="text-xs text-muted-foreground">Entregador</p>
                              <p className="text-sm text-foreground">{order.entregadorNome}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                          <button onClick={() => copyOrderData(order)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${copiedOrderId === order.id ? "bg-green-500/20 text-green-400" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>
                            {copiedOrderId === order.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiedOrderId === order.id ? "Copiado!" : "Copiar"}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(order.id)}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Excluir
                          </button>
                        </div>
                      </div>
                    ))}

                    {ordersCompleted.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <PackageCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum pedido finalizado</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6. Cancelados */}
              {activeTab === "orders-cancelled" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-xl font-bold text-foreground">Cancelados ({ordersCancelled.length})</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button 
                        onClick={() => selectAllOrders(ordersCancelled, "orders-cancelled")}
                        className="px-3 py-1.5 text-sm bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all"
                      >
                        Selecionar todos
                      </button>
                      {selectedOrders.size > 0 && selectedOrdersTab === "orders-cancelled" && (
                        <>
                          <button 
                            onClick={deselectAllOrders}
                            className="px-3 py-1.5 text-sm bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all"
                          >
                            Desmarcar
                          </button>
                          <button
                            onClick={() => setShowDeleteMultiple(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 font-medium rounded-xl transition-all hover:bg-red-500/30"
                          >
                            <Trash2 className="w-4 h-4" /> Excluir ({selectedOrders.size})
                          </button>
                        </>
                      )}
                      <button onClick={loadOrders} className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground font-medium rounded-xl transition-all hover:bg-secondary/80">
                        <Loader2 className="w-4 h-4" /> Atualizar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {ordersCancelled.map((order) => (
                      <div key={order.id} className="p-4 rounded-xl border border-border bg-secondary/30 opacity-70">
                        <div className="flex items-start gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(order.id)}
                            onChange={() => toggleOrderSelection(order.id, "orders-cancelled")}
                            className="w-5 h-5 mt-1 rounded border-border bg-input accent-primary"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-bold text-foreground">{order.id}</p>
                                <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString("pt-BR")}</p>
                              </div>
                              <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400">Cancelado</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Cliente</p>
                            <p className="text-sm text-foreground">{order.customerName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-lg font-bold text-foreground line-through">R$ {order.total.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground">Itens</p>
                          <p className="text-sm text-foreground">{order.items}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                          <button
                            onClick={() => setShowDeleteConfirm(order.id)}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Excluir
                          </button>
                        </div>
                      </div>
                    ))}

                    {ordersCancelled.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Ban className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum pedido cancelado</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Aba Pedidos Abandonados */}
              {activeTab === "orders-abandoned" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-xl font-bold text-foreground">Abandonados ({ordersAbandoned.length})</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button 
                        onClick={() => selectAllOrders(ordersAbandoned, "orders-abandoned")}
                        className="px-3 py-1.5 text-sm bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all"
                      >
                        Selecionar todos
                      </button>
                      {selectedOrders.size > 0 && selectedOrdersTab === "orders-abandoned" && (
                        <>
                          <button 
                            onClick={deselectAllOrders}
                            className="px-3 py-1.5 text-sm bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all"
                          >
                            Desmarcar
                          </button>
                          <button
                            onClick={() => setShowDeleteMultiple(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 font-medium rounded-xl transition-all hover:bg-red-500/30"
                          >
                            <Trash2 className="w-4 h-4" /> Excluir ({selectedOrders.size})
                          </button>
                        </>
                      )}
                      <button onClick={loadOrders} className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground font-medium rounded-xl transition-all hover:bg-secondary/80">
                        <Loader2 className="w-4 h-4" /> Atualizar
                      </button>
                    </div>
                  </div>

                  <div className="bg-card/50 p-4 rounded-xl border border-orange-500/30">
                    <p className="text-sm text-muted-foreground">
                      Pedidos iniciados pelo cliente mas nao finalizados/pagos ha mais de {abandonedMinutes} minutos.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {ordersAbandoned.map(order => (
                      <div key={order.id} className="bg-card p-4 rounded-xl border border-orange-500/30">
                        <div className="flex items-start gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(order.id)}
                            onChange={() => toggleOrderSelection(order.id, "orders-abandoned")}
                            className="w-5 h-5 mt-1 rounded border-border bg-input accent-primary"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-lg font-bold text-foreground">{order.id}</p>
                                <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString("pt-BR")}</p>
                              </div>
                              <div className="text-right">
                                <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-400">
                                  Parado ha {getTimeSinceCreation(order.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Cliente</p>
                            <p className="text-sm text-foreground font-medium">{order.customerName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Telefone</p>
                            <p className="text-sm text-foreground">{order.customerPhone}</p>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground">Itens</p>
                          <p className="text-sm text-foreground">{order.items}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-lg font-bold text-primary">R$ {order.total.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pagamento</p>
                            <p className="text-sm text-foreground">{order.paymentMethod}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                          <button onClick={() => chargeOnWhatsApp(order)} className="px-4 py-2 text-sm font-medium rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all flex items-center gap-2">
                            <Phone className="w-4 h-4" /> Cobrar no WhatsApp
                          </button>
                          <button onClick={() => copyOrderData(order)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${copiedOrderId === order.id ? "bg-green-500/20 text-green-400" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>
                            {copiedOrderId === order.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiedOrderId === order.id ? "Copiado!" : "Copiar"}
                          </button>
                          <button onClick={() => updateOrderStatus(order.id, "cancelled")} className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all flex items-center gap-2">
                            <Ban className="w-4 h-4" /> Cancelar
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(order.id)}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Excluir
                          </button>
                        </div>
                      </div>
                    ))}

                    {ordersAbandoned.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum pedido abandonado</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Aba Pedidos Arquivados */}
              {activeTab === "orders-archived" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-foreground">Arquivados ({ordersArchived.length})</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button 
                        onClick={() => selectAllOrders(ordersArchived, "orders-archived")}
                        className="px-3 py-1.5 text-sm bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all"
                      >
                        Selecionar todos
                      </button>
                      {selectedOrders.size > 0 && selectedOrdersTab === "orders-archived" && (
                        <>
                          <button 
                            onClick={deselectAllOrders}
                            className="px-3 py-1.5 text-sm bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all"
                          >
                            Desmarcar
                          </button>
                          <button
                            onClick={() => setShowDeleteMultiple(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 font-medium rounded-xl transition-all hover:bg-red-500/30"
                          >
                            <Trash2 className="w-4 h-4" /> Excluir ({selectedOrders.size})
                          </button>
                        </>
                      )}
                      <button onClick={loadOrders} className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground font-medium rounded-xl transition-all hover:bg-secondary/80">
                        <Loader2 className="w-4 h-4" /> Atualizar
                      </button>
                    </div>
                  </div>
                  
                  {/* Busca de arquivados */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Buscar pedido arquivado..."
                      value={archivedSearchInput}
                      onChange={(e) => setArchivedSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setArchivedSearchQuery(archivedSearchInput)
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button
                      onClick={() => setArchivedSearchQuery(archivedSearchInput)}
                      className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:brightness-110 transition-all"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    {archivedSearchQuery && (
                      <button
                        onClick={() => {
                          setArchivedSearchInput("")
                          setArchivedSearchQuery("")
                        }}
                        className="px-4 py-2 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {archivedSearchQuery && (
                    <p className="text-sm text-muted-foreground">
                      {ordersArchived.length} pedido(s) encontrado(s) para &quot;{archivedSearchQuery}&quot;
                    </p>
                  )}

                  <div className="space-y-4">
                    {ordersArchived.map((order) => (
                      <div key={order.id} className="bg-card rounded-xl p-4 border border-border">
                        <div className="flex items-start gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(order.id)}
                            onChange={() => toggleOrderSelection(order.id, "orders-archived")}
                            className="w-5 h-5 mt-1 rounded border-border bg-input accent-primary"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-bold text-foreground">{order.id}</span>
                                <p className="text-sm text-muted-foreground">{order.customerName}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                              </div>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                order.status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
                                order.status === "cancelled" ? "bg-red-500/20 text-red-400" :
                                "bg-slate-500/20 text-slate-400"
                              }`}>
                                {order.status === "completed" ? "Finalizado" : order.status === "cancelled" ? "Cancelado" : order.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{order.items}</div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-lg font-bold text-primary">R$ {order.total.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pagamento</p>
                            <p className="text-sm text-foreground">{order.paymentMethod}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                          <button 
                            onClick={() => restaurarPedido(order.id)} 
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all flex items-center gap-2"
                          >
                            <RotateCcw className="w-4 h-4" /> Restaurar
                          </button>
                          <button 
                            onClick={() => copyOrderData(order)} 
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${copiedOrderId === order.id ? "bg-green-500/20 text-green-400" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
                          >
                            {copiedOrderId === order.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiedOrderId === order.id ? "Copiado!" : "Copiar"}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(order.id)}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Excluir
                          </button>
                        </div>
                      </div>
                    ))}

                    {ordersArchived.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FolderArchive className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>{archivedSearchQuery ? "Nenhum pedido arquivado encontrado" : "Nenhum pedido arquivado"}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toast de Notificacao */}
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 bg-primary text-primary-foreground px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-300">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}

        {/* Modal de confirmacao de entregador */}
        {confirmEntregador && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-border">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Confirmar Entregador</h3>
              </div>
              <div className="space-y-3 mb-6">
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Entregador</p>
                  <p className="text-foreground font-medium">{confirmEntregador.entregador.nome}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="text-foreground">{confirmEntregador.entregador.whatsapp}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Pedido</p>
                  <p className="text-foreground font-medium">{confirmEntregador.orderId}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmEntregador(null)}
                  className="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmAssignEntregador}
                  className="flex-1 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-all"
                >
                  Confirmar Entrega
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmacao de exclusao individual */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-border">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Excluir Pedido</h3>
                <p className="text-muted-foreground mt-2">
                  Tem certeza que deseja excluir o pedido <span className="font-bold text-foreground">{showDeleteConfirm}</span>?
                </p>
                <p className="text-sm text-red-400 mt-2">Esta acao nao pode ser desfeita.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={deleteLoading}
                  className="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteSingleOrder(showDeleteConfirm)}
                  disabled={deleteLoading}
                  className="flex-1 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Excluir"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de aviso de aba diferente */}
        {showTabWarning && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-border">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Selecao em outra aba</h3>
                <p className="text-muted-foreground mt-2">
                  Voce ja tem pedidos selecionados em outra aba. Desmarque-os antes de selecionar nesta aba.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTabWarning(false)}
                  className="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-all"
                >
                  Entendi
                </button>
                <button
                  onClick={() => {
                    deselectAllOrders()
                    setShowTabWarning(false)
                  }}
                  className="flex-1 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:brightness-110 transition-all"
                >
                  Desmarcar todos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmacao de exclusao multipla */}
        {showDeleteMultiple && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-border">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Excluir Pedidos</h3>
                <p className="text-muted-foreground mt-2">
                  Tem certeza que deseja excluir <span className="font-bold text-foreground">{selectedOrders.size}</span> pedido(s)?
                </p>
                <p className="text-sm text-red-400 mt-2">Esta acao nao pode ser desfeita.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteMultiple(false)}
                  disabled={deleteLoading}
                  className="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={deleteMultipleOrders}
                  disabled={deleteLoading}
                  className="flex-1 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Excluir ${selectedOrders.size}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmacao para arquivar relatorios */}
        {showArchiveConfirm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-border">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Limpar Relatorios</h3>
                <p className="text-muted-foreground mt-2">
                  Tem certeza que deseja limpar os relatorios? Os pedidos serao arquivados e nao aparecerao mais nas estatisticas.
                </p>
                <p className="text-sm text-red-400 mt-2">
                  Essa acao nao pode ser desfeita.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowArchiveConfirm(false)}
                  className="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={archiveAllOrders}
                  className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Copia Manual */}
        {manualCopyText && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-border">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-foreground">Copiar Pedido</h3>
                <p className="text-sm text-muted-foreground mt-1">Selecione e copie manualmente</p>
              </div>
              <textarea
                readOnly
                value={manualCopyText}
                className="w-full h-48 p-3 text-sm bg-secondary border border-border rounded-xl text-foreground resize-none focus:outline-none"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <button
                onClick={() => setManualCopyText(null)}
                className="w-full mt-4 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Modal de Copia Manual do Link do Entregador */}
        {manualEntregadorLink && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-border">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-foreground">Copiar Link do Entregador</h3>
                <p className="text-sm text-muted-foreground mt-1">Nao foi possivel copiar automaticamente. Copie manualmente abaixo:</p>
              </div>
              <input
                type="text"
                readOnly
                value={manualEntregadorLink}
                className="w-full p-3 text-sm bg-secondary border border-border rounded-xl text-foreground focus:outline-none"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => setManualEntregadorLink(null)}
                className="w-full mt-4 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Modal de Confirmacao para Excluir Produto */}
        {deleteProductId !== null && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-foreground">Excluir Produto</h3>
                <p className="text-sm text-muted-foreground mt-2">Tem certeza que deseja excluir este produto?</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteProductId(null)}
                  className="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteProduct}
                  className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
