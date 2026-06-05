"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { 
  Lock, 
  Loader2,
  ArrowLeft,
  Ban,
  Check,
  Phone,
  Copy,
  Link2,
  ExternalLink,
  ClockIcon,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  Truck,
  Users2,
  MessageCircle,
  AlertCircle,
  Search,
  FolderArchive,
  Trash2,
  RotateCcw,
  Palette
} from "lucide-react"
import Link from "next/link"
import { type SiteConfig, type Product, type Coupon, type Order, type NeighborhoodFee, type Entregador, defaultConfig } from "@/lib/config-types"
import { 
  AdminHeader, 
  AdminOrdersCard, 
  AdminQuickSettings, 
  AdminRevenueReport,
  AdminStoreSettings,
  AdminProductsSettings,
  AdminCategoriesSettings,
  AdminBannerSettings,
  AdminHoursSettings,
  AdminDeliverySettings,
  AdminPaymentSettings,
  AdminWhatsappSettings,
  AdminCouponsSettings,
  AdminEntregadoresSettings,
  AdminReportsSettings,
  AdminModals,
} from "./components"
import { AdminCustomization } from "./components/AdminCustomization"
import { AdminDashboard } from "./components/AdminDashboard"

// Utils e types extraidos
import type { TabType, FinancialHistoryItem, ReportStats } from "./types"
import { 
  normalizeText,
  normalizePhoneForWhatsApp,
  formatCurrency,
  formatDate,
  calcularTempoEntrega,
  getTimeSinceCreation,
  isOrderConfirmed,
  getStatusColor,
  getStatusLabel,
  getPaymentStatusColor,
  getPaymentStatusLabel,
  getPublicBaseUrl,
  getOrderTrackingLink,
  getEntregadorPanelLink,
  generateEntregadorMessage,
  copyToClipboardRobust,
  getOrderCode,
  formatOrderItems,
} from "./utils"
import { 
  ORDERS_POLLING_INTERVAL,
  SESSION_DURATION,
  TOAST_DURATION,
  NOTIFICATION_FREQUENCIES_STRONG,
  NOTIFICATION_FREQUENCIES_WEAK,
  VIBRATION_PATTERN,
} from "./constants"

export default function AdminPage() {
  // ========== ESTADOS PRINCIPAIS ==========
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [config, setConfig] = useState<SiteConfig>(defaultConfig)
  const [activeTab, setActiveTab] = useState<TabType>("dashboard")
  const [sessionPassword, setSessionPassword] = useState("")
  
  // ========== ESTADOS DE PEDIDOS ==========
  const [orders, setOrders] = useState<Order[]>([])
  const [financialHistory, setFinancialHistory] = useState<FinancialHistoryItem[]>([])
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null)
  
  // ========== ESTADOS DE NOTIFICACAO ==========
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [soundActivated, setSoundActivated] = useState(false)
  const [strongNotification, setStrongNotification] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [adminOpenedAt, setAdminOpenedAt] = useState<string | null>(null)
  const [knownOrderIds, setKnownOrderIds] = useState<Set<string>>(new Set())
  const [newOrdersCount, setNewOrdersCount] = useState(0)
  const [pulsingOrders, setPulsingOrders] = useState<Set<string>>(new Set())
  
  // ========== ESTADOS DE FILTROS ==========
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "week" | "month" | "all">("all")
  const [filtroEntregador, setFiltroEntregador] = useState<string>("todos")
  const [archivedSearchInput, setArchivedSearchInput] = useState("")
  const [archivedSearchQuery, setArchivedSearchQuery] = useState("")
  
  // ========== ESTADO DE STORE SETTINGS (v100 - Supabase Only) ==========
  // storeSettings: valores SALVOS (usados no header)
  // pendingStoreSettings: valores EDITADOS no formulario (usados no handleSave)
  const [storeSettings, setStoreSettings] = useState({
    storeName: '',
    subtitle: '',
    slogan: '',
    closedMessage: '',
    whatsapp: '',
    address: '',
    openTime: '',
    closeTime: '',
    storeOpen: false,
    manualControl: false,
  })
  
  // Valores pendentes do formulario (header NAO muda enquanto digita)
  const pendingStoreSettingsRef = useRef(storeSettings)
  
  // Callback estavel para receber mudancas do formulario AdminStoreSettings
  const handlePendingSettingsChange = useCallback((_hasChanges: boolean, pending: typeof storeSettings) => {
    pendingStoreSettingsRef.current = pending
  }, [])
  
  // ========== ESTADOS DE UI/MODAIS ==========
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null)
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)
  const [manualCopyText, setManualCopyText] = useState<string | null>(null)
  const [manualEntregadorLink, setManualEntregadorLink] = useState<string | null>(null)
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [confirmEntregador, setConfirmEntregador] = useState<{orderId: string, entregador: Entregador} | null>(null)
  const [problemaEntregaOrderId, setProblemaEntregaOrderId] = useState<string | null>(null)
  const [problemaEntregaObs, setProblemaEntregaObs] = useState("")
  
  // ========== ESTADOS DE SELECAO ==========
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [selectedOrdersTab, setSelectedOrdersTab] = useState<TabType | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showDeleteMultiple, setShowDeleteMultiple] = useState(false)
  const [showTabWarning, setShowTabWarning] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ========== FUNCAO DE TOAST ==========
  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), TOAST_DURATION)
  }, [])

  // ========== FUNCOES DE AUDIO ==========
  const playBeepSequence = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const volume = strongNotification ? 0.8 : 0.4
      const frequencies = strongNotification ? NOTIFICATION_FREQUENCIES_STRONG : NOTIFICATION_FREQUENCIES_WEAK
      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          try {
            const oscillator = ctx.createOscillator()
            const gainNode = ctx.createGain()
            oscillator.connect(gainNode)
            gainNode.connect(ctx.destination)
            oscillator.frequency.value = freq
            oscillator.type = "sine"
            gainNode.gain.setValueAtTime(volume, ctx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
            oscillator.start()
            oscillator.stop(ctx.currentTime + 0.35)
          } catch { /* ignore */ }
        }, index * 350)
      })
    } catch { /* ignore */ }
  }, [strongNotification])

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled || !soundActivated) return
    if (strongNotification && navigator.vibrate) navigator.vibrate(VIBRATION_PATTERN)
    playBeepSequence()
  }, [soundEnabled, soundActivated, strongNotification, playBeepSequence])

  const playTestSound = useCallback(() => {
    if (!soundActivated) { showToast("Ative o som primeiro!"); return }
    playBeepSequence()
    showToast("Som de teste tocado!")
  }, [soundActivated, playBeepSequence, showToast])

  const activateSound = useCallback(() => {
    setSoundActivated(true)
    setSoundEnabled(true)
    try {
      const ctx = new AudioContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.value = 600
      oscillator.type = "sine"
      gainNode.gain.value = 0.3
      oscillator.start()
      setTimeout(() => {
        oscillator.stop()
        setTimeout(() => {
          const osc2 = ctx.createOscillator()
          const gain2 = ctx.createGain()
          osc2.connect(gain2)
          gain2.connect(ctx.destination)
          osc2.frequency.value = 800
          osc2.type = "sine"
          gain2.gain.value = 0.3
          osc2.start()
          setTimeout(() => osc2.stop(), 150)
        }, 200)
      }, 150)
    } catch { /* ignore */ }
    showToast("Som ativado! Voce ouvira alertas de novos pedidos.")
  }, [showToast])

  // ========== SESSAO E AUTENTICACAO ==========
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
      } catch { localStorage.removeItem("admin_session") }
    }
  }, [])

  // ========== FUNCOES DE API ==========
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true)
      console.log("[Admin v102] loadConfig - Carregando TODOS os dados do Supabase...")
      
      // Iniciar com config default
      let baseConfig = { ...defaultConfig }
      
      // 1. Carregar store-settings COMPLETO do Supabase (inclui banner, payment, whatsapp, etc)
      console.log("[Admin v102] Carregando store-settings...")
      const settingsRes = await fetch('/api/store-settings')
      const settingsData = await settingsRes.json()
      if (settingsData.success && settingsData.settings) {
        const s = settingsData.settings
        console.log("[Admin v102] Store settings carregados:", s.storeName)
        
        // Store settings basicos
        setStoreSettings({
          storeName: s.storeName || '',
          subtitle: s.subtitle || '',
          slogan: s.slogan || '',
          closedMessage: s.closedMessage || '',
          whatsapp: s.whatsapp || '',
          address: s.address || '',
          openTime: s.openTime || '',
          closeTime: s.closeTime || '',
          storeOpen: s.storeOpen ?? false,
          manualControl: s.manualControl ?? false,
        })
        
        // Atualizar baseConfig com dados expandidos
        baseConfig.storeName = s.storeName || baseConfig.storeName
        
        // Banner
        if (s.banner) {
          baseConfig.banner = {
            ...baseConfig.banner,
            mainText: s.banner.mainText || baseConfig.banner.mainText,
            secondaryText: s.banner.secondaryText || baseConfig.banner.secondaryText,
            promoActive: s.banner.promoActive ?? baseConfig.banner.promoActive,
            promoPrice: s.banner.promoPrice ?? baseConfig.banner.promoPrice,
            promoText: s.banner.promoText || baseConfig.banner.promoText,
            imageUrl: s.banner.imageUrl || baseConfig.banner.imageUrl,
          }
        }
        
        // Store Hours
        if (s.storeHours) {
          baseConfig.storeHours = {
            ...baseConfig.storeHours,
            isOpen: s.storeHours.isOpen ?? baseConfig.storeHours.isOpen,
            manualControl: s.storeHours.manualControl ?? baseConfig.storeHours.manualControl,
            openTime: s.storeHours.openTime || baseConfig.storeHours.openTime,
            closeTime: s.storeHours.closeTime || baseConfig.storeHours.closeTime,
            closedMessage: s.storeHours.closedMessage || baseConfig.storeHours.closedMessage,
            abandonedOrderMinutes: s.storeHours.abandonedOrderMinutes ?? baseConfig.storeHours.abandonedOrderMinutes,
            autoArchiveDays: s.storeHours.autoArchiveDays ?? baseConfig.storeHours.autoArchiveDays,
          }
        }
        
        // Delivery (configuracoes basicas, bairros vem separado)
        if (s.delivery) {
          baseConfig.delivery = {
            ...baseConfig.delivery,
            enabled: s.delivery.enabled ?? baseConfig.delivery.enabled,
            defaultFee: s.delivery.defaultFee ?? baseConfig.delivery.defaultFee,
            minimumOrder: s.delivery.minimumOrder ?? baseConfig.delivery.minimumOrder,
            estimatedTime: s.delivery.estimatedTime || baseConfig.delivery.estimatedTime,
            pickupEnabled: s.delivery.pickupEnabled ?? baseConfig.delivery.pickupEnabled,
          }
        }
        
        // Payment
        if (s.payment) {
          baseConfig.payment = {
            ...baseConfig.payment,
            minValueForAsaas: s.payment.minValueForAsaas ?? baseConfig.payment.minValueForAsaas,
            pixManualEnabled: s.payment.pixManualEnabled ?? baseConfig.payment.pixManualEnabled,
            pixAsaasEnabled: s.payment.pixAsaasEnabled ?? baseConfig.payment.pixAsaasEnabled,
            pixExpirationMinutes: s.payment.pixExpirationMinutes ?? baseConfig.payment.pixExpirationMinutes,
          }
        }
        
        // PIX Manual
        if (s.pixManual) {
          baseConfig.pixManual = {
            ...baseConfig.pixManual,
            key: s.pixManual.key || baseConfig.pixManual.key,
            keyFull: s.pixManual.keyFull || s.pixManual.key || baseConfig.pixManual.keyFull,
            receiverName: s.pixManual.receiverName || baseConfig.pixManual.receiverName,
          }
        }
        
        // WhatsApp config
        if (s.whatsappConfig) {
          baseConfig.whatsapp = {
            ...baseConfig.whatsapp,
            number: s.whatsappConfig.number || s.whatsapp || baseConfig.whatsapp.number,
            defaultMessage: s.whatsappConfig.defaultMessage || baseConfig.whatsapp.defaultMessage,
            receiptMessage: s.whatsappConfig.receiptMessage || baseConfig.whatsapp.receiptMessage,
            supportEnabled: s.whatsappConfig.supportEnabled ?? baseConfig.whatsapp.supportEnabled,
          }
        }
      }
      
      // 2. Carregar produtos do Supabase
      console.log("[Admin v102] Carregando produtos...")
      const productsRes = await fetch('/api/products')
      const productsData = await productsRes.json()
      if (productsData.success && Array.isArray(productsData.products) && productsData.products.length > 0) {
        console.log(`[Admin v102] ${productsData.products.length} produtos carregados`)
        baseConfig.products = productsData.products
      }
      
      // 3. Carregar bairros do Supabase
      console.log("[Admin v102] Carregando bairros...")
      const neighborhoodsRes = await fetch('/api/neighborhoods')
      const neighborhoodsData = await neighborhoodsRes.json()
      if (neighborhoodsData.success && Array.isArray(neighborhoodsData.neighborhoods) && neighborhoodsData.neighborhoods.length > 0) {
        console.log(`[Admin v102] ${neighborhoodsData.neighborhoods.length} bairros carregados`)
        const neighborhoodFees = neighborhoodsData.neighborhoods.map((n: { name: string; deliveryFee?: number; fee?: number; active: boolean }) => ({
          name: n.name,
          fee: n.deliveryFee ?? n.fee ?? 0,
          active: n.active
        }))
        baseConfig.delivery = { ...baseConfig.delivery, neighborhoodFees }
      }
      
      // 4. Carregar cupons do Supabase
      console.log("[Admin v102] Carregando cupons...")
      const couponsRes = await fetch('/api/coupons')
      const couponsData = await couponsRes.json()
      if (couponsData.success && Array.isArray(couponsData.coupons)) {
        console.log(`[Admin v102] ${couponsData.coupons.length} cupons carregados`)
        baseConfig.coupons = couponsData.coupons
      }
      
      // 5. Carregar entregadores do Supabase
      console.log("[Admin v102] Carregando entregadores...")
      const entregadoresRes = await fetch('/api/entregadores')
      const entregadoresData = await entregadoresRes.json()
      if (entregadoresData.success && Array.isArray(entregadoresData.entregadores)) {
        console.log(`[Admin v102] ${entregadoresData.entregadores.length} entregadores carregados`)
        baseConfig.entregadores = entregadoresData.entregadores
      }
      
      setConfig(baseConfig)
      console.log("[Admin v102] TODOS os dados carregados com sucesso do Supabase")
    } catch (error) {
      console.error("[Admin v102] Erro ao carregar:", error)
    } finally {
      setLoading(false)
    }
  }, [sessionPassword])

  // Sincroniza o ref quando storeSettings e carregado do Supabase
  useEffect(() => {
    if (storeSettings.storeName) {
      pendingStoreSettingsRef.current = storeSettings
    }
  }, [storeSettings])

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders?password=${encodeURIComponent(sessionPassword)}&includeHistory=true`)
      const data = await res.json()
      if (data.success && data.orders) {
        const fetchedOrders = data.orders as Order[]
        setOrders(fetchedOrders)
        if (!initialLoadDone) {
          const allIds = new Set(fetchedOrders.map(o => o.id))
          setKnownOrderIds(allIds)
          setAdminOpenedAt(new Date().toISOString())
          setInitialLoadDone(true)
        }
      }
      if (data.financialHistory) setFinancialHistory(data.financialHistory)
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error)
    }
  }, [sessionPassword, initialLoadDone])

  const loadOrdersWithNotification = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders?password=${encodeURIComponent(sessionPassword)}`, { cache: "no-store" })
      const data = await res.json()
      if (data.success && data.orders) {
        const fetchedOrders = data.orders as Order[]
        if (!initialLoadDone) {
          const allIds = new Set(fetchedOrders.map(o => o.id))
          setKnownOrderIds(allIds)
          setAdminOpenedAt(new Date().toISOString())
          setInitialLoadDone(true)
          setOrders(fetchedOrders)
          setNewOrdersCount(0)
          return
        }
        const trulyNewOrders = fetchedOrders.filter(o => {
          const isNewId = !knownOrderIds.has(o.id)
          const createdAfterOpen = adminOpenedAt ? new Date(o.createdAt) > new Date(adminOpenedAt) : false
          const isActive = ["pending", "confirmed", "preparing", "delivering"].includes(o.status)
          return isNewId && createdAfterOpen && isActive
        })
        if (trulyNewOrders.length > 0) {
          playNotificationSound()
          showToast(`${trulyNewOrders.length} novo${trulyNewOrders.length > 1 ? "s" : ""} pedido${trulyNewOrders.length > 1 ? "s" : ""} recebido${trulyNewOrders.length > 1 ? "s" : ""}!`)
          setPulsingOrders(prev => {
            const newSet = new Set(prev)
            trulyNewOrders.forEach(o => newSet.add(o.id))
            return newSet
          })
          setNewOrdersCount(prev => prev + trulyNewOrders.length)
          setKnownOrderIds(prev => {
            const newSet = new Set(prev)
            trulyNewOrders.forEach(o => newSet.add(o.id))
            return newSet
          })
        }
        setOrders(fetchedOrders)
      }
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error)
    }
  }, [sessionPassword, initialLoadDone, knownOrderIds, adminOpenedAt, playNotificationSound, showToast])

  // ========== EFEITOS DE CARREGAMENTO ==========
  useEffect(() => {
    if (isAuthenticated && sessionPassword) {
      loadConfig()
      loadOrders()
      const pollInterval = setInterval(() => loadOrdersWithNotification(), ORDERS_POLLING_INTERVAL)
      return () => clearInterval(pollInterval)
    }
  }, [isAuthenticated, sessionPassword, loadConfig, loadOrders, loadOrdersWithNotification])

  useEffect(() => {
    if (isAuthenticated && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [isAuthenticated])

  // ========== AUTENTICACAO ==========
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
        const expiry = new Date().getTime() + SESSION_DURATION
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

  // ========== SALVAR CONFIGURACOES v102 ==========
  // TUDO salvo via APIs server-side no Supabase
  // Toast verde mostra "Salvo no Supabase" em caso de sucesso
  // Erro mostra APENAS o erro real atual da API
  const handleSave = async () => {
    console.log("[Admin v102] handleSave iniciado - Salvando TUDO no Supabase")
    setSaving(true)
    setSaveSuccess(false)
    
    const results = {
      storeSettings: { success: false, error: '' },
      products: { success: false, count: 0, error: '' },
      neighborhoods: { success: false, count: 0, error: '' },
      coupons: { success: false, count: 0, error: '' },
      entregadores: { success: false, count: 0, error: '' },
    }
    
    try {
      // 1. SALVAR STORE-SETTINGS COMPLETO NO SUPABASE
      // Inclui: dados basicos, banner, horario, entrega, pagamento, whatsapp
      const settingsToSave = pendingStoreSettingsRef.current
      console.log("[Admin v102] Salvando store-settings completo:", settingsToSave.storeName)
      try {
        const settingsRes = await fetch("/api/store-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Dados basicos
            store_name: settingsToSave.storeName,
            subtitle: settingsToSave.subtitle,
            slogan: settingsToSave.slogan,
            closed_message: settingsToSave.closedMessage,
            whatsapp: settingsToSave.whatsapp,
            address: settingsToSave.address,
            open_time: settingsToSave.openTime,
            close_time: settingsToSave.closeTime,
            store_open: settingsToSave.storeOpen,
            manual_control: settingsToSave.manualControl,
            // Banner
            banner: config.banner,
            // Horario avancado
            storeHours: config.storeHours,
            // Entrega (config basica, bairros vao separado)
            delivery: {
              enabled: config.delivery?.enabled,
              defaultFee: config.delivery?.defaultFee,
              minimumOrder: config.delivery?.minimumOrder,
              estimatedTime: config.delivery?.estimatedTime,
              pickupEnabled: config.delivery?.pickupEnabled,
            },
            // Pagamento
            payment: config.payment,
            // PIX Manual
            pixManual: config.pixManual,
            // WhatsApp config
            whatsappConfig: config.whatsapp,
          }),
        })
        const settingsData = await settingsRes.json()
        console.log("[Admin v102] store-settings response:", settingsData)
        if (settingsData.success) {
          results.storeSettings.success = true
          setStoreSettings(settingsToSave)
        } else {
          results.storeSettings.error = settingsData.error || 'Erro store-settings'
        }
      } catch (e) {
        results.storeSettings.error = String(e)
      }
      
      // 2. SALVAR PRODUTOS NO SUPABASE
      console.log("[Admin v102] Salvando produtos...")
      try {
        const productsRes = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: config.products }),
        })
        const productsData = await productsRes.json()
        console.log("[Admin v102] products response:", productsData)
        if (productsData.success) {
          results.products.success = true
          results.products.count = productsData.count || config.products.length
        } else {
          results.products.error = productsData.error || 'Erro produtos'
        }
      } catch (e) {
        results.products.error = String(e)
      }
      
      // 3. SALVAR BAIRROS NO SUPABASE
      console.log("[Admin v102] Salvando bairros...")
      try {
        const neighborhoodFees = config.delivery?.neighborhoodFees || []
        if (neighborhoodFees.length > 0) {
          const neighborhoodsToSave = neighborhoodFees.map((n: NeighborhoodFee, i: number) => ({
            name: n.name,
            deliveryFee: n.fee,
            active: n.active !== false,
            order: i
          }))
          
          const neighborhoodsRes = await fetch("/api/neighborhoods", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ neighborhoods: neighborhoodsToSave }),
          })
          const neighborhoodsData = await neighborhoodsRes.json()
          console.log("[Admin v102] neighborhoods response:", neighborhoodsData)
          if (neighborhoodsData.success) {
            results.neighborhoods.success = true
            results.neighborhoods.count = neighborhoodsData.count || neighborhoodFees.length
          } else {
            results.neighborhoods.error = neighborhoodsData.error || 'Erro bairros'
          }
        } else {
          results.neighborhoods.success = true
          results.neighborhoods.count = 0
        }
      } catch (e) {
        results.neighborhoods.error = String(e)
      }
      
      // 4. SALVAR CUPONS NO SUPABASE
      console.log("[Admin v102] Salvando cupons...")
      try {
        const coupons = config.coupons || []
        const couponsRes = await fetch("/api/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coupons }),
        })
        const couponsData = await couponsRes.json()
        console.log("[Admin v102] coupons response:", couponsData)
        if (couponsData.success) {
          results.coupons.success = true
          results.coupons.count = couponsData.count || coupons.length
        } else {
          results.coupons.error = couponsData.error || 'Erro cupons'
        }
      } catch (e) {
        results.coupons.error = String(e)
      }
      
      // 5. SALVAR ENTREGADORES NO SUPABASE
      console.log("[Admin v102] Salvando entregadores...")
      try {
        const entregadores = config.entregadores || []
        const entregadoresRes = await fetch("/api/entregadores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entregadores }),
        })
        const entregadoresData = await entregadoresRes.json()
        console.log("[Admin v102] entregadores response:", entregadoresData)
        if (entregadoresData.success) {
          results.entregadores.success = true
          results.entregadores.count = entregadoresData.count || entregadores.length
        } else {
          results.entregadores.error = entregadoresData.error || 'Erro entregadores'
        }
      } catch (e) {
        results.entregadores.error = String(e)
      }
      
      // RESULTADO FINAL v102
      const allSuccess = results.storeSettings.success && results.products.success && results.coupons.success && results.entregadores.success
      console.log("[Admin v102] Resultado:", results)
      
      if (allSuccess) {
        setSaveSuccess(true)
        // Toast verde de sucesso com todos os contadores
        const parts = []
        if (results.products.count > 0) parts.push(`${results.products.count} produtos`)
        if (results.neighborhoods.count > 0) parts.push(`${results.neighborhoods.count} bairros`)
        if (results.coupons.count > 0) parts.push(`${results.coupons.count} cupons`)
        if (results.entregadores.count > 0) parts.push(`${results.entregadores.count} entregadores`)
        const summary = parts.length > 0 ? ` (${parts.join(', ')})` : ''
        showToast(`Salvo no Supabase${summary}`)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        // Mostra APENAS erro real atual - sem concatenar erros antigos
        const firstError = results.storeSettings.error || results.products.error || results.neighborhoods.error || results.coupons.error || results.entregadores.error || 'Erro desconhecido'
        showToast(firstError)
      }
      
    } catch (error) {
      console.error("[Admin v102] Erro geral:", error)
      showToast(String(error))
    } finally {
      setSaving(false)
    }
  }

  // ========== FUNCOES DE PRODUTO ==========
  const updateProduct = (id: number, field: keyof Product, value: string | number | boolean) => {
    setConfig(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === id ? { ...p, [field]: value } : p),
    }))
  }

  const addProduct = () => {
    const newId = Math.max(...config.products.map(p => p.id), 0) + 1
    const newOrder = Math.max(...config.products.map(p => p.order || 0), 0) + 1
    setConfig(prev => ({
      ...prev,
      products: [...prev.products, { id: newId, name: "Novo Produto", price: 10, description: "Descricao do produto", active: true, stock: 100, outOfStock: false, order: newOrder }],
    }))
  }

  const removeProduct = (id: number) => setDeleteProductId(id)

  const confirmDeleteProduct = () => {
    if (deleteProductId !== null) {
      setConfig(prev => ({ ...prev, products: prev.products.filter(p => p.id !== deleteProductId) }))
      showToast("Produto excluido")
      setDeleteProductId(null)
    }
  }

  const moveProduct = (id: number, direction: "up" | "down" | "top" | "bottom") => {
    const products = [...config.products].sort((a, b) => (a.order || 0) - (b.order || 0))
    const index = products.findIndex(p => p.id === id)
    
    if (direction === "up" && index === 0) return
    if (direction === "down" && index === products.length - 1) return
    if (direction === "top" && index === 0) return
    if (direction === "bottom" && index === products.length - 1) return
    
    let newProducts = [...products]
    const [movedProduct] = newProducts.splice(index, 1)
    
    if (direction === "up") {
      newProducts.splice(index - 1, 0, movedProduct)
    } else if (direction === "down") {
      newProducts.splice(index + 1, 0, movedProduct)
    } else if (direction === "top") {
      newProducts.unshift(movedProduct)
    } else if (direction === "bottom") {
      newProducts.push(movedProduct)
    }
    
    // Atualizar ordem de todos os produtos
    newProducts = newProducts.map((p, i) => ({ ...p, order: i, displayOrder: i }))
    setConfig(prev => ({ ...prev, products: newProducts }))
  }

  // ========== FUNCOES DE CUPOM ==========
  const addCoupon = () => {
    const newCoupon: Coupon = { id: `coupon-${Date.now()}`, code: "NOVO10", type: "percentage", value: 10, active: true, minimumOrder: 0 }
    setConfig(prev => ({ ...prev, coupons: [...(prev.coupons || []), newCoupon] }))
  }

  const updateCoupon = (id: string, field: keyof Coupon, value: string | number | boolean | undefined) => {
    setConfig(prev => ({ ...prev, coupons: (prev.coupons || []).map(c => c.id === id ? { ...c, [field]: value } : c) }))
  }

  const removeCoupon = (id: string) => {
    setConfig(prev => ({ ...prev, coupons: (prev.coupons || []).filter(c => c.id !== id) }))
  }

  // ========== FUNCOES DE BAIRRO ==========
  const addNeighborhoodFee = () => {
    const newFee: NeighborhoodFee = { name: "Novo Bairro", fee: 5, active: true }
    setConfig(prev => ({ ...prev, delivery: { ...prev.delivery, neighborhoodFees: [...(prev.delivery?.neighborhoodFees || []), newFee] } }))
  }

  const updateNeighborhoodFee = (index: number, field: keyof NeighborhoodFee, value: string | number | boolean) => {
    setConfig(prev => ({
      ...prev,
      delivery: { ...prev.delivery, neighborhoodFees: (prev.delivery?.neighborhoodFees || []).map((f, i) => i === index ? { ...f, [field]: value } : f) },
    }))
  }

  const removeNeighborhoodFee = (index: number) => {
    setConfig(prev => ({ ...prev, delivery: { ...prev.delivery, neighborhoodFees: (prev.delivery?.neighborhoodFees || []).filter((_, i) => i !== index) } }))
  }

  // ========== FUNCOES DE PEDIDO ==========
  const updateOrderStatus = async (orderId: string, status: Order["status"]) => {
    try {
      const res = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: sessionPassword, orderId, status }) })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
        setTimeout(() => loadOrders(), 500)
      }
    } catch (error) { console.error("Erro ao atualizar pedido:", error) }
  }

  const updatePaymentStatus = async (orderId: string, paymentStatus: Order["paymentStatus"], manuallyConfirmed: boolean) => {
    try {
      const res = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: sessionPassword, orderId, paymentStatus, manuallyConfirmed }) })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus, manuallyConfirmed, status: manuallyConfirmed ? "confirmed" : o.status, confirmedAt: manuallyConfirmed ? new Date().toISOString() : o.confirmedAt } : o))
        setTimeout(() => loadOrders(), 500)
      }
    } catch (error) { console.error("Erro ao atualizar pagamento:", error) }
  }

  const assignEntregador = async (orderId: string, entregador: Entregador) => {
    try {
      const res = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: sessionPassword, orderId, entregadorId: entregador.id, entregadorNome: entregador.nome, entregadorWhatsapp: entregador.whatsapp }) })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, entregadorId: entregador.id, entregadorNome: entregador.nome, entregadorWhatsapp: entregador.whatsapp } : o))
        showToast(`Entregador ${entregador.nome} selecionado`)
      }
    } catch (error) { console.error("Erro ao atribuir entregador:", error) }
  }

  const removeEntregador = async (orderId: string) => {
    try {
      const res = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: sessionPassword, orderId, limparEntregador: true }) })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, entregadorId: undefined, entregadorNome: undefined, entregadorWhatsapp: undefined } : o))
        showToast("Entregador removido")
      }
    } catch (error) { console.error("Erro ao remover entregador:", error) }
  }

  const marcarSaiuParaEntrega = async (orderId: string) => {
    try {
      const res = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: sessionPassword, orderId, status: "delivering" }) })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "delivering", saiuParaEntregaEm: new Date().toISOString() } : o))
        showToast("Pedido saiu para entrega!")
        setTimeout(() => loadOrders(), 500)
      }
    } catch (error) { console.error("Erro ao marcar saiu para entrega:", error) }
  }

  const voltarParaPreparo = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    const novoHistorico = [...(order.historicoEntrega || []), { data: new Date().toISOString(), evento: "RETORNOU_PREPARO", observacao: `Retornou do entregador: ${order.entregadorNome || "N/A"}` }]
    try {
      const res = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: sessionPassword, orderId, status: "preparing", limparEntregador: true, historicoEntrega: novoHistorico }) })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "preparing", entregadorId: undefined, entregadorNome: undefined, entregadorWhatsapp: undefined, saiuParaEntregaEm: undefined, historicoEntrega: novoHistorico } : o))
        showToast("Pedido voltou para preparo")
      }
    } catch (error) { console.error("Erro ao voltar para preparo:", error) }
  }

  const registrarProblemaEntrega = async (orderId: string, observacao: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    const novoHistorico = [...(order.historicoEntrega || []), { data: new Date().toISOString(), evento: "PROBLEMA", observacao }]
    try {
      const res = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: sessionPassword, orderId, historicoEntrega: novoHistorico }) })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, historicoEntrega: novoHistorico } : o))
        showToast("Problema registrado")
        setProblemaEntregaOrderId(null)
        setProblemaEntregaObs("")
      }
    } catch (error) { console.error("Erro ao registrar problema:", error) }
  }

  const deleteSingleOrder = async (orderId: string) => {
    setDeleteLoading(true)
    try {
      const res = await fetch("/api/orders", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: sessionPassword, orderIds: [orderId] }) })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.filter(o => o.id !== orderId))
        showToast("Pedido excluido")
        setShowDeleteConfirm(null)
      } else { showToast(data.error || "Erro ao excluir") }
    } catch (error) {
      console.error("Erro ao excluir pedido:", error)
      showToast("Erro ao excluir pedido")
    } finally { setDeleteLoading(false) }
  }

  const deleteMultipleOrders = async () => {
    if (selectedOrders.size === 0) return
    setDeleteLoading(true)
    try {
      const res = await fetch("/api/orders", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: sessionPassword, orderIds: Array.from(selectedOrders) }) })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.filter(o => !selectedOrders.has(o.id)))
        showToast(`${selectedOrders.size} pedido(s) excluido(s)`)
        setSelectedOrders(new Set())
        setShowDeleteMultiple(false)
      } else { showToast(data.error || "Erro ao excluir") }
    } catch (error) {
      console.error("Erro ao excluir pedidos:", error)
      showToast("Erro ao excluir pedidos")
    } finally { setDeleteLoading(false) }
  }

  const archiveAllOrders = async () => {
    try {
      const res = await fetch("/api/orders", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: sessionPassword, action: "archive_all" }) })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => ({ ...o, archived: true })))
        setShowArchiveConfirm(false)
      }
    } catch (error) { console.error("Erro ao arquivar pedidos:", error) }
  }

  const restaurarPedido = async (orderId: string) => {
    try {
      const res = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: sessionPassword, orderId, archived: false }) })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, archived: false } : o))
        showToast("Pedido restaurado!")
      }
    } catch (error) { console.error("Erro ao restaurar pedido:", error) }
  }

  const cleanupDuplicates = async () => {
    try {
      const res = await fetch("/api/orders", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: sessionPassword, action: "cleanup_duplicates" }) })
      const data = await res.json()
      if (data.success) {
        showToast(`Limpeza concluida: ${data.removedCount} duplicata(s) removida(s)`)
        loadOrders()
      }
    } catch (error) {
      console.error("Erro ao limpar duplicatas:", error)
      showToast("Erro ao limpar duplicatas")
    }
  }

  // ========== SELECAO DE PEDIDOS ==========
  const toggleOrderSelection = (orderId: string, tab: TabType) => {
    if (selectedOrdersTab && selectedOrdersTab !== tab && selectedOrders.size > 0) {
      setShowTabWarning(true)
      return
    }
    setSelectedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
        if (newSet.size === 0) setSelectedOrdersTab(null)
      } else {
        newSet.add(orderId)
        setSelectedOrdersTab(tab)
      }
      return newSet
    })
  }

  const selectAllOrders = (ordersList: Order[], tab: TabType) => {
    if (selectedOrdersTab && selectedOrdersTab !== tab && selectedOrders.size > 0) {
      setShowTabWarning(true)
      return
    }
    setSelectedOrders(new Set(ordersList.map(o => o.id)))
    setSelectedOrdersTab(tab)
  }

  const deselectAllOrders = () => {
    setSelectedOrders(new Set())
    setSelectedOrdersTab(null)
  }

  const confirmAssignEntregador = async () => {
    if (!confirmEntregador) return
    await assignEntregador(confirmEntregador.orderId, confirmEntregador.entregador)
    setConfirmEntregador(null)
  }

  const markOrdersAsSeen = () => {
    setNewOrdersCount(0)
    setPulsingOrders(new Set())
    showToast("Pedidos marcados como vistos")
  }

  // ========== FUNCOES DE WHATSAPP ==========
  const sendOrderToEntregador = (order: Order, entregadorWhatsapp: string) => {
    const phone = normalizePhoneForWhatsApp(entregadorWhatsapp)
    const message = generateEntregadorMessage(order)
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank")
  }

  const openCustomerWhatsApp = (phone: string, message?: string) => {
    const cleanPhone = normalizePhoneForWhatsApp(phone)
    const defaultMessage = message || "Ola, seu pedido esta em preparacao!"
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultMessage)}`, "_blank")
  }

  const chargeOnWhatsApp = (order: Order) => {
    const phone = normalizePhoneForWhatsApp(order.customerPhone)
    const message = encodeURIComponent(`Ola! Vimos que seu pedido na P.K Gostosuras ficou pendente. Deseja finalizar agora?`)
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank")
  }

  const sendTrackingLinkToCustomer = (order: Order) => {
    const orderCode = getOrderCode(order)
    const link = getOrderTrackingLink(orderCode)
    const phone = normalizePhoneForWhatsApp(order.customerPhone)
    const message = `Ola!\n\nAcompanhe seu pedido em tempo real:\n\n${link}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank")
  }

  // ========== FUNCOES DE COPIA ==========
  const copyOrderData = async (order: Order) => {
    const orderCode = getOrderCode(order)
    const text = `Pedido: ${orderCode}\nCliente: ${order.customerName}\nTelefone: ${order.customerPhone}\nEndereco: ${order.address || "N/A"}\nBairro: ${order.neighborhood || "N/A"}\nReferencia: ${order.reference || "N/A"}\nItens: ${formatOrderItems(order)}\nTotal: R$ ${order.total.toFixed(2)}\nPagamento: ${order.paymentMethod}\nStatus: ${getPaymentStatusLabel(order.paymentStatus)}`
    await copyToClipboardRobust(text, () => { setCopiedOrderId(order.id); setTimeout(() => setCopiedOrderId(null), 2000) }, (t) => setManualCopyText(t))
  }

  const copyTrackingLink = async (order: Order) => {
    const orderCode = getOrderCode(order)
    const link = getOrderTrackingLink(orderCode)
    try {
      await navigator.clipboard.writeText(link)
      setCopiedLinkId(order.id)
      showToast("Link copiado!")
      setTimeout(() => setCopiedLinkId(null), 2000)
    } catch { setManualCopyText(link) }
  }

  // ========== ARQUIVAMENTO AUTOMATICO ==========
  useEffect(() => {
    if (!isAuthenticated || orders.length === 0 || !config.storeHours?.autoArchiveDays) return
    const autoArchiveOldOrders = async () => {
      const autoArchiveDays = config.storeHours?.autoArchiveDays || 0
      if (autoArchiveDays === 0) return
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
          await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: sessionPassword, orderId: order.id, archived: true }) })
        }
        loadOrders()
      }
    }
    autoArchiveOldOrders()
  }, [config.storeHours?.autoArchiveDays, orders.length, isAuthenticated, orders, sessionPassword, loadOrders])

  // ========== FILTRO POR DATA ==========
  const filterByDate = (order: Order): boolean => {
    if (dateFilter === "all") return true
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const confirmed = isOrderConfirmed(order)
    const dateStr = confirmed && order.paidAt ? order.paidAt : order.createdAt
    const orderDate = new Date(dateStr)
    switch (dateFilter) {
      case "today": return orderDate >= today
      case "yesterday": return orderDate >= yesterday && orderDate < today
      case "week": return orderDate >= weekStart
      case "month": return orderDate >= monthStart
      default: return true
    }
  }

  // ========== FILTRO DE PEDIDOS ATIVOS ==========
  const activeOrders = orders.filter(o => {
    if (o.archived) return false
    if (!filterByDate(o)) return false
    if (searchQuery.trim()) {
      const query = normalizeText(searchQuery)
      const normalizedId = normalizeText(o.id)
      const normalizedName = normalizeText(o.customerName)
      const normalizedPhone = o.customerPhone.replace(/\D/g, "")
      const normalizedAddress = o.address ? normalizeText(o.address) : ""
      const normalizedPayment = o.paymentMethod ? normalizeText(o.paymentMethod) : ""
      return normalizedId.includes(query) || normalizedName.includes(query) || normalizedPhone.includes(query.replace(/\D/g, "")) || normalizedAddress.includes(query) || normalizedPayment.includes(query)
    }
    return true
  })

  // ========== ESTATISTICAS ==========
  const historicalRevenue = financialHistory.reduce((sum, h) => sum + h.total, 0)
  const historicalPixAuto = financialHistory.filter(h => h.paymentMethod === "PIX Asaas").reduce((s, h) => s + h.total, 0)
  const historicalPixManual = financialHistory.filter(h => h.paymentMethod === "PIX Manual" || h.paymentMethod === "PIX").reduce((s, h) => s + h.total, 0)
  const historicalDinheiro = financialHistory.filter(h => h.paymentMethod === "Dinheiro").reduce((s, h) => s + h.total, 0)
  const historicalCartao = financialHistory.filter(h => h.paymentMethod === "Cartao" || h.paymentMethod === "Cartão").reduce((s, h) => s + h.total, 0)

  const reportStats: ReportStats = {
    totalOrders: activeOrders.length + financialHistory.length,
    totalRevenue: activeOrders.reduce((sum, o) => sum + o.total, 0) + historicalRevenue,
    confirmedOrders: activeOrders.filter(isOrderConfirmed),
    pixAutomatic: activeOrders.filter(o => (o.isPixAutomatic || o.paymentMethod === "PIX Asaas") && isOrderConfirmed(o)),
    pixManual: activeOrders.filter(o => (o.paymentMethod === "PIX Manual" || (o.paymentMethod === "PIX" && !o.isPixAutomatic)) && isOrderConfirmed(o)),
    dinheiro: activeOrders.filter(o => o.paymentMethod === "Dinheiro" && isOrderConfirmed(o)),
    cartao: activeOrders.filter(o => (o.paymentMethod === "Cartao" || o.paymentMethod === "Cartão") && isOrderConfirmed(o)),
    historicalPixAuto,
    historicalPixManual,
    historicalDinheiro,
    historicalCartao,
    historicalRevenue,
    historicalCount: financialHistory.length,
    confirmedRevenue: activeOrders.filter(isOrderConfirmed).reduce((sum, o) => sum + o.total, 0) + historicalRevenue,
    pendingRevenue: activeOrders.filter(o => !isOrderConfirmed(o) && o.status !== "cancelled").reduce((sum, o) => sum + o.total, 0),
  }

  const getTopProducts = () => {
    const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {}
    activeOrders.filter(isOrderConfirmed).forEach(order => {
      if (order.itemsDetailed && Array.isArray(order.itemsDetailed)) {
        order.itemsDetailed.forEach((item: { name?: string; productName?: string; quantity?: number; price?: number; subtotal?: number }) => {
          const productName = item.name || item.productName || "Produto sem nome"
          const qty = item.quantity || 1
          const itemPrice = item.price || 0
          const itemRevenue = item.subtotal || (itemPrice * qty) || 0
          if (!productName || productName === "Produto sem nome" || typeof productName === "number") return
          const key = productName
          if (!productSales[key]) productSales[key] = { name: productName, quantity: 0, revenue: 0 }
          productSales[key].quantity += qty
          productSales[key].revenue += itemRevenue
        })
      }
    })
    return Object.values(productSales).filter(p => p.name && typeof p.name === "string" && p.quantity > 0).sort((a, b) => b.quantity - a.quantity).slice(0, 10)
  }

  const getTopCustomers = () => {
    const customerStats: Record<string, { name: string, phone: string, orders: number, revenue: number, lastOrder: string }> = {}
    activeOrders.filter(o => o.paymentStatus === "confirmed" || o.manuallyConfirmed).forEach(order => {
      const key = order.customerPhone || order.customerName
      if (!customerStats[key]) customerStats[key] = { name: order.customerName, phone: order.customerPhone, orders: 0, revenue: 0, lastOrder: order.createdAt }
      customerStats[key].orders += 1
      customerStats[key].revenue += order.total
      if (order.createdAt > customerStats[key].lastOrder) customerStats[key].lastOrder = order.createdAt
    })
    return Object.values(customerStats).sort((a, b) => b.orders - a.orders).slice(0, 10)
  }

  // ========== FILTROS DE ABAS ==========
  // Pedidos aguardando pagamento: status=pending E nao tem confirmacao
  const ordersPendingPayment = activeOrders.filter(o => 
    o.status === "pending" && 
    o.paymentStatus !== "confirmed" && 
    !o.manuallyConfirmed && 
    !o.confirmedAutomatically && 
    !o.paidAt
  )
  // Pedidos confirmados aguardando preparo: status=confirmed OU (status=pending com pagamento confirmado)
  const ordersPaidWaiting = activeOrders.filter(o => 
    o.status === "confirmed" || 
    (o.status === "pending" && (o.paymentStatus === "confirmed" || o.manuallyConfirmed || o.confirmedAutomatically || o.paidAt))
  )
  const ordersPreparing = activeOrders.filter(o => o.status === "preparing")
  const ordersDelivering = activeOrders.filter(o => o.status === "delivering")
  const ordersCompleted = activeOrders.filter(o => o.status === "completed")
  const ordersCancelled = activeOrders.filter(o => o.status === "cancelled")
  const abandonedMinutes = config.storeHours?.abandonedOrderMinutes || 15
  const ordersAbandoned = activeOrders.filter(o => {
    if (o.status === "cancelled" || o.status === "completed") return false
    if (isOrderConfirmed(o)) return false
    const createdAt = new Date(o.createdAt).getTime()
    const now = Date.now()
    const minutesPassed = (now - createdAt) / (1000 * 60)
    return minutesPassed >= abandonedMinutes
  })
  const ordersArchived = orders.filter(o => {
    if (!o.archived) return false
    if (archivedSearchQuery.trim()) {
      const query = normalizeText(archivedSearchQuery)
      const normalizedId = normalizeText(o.id)
      const normalizedName = normalizeText(o.customerName)
      const normalizedPhone = o.customerPhone.replace(/\D/g, "")
      return normalizedId.includes(query) || normalizedName.includes(query) || normalizedPhone.includes(query.replace(/\D/g, ""))
    }
    return true
  })

  // ========== FUNCAO DE BUSCA ==========
  const executeSearch = () => {
    setSearchQuery(searchInput)
    if (!searchInput.trim()) return
    const query = normalizeText(searchInput)
    const matchingOrder = orders.find(o => {
      if (o.archived) return false
      const normalizedId = normalizeText(o.id)
      const normalizedName = normalizeText(o.customerName)
      const normalizedPhone = o.customerPhone.replace(/\D/g, "")
      const normalizedAddress = o.address ? normalizeText(o.address) : ""
      const normalizedPayment = o.paymentMethod ? normalizeText(o.paymentMethod) : ""
      return normalizedId.includes(query) || normalizedName.includes(query) || normalizedPhone.includes(query.replace(/\D/g, "")) || normalizedAddress.includes(query) || normalizedPayment.includes(query)
    })
    if (matchingOrder) {
      const isPendingPayment = matchingOrder.paymentStatus !== "confirmed" && !matchingOrder.manuallyConfirmed && !matchingOrder.confirmedAutomatically && !matchingOrder.paidAt && !["preparing", "delivering", "completed", "cancelled"].includes(matchingOrder.status)
      const isPaidWaiting = (matchingOrder.paymentStatus === "confirmed" || matchingOrder.manuallyConfirmed || matchingOrder.confirmedAutomatically || matchingOrder.paidAt) && matchingOrder.status === "confirmed"
      if (isPendingPayment) setActiveTab("orders-pending")
      else if (isPaidWaiting) setActiveTab("orders-paid")
      else if (matchingOrder.status === "preparing") setActiveTab("orders-preparing")
      else if (matchingOrder.status === "delivering") setActiveTab("orders-delivering")
      else if (matchingOrder.status === "completed") setActiveTab("orders-completed")
      else if (matchingOrder.status === "cancelled") setActiveTab("orders-cancelled")
    }
  }

  // ========== TELA DE LOGIN ==========
  if (!isAuthenticated) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="fixed bottom-20 right-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="w-full max-w-sm relative">
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl border border-primary/10">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-primary/30 to-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20 ring-1 ring-primary/20">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Area Admin</h1>
              <p className="text-sm text-muted-foreground/70 mt-1">Digite a senha para acessar</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="w-full px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all" autoFocus />
              {authError && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg">{authError}</p>}
              <button type="submit" disabled={loading || !password} className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 shadow-lg shadow-primary/20">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Lock className="w-4 h-4" /> Entrar</>}
              </button>
            </form>
            <Link href="/" className="flex items-center justify-center gap-2 mt-5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar para a loja
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ========== PAINEL ADMIN ==========
  return (
    <div className="dark min-h-screen bg-background">
      <AdminHeader storeName={storeSettings.storeName} newOrdersCount={newOrdersCount} soundActivated={soundActivated} soundEnabled={soundEnabled} saving={saving} saveSuccess={saveSuccess} onRefresh={() => loadOrdersWithNotification()} onActivateSound={activateSound} onTestSound={playTestSound} onToggleSound={() => setSoundEnabled(!soundEnabled)} onSave={handleSave} onLogout={handleLogout} onMarkAsSeen={markOrdersAsSeen} />
      {saveSuccess && <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 text-center text-sm font-medium animate-in slide-in-from-top shadow-lg">Alteracoes salvas com sucesso!</div>}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AdminOrdersCard activeTab={activeTab} searchInput={searchInput} dateFilter={dateFilter} searchQuery={searchQuery} activeOrdersCount={activeOrders.length} ordersPendingPayment={ordersPendingPayment} ordersPaidWaiting={ordersPaidWaiting} ordersPreparing={ordersPreparing} ordersDelivering={ordersDelivering} ordersCompleted={ordersCompleted} ordersCancelled={ordersCancelled} ordersAbandoned={ordersAbandoned} ordersArchived={ordersArchived} onSearchInputChange={setSearchInput} onDateFilterChange={setDateFilter} onSearch={executeSearch} onClearSearch={() => { setSearchInput(""); setSearchQuery("") }} onTabChange={setActiveTab} onConfirmPayment={(order) => updatePaymentStatus(order.id, "confirmed", true)} onStartPreparing={(order) => updateOrderStatus(order.id, "preparing")} onStartDelivery={(order) => updateOrderStatus(order.id, "delivering")} onFinishOrder={(order) => updateOrderStatus(order.id, "completed")} onCancelOrder={(order) => updateOrderStatus(order.id, "cancelled")} onCopyLink={(order) => copyTrackingLink(order)} onSendLink={(order) => sendTrackingLinkToCustomer(order)} onWhatsApp={(order) => openCustomerWhatsApp(order.customerPhone)} onRefresh={loadOrders} formatOrderItems={formatOrderItems} getOrderCode={getOrderCode} entregadores={config.entregadores || []} onSelectEntregador={(order, entregador) => setConfirmEntregador({ orderId: order.id, entregador })} onSendToEntregador={(order) => { if (order.entregadorWhatsapp) sendOrderToEntregador(order, order.entregadorWhatsapp) }} />
            <AdminQuickSettings activeTab={activeTab} onTabChange={setActiveTab} />
            <AdminRevenueReport ordersCompleted={ordersCompleted} ordersCancelled={ordersCancelled} />
            <Link href="/" className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-all text-sm font-medium"><ArrowLeft className="w-4 h-4" /> Ver Loja</Link>

            <div className="bg-card/80 rounded-2xl p-4 sm:p-6 border border-border/50 shadow-xl">
              {activeTab === "dashboard" && <AdminDashboard orders={orders} formatCurrency={formatCurrency} />}
              {activeTab === "store" && <AdminStoreSettings settings={storeSettings} isLoading={loading} onSettingsChange={() => {}} onPendingChanges={handlePendingSettingsChange} />}
              {activeTab === "products" && <AdminProductsSettings products={config.products} expandedProduct={expandedProduct} onExpandedProductChange={setExpandedProduct} onAddProduct={addProduct} onUpdateProduct={updateProduct} onRemoveProduct={removeProduct} onMoveProduct={moveProduct} />}
              {activeTab === "categories" && <AdminCategoriesSettings />}
              {activeTab === "banner" && <AdminBannerSettings config={config} onConfigChange={setConfig} />}
              {activeTab === "hours" && <AdminHoursSettings config={config} onConfigChange={setConfig} />}
              {activeTab === "delivery" && <AdminDeliverySettings config={config} onConfigChange={setConfig} onAddNeighborhoodFee={addNeighborhoodFee} onUpdateNeighborhoodFee={updateNeighborhoodFee} onRemoveNeighborhoodFee={removeNeighborhoodFee} />}
              {activeTab === "payment" && <AdminPaymentSettings config={config} onConfigChange={setConfig} />}
              {activeTab === "whatsapp" && <AdminWhatsappSettings config={config} onConfigChange={setConfig} />}
              {activeTab === "coupons" && <AdminCouponsSettings coupons={config.coupons || []} onAddCoupon={addCoupon} onUpdateCoupon={updateCoupon} onRemoveCoupon={removeCoupon} />}
              {activeTab === "entregadores" && <AdminEntregadoresSettings entregadores={config.entregadores || []} onAddEntregador={() => { const newToken = Math.random().toString(36).substring(2, 10) + Date.now().toString(36); const newEntregador: Entregador = { id: `entregador-${Date.now()}`, nome: "", whatsapp: "", status: "ativo", disponibilidade: "disponivel", horarioInicio: "08:00", horarioFim: "22:00", observacao: "", pin: "", token: newToken }; setConfig(prev => ({ ...prev, entregadores: [...(prev.entregadores || []), newEntregador] })) }} onUpdateEntregador={(id, field, value) => setConfig(prev => ({ ...prev, entregadores: (prev.entregadores || []).map(ent => ent.id === id ? { ...ent, [field]: value } : ent) }))} onRemoveEntregador={(id) => setConfig(prev => ({ ...prev, entregadores: (prev.entregadores || []).filter(ent => ent.id !== id) }))} getEntregadorPanelLink={getEntregadorPanelLink} copyToClipboard={copyToClipboardRobust} normalizePhoneForWhatsApp={normalizePhoneForWhatsApp} showToast={showToast} setManualEntregadorLink={setManualEntregadorLink} />}
              {activeTab === "customization" && <AdminCustomization onSave={() => loadConfig()} />}
              {activeTab === "reports" && <AdminReportsSettings reportStats={reportStats} getTopProducts={getTopProducts} getTopCustomers={getTopCustomers} onCleanupDuplicates={cleanupDuplicates} onShowArchiveConfirm={() => setShowArchiveConfirm(true)} formatCurrency={formatCurrency} />}

              {/* Pedidos agora sao gerenciados pelo AdminOrdersCard expansivel */}
            </div>
          </div>
        )}

        {/* Toast de notificacao */}
        {toastMessage && <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-foreground text-background rounded-xl shadow-2xl z-50 animate-in slide-in-from-bottom">{toastMessage}</div>}

        {/* Marca de versao v94 */}
        <div className="fixed bottom-2 right-2 text-xs text-muted-foreground/50 font-mono">
          Admin v100 - Supabase Only
        </div>

        {/* Modais */}
        <AdminModals confirmEntregador={confirmEntregador} onCancelEntregador={() => setConfirmEntregador(null)} onConfirmEntregador={confirmAssignEntregador} showDeleteConfirm={showDeleteConfirm} onCancelDelete={() => setShowDeleteConfirm(null)} onConfirmDelete={deleteSingleOrder} deleteLoading={deleteLoading} showTabWarning={showTabWarning} onDismissTabWarning={() => setShowTabWarning(false)} onDeselectAllOrders={deselectAllOrders} showDeleteMultiple={showDeleteMultiple} selectedOrdersCount={selectedOrders.size} onCancelDeleteMultiple={() => setShowDeleteMultiple(false)} onConfirmDeleteMultiple={deleteMultipleOrders} showArchiveConfirm={showArchiveConfirm} onCancelArchive={() => setShowArchiveConfirm(false)} onConfirmArchive={archiveAllOrders} manualCopyText={manualCopyText} onCloseManualCopy={() => setManualCopyText(null)} manualEntregadorLink={manualEntregadorLink} onCloseEntregadorLink={() => setManualEntregadorLink(null)} deleteProductId={deleteProductId !== null ? String(deleteProductId) : null} onCancelDeleteProduct={() => setDeleteProductId(null)} onConfirmDeleteProduct={confirmDeleteProduct} />
      </div>
    </div>
  )
}
