"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, ShoppingCart, Send, MapPin, User, CreditCard, MessageSquare, X, Copy, Check, Loader2, MapPinned, Phone, Home as HomeIcon, AlertCircle, Tag, Truck, MessageCircle, Clock, ChevronRight, Package, Zap } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { type SiteConfig, defaultConfig } from "@/lib/config-types"

// Types, Constants e Utils da area do cliente
import type { PaymentStatus, DeliveryType, OrderSnapshot, PixData, CustomerOrder, SavedOrder, Coupon, Customer, FormData } from "./(store)/types"
import { CUSTOMER_SESSION_KEY, ORDER_STORAGE_KEY, DEFAULT_FORM_DATA, TOAST_DURATION, FALLBACK_NEIGHBORHOOD_FEES } from "./(store)/constants"
import { formatCurrency, generateOrderId, normalizeProductName, generatePixCode } from "./(store)/utils"
import { useCart } from "./(store)/hooks/useCart"
import { HeroBanner, StoreClosedBanner, ProductList, CartSummary, FloatingCartButton, StoreFooter, StoreHeader, CartDrawer } from "./(store)/components"
import { ConfirmPixActiveModal, NewOrderOptionsModal, CustomerLoginModal, MyAccountModal, MyOrdersModal, RepeatOrderModal, Toast, AddToCartToast } from "./(store)/components/modals"

export default function Home() {
  // Config do site carregada da API
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(defaultConfig)
  const [configLoaded, setConfigLoaded] = useState(false)

  // Dados derivados da config
  const products = siteConfig.products
    .filter(p => p.active !== false)
    .filter(p => !p.outOfStock)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
  const WHATSAPP_NUMBER = siteConfig.whatsapp?.number || ""
  const MIN_VALUE_FOR_ASAAS = Number(siteConfig.payment?.minValueForAsaas) || 15
  const PIX_MANUAL_KEY = siteConfig.pixManual?.key || ""
  const PIX_MANUAL_KEY_FULL = siteConfig.pixManual?.keyFull || ""
  const PIX_MANUAL_NAME = siteConfig.pixManual?.receiverName || ""
  const PIX_RECEIVER_NAME = siteConfig.pixManual?.receiverName || ""
  const PIX_MANUAL_CITY = siteConfig.pixManual?.city || "SAO PAULO"
  const DELIVERY_FEE = siteConfig.delivery?.defaultFee || 0
  const MINIMUM_ORDER = siteConfig.delivery?.minimumOrder || 0
  const DELIVERY_ENABLED = siteConfig.delivery?.enabled !== false
  const PICKUP_ENABLED = siteConfig.delivery?.pickupEnabled !== false
  const STORE_NAME = siteConfig.storeName || "P.K Gostosuras"

  // Verificar se esta dentro do horario de funcionamento
  const isWithinBusinessHours = (): boolean => {
    const openTime = siteConfig.storeHours?.openTime || "18:00"
    const closeTime = siteConfig.storeHours?.closeTime || "23:30"
    
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentMinutes = currentHour * 60 + currentMinute
    
    const [openHour, openMin] = openTime.split(":").map(Number)
    const [closeHour, closeMin] = closeTime.split(":").map(Number)
    const openMinutes = openHour * 60 + openMin
    const closeMinutes = closeHour * 60 + closeMin
    
    // Se horario de fechamento e menor que abertura (passa da meia-noite)
    // Ex: abre 18:00, fecha 01:15
    if (closeMinutes < openMinutes) {
      // Esta aberto se: depois da abertura OU antes do fechamento
      return currentMinutes >= openMinutes || currentMinutes < closeMinutes
    } else {
      // Horario normal (ex: 08:00 as 22:00)
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes
    }
  }

  // Estado para controlar hydration - evita mismatch server/client
  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Status da loja via localStorage (FONTE UNICA DE VERDADE)
  // Chave: pk-store-status (mesma do AdminStoreSettings)
  const [storeStatusData, setStoreStatusData] = useState<{
    storeOpen: boolean
    manualControl: boolean
    openTime: string
    closeTime: string
    closedMessage: string
  } | null>(null)
  
  // Atualiza status da loja periodicamente do Supabase (a cada 30s)
  useEffect(() => {
    if (!isClient) return
    
    const refreshStoreStatus = async () => {
      try {
        const res = await fetch('/api/store-settings', { cache: 'no-store' })
        const data = await res.json()
        if (data.success && data.settings) {
          const s = data.settings
          setStoreStatusData({
            storeOpen: s.storeOpen ?? true,
            manualControl: s.manualControl ?? false,
            openTime: s.openTime || s.storeHours?.openTime || '10:00',
            closeTime: s.closeTime || s.storeHours?.closeTime || '22:00',
            closedMessage: s.closedMessage || s.storeHours?.closedMessage || 'Estamos fechados no momento.'
          })
        }
      } catch (err) {
        console.error('[Store] Erro ao atualizar status:', err)
      }
    }
    
    // Atualiza a cada 30 segundos
    const interval = setInterval(refreshStoreStatus, 30000)
    return () => clearInterval(interval)
  }, [isClient])

  // Verifica horario de funcionamento usando dados do Supabase
  const isWithinBusinessHoursLocal = useCallback(() => {
    if (!storeStatusData) return true
    
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    
    const [openH, openM] = storeStatusData.openTime.split(":").map(Number)
    const [closeH, closeM] = storeStatusData.closeTime.split(":").map(Number)
    const openMinutes = openH * 60 + openM
    const closeMinutes = closeH * 60 + closeM
    
    // Horario normal (abre e fecha no mesmo dia)
    if (openMinutes < closeMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes
    } else {
      // Horario que cruza meia-noite
      return currentMinutes >= openMinutes || currentMinutes < closeMinutes
    }
  }, [storeStatusData])

  // Loja esta realmente aberta
  // Se manualControl === true, IGNORA COMPLETAMENTE os horarios
  // Se manualControl === false, verifica horario de funcionamento
  const isStoreOpen = isClient ? (
    storeStatusData 
      ? (storeStatusData.manualControl ? storeStatusData.storeOpen : isWithinBusinessHoursLocal())
      : true // Fallback: aberta ate carregar
  ) : true

  // Hook do carrinho - gerencia quantities, showCart, toast de adicao e som
  const cart = useCart({ products })
  const { quantities, setQuantities, showCart, setShowCart, updateQuantity, getTotalItems, addToast, addToCartAudioRef } = cart
  
  const [formData, setFormData] = useState<FormData>({ ...DEFAULT_FORM_DATA })
  
  // Cupom
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponError, setCouponError] = useState("")
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(DELIVERY_ENABLED ? "entrega" : "retirada")
  const [showCheckout, setShowCheckout] = useState(false)
  const [useSavedData, setUseSavedData] = useState<boolean | null>(null) // null = nao escolheu, true = usar salvos, false = novo endereco
  const [copied, setCopied] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  
  // Asaas PIX states
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle")
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string>("")
  const [pixData, setPixData] = useState<PixData | null>(null)
  const [orderId, setOrderId] = useState<string>("")
  const [paymentTime, setPaymentTime] = useState<string>("")
  const [manualPixCode, setManualPixCode] = useState<string>("")
  const [copiedManualKey, setCopiedManualKey] = useState(false)
  const [copiedManualCode, setCopiedManualCode] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  
  // Sistema de conta do cliente
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showMyOrdersModal, setShowMyOrdersModal] = useState(false)
  const [showMyAccountModal, setShowMyAccountModal] = useState(false)
  const [loginStep, setLoginStep] = useState<"phone" | "pin" | "register">("phone")
  const [loginPhone, setLoginPhone] = useState("")
  const [loginPin, setLoginPin] = useState("")
  const [loginName, setLoginName] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [showRepeatConfirm, setShowRepeatConfirm] = useState(false)
  const [orderToRepeat, setOrderToRepeat] = useState<typeof customerOrders[0] | null>(null)
  const [pixTimeLeft, setPixTimeLeft] = useState<number>(0)
  const [pixExpired, setPixExpired] = useState(false)
  
  // Snapshot do pedido - bloqueio apos gerar PIX
  const [orderSnapshot, setOrderSnapshot] = useState<OrderSnapshot | null>(null)
  const isOrderLocked = orderSnapshot !== null && paymentStatus === "awaiting" && !pixExpired
  
  // Cooldown para novo PIX (anti-spam)
  const [pixCooldownEnd, setPixCooldownEnd] = useState<number | null>(null)
  const [pixCooldownLeft, setPixCooldownLeft] = useState<number>(0)
  
  const [showChangePaymentModal, setShowChangePaymentModal] = useState(false)
  const [showManualPixDuringCooldown, setShowManualPixDuringCooldown] = useState(false)
  
  // Verifica se esta em cooldown (bloqueio anti-spam)
  const isInCooldown = pixCooldownEnd !== null && pixCooldownLeft > 0
  
  // Pedido bloqueado = PIX ativo OU em cooldown
  const isOrderBlocked = isOrderLocked || isInCooldown
  
  // Verificar se dados do cliente estao confirmados
  // Para clientes logados com dados salvos: precisa escolher "Usar dados salvos" ou "Novo endereco"
  // Para clientes sem dados salvos ou nao logados: nao exige escolha
  const hasDataToChoose = customer && (customer.savedAddress || customerOrders.length > 0)
  const needsAddressChoice = hasDataToChoose && useSavedData === null
  
  // Validar se o endereco esta completo (para entrega)
  const isAddressComplete = deliveryType === "retirada" || (
    formData.nome.trim() !== "" &&
    formData.telefone.trim() !== "" &&
    formData.endereco.trim() !== "" &&
    formData.numero.trim() !== "" &&
    formData.bairro.trim() !== ""
  )
  
  // Dados confirmados = escolheu opcao (se necessario) E endereco completo (se entrega)
  const isDataConfirmed = !needsAddressChoice && isAddressComplete

  // Mostrar toast
  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), TOAST_DURATION)
  }
  
  // Funcao para preencher dados do cliente no formulario
  const fillFormWithCustomerData = (customerData: Customer) => {
    setFormData(prev => ({
      ...prev,
      nome: customerData.name || prev.nome,
      telefone: customerData.phone || prev.telefone,
      endereco: customerData.savedAddress?.endereco || prev.endereco,
      numero: customerData.savedAddress?.numero || prev.numero,
      bairro: customerData.savedAddress?.bairro || prev.bairro,
      referencia: customerData.savedAddress?.referencia || prev.referencia,
    }))
  }
  
  // Carregar sessao do cliente ao iniciar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSession = localStorage.getItem(CUSTOMER_SESSION_KEY)
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession) as Customer
          setCustomer(parsed)
          // Preencher dados automaticamente
          fillFormWithCustomerData(parsed)
        } catch {
          localStorage.removeItem(CUSTOMER_SESSION_KEY)
        }
      }
    }
  }, [])
  
  // Salvar sessao do cliente
  const saveCustomerSession = (customerData: Customer) => {
    setCustomer(customerData)
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(customerData))
  }
  
  // Logout do cliente
  const handleCustomerLogout = () => {
    setCustomer(null)
    localStorage.removeItem(CUSTOMER_SESSION_KEY)
    setShowProfileMenu(false)
    setUseSavedData(null)
    showToast("Voce saiu da sua conta")
  }
  
  // Usar dados salvos do cliente
  const handleUseSavedData = () => {
    if (customer) {
      // Primeiro tentar usar savedAddress do cliente
      if (customer.savedAddress && customer.savedAddress.endereco) {
        setFormData(prev => ({
          ...prev,
          nome: customer.name || prev.nome,
          telefone: customer.phone || prev.telefone,
          endereco: customer.savedAddress?.endereco || prev.endereco,
          numero: customer.savedAddress?.numero || prev.numero,
          bairro: customer.savedAddress?.bairro || prev.bairro,
          referencia: customer.savedAddress?.referencia || prev.referencia,
        }))
      } 
      // Se nao tem savedAddress, tentar usar dados do ultimo pedido
      else if (customerOrders.length > 0) {
        const lastOrder = customerOrders[0] // O mais recente
        // Extrair dados do endereco (formato: "Rua X, 123")
        const addressParts = (lastOrder.address || "").split(" - ")
        const enderecoNumero = addressParts[0] || ""
        const [endereco, numero] = enderecoNumero.includes(",") 
          ? enderecoNumero.split(",").map(s => s.trim())
          : [enderecoNumero, ""]
        
        setFormData(prev => ({
          ...prev,
          nome: customer.name || prev.nome,
          telefone: customer.phone || prev.telefone,
          endereco: endereco || prev.endereco,
          numero: numero || prev.numero,
          bairro: lastOrder.neighborhood || prev.bairro,
          referencia: addressParts.length > 1 ? addressParts.slice(1).join(" - ") : prev.referencia,
        }))
        
        // Definir tipo de entrega do ultimo pedido
        if (lastOrder.deliveryType === "entrega") {
          setDeliveryType("entrega")
        } else if (lastOrder.deliveryType === "retirada") {
          setDeliveryType("retirada")
        }
      }
      // Se nao tem nada, pelo menos preencher nome e telefone
      else {
        setFormData(prev => ({
          ...prev,
          nome: customer.name || prev.nome,
          telefone: customer.phone || prev.telefone,
        }))
      }
      
      setUseSavedData(true)
    }
  }
  
  // Usar novo endereco (limpar campos de endereco, manter nome e telefone)
  const handleUseNewAddress = () => {
    if (customer) {
      setFormData(prev => ({
        ...prev,
        nome: customer.name || prev.nome,
        telefone: customer.phone || prev.telefone,
        endereco: "",
        numero: "",
        bairro: "",
        referencia: "",
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        endereco: "",
        numero: "",
        bairro: "",
        referencia: "",
      }))
    }
    setUseSavedData(false)
  }
  
  // Verificar se telefone existe
  const checkPhoneExists = async (phone: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/customers?phone=${encodeURIComponent(phone)}`)
      const data = await res.json()
      return data.found === true
    } catch {
      return false
    }
  }
  
  // Fazer login
  const handleLogin = async () => {
    setLoginLoading(true)
    setLoginError("")
    
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          phone: loginPhone,
          pin: loginPin
        })
      })
      
      const data = await res.json()
      
      if (data.success) {
        saveCustomerSession(data.customer)
        fillFormWithCustomerData(data.customer)
        setShowLoginModal(false)
        resetLoginForm()
        showToast(`Bem-vindo(a), ${data.customer.name}!`)
      } else {
        setLoginError(data.error || "Erro ao fazer login")
      }
    } catch {
      setLoginError("Erro de conexao")
    } finally {
      setLoginLoading(false)
    }
  }
  
  // Criar conta
  const handleRegister = async () => {
    setLoginLoading(true)
    setLoginError("")
    
    if (loginPin.length !== 4) {
      setLoginError("PIN deve ter 4 digitos")
      setLoginLoading(false)
      return
    }
    
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          phone: loginPhone,
          name: loginName,
          pin: loginPin
        })
      })
      
      const data = await res.json()
      
      if (data.success) {
        saveCustomerSession(data.customer)
        fillFormWithCustomerData(data.customer)
        setShowLoginModal(false)
        resetLoginForm()
        showToast("Conta criada com sucesso!")
      } else {
        setLoginError(data.error || "Erro ao criar conta")
      }
    } catch {
      setLoginError("Erro de conexao")
    } finally {
      setLoginLoading(false)
    }
  }
  
  // Avancar no login
  const handleLoginNext = async () => {
    if (loginStep === "phone") {
      if (!loginPhone || loginPhone.replace(/\D/g, "").length < 10) {
        setLoginError("Digite um telefone valido")
        return
      }
      
      setLoginLoading(true)
      const exists = await checkPhoneExists(loginPhone)
      setLoginLoading(false)
      
      if (exists) {
        setLoginStep("pin")
      } else {
        setLoginStep("register")
      }
    }
  }
  
  // Resetar formulario de login
  const resetLoginForm = () => {
    setLoginStep("phone")
    setLoginPhone("")
    setLoginPin("")
    setLoginName("")
    setLoginError("")
  }
  
  // Carregar pedidos do cliente
  const loadCustomerOrders = async () => {
    if (!customer) return
    
    setLoadingOrders(true)
    try {
      const res = await fetch(`/api/customers/orders?phone=${customer.phone}`)
      const data = await res.json()
      if (data.success) {
        setCustomerOrders(data.orders || [])
      }
    } catch {
      console.error("Erro ao carregar pedidos")
    } finally {
      setLoadingOrders(false)
    }
  }
  
  // Toggle favorito
  const toggleFavorite = async (productId: number) => {
    if (!customer) {
      setShowLoginModal(true)
      return
    }
    
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          phone: customer.phone,
          toggleFavorite: productId
        })
      })
      
      const data = await res.json()
      if (data.success) {
        saveCustomerSession(data.customer)
        const isFav = data.customer.favorites.includes(productId)
        showToast(isFav ? "Adicionado aos favoritos!" : "Removido dos favoritos")
      }
    } catch {
      showToast("Erro ao atualizar favoritos")
    }
  }
  
  // Abrir confirmacao para repetir pedido
  const openRepeatConfirm = (order: typeof customerOrders[0]) => {
    if (!order.itemsDetailed || order.itemsDetailed.length === 0) {
      showToast("Nao foi possivel repetir este pedido")
      return
    }
    setOrderToRepeat(order)
    setShowRepeatConfirm(true)
  }
  
  // Funcao para normalizar nome de produto para comparacao - usando util importado
  // (mantendo a funcao local para garantir compatibilidade exata)
  
  // Confirmar e repetir pedido
  const confirmRepeatOrder = () => {
    if (!orderToRepeat || !orderToRepeat.itemsDetailed || orderToRepeat.itemsDetailed.length === 0) {
      showToast("Erro ao repetir pedido")
      setShowRepeatConfirm(false)
      setOrderToRepeat(null)
      return
    }
    
    // Criar novo carrinho com os itens do pedido antigo
    const newQuantities: Record<number, number> = {}
    
    for (const item of orderToRepeat.itemsDetailed) {
      // Tentar encontrar o produto por ID
      let product = products.find(p => p.id === item.productId)
      
      // Se nao encontrou por ID, tentar por nome
      if (!product) {
        const itemNameLower = item.productName.toLowerCase().trim()
        product = products.find(p => p.name.toLowerCase().trim() === itemNameLower)
      }
      
      // Se ainda nao encontrou, tentar match parcial
      if (!product) {
        const itemNameLower = item.productName.toLowerCase()
        product = products.find(p => 
          p.name.toLowerCase().includes(itemNameLower) || 
          itemNameLower.includes(p.name.toLowerCase())
        )
      }
      
      if (product) {
        newQuantities[product.id] = item.quantity
      }
    }
    
    // Se nenhum produto foi encontrado
    if (Object.keys(newQuantities).length === 0) {
      showToast("Produtos nao disponiveis")
      setShowRepeatConfirm(false)
      setOrderToRepeat(null)
      return
    }
    
    // Atualizar carrinho
    setQuantities(newQuantities)
    
    // Resetar escolha de dados salvos
    setUseSavedData(null)
    
    // Definir tipo de entrega
    if (orderToRepeat.deliveryType === "entrega") {
      setDeliveryType("entrega")
    } else if (orderToRepeat.deliveryType === "retirada") {
      setDeliveryType("retirada")
    }
    
    // Fechar modais primeiro
    setShowRepeatConfirm(false)
    setShowMyOrdersModal(false)
    setOrderToRepeat(null)
    
    // Abrir carrinho apos um pequeno delay
    setTimeout(() => {
      setShowCart(true)
      showToast("Itens adicionados!")
      
      // Scroll para checkout
      setTimeout(() => {
        const el = document.getElementById("checkout-section")
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 200)
    }, 50)
  }
  
  // Funcao antiga mantida para compatibilidade
  const repeatOrder = (order: typeof customerOrders[0]) => {
    openRepeatConfirm(order)
  }
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // addToCartAudioRef agora vem do useCart hook
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pixTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Interface do pedido salvo - usando tipo importado
  
  // Restaurar pedido do localStorage ao carregar
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem(ORDER_STORAGE_KEY)
      if (savedOrder) {
        const order: SavedOrder = JSON.parse(savedOrder)
        
        // Restaurar estados
        setQuantities(order.quantities || {})
        setFormData(order.formData || formData)
        setDeliveryType(order.deliveryType || "entrega")
        setShowCheckout(order.showCheckout || false)
        setPaymentStatus(order.paymentStatus || "idle")
        setPixData(order.pixData || null)
        setOrderSnapshot(order.orderSnapshot || null)
        setOrderId(order.orderId || "")
        setPixExpired(order.pixExpired || false)
        setAppliedCoupon(order.appliedCoupon || null)
        setCouponCode(order.couponCode || "")
        
        // Restaurar cooldown se ainda estiver ativo
        if (order.pixCooldownEnd && order.pixCooldownEnd > Date.now()) {
          setPixCooldownEnd(order.pixCooldownEnd)
          setPixCooldownLeft(Math.ceil((order.pixCooldownEnd - Date.now()) / 1000))
        }
        
        // Restaurar tempo do PIX se ainda estiver ativo
        if (order.pixData && order.paymentStatus === "awaiting" && !order.pixExpired) {
          // Calcular tempo restante baseado no expiresAt
          if (order.pixData.expiresAt) {
            const expiresAt = new Date(order.pixData.expiresAt).getTime()
            const now = Date.now()
            const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000))
            if (remaining > 0) {
              setPixTimeLeft(remaining)
            } else {
              setPixExpired(true)
              setPaymentStatus("idle")
            }
          } else if (order.pixTimeLeft > 0) {
            // Fallback: usar tempo salvo menos tempo decorrido
            const elapsed = Math.floor((Date.now() - order.savedAt) / 1000)
            const remaining = Math.max(0, order.pixTimeLeft - elapsed)
            if (remaining > 0) {
              setPixTimeLeft(remaining)
            } else {
              setPixExpired(true)
              setPaymentStatus("idle")
            }
          }
        }
        
        // Pedido restaurado
      }
    } catch (error) {
      console.error("Erro ao restaurar pedido:", error)
    }
  }, [])
  
  // Salvar pedido no localStorage quando houver mudancas
  useEffect(() => {
    // So salvar se tiver algo no carrinho ou checkout aberto
    const hasItems = Object.values(quantities).some(qty => qty > 0)
    const hasOrder = showCheckout || paymentStatus !== "idle" || orderSnapshot !== null
    
    if (hasItems || hasOrder) {
      const orderToSave: SavedOrder = {
        quantities,
        formData,
        deliveryType,
        showCheckout,
        paymentStatus,
        pixData,
        orderSnapshot,
        orderId,
        pixTimeLeft,
        pixExpired,
        pixCooldownEnd,
        appliedCoupon,
        couponCode,
        savedAt: Date.now()
      }
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orderToSave))
    }
  }, [quantities, formData, deliveryType, showCheckout, paymentStatus, pixData, orderSnapshot, orderId, pixTimeLeft, pixExpired, pixCooldownEnd, appliedCoupon, couponCode])

  // Retorna bairros do Supabase (sem fallback fake)
  const getNeighborhoodFees = () => {
    const realFees = siteConfig.delivery?.neighborhoodFees || []
    return { fees: realFees }
  }

  // Calcula taxa de entrega baseado no bairro
  const getDeliveryFee = () => {
    if (deliveryType === "retirada") return 0
    const { fees } = getNeighborhoodFees()
    const fee = fees.find(f => 
      f.name.toLowerCase() === formData.bairro.toLowerCase()
    )
    return fee ? fee.fee : DELIVERY_FEE
  }

  // Aplica cupom
  const applyCoupon = () => {
    setCouponError("")
    const coupons = siteConfig.coupons || []
    const coupon = coupons.find(c => 
      c.code.toLowerCase() === couponCode.toLowerCase() && c.active
    )
    
    if (!coupon) {
      setCouponError("Cupom invalido ou expirado")
      return
    }
    
    const subtotal = getSubtotal()
    if (coupon.minimumOrder > 0 && subtotal < coupon.minimumOrder) {
      setCouponError(`Pedido minimo de R$ ${coupon.minimumOrder.toFixed(2)} para este cupom`)
      return
    }
    
    setAppliedCoupon(coupon)
    setCouponCode("")
  }

  // Calcula desconto
  const getDiscount = () => {
    if (!appliedCoupon) return 0
    const subtotal = getSubtotal()
    if (appliedCoupon.type === "percentage") {
      return subtotal * (appliedCoupon.value / 100)
    }
    return Math.min(appliedCoupon.value, subtotal)
  }

  // Subtotal (sem entrega e sem desconto)
  const getSubtotal = () => {
    return products.reduce((total, product) => {
      const price = Number(product.price) || 0
      return total + price * (quantities[product.id] || 0)
    }, 0)
  }

  // Total final
  const getTotal = () => {
    const subtotal = getSubtotal()
    const discount = getDiscount()
    const deliveryFee = getDeliveryFee()
    return Math.max(0, subtotal - discount + deliveryFee)
  }

  // Modal de confirmacao para novo pedido
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false)

  // Novo pedido do zero - limpa tudo
  const startNewOrderFromScratch = () => {
    // Limpar localStorage PRIMEIRO
    localStorage.removeItem(ORDER_STORAGE_KEY)
    
    // Limpar PIX
    setPixData(null)
    setPaymentStatus("idle")
    setOrderSnapshot(null)
    setPixExpired(false)
    setPixTimeLeft(0)
    setOrderId("")
    
    // Limpar cooldown
    setPixCooldownEnd(null)
    setPixCooldownLeft(0)
    setShowManualPixDuringCooldown(false)
    
    // Limpar carrinho
    setQuantities({})
    
    // Limpar formulario - usando constante importada
    setFormData({ ...DEFAULT_FORM_DATA })
    
    // Limpar cupom
    setAppliedCoupon(null)
    setCouponCode("")
    setCouponError("")
    
    // Parar polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    
    // Fechar modais e checkout
    setShowNewOrderModal(false)
    setShowCloseConfirmModal(false)
    setShowCheckout(false)
  }

  // Novo pedido mantendo dados de entrega
  const startNewOrderKeepingData = () => {
    // Limpar localStorage PRIMEIRO
    localStorage.removeItem(ORDER_STORAGE_KEY)
    
    // Salvar dados de entrega
    const savedNome = formData.nome
    const savedTelefone = formData.telefone
    const savedEndereco = formData.endereco
    const savedNumero = formData.numero
    const savedReferencia = formData.referencia
    const savedLocalizacao = formData.localizacao
    
    // Limpar PIX
    setPixData(null)
    setPaymentStatus("idle")
    setOrderSnapshot(null)
    setPixExpired(false)
    setPixTimeLeft(0)
    setOrderId("")
    
    // Limpar cooldown
    setPixCooldownEnd(null)
    setPixCooldownLeft(0)
    setShowManualPixDuringCooldown(false)
    
    // Limpar carrinho
    setQuantities({})
    
    // Restaurar formulario com dados salvos (menos bairro)
    setFormData({
      nome: savedNome,
      telefone: savedTelefone,
      endereco: savedEndereco,
      numero: savedNumero,
      referencia: savedReferencia,
      pagamento: "pix",
      observacao: "",
      localizacao: savedLocalizacao,
      bairro: "", // Bairro deve ser reselecionado
    })
    
    // Limpar cupom
    setAppliedCoupon(null)
    setCouponCode("")
    setCouponError("")
    
    // Parar polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    
    // Fechar modais e checkout
    setShowNewOrderModal(false)
    setShowCloseConfirmModal(false)
    setShowCheckout(false)
  }

  // Tentar fechar checkout - verifica se tem PIX ativo ou cooldown
  const handleCloseCheckout = () => {
    // Se pagamento foi confirmado, mostrar modal de novo pedido diretamente
    if (paymentStatus === "confirmed") {
      setShowNewOrderModal(true)
      return
    }
    if (isOrderBlocked) {
      setShowCloseConfirmModal(true)
      return
    }
    // Se nao tem PIX ativo nem cooldown, pode fechar normalmente
    setShowCheckout(false)
    setPaymentStatus("idle")
    setPixData(null)
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
  }

  // Alterar forma de pagamento com cooldown
  const handleChangePaymentMethod = () => {
    // Cancelar PIX atual
    setPixData(null)
    setPaymentStatus("idle")
    setOrderSnapshot(null)
    setPixExpired(false)
    setPixTimeLeft(0)
    
    // Parar polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    
    // Iniciar cooldown de 5 minutos
    setPixCooldownEnd(Date.now() + 5 * 60 * 1000)
    
    // Fechar modal
    setShowChangePaymentModal(false)
  }

  // Cancelar pedido e limpar tudo (compatibilidade)
  const cancelOrderAndStartNew = () => {
    setShowNewOrderModal(true)
  }

  // Resetar loja completamente (apos finalizar pedido)
  const resetStoreAfterOrder = () => {
    // Limpar localStorage PRIMEIRO
    localStorage.removeItem(ORDER_STORAGE_KEY)
    
    // Limpar PIX
    setPixData(null)
    setPaymentStatus("idle")
    setOrderSnapshot(null)
    setPixExpired(false)
    setPixTimeLeft(0)
    setOrderId("")
    
    // Limpar cooldown
    setPixCooldownEnd(null)
    setPixCooldownLeft(0)
    setShowManualPixDuringCooldown(false)
    
    // Limpar carrinho
    setQuantities({})
    
    // Limpar formulario - usando constante importada
    setFormData({ ...DEFAULT_FORM_DATA })
    
    // Limpar cupom
    setAppliedCoupon(null)
    setCouponCode("")
    setCouponError("")
    
    // Parar polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    
    // Fechar modais e checkout
    setShowNewOrderModal(false)
    setShowCloseConfirmModal(false)
    setShowCheckout(false)
  }

  // Timer do PIX
  useEffect(() => {
  if (pixData?.expiresAt && paymentStatus === "awaiting") {
  const updateTimer = () => {
  const now = Date.now()
  const expires = new Date(pixData.expiresAt!).getTime()
  const diff = Math.max(0, Math.floor((expires - now) / 1000))
  setPixTimeLeft(diff)
  if (diff <= 0) {
  setPixExpired(true)
  if (pixTimerRef.current) clearInterval(pixTimerRef.current)
  }
  }
  updateTimer()
  pixTimerRef.current = setInterval(updateTimer, 1000)
  return () => {
  if (pixTimerRef.current) clearInterval(pixTimerRef.current)
  }
  }
  }, [pixData?.expiresAt, paymentStatus])

  // Timer do cooldown (anti-spam)
  useEffect(() => {
    if (pixCooldownEnd) {
      const updateCooldown = () => {
        const now = Date.now()
        const diff = Math.max(0, Math.floor((pixCooldownEnd - now) / 1000))
        setPixCooldownLeft(diff)
        if (diff <= 0) {
          setPixCooldownEnd(null)
        }
      }
      updateCooldown()
      const interval = setInterval(updateCooldown, 1000)
      return () => clearInterval(interval)
    }
  }, [pixCooldownEnd])

  // Carregar config do site - FONTE: SUPABASE via APIs
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // 1. Carregar store-settings do Supabase (fonte principal)
        const [settingsRes, productsRes, neighborhoodsRes, couponsRes] = await Promise.all([
          fetch("/api/store-settings", { cache: "no-store" }),
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/neighborhoods", { cache: "no-store" }),
          fetch("/api/coupons", { cache: "no-store" }),
        ])
        
        const [settingsData, productsData, neighborhoodsData, couponsData] = await Promise.all([
          settingsRes.json(),
          productsRes.json(),
          neighborhoodsRes.json(),
          couponsRes.json(),
        ])
        
        // Montar config a partir das APIs do Supabase
        const newConfig: SiteConfig = { ...defaultConfig }
        
        // Store settings
        if (settingsData.success && settingsData.settings) {
          const s = settingsData.settings
          newConfig.storeName = s.storeName || defaultConfig.storeName
          
          // Banner
          if (s.banner) {
            newConfig.banner = {
              ...defaultConfig.banner,
              mainText: s.banner.mainText || defaultConfig.banner.mainText,
              secondaryText: s.banner.secondaryText || defaultConfig.banner.secondaryText,
              promoActive: s.banner.promoActive ?? defaultConfig.banner.promoActive,
              promoPrice: s.banner.promoPrice ?? defaultConfig.banner.promoPrice,
              promoText: s.banner.promoText || defaultConfig.banner.promoText,
              imageUrl: s.banner.imageUrl || defaultConfig.banner.imageUrl,
            }
          }
          
          // Store Hours
          if (s.storeHours) {
            newConfig.storeHours = {
              ...defaultConfig.storeHours,
              isOpen: s.storeHours.isOpen ?? defaultConfig.storeHours.isOpen,
              manualControl: s.storeHours.manualControl ?? defaultConfig.storeHours.manualControl,
              openTime: s.storeHours.openTime || defaultConfig.storeHours.openTime,
              closeTime: s.storeHours.closeTime || defaultConfig.storeHours.closeTime,
              closedMessage: s.storeHours.closedMessage || defaultConfig.storeHours.closedMessage,
            }
          }
          
          // Delivery
          if (s.delivery) {
            newConfig.delivery = {
              ...defaultConfig.delivery,
              enabled: s.delivery.enabled ?? defaultConfig.delivery.enabled,
              defaultFee: s.delivery.defaultFee ?? defaultConfig.delivery.defaultFee,
              minimumOrder: s.delivery.minimumOrder ?? defaultConfig.delivery.minimumOrder,
              estimatedTime: s.delivery.estimatedTime || defaultConfig.delivery.estimatedTime,
              pickupEnabled: s.delivery.pickupEnabled ?? defaultConfig.delivery.pickupEnabled,
            }
          }
          
          // Payment
          if (s.payment) {
            newConfig.payment = {
              ...defaultConfig.payment,
              minValueForAsaas: s.payment.minValueForAsaas ?? defaultConfig.payment.minValueForAsaas,
              pixManualEnabled: s.payment.pixManualEnabled ?? defaultConfig.payment.pixManualEnabled,
              pixAsaasEnabled: s.payment.pixAsaasEnabled ?? defaultConfig.payment.pixAsaasEnabled,
              pixExpirationMinutes: s.payment.pixExpirationMinutes ?? defaultConfig.payment.pixExpirationMinutes,
            }
          }
          
          // PIX Manual
          if (s.pixManual) {
            newConfig.pixManual = {
              ...defaultConfig.pixManual,
              key: s.pixManual.key || defaultConfig.pixManual.key,
              keyFull: s.pixManual.keyFull || s.pixManual.key || defaultConfig.pixManual.keyFull,
              receiverName: s.pixManual.receiverName || defaultConfig.pixManual.receiverName,
            }
          }
          
          // WhatsApp
          if (s.whatsappConfig) {
            newConfig.whatsapp = {
              ...defaultConfig.whatsapp,
              number: s.whatsappConfig.number || s.whatsapp || defaultConfig.whatsapp.number,
              defaultMessage: s.whatsappConfig.defaultMessage || defaultConfig.whatsapp.defaultMessage,
              receiptMessage: s.whatsappConfig.receiptMessage || defaultConfig.whatsapp.receiptMessage,
              supportEnabled: s.whatsappConfig.supportEnabled ?? defaultConfig.whatsapp.supportEnabled,
            }
          } else if (s.whatsapp) {
            newConfig.whatsapp = { ...defaultConfig.whatsapp, number: s.whatsapp }
          }
          
          // Status da loja - USAR DADOS DO SUPABASE
          setStoreStatusData({
            storeOpen: s.storeOpen ?? true,
            manualControl: s.manualControl ?? false,
            openTime: s.openTime || s.storeHours?.openTime || '10:00',
            closeTime: s.closeTime || s.storeHours?.closeTime || '22:00',
            closedMessage: s.closedMessage || s.storeHours?.closedMessage || 'Estamos fechados no momento.'
          })
        }
        
        // Produtos
        if (productsData.success && Array.isArray(productsData.products)) {
          newConfig.products = productsData.products
        }
        
        // Bairros
        if (neighborhoodsData.success && Array.isArray(neighborhoodsData.neighborhoods)) {
          newConfig.delivery = {
            ...newConfig.delivery,
            neighborhoodFees: neighborhoodsData.neighborhoods.map((n: { name: string; deliveryFee?: number; fee?: number; active: boolean }) => ({
              name: n.name,
              fee: n.deliveryFee ?? n.fee ?? 0,
              active: n.active
            }))
          }
        }
        
        // Cupons
        if (couponsData.success && Array.isArray(couponsData.coupons)) {
          newConfig.coupons = couponsData.coupons
        }
        
        setSiteConfig(newConfig)
      } catch (error) {
        console.error("Erro ao carregar config:", error)
      } finally {
        setConfigLoaded(true)
      }
    }
    loadConfig()
  }, [])

  // Som de confirmacao
  const playConfirmSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }
  }, [])

  // playAddSound, addToast, updateQuantity e getTotalItems agora vem do useCart hook

  // formatCurrency e generateOrderId agora sao importados de utils

  // Registra pedido na API
  const registerOrder = async (paymentMethod: string) => {
    const orderItems = products
      .filter((p) => quantities[p.id] > 0)
      .map((p) => `${quantities[p.id]}x ${p.name}`)
      .join(", ")
    
    // Detalhes do pedido para permitir "Pedir novamente"
    const itemsDetailed = products
      .filter((p) => quantities[p.id] > 0)
      .map((p) => ({
        productId: p.id,
        productName: p.name,
        quantity: quantities[p.id],
        price: p.price,
        subtotal: p.price * quantities[p.id]
      }))

    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            orderId: orderId || generateOrderId(),
            customerName: formData.nome,
            customerPhone: formData.telefone,
            customerId: customer?.id, // Associar ao cliente logado
            items: orderItems,
            itemsDetailed, // Para permitir repetir pedido
            total: getTotal(),
            paymentMethod,
            deliveryType,
            address: deliveryType === "entrega" 
              ? `${formData.endereco}, ${formData.numero} - ${formData.bairro} (Ref: ${formData.referencia})`
              : "Retirada no local",
            neighborhood: formData.bairro,
            reference: formData.referencia,
          },
        }),
      })
      
      // Se cliente logado, atualizar estatisticas e salvar endereco
      if (customer) {
        // Registrar pedido nas estatisticas
        await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "recordOrder",
            phone: customer.phone,
            orderTotal: getTotal()
          })
        })
        
        // Salvar endereco se for entrega
        if (deliveryType === "entrega" && formData.endereco) {
          const updateRes = await fetch("/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update",
              phone: customer.phone,
              savedAddress: {
                endereco: formData.endereco,
                numero: formData.numero,
                bairro: formData.bairro,
                referencia: formData.referencia
              }
            })
          })
          
          const updateData = await updateRes.json()
          if (updateData.success) {
            saveCustomerSession(updateData.customer)
          }
        }
      }
    } catch (error) {
      console.error("Erro ao registrar pedido:", error)
    }
  }

  // Gera codigo PIX EMV para pagamento manual - wrapper usando util importado
  const generateManualPixCode = (amount: number) => generatePixCode(amount, PIX_MANUAL_KEY_FULL, PIX_RECEIVER_NAME, PIX_MANUAL_CITY)

  const copyToClipboard = async (text: string, setCopiedFn: (v: boolean) => void) => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text)
        setCopiedFn(true)
        setTimeout(() => setCopiedFn(false), 2000)
        return
      }
    } catch {
      // Fallback
    }

    try {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.left = "-9999px"
      textarea.style.top = "0"
      textarea.setAttribute("readonly", "")
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopiedFn(true)
      setTimeout(() => setCopiedFn(false), 2000)
    } catch {
      showToast("Texto copiado!")
    }
  }

  const getLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocalizacao nao suportada pelo navegador")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
        setFormData((prev) => ({ ...prev, localizacao: mapsUrl }))
      },
      () => {
        showToast("Nao foi possivel obter sua localizacao")
      }
    )
  }

  const openCheckout = () => {
    // Verificar se loja esta aberta (manual + horario)
    if (!isStoreOpen) {
      showToast("A loja esta fechada no momento")
      return
    }
    if (getTotalItems() === 0) {
      showToast("Adicione pelo menos um item ao carrinho!")
      return
    }
    const subtotal = getSubtotal()
    if (MINIMUM_ORDER > 0 && subtotal < MINIMUM_ORDER) {
      showToast(`Pedido minimo de R$ ${MINIMUM_ORDER.toFixed(2)}`)
      return
    }
    setShowCheckout(true)
    setPaymentStatus("idle")
    setPixData(null)
    setAppliedCoupon(null)
    setCouponCode("")
    setCouponError("")
  }

  // Criar cobranca PIX via Asaas
  const createPixCharge = async () => {
    // Verificar se ja existe PIX ativo
    if (isOrderBlocked) {
      showToast("Ja existe um PIX ativo. Aguarde o pagamento ou cancele para comecar um novo pedido.")
      return
    }
    
    // Verificar cooldown anti-spam
    if (pixCooldownEnd && Date.now() < pixCooldownEnd) {
      const minutes = Math.floor(pixCooldownLeft / 60)
      const seconds = pixCooldownLeft % 60
      showToast(`Aguarde ${minutes}:${seconds.toString().padStart(2, '0')} para gerar um novo PIX automatico.`)
      return
    }
    
    if (!formData.nome) {
      showToast("Por favor, preencha seu nome!")
      return
    }

    // Validar telefone obrigatorio
    const cleanPhone = formData.telefone.replace(/\D/g, "")
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      showToast("Por favor, preencha um telefone valido!")
      return
    }

    if (deliveryType === "entrega" && (!formData.endereco || !formData.numero || !formData.referencia)) {
      showToast("Por favor, preencha todos os campos de entrega!")
      return
    }

    // Validar bairro obrigatorio para entrega
    if (deliveryType === "entrega" && !formData.bairro) {
      showToast("Por favor, selecione seu bairro para calcular a entrega!")
      return
    }

    const subtotal = getSubtotal()
    const discount = getDiscount()
    const deliveryFee = getDeliveryFee()
    const total = getTotal()
    const newOrderId = generateOrderId()
    setOrderId(newOrderId)

    // Se valor for menor que R$15, usar PIX manual
    if (total < MIN_VALUE_FOR_ASAAS) {
      const pixCode = generateManualPixCode(total)
      setManualPixCode(pixCode)
      setPaymentStatus("manual")
      return
    }

    setPaymentStatus("loading")

    // Criar snapshot do pedido ANTES de chamar API
    const orderItems = products
      .filter((p) => quantities[p.id] > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        quantity: quantities[p.id],
      }))

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const snapshot: OrderSnapshot = {
      items: orderItems,
      subtotal,
      deliveryFee,
      discount,
      total,
      couponCode: appliedCoupon?.code || null,
      bairro: formData.bairro,
      deliveryType,
      customerName: formData.nome,
      customerPhone: formData.telefone,
      address: formData.endereco + ", " + formData.numero,
      reference: formData.referencia,
      orderId: newOrderId,
      createdAt: new Date().toISOString(),
      expiresAt,
    }

    const orderDescription = orderItems.map(i => `${i.quantity}x ${i.name}`).join(", ")

    // Garantir que total seja numero
    const totalValue = Number(total)

    try {
      const response = await fetch("/api/asaas/create-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: totalValue,
          description: `Pedido ${newOrderId} - ${orderDescription}`,
          customerName: formData.nome,
          customerPhone: cleanPhone,
          externalReference: newOrderId,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        console.error("[v0] Erro da API Asaas:", data.error || data.details || "Erro desconhecido")
        
        // Verificar se e erro de telefone invalido
        const errorMsg = data.error || data.details || ""
        if (errorMsg.toLowerCase().includes("phone") || errorMsg.toLowerCase().includes("telefone") || errorMsg.toLowerCase().includes("celular") || errorMsg.toLowerCase().includes("mobilePhone")) {
          setPaymentErrorMessage("Telefone invalido. Verifique se o numero foi digitado corretamente com DDD (ex: 11999999999).")
        } else if (errorMsg.toLowerCase().includes("cpf") || errorMsg.toLowerCase().includes("document")) {
          setPaymentErrorMessage("CPF/CNPJ invalido. Verifique o documento informado.")
        } else if (errorMsg.toLowerCase().includes("name") || errorMsg.toLowerCase().includes("nome")) {
          setPaymentErrorMessage("Nome invalido. Informe seu nome completo.")
        } else {
          setPaymentErrorMessage(errorMsg || "Erro ao gerar PIX. Tente novamente.")
        }
        
        setPaymentStatus("error")
        return
      }

      if (data.success && data.pixQrCode && data.pixCopyPaste) {
        setPixExpired(false)
        setPixData({
          paymentId: data.paymentId,
          pixQrCode: data.pixQrCode,
          pixCopyPaste: data.pixCopyPaste,
          value: data.value,
          expiresAt: data.expiresAt,
        })
        // Salvar snapshot do pedido
        setOrderSnapshot(snapshot)
        setPaymentStatus("awaiting")
        
        // SALVAR PEDIDO NO BACKEND IMEDIATAMENTE (com status pendente)
        try {
          await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order: {
                orderId: newOrderId,
                customerName: formData.nome,
                customerPhone: formData.telefone,
                items: snapshot.items.map((i: { quantity: number; name: string }) => `${i.quantity}x ${i.name}`).join(", "),
                itemsDetailed: snapshot.items,
                total: snapshot.total,
                paymentMethod: "PIX Asaas",
                deliveryType,
                address: deliveryType === "entrega" 
                  ? `${formData.endereco}, ${formData.numero} - ${formData.bairro} (Ref: ${formData.referencia})`
                  : "Retirada no local",
                neighborhood: formData.bairro,
                reference: formData.referencia,
                observation: formData.observacao,
                isPixAutomatic: true,
                asaasPaymentId: data.paymentId,
              },
            }),
          })
        } catch {
          // Erro silencioso ao salvar pedido
        }
        
        startPaymentPolling(data.paymentId)
      } else {
        console.error("[v0] PIX incompleto ou erro:", data)
        setPaymentStatus("error")
      }
    } catch (error) {
      console.error("[v0] Erro ao criar PIX:", error)
      setPaymentErrorMessage("Erro de conexao. Verifique sua internet e tente novamente.")
      setPaymentStatus("error")
    }
  }

  // Polling para verificar pagamento
  const startPaymentPolling = (paymentId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/asaas/check-payment?paymentId=${paymentId}`)
        const data = await response.json()

        if (data.isPaid) {
          setPaymentStatus("confirmed")
          setPaymentTime(new Date().toLocaleString("pt-BR"))
          playConfirmSound()
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
          }
          
          // ATUALIZAR PEDIDO NO BACKEND COMO CONFIRMADO
          try {
            await fetch("/api/orders/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: orderId,
                asaasPaymentId: paymentId,
              }),
            })
          } catch {
            // Erro silencioso ao confirmar pedido
          }
        }
      } catch (error) {
        console.error("Erro ao verificar pagamento:", error)
      }
    }, 3000) // Verifica a cada 3 segundos
  }

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // Mensagem WhatsApp para pedido confirmado
  const sendConfirmedOrder = async () => {
    const orderItems = products
      .filter((p) => quantities[p.id] > 0)
      .map((p) => `${quantities[p.id]}x ${p.name}`)
      .join("\n")

    const totalQty = getTotalItems()
    const subtotal = getSubtotal()
    const discount = getDiscount()
    const deliveryFee = getDeliveryFee()

    const deliveryInfo = deliveryType === "entrega"
      ? `Endereco: ${formData.endereco}, ${formData.numero}${formData.bairro ? ` - ${formData.bairro}` : ""}\nReferencia: ${formData.referencia}${formData.localizacao ? `\nLocalizacao: ${formData.localizacao}` : ""}`
      : "Retirada no local"

    let discountLine = ""
    if (appliedCoupon && discount > 0) {
      discountLine = `\nCupom: ${appliedCoupon.code} (-${formatCurrency(discount)})`
    }

    let deliveryFeeLine = ""
    if (deliveryFee > 0 && deliveryType === "entrega") {
      deliveryFeeLine = `\nTaxa de entrega: ${formatCurrency(deliveryFee)}`
    }

const message = `━━━━━━━━━━━━━━━━━━
PEDIDO PAGO
━━━━━━━━━━���━━━━━━━

Pedido No: ${orderId}

Cliente:
${formData.nome}
Tel: ${formData.telefone}

Itens:
${orderItems}

Quantidade:
${totalQty} item(s)

Subtotal: ${formatCurrency(subtotal)}${discountLine}${deliveryFeeLine}
Total: ${formatCurrency(getTotal())}

Pagamento:
PIX CONFIRMADO

${deliveryType === "entrega" ? "Entrega:" : "Retirada:"}
${deliveryInfo}

Horario:
${paymentTime}

Acompanhe seu pedido:
https://www.pkgostosuras.shop/pedido/${orderId}

━━━━━━━━━━━━━━━━━━`

    // Registrar pedido
    await registerOrder("PIX Asaas")

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
    
    // Resetar loja apos enviar para WhatsApp
    resetStoreAfterOrder()
  }

  // Mensagem WhatsApp para problema com PIX
  const sendManualPayment = async () => {
    const orderItems = products
      .filter((p) => quantities[p.id] > 0)
      .map((p) => `${quantities[p.id]}x ${p.name}`)
      .join("\n")

    const deliveryInfo = deliveryType === "entrega"
      ? `Endereco: ${formData.endereco}, ${formData.numero}${formData.bairro ? ` - ${formData.bairro}` : ""}\nReferencia: ${formData.referencia}${formData.localizacao ? `\nLocalizacao: ${formData.localizacao}` : ""}`
      : "Retirada no local"

    const message = `Ola! Quero pagar meu pedido pelo PIX manual.

Pedido: ${orderId || generateOrderId()}

Nome: ${formData.nome}
Tel: ${formData.telefone}

Itens:
${orderItems}

Valor: ${formatCurrency(getTotal())}

${deliveryType === "entrega" ? "Entrega:" : "Retirada:"}
${deliveryInfo}

Observacao: ${formData.observacao || "Nenhuma"}

Acompanhe seu pedido:
https://www.pkgostosuras.shop/pedido/${orderId || generateOrderId()}`

    // Registrar pedido
    await registerOrder("PIX Manual")

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
    
    // Resetar loja apos enviar para WhatsApp
    resetStoreAfterOrder()
  }

  // Pagamento manual (dinheiro/cartao)
  const handleManualPayment = async () => {
    if (!formData.nome) {
      showToast("Por favor, preencha seu nome!")
      return
    }

    if (deliveryType === "entrega" && (!formData.endereco || !formData.numero || !formData.referencia)) {
      showToast("Por favor, preencha todos os campos de entrega!")
      return
    }

    // Validar bairro obrigatorio para entrega
    if (deliveryType === "entrega" && !formData.bairro) {
      showToast("Por favor, selecione seu bairro para calcular a entrega!")
      return
    }

    const orderItems = products
      .filter((p) => quantities[p.id] > 0)
      .map((p) => `${quantities[p.id]}x ${p.name}`)
      .join("\n")

    const pagamentoTexto = formData.pagamento === "dinheiro" ? "Dinheiro" : "Cartao"

    const deliveryInfo = deliveryType === "entrega"
      ? `Endereco: ${formData.endereco}, ${formData.numero}${formData.bairro ? ` - ${formData.bairro}` : ""}\nReferencia: ${formData.referencia}${formData.localizacao ? `\nLocalizacao: ${formData.localizacao}` : ""}`
      : "Retirada no local"

    const message = `NOVO PEDIDO - ${STORE_NAME}

Pedido: ${orderId || generateOrderId()}

Itens:
${orderItems}

Total:
${formatCurrency(getTotal())}

Dados para ${deliveryType === "entrega" ? "Entrega" : "Retirada"}:
Nome: ${formData.nome}
Tel: ${formData.telefone}
${deliveryInfo}

Pagamento:
${pagamentoTexto}

Observacao:
${formData.observacao || "Nenhuma"}

Acompanhe seu pedido:
https://www.pkgostosuras.shop/pedido/${orderId || generateOrderId()}`

    // Registrar pedido
    await registerOrder(pagamentoTexto)

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
    
    // Resetar loja apos enviar para WhatsApp
    resetStoreAfterOrder()
  }

  // Mostrar loading enquanto carrega config do Supabase
  // Evita mostrar dados antigos do defaultConfig
  if (!configLoaded) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Carregando loja...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Audio elements */}
      <audio ref={addToCartAudioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleA4EXqvZzoliCwJcqN3Qi2cKAl+r3c+IZQsCX6rczolmCgJfq9zOiWYKAl+q3M6JZgoCX6vdzYhmCgJfq93NiGYKAl+q3c2JZgoCX6vdzYhmCgJfqtzNiWYKAl+r3c2IZgoCX6rczolmCgJfq93OiGUKAmCq3M6JZgoCX6vczolmCgJfqtzOiWYKAl+r3c6IZQoCYKrczolmCgJfq9zOiWYKAl+q3M6JZgoCX6vdzYhmCgJfqtzNiWYKAl+r3c2IZgoCX6rczYlmCgJfq93NiGYKAl+q3M2JZgoCX6vdzYlmCgJfqtzNiGYKAl+r3c2JZgoCX6rczYlmCgJfq93NiGYKAl+q3M2JZgoCX6vdzYhmCgJfqtzNiWYKAl+r3c2IZgoCX6rczYlmCgJfq93NiGYKAl+q3M6JZgoCX6vdzYhmCgJfqt3NiGYKAmCq3M2JZgoCX6vdzYhmCgJfqtzOiWYKAl+r3c2IZgoCYKrczYlmCgJfq93NiGYKAl+q3M6JZgoCX6vdzYhmCgJfqtzNiWYKAl+r3c2IZgoCX6rczolmCgJfq93NiGYKAl+q3M6JZgoCX6vdzYhmCgJfqtzNiWYKAl+r3c2IZgoCX6rczolmCgJfq93OiGUKAmCq3M6JZgoCX6vczolmCgJfqtzOiWYKAl+r3c6IZQoCYKrczolmCgJfq9zOiWYKAl+q3M6JZgoCX6vdzYhmCgJfqtzNiWYKAl+r3c2IZgoCX6rczYlmCgJfq93NiGYKAl+q3M2JZgoCX6vdzYlmCgJfqtzNiGYKAl+r3c2JZgoCX6rczYlmCgJfq93NiGYKAl+q3M2JZgoCX6vdzYhmCgJfqtzNiWYKAl+r3c2IZgoCX6rczYlmCgJfq93NiGYKAl+q3M6JZgoCX6vdzYhmCgJfqt3NiGYKAmCq3M2JZgoCX6vdzYhmCgJfqtzOiWYKAl+r3c2IZgoCYKrczYlmCgJfq93NiGYKAl+q3M6JZgoCX6vdzYhmCgJfqtzNiWYKAl+r3c2IZgoCX6rczolmCgJfq93NiGYKAl+q3M6JZgoCX6vdzYhmCgJfqtzNiWYKAl+r3c2IZgoCX6rczolmCgJfq93OiGUKAmCq3M6JZgoCX6vczolmCgJfqtzOiWYKAl+r3c6IZQoCYKrczolmCgJfq9zOiWYKAl+q3M6JZgoCX6vdzYhm" type="audio/wav" />
      </audio>
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRl9vT19teleS0OAREREAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6WgWdXXWx5ipOXlpCJgHx3c3J0dn+Hi5CSlZiZmZmYlpORjoyJh4WDgoKDhYiLj5KVl5iYl5WTkI2Lh4WDgYGChIeKjpGUlpeYl5WTkI2Kh4SCgIGDhYmMj5KVl5iYl5WSj4yJhoOBgIGDhomMj5KVl5iYmJaUkY6Lh4SBgICChYiMj5KVl5iYmJaUkY6Lh4SBgICChYiLj5KVl5iYmJaUkY6Lh4SBgIGChYiMj5KVl5iYmJaUkY6Lh4SBgICChYiLj5KVl5iYmJaUkY6LiISBgICChYiLj5KVl5iYmJaUkY6LiISBgICChYiMj5KVl5iYmJaUkY6Lh4SBgICChYiMj5KVl5iYl5aTkI2Kh4SBgIGDhYmMj5KVl5iYl5WTkI2KhoOBgIGDhomMj5KVl5iYl5WTkI2KhoOBgIKEh4qNkJOWmJiYl5WSkI2KhoOBgIKEh4qNkJOWl5iYl5WSkI2KhoOBgIKEh4qOkZSWl5iYl5WSkI2KhoOBgIKEh4qNkJOWl5iYl5WSkI2KhoOBgIKEh4qNkJOWmJiYl5WSkI2Kh4OBgIKEh4qNkJOWmJiYl5WSkI2Kh4OBgIKEh4qNkJOWmJiYl5WSkI2KhoOBgIKEh4qNkJOWmJiYl5WSkI6Lh4SBgYKEh4qNkJOWmJiYl5WSkI6Lh4SBgYKEh4qNkJOW" type="audio/wav" />
      </audio>

      {/* Header Premium */}
      <StoreHeader
        customer={customer}
        showProfileMenu={showProfileMenu}
        cartItemsCount={getTotalItems()}
        onToggleProfileMenu={() => setShowProfileMenu(!showProfileMenu)}
        onCloseProfileMenu={() => setShowProfileMenu(false)}
        onToggleCart={() => setShowCart(!showCart)}
        onOpenMyAccount={() => {
          setShowProfileMenu(false)
          setShowMyAccountModal(true)
        }}
        onOpenMyOrders={() => {
          setShowProfileMenu(false)
          setShowMyOrdersModal(true)
          loadCustomerOrders()
        }}
        onLogout={handleCustomerLogout}
        onOpenLogin={() => {
          setShowProfileMenu(false)
          setShowLoginModal(true)
        }}
      />

      {/* Hero - Cinematografico Premium */}
      <HeroBanner />

      {/* Aviso Loja Fechada Premium */}
      {!isStoreOpen && <StoreClosedBanner />}

      {/* Products */}
      <ProductList
        products={products}
        quantities={quantities}
        onUpdateQuantity={updateQuantity}
        customerFavorites={customer?.favorites || []}
        onToggleFavorite={toggleFavorite}
      />

        {/* Cart Summary */}
        <CartSummary 
          products={products} 
          quantities={quantities} 
          total={getTotal()} 
        />

        {/* Spacer for fixed button - altura suficiente para nao sobrepor */}
        <div className="h-24" />

        {/* Footer */}
        <StoreFooter />

      {/* Fixed Bottom Button */}
      <FloatingCartButton
        isStoreOpen={isStoreOpen}
        totalItems={getTotalItems()}
        total={getTotal()}
        onOpenCheckout={openCheckout}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        products={products}
        quantities={quantities}
        onUpdateQuantity={updateQuantity}
        subtotal={getSubtotal()}
        total={getTotal()}
        isStoreOpen={isStoreOpen}
        onCheckout={openCheckout}
      />

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] bg-background overflow-y-auto animate-slide-up">
          <div className="min-h-screen pb-8">
            {/* Modal Header Premium */}
            <header className="sticky top-0 z-10 glass border-b border-white/5">
              <div className="max-w-lg mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">
                        {paymentStatus === "confirmed" ? "Pedido Confirmado" : "Finalizar Pedido"}
                      </h2>
                      <p className="text-xs text-muted-foreground">{getTotalItems()} {getTotalItems() === 1 ? 'item' : 'itens'} no carrinho</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleCloseCheckout}
                    className="p-2.5 bg-secondary/60 hover:bg-secondary rounded-xl text-foreground/70 hover:text-foreground transition-all duration-200 active:scale-95"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            </header>

            <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">
              {/* Payment Confirmed Screen */}
              {paymentStatus === "confirmed" && (
                <div className="space-y-5 animate-in fade-in duration-500">
                  {/* Success Banner Premium */}
                  <div className="relative bg-gradient-to-br from-green-500/15 via-green-500/10 to-green-500/5 border border-green-500/30 rounded-3xl p-8 text-center overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />
                    <div className="relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-green-500/40 animate-float">
                        <Check className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-black text-green-400 mb-2">PAGAMENTO APROVADO</h3>
                      <p className="text-green-400/70 text-sm">Seu pedido foi confirmado com sucesso!</p>
                    </div>
                  </div>

                  {/* Order Details Premium */}
                  <div className="premium-card rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-center border-b border-primary/10 pb-4">
                      <span className="text-muted-foreground text-sm flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Pedido No
                      </span>
                      <span className="font-black text-primary text-lg">{orderId}</span>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <User className="w-3 h-3" />
                        Cliente
                      </p>
                      <p className="font-bold text-foreground">{formData.nome}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <ShoppingCart className="w-3 h-3" />
                        Itens
                      </p>
                      {products.map((product) => {
                        const qty = quantities[product.id] || 0
                        if (qty === 0) return null
                        return (
                          <p key={product.id} className="text-foreground flex items-center gap-2.5 text-sm">
                            <span className="w-6 h-6 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center text-xs font-bold text-primary">{qty}</span>
                            {product.name}
                          </p>
                        )
                      })}
                    </div>

                    <div className="flex justify-between items-center border-t border-primary/10 pt-4">
                      <span className="font-bold text-foreground">Total</span>
                      <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">{formatCurrency(getTotal())}</span>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CreditCard className="w-3 h-3" />
                        Pagamento
                      </p>
                      <p className="font-bold text-green-400 flex items-center gap-2 text-sm">
                        <div className="w-5 h-5 bg-green-500/20 rounded flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                        PIX CONFIRMADO
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        {deliveryType === "entrega" ? "Entrega" : "Retirada"}
                      </p>
                      {deliveryType === "entrega" ? (
                        <>
                          <p className="text-foreground text-sm font-medium">{formData.endereco}, {formData.numero}</p>
                          <p className="text-muted-foreground text-xs">Ref: {formData.referencia}</p>
                          {formData.localizacao && (
                            <a href={formData.localizacao} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline flex items-center gap-1.5 mt-1">
                              <MapPin className="w-3.5 h-3.5" />
                              Ver no mapa
                            </a>
                          )}
                        </>
                      ) : (
                        <p className="text-foreground text-sm font-medium">Retirada no local</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Horario do pagamento
                      </p>
                      <p className="text-foreground text-sm font-medium">{paymentTime}</p>
                    </div>
                  </div>

                  {/* Send to WhatsApp Button Premium */}
                  <button
                    onClick={sendConfirmedOrder}
                    className="premium-btn w-full py-5 bg-gradient-to-r from-green-500 to-green-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all hover:shadow-2xl hover:shadow-green-500/40 active:scale-[0.98] relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <Check className="w-5 h-5 relative" />
                    <span>ENVIAR PEDIDO CONFIRMADO</span>
                  </button>
                  
                  {/* Botao Acompanhar Pedido */}
                  <a
                    href={`/pedido/${orderId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="premium-btn w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold rounded-2xl flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <Package className="w-5 h-5 relative" />
                    <span>ACOMPANHAR PEDIDO</span>
                  </a>
                </div>
              )}

              {/* Normal Checkout Flow */}
              {paymentStatus !== "confirmed" && (
                <>
                  {/* Order Summary Premium */}
                  <section className="premium-card rounded-2xl p-5 animate-scale-in">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <ShoppingCart className="w-4 h-4 text-primary" />
                        </div>
                        Resumo do Pedido
                      </h3>
                      <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                        {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                      
                    <div className="space-y-2">
                      {products.map((product) => {
                        const qty = quantities[product.id] || 0
                        if (qty === 0) return null
                        return (
                          <div key={product.id} className="flex justify-between items-center text-sm py-2.5 border-b border-border/30 last:border-0 group hover:bg-secondary/20 -mx-2 px-2 rounded-lg transition-colors">
                            <span className="text-muted-foreground flex items-center gap-2.5">
                              <span className="w-6 h-6 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center text-xs font-bold text-primary">{qty}</span>
                              <span className="group-hover:text-foreground transition-colors">{product.name}</span>
                            </span>
                            <span className="text-foreground font-semibold tabular-nums">
                              {formatCurrency(product.price * qty)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                      
                    {/* Subtotal, Desconto, Taxa, Total */}
                    <div className="border-t border-primary/10 mt-4 pt-4 space-y-2.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="text-foreground tabular-nums">{formatCurrency(getSubtotal())}</span>
                      </div>
                      {appliedCoupon && getDiscount() > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" />
                            Cupom {appliedCoupon.code}
                          </span>
                          <span className="text-green-400 font-semibold">-{formatCurrency(getDiscount())}</span>
                        </div>
                      )}
                      {deliveryType === "entrega" && getDeliveryFee() > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5" />
                            Taxa de entrega
                          </span>
                          <span className="text-foreground tabular-nums">{formatCurrency(getDeliveryFee())}</span>
                        </div>
                      )}
                        
                      {/* Total Premium */}
                      <div className="flex justify-between items-center pt-3 border-t border-primary/20 mt-3">
                        <span className="text-foreground font-bold text-lg">Total</span>
                        <div className="text-right">
                          <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-accent drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                            {formatCurrency(getTotal())}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cupom */}
                    {(siteConfig.coupons || []).length > 0 && !appliedCoupon && (
                      <div className={`mt-4 pt-4 border-t border-border/30 ${isOrderBlocked ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Codigo do cupom"
                            disabled={isOrderBlocked}
                            className="premium-input flex-1 px-4 py-3 bg-input/50 border border-border/50 rounded-xl text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <button
                            onClick={applyCoupon}
                            disabled={isOrderBlocked}
                            className="premium-btn px-5 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                          >
                            Aplicar
                          </button>
                        </div>
                        {couponError && (
                          <p className="text-red-400 text-xs mt-2">{couponError}</p>
                        )}
                      </div>
                    )}
                    {appliedCoupon && (
                      <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between bg-green-500/5 -mx-2 px-3 py-2 rounded-xl">
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <Tag className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-bold">Cupom {appliedCoupon.code} aplicado</span>
                        </div>
                        <button
                          onClick={() => setAppliedCoupon(null)}
                          disabled={isOrderBlocked}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </section>

                  {/* Mensagem de pedido bloqueado - Premium */}
                  {isOrderBlocked && (
                    <div className="relative bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-5 overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex items-start gap-4 relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-amber-400 font-black text-sm">Pedido bloqueado</p>
                          <p className="text-muted-foreground text-xs mt-1">
                            Para alterar itens ou bairro, cancele este pedido e comece um novo.
                          </p>
                          <button
                            onClick={() => setShowNewOrderModal(true)}
                            className="mt-3 px-5 py-2.5 bg-gradient-to-r from-amber-500/20 to-amber-500/10 text-amber-400 rounded-xl text-sm font-bold hover:from-amber-500/30 hover:to-amber-500/20 transition-all border border-amber-500/30 active:scale-[0.98]"
                          >
                            Fazer novo pedido
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delivery Type Premium */}
                  <section className={`premium-card rounded-2xl p-5 animate-scale-in ${isOrderBlocked ? 'opacity-50 pointer-events-none' : ''}`} style={{ animationDelay: '0.1s' }}>
                    <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Truck className="w-4 h-4 text-primary" />
                      </div>
                      Tipo de Entrega
                    </h3>
                    
                    {/* Segmented Control Premium */}
                    <div className="bg-secondary/30 backdrop-blur-sm rounded-2xl p-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        {DELIVERY_ENABLED && (
                          <button
                            onClick={() => !isOrderBlocked && setDeliveryType("entrega")}
                            disabled={isOrderBlocked}
                            className={`relative py-4 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2.5 ${
                              deliveryType === "entrega"
                                ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 glow-primary"
                                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-card/50"
                            }`}
                          >
                            <MapPin className="w-4 h-4" />
                            <span>Entrega</span>
                            {DELIVERY_FEE > 0 && deliveryType !== "entrega" && (
                              <span className="text-[10px] opacity-60">(+R${DELIVERY_FEE})</span>
                            )}
                          </button>
                        )}
                        {PICKUP_ENABLED && (
                          <button
                            onClick={() => !isOrderBlocked && setDeliveryType("retirada")}
                            disabled={isOrderBlocked}
                            className={`relative py-4 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2.5 ${
                              deliveryType === "retirada"
                                ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 glow-primary"
                                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-card/50"
                            }`}
                          >
                            <HomeIcon className="w-4 h-4" />
                            <span>Retirada</span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {deliveryType === "entrega" && siteConfig.delivery?.estimatedTime && (
                      <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1.5 bg-secondary/30 py-2 rounded-lg">
                        <Clock className="w-3.5 h-3.5" />
                        Tempo estimado: <span className="text-foreground font-medium">{siteConfig.delivery.estimatedTime}</span>
                      </p>
                    )}
                  </section>

                  {/* Customer Info Premium */}
                  <section className={`premium-card rounded-2xl p-5 space-y-5 animate-scale-in ${isOrderBlocked ? 'opacity-50 pointer-events-none' : ''}`} style={{ animationDelay: '0.15s' }}>
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      Seus Dados
                    </h3>
                    
                    {/* Opcao de usar dados salvos */}
                    {customer && (customer.savedAddress || customerOrders.length > 0) && useSavedData === null && !isOrderBlocked && (
                      <div className="bg-gradient-to-br from-secondary/60 to-secondary/30 backdrop-blur-sm rounded-2xl p-5 space-y-4 border border-primary/10">
                        <p className="text-sm text-foreground font-bold">Como deseja prosseguir?</p>
                        <div className="flex flex-col gap-3">
                          <button
                            type="button"
                            onClick={handleUseSavedData}
                            className="premium-btn w-full py-4 px-4 text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all font-bold flex items-center justify-center gap-2 active:scale-[0.98]"
                          >
                            <Check className="w-4 h-4" />
                            Usar dados salvos
                          </button>
                          <button
                            type="button"
                            onClick={handleUseNewAddress}
                            className="w-full py-4 px-4 text-sm bg-card/80 text-foreground rounded-xl hover:bg-card transition-all border border-border/50 font-medium flex items-center justify-center gap-2 active:scale-[0.98]"
                          >
                            <Plus className="w-4 h-4" />
                            Inserir novo endereco
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Indicador de dados salvos em uso */}
                    {useSavedData === true && (
                      <div className="flex items-center justify-between bg-gradient-to-r from-green-500/15 to-green-500/5 rounded-xl px-4 py-3 border border-green-500/25">
                        <span className="text-sm text-green-400 font-bold flex items-center gap-2">
                          <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          Usando dados salvos
                        </span>
                        <button
                          type="button"
                          onClick={() => setUseSavedData(null)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Alterar
                        </button>
                      </div>
                    )}
                    
                    {/* Campos Premium */}
                    {(useSavedData !== null || !customer || (!customer.savedAddress && customerOrders.length === 0)) && (
                      <>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                            <User className="w-3 h-3" />
                            Nome *
                          </label>
                          <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) => !isOrderBlocked && setFormData({ ...formData, nome: e.target.value })}
                            disabled={isOrderBlocked}
                            placeholder="Seu nome completo"
                            className="premium-input w-full px-4 py-3.5 bg-input/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-50"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                            <Phone className="w-3 h-3" />
                            Telefone/WhatsApp *
                          </label>
                          <input
                            type="tel"
                            value={formData.telefone}
                            disabled={isOrderBlocked}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "").slice(0, 11)
                              const formatted = value
                                .replace(/(\d{2})(\d)/, "($1) $2")
                                .replace(/(\d{5})(\d)/, "$1-$2")
                              setFormData({ ...formData, telefone: formatted })
                            }}
                            placeholder="(11) 99999-9999"
                            className="premium-input w-full px-4 py-3.5 bg-input/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                          />
                        </div>

                        {deliveryType === "entrega" && (
                          <>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                                <MapPin className="w-3 h-3" />
                                Endereco *
                              </label>
                              <input
                                type="text"
                                value={formData.endereco}
                                onChange={(e) => !isOrderBlocked && setFormData({ ...formData, endereco: e.target.value })}
                                disabled={isOrderBlocked}
                                placeholder="Rua"
                                className="premium-input w-full px-4 py-3.5 bg-input/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-50"
                              />
                            </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                              <HomeIcon className="w-3 h-3" />
                              Numero *
                            </label>
                            <input
                              type="text"
                              value={formData.numero}
                              onChange={(e) => !isOrderBlocked && setFormData({ ...formData, numero: e.target.value })}
                              disabled={isOrderBlocked}
                              placeholder="Numero"
                              className="premium-input w-full px-4 py-3.5 bg-input/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-50"
                            />
                          </div>
                        </div>

                        {/* Bairro Dropdown Premium */}
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                            <MapPin className="w-3 h-3" />
                            Bairro *
                          </label>
                          <select
                            value={formData.bairro}
                            onChange={(e) => !isOrderBlocked && setFormData({ ...formData, bairro: e.target.value })}
                            disabled={isOrderBlocked}
                            className={`premium-input w-full px-4 py-3.5 bg-input/50 border border-border/50 rounded-xl text-foreground focus:outline-none appearance-none ${isOrderBlocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '18px' }}
                          >
                            <option value="">Selecione seu bairro</option>
                            {(() => {
                              const { fees } = getNeighborhoodFees()
                              return fees
                                .filter(n => n.active !== false)
                                .map((neighborhood) => (
                                  <option key={neighborhood.name} value={neighborhood.name}>
                                    {neighborhood.name} - R$ {neighborhood.fee.toFixed(2)}
                                  </option>
                                ))
                            })()}
                          </select>
                          {getNeighborhoodFees().fees.length === 0 && (
                            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Nenhum bairro cadastrado. Entre em contato pelo WhatsApp.
                            </p>
                          )}
                          {formData.bairro && (
                            <div className="mt-3 p-4 bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/25 rounded-xl">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Truck className="w-4 h-4 text-primary" />
                                  Taxa de entrega:
                                </span>
                                <span className="font-black text-primary text-lg">
                                  {formatCurrency(orderSnapshot ? orderSnapshot.deliveryFee : getDeliveryFee())}
                                </span>
                              </div>
                            </div>
                          )}
                          {!formData.bairro && !isOrderBlocked && getNeighborhoodFees().fees.length > 0 && (
                            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Selecione seu bairro para calcular a entrega.
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                            <MapPinned className="w-3 h-3" />
                            Referencia *
                          </label>
                          <input
                            type="text"
                            value={formData.referencia}
                            onChange={(e) => !isOrderBlocked && setFormData({ ...formData, referencia: e.target.value })}
                            disabled={isOrderBlocked}
                            placeholder="Ponto de referencia"
                            className="premium-input w-full px-4 py-3.5 bg-input/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-50"
                          />
                        </div>

                        <button
                          onClick={getLocation}
                          disabled={isOrderBlocked}
                          className={`premium-btn w-full py-4 bg-gradient-to-r from-secondary to-secondary/80 text-foreground rounded-xl flex items-center justify-center gap-2.5 font-bold border border-border/50 ${isOrderBlocked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98]'}`}
                        >
                          <MapPinned className="w-4 h-4" />
                          Enviar minha localizacao
                        </button>
                        {formData.localizacao && (
                          <p className="text-xs text-green-400 text-center flex items-center justify-center gap-1.5 bg-green-500/10 py-2 rounded-lg">
                            <Check className="w-3.5 h-3.5" />
                            Localizacao capturada com sucesso!
                          </p>
                        )}
                      </>
                    )}

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                        <MessageSquare className="w-3 h-3" />
                        Observacoes (opcional)
                      </label>
                      <textarea
                        value={formData.observacao}
                        onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                        placeholder="Ex: Sem banana, mais granola..."
                        rows={2}
                        className="premium-input w-full px-4 py-3.5 bg-input/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/70 focus:outline-none resize-none"
                      />
                    </div>
                      </>
                    )}
                  </section>

                  {/* Payment Method Premium */}
                  <section className="premium-card rounded-2xl p-5 space-y-5 animate-scale-in" style={{ animationDelay: '0.2s' }}>
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-primary" />
                      </div>
                      Forma de Pagamento
                    </h3>
                    
                    {/* Payment Options Premium */}
                    {!isOrderLocked && (
                      <div className="grid grid-cols-3 gap-3">
                        {/* PIX Card */}
                        <button
                          onClick={() => {
                            setFormData({ ...formData, pagamento: "pix" })
                            if (!isInCooldown) {
                              setPaymentStatus("idle")
                              setPixData(null)
                            }
                          }}
                          className={`relative py-5 px-3 rounded-2xl text-center font-bold transition-all duration-300 flex flex-col items-center gap-2 overflow-hidden group ${
                            formData.pagamento === "pix"
                              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20 border-2 border-primary/50 scale-[1.02]"
                              : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-border/40 hover:border-primary/40"
                          }`}
                        >
                          <span className="text-2xl relative">💠</span>
                          <span className="text-sm relative font-bold">Pix</span>
                          <span className={`text-[10px] relative font-medium ${formData.pagamento === "pix" ? 'text-primary-foreground/90' : 'text-foreground/50'}`}>
                            Pagamento automatico
                          </span>
                        </button>
                        
                        {/* Dinheiro Card */}
                        <button
                          onClick={() => {
                            setFormData({ ...formData, pagamento: "dinheiro" })
                            if (!isInCooldown) {
                              setPaymentStatus("idle")
                              setPixData(null)
                            }
                          }}
                          className={`relative py-5 px-3 rounded-2xl text-center font-bold transition-all duration-300 flex flex-col items-center gap-2 ${
                            formData.pagamento === "dinheiro"
                              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20 border-2 border-primary/50 scale-[1.02]"
                              : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-border/40 hover:border-primary/40"
                          }`}
                        >
                          <span className="text-2xl">💵</span>
                          <span className="text-sm font-bold">Dinheiro</span>
                          <span className={`text-[10px] font-medium ${formData.pagamento === "dinheiro" ? 'text-primary-foreground/90' : 'text-foreground/50'}`}>
                            Pagamento na entrega
                          </span>
                        </button>
                        
                        {/* Cartao Card */}
                        <button
                          onClick={() => {
                            setFormData({ ...formData, pagamento: "cartao" })
                            if (!isInCooldown) {
                              setPaymentStatus("idle")
                              setPixData(null)
                            }
                          }}
                          className={`relative py-5 px-3 rounded-2xl text-center font-bold transition-all duration-300 flex flex-col items-center gap-2 ${
                            formData.pagamento === "cartao"
                              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20 border-2 border-primary/50 scale-[1.02]"
                              : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-border/40 hover:border-primary/40"
                          }`}
                        >
                          <span className="text-2xl">💳</span>
                          <span className="text-sm font-bold">Cartao</span>
                          <span className={`text-[10px] font-medium ${formData.pagamento === "cartao" ? 'text-primary-foreground/90' : 'text-foreground/50'}`}>
                            Pagamento na entrega
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Card de cooldown com PIX manual - Premium */}
                    {isInCooldown && (
                      <div className="space-y-4">
                        {/* Aviso de cooldown - Premium */}
                        <div className="relative bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 overflow-hidden">
                          <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                          <p className="text-amber-400 text-sm text-center relative flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4" />
                            Novo PIX automatico em:{" "}
                            <span className="font-mono font-black text-base bg-amber-500/20 px-2 py-0.5 rounded-lg">
                              {Math.floor(pixCooldownLeft / 60).toString().padStart(2, '0')}:{(pixCooldownLeft % 60).toString().padStart(2, '0')}
                            </span>
                          </p>
                        </div>
                        
                        {/* PIX Manual durante cooldown - Premium */}
                        {formData.pagamento === "pix" && (
                          <div className="relative bg-gradient-to-br from-secondary/80 via-secondary/50 to-secondary/30 backdrop-blur-sm rounded-2xl p-5 space-y-4 border border-border/50">
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground mb-4">
                                Nao quer esperar? Pague pelo PIX manual e envie o comprovante no WhatsApp.
                              </p>
                              {!showManualPixDuringCooldown ? (
                                <button
                                  onClick={() => setShowManualPixDuringCooldown(true)}
                                  className="relative px-6 py-4 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/30 overflow-hidden group"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                  <span className="relative">Pagar com PIX manual</span>
                                </button>
                              ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 border-t border-border/50 pt-5 mt-5">
                                  <div className="text-center">
                                    <h4 className="font-black text-foreground text-lg">PIX Manual</h4>
                                    <p className="text-xs text-muted-foreground mt-1">Pague e envie o comprovante</p>
                                  </div>
                                  
                                  <div className="flex flex-col items-center">
                                    <div className="bg-white p-4 rounded-2xl shadow-xl">
                                      <QRCodeSVG
                                        value={generateManualPixCode(orderSnapshot?.total || getTotal())}
                                        size={150}
                                        level="M"
                                        includeMargin={false}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="bg-input rounded-xl px-4 py-3">
                                      <p className="text-xs text-muted-foreground">Recebedor</p>
                                      <p className="font-semibold text-foreground">{PIX_RECEIVER_NAME || 'Destinatario'}</p>
                                    </div>
                                    
                                    <div className="bg-input rounded-xl px-4 py-3">
                                      <p className="text-xs text-muted-foreground">Valor</p>
                                      <p className="font-bold text-xl text-primary">{formatCurrency(orderSnapshot?.total || getTotal())}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground text-center">Codigo copia e cola:</p>
                                    <div className="bg-input rounded-xl p-3 relative">
                                      <p className="text-xs text-foreground break-all pr-8 font-mono">
                                        {generateManualPixCode(orderSnapshot?.total || getTotal()).substring(0, 50)}...
                                      </p>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(generateManualPixCode(orderSnapshot?.total || getTotal()))
                                          showToast("Codigo PIX copiado!")
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary/20 rounded-lg hover:bg-primary/30 transition-colors"
                                      >
                                        <Copy className="w-4 h-4 text-primary" />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <button
                                    onClick={() => {
                                      // Montar lista de itens do pedido
                                      const snapshot = orderSnapshot
                                      let itemsList = ""
                                      if (snapshot?.items) {
                                        itemsList = snapshot.items.map((item: { name: string; quantity: number; price: number }) => 
                                          `- ${item.quantity}x ${item.name}: ${formatCurrency(item.price * item.quantity)}`
                                        ).join("\n")
                                      } else {
                                        // Fallback para carrinho atual
                                        itemsList = Object.entries(quantities)
                                          .filter(([, qty]) => qty > 0)
                                          .map(([id, qty]) => {
                                            const product = products.find((p) => p.id === Number(id))
                                            if (product) {
                                              return `- ${qty}x ${product.name}: ${formatCurrency(product.price * qty)}`
                                            }
                                            return ""
                                          })
                                          .filter(Boolean)
                                          .join("\n")
                                      }
                                      
                                      const valorTotal = snapshot?.total || getTotal()
                                      const bairroInfo = snapshot?.bairro || formData.bairro || "Nao informado"
                                      
                                      const message = encodeURIComponent(
                                        `Ola! Fiz um pedido e paguei via PIX manual.\n\n` +
                                        `Pedido: ${orderId || generateOrderId()}\n\n` +
                                        `Resumo do pedido:\n${itemsList}\n\n` +
                                        `Forma de pagamento: PIX manual\n` +
                                        `Valor total: ${formatCurrency(valorTotal)}\n\n` +
                                        `Dados de entrega:\n` +
                                        `Nome: ${formData.nome}\n` +
                                        `Telefone: ${formData.telefone}\n` +
                                        `Endereco: ${formData.endereco}, ${formData.numero}, ${bairroInfo}\n` +
                                        `Referencia: ${formData.referencia || "Nao informada"}\n` +
                                        `Observacao: ${formData.observacao || "Nenhuma"}\n\n` +
                                        `Vou enviar o comprovante agora.`
                                      )
                                      window.open(`https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${message}`, "_blank")
                                      
                                      // Resetar loja apos enviar para WhatsApp
                                      resetStoreAfterOrder()
                                    }}
                                    className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                  >
                                    <MessageCircle className="w-5 h-5" />
                                    Enviar comprovante no WhatsApp
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PIX Section Premium */}
                    {formData.pagamento === "pix" && (
                      <div className="relative bg-gradient-to-br from-secondary/80 via-secondary/50 to-secondary/30 backdrop-blur-sm rounded-2xl p-5 space-y-4 border border-border/50 overflow-hidden">
                        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                        
                        {/* Loading State Premium */}
                        {paymentStatus === "loading" && (
                          <div className="flex flex-col items-center py-10 relative">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mb-5">
                              <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            </div>
                            <p className="text-foreground font-black text-lg">Gerando PIX...</p>
                            <p className="text-sm text-muted-foreground mt-1">Aguarde um momento</p>
                          </div>
                        )}

                        {/* Error State Premium */}
                        {paymentStatus === "error" && (
                          <div className="text-center py-8 relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                              <AlertCircle className="w-8 h-8 text-red-400" />
                            </div>
                            <p className="text-red-400 font-black text-lg mb-2">Erro ao gerar PIX</p>
                            {paymentErrorMessage && (
                              <p className="text-sm text-red-300/80 mb-5 px-4">{paymentErrorMessage}</p>
                            )}
                            <button
                              onClick={() => {
                                setPaymentStatus("idle")
                                setPaymentErrorMessage("")
                              }}
                              className="px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/30 hover:brightness-110 transition-all active:scale-[0.98]"
                            >
                              Corrigir e tentar novamente
                            </button>
                          </div>
                        )}

                        {/* Awaiting Payment Premium */}
                        {paymentStatus === "awaiting" && pixData && (
                          <div className="space-y-5 animate-in fade-in duration-500">
                            {/* Header PIX Premium */}
                            <div className="text-center border-b border-primary/10 pb-4">
                              <div className="flex items-center justify-center gap-2 mb-3">
                                <span className="text-2xl">💠</span>
                                <h4 className="font-black text-foreground text-xl">Pagamento via PIX</h4>
                              </div>
                              {!pixExpired ? (
                                <div className="inline-flex items-center gap-2 bg-yellow-500/10 px-4 py-2 rounded-full border border-yellow-500/30">
                                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                                  <span className="text-yellow-400 font-bold text-sm">AGUARDANDO PAGAMENTO</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-2 bg-red-500/10 px-4 py-2 rounded-full border border-red-500/30">
                                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                                  <span className="text-red-400 font-bold text-sm">PIX EXPIRADO</span>
                                </div>
                              )}
                              {/* Timer Premium */}
                              {!pixExpired && pixTimeLeft > 0 && (
                                <div className="mt-4 inline-flex items-center gap-3 bg-gradient-to-r from-secondary/60 to-secondary/30 px-5 py-2.5 rounded-xl border border-border/30">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Expira em</span>
                                  <span className={`font-mono font-black text-lg ${pixTimeLeft <= 60 ? 'text-red-400' : 'text-primary'}`}>
                                    {Math.floor(pixTimeLeft / 60).toString().padStart(2, '0')}:{(pixTimeLeft % 60).toString().padStart(2, '0')}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* QR Code Premium */}
                            <div className="flex flex-col items-center">
                              <p className="text-sm text-muted-foreground mb-4">
                                {pixExpired ? "PIX expirado - gere um novo" : "Escaneie o QR Code para pagar"}
                              </p>
                              <div className={`relative bg-white p-5 rounded-2xl shadow-2xl shadow-primary/20 ${pixExpired ? 'opacity-40 grayscale' : 'glow-primary'}`}>
                                {!pixExpired && (
                                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-2xl blur-sm -z-10" />
                                )}
                                {pixData.pixQrCode ? (
                                  <img
                                    src={`data:image/png;base64,${pixData.pixQrCode}`}
                                    alt="QR Code PIX"
                                    width={180}
                                    height={180}
                                  />
                                ) : (
                                  <QRCodeSVG
                                    value={pixData.pixCopyPaste}
                                    size={180}
                                    level="M"
                                    includeMargin={false}
                                  />
                                )}
                              </div>
                              {pixExpired && (
                                <button
                                  onClick={cancelOrderAndStartNew}
                                  className="premium-btn mt-5 px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98]"
                                >
                                  Comecar novo pedido
                                </button>
                              )}
                            </div>

                            {/* Dados do recebedor Premium */}
                            <div className="space-y-3">
                              <div className="bg-gradient-to-r from-input/80 to-input/50 rounded-xl px-4 py-3.5 border border-border/30">
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <User className="w-3 h-3" />
                                  Nome do Recebedor
                                </p>
                                <p className="font-bold text-foreground mt-1">{PIX_RECEIVER_NAME}</p>
                              </div>

                              <div className="bg-gradient-to-r from-primary/15 to-primary/5 rounded-xl px-4 py-4 border border-primary/25">
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <CreditCard className="w-3 h-3" />
                                  Valor do Pedido
                                </p>
                                <p className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mt-1">{formatCurrency(orderSnapshot?.total || pixData.value)}</p>
                              </div>
                              
                              {orderSnapshot && (
                                <div className="bg-secondary/30 rounded-xl px-4 py-3 text-xs space-y-1.5 border border-border/20">
                                  <p className="text-muted-foreground flex justify-between">
                                    <span>Subtotal:</span>
                                    <span className="font-medium text-foreground">{formatCurrency(orderSnapshot.subtotal)}</span>
                                  </p>
                                  {orderSnapshot.discount > 0 && (
                                    <p className="text-green-400 flex justify-between">
                                      <span>Desconto:</span>
                                      <span className="font-medium">-{formatCurrency(orderSnapshot.discount)}</span>
                                    </p>
                                  )}
                                  {orderSnapshot.deliveryFee > 0 && (
                                    <p className="text-muted-foreground flex justify-between">
                                      <span>Entrega ({orderSnapshot.bairro}):</span>
                                      <span className="font-medium text-foreground">{formatCurrency(orderSnapshot.deliveryFee)}</span>
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Codigo PIX Copia e Cola Premium */}
                            <div className="bg-gradient-to-br from-input/80 to-input/50 rounded-xl p-5 space-y-4 border border-border/30">
                              <p className="font-bold text-foreground flex items-center gap-2">
                                <Copy className="w-4 h-4 text-primary" />
                                Codigo PIX Copia e Cola
                              </p>
                              <div className="bg-background/60 rounded-xl p-4 max-h-24 overflow-y-auto border border-border/20">
                                <p className="font-mono text-xs text-muted-foreground break-all select-all leading-relaxed">
                                  {pixData.pixCopyPaste}
                                </p>
                              </div>
                              <button
                                onClick={() => !pixExpired && copyToClipboard(pixData.pixCopyPaste, setCopiedCode)}
                                disabled={pixExpired}
                                className={`premium-btn w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold transition-all ${
                                  pixExpired 
                                    ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                                    : copiedCode
                                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30'
                                      : 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]'
                                }`}
                              >
                                {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                {pixExpired ? "PIX Expirado" : copiedCode ? "Copiado!" : "Copiar Codigo PIX"}
                              </button>
                            </div>

                            {/* Aviso Premium */}
                            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
                              <p className="text-sm text-foreground text-center font-medium flex items-center justify-center gap-2">
                                <Zap className="w-4 h-4 text-primary" />
                                O pagamento sera confirmado automaticamente
                              </p>
                            </div>
                            
                            {/* Botao alterar forma de pagamento */}
                            {!pixExpired && (
                              <button
                                onClick={() => setShowChangePaymentModal(true)}
                                className="w-full py-3 text-sm text-muted-foreground hover:text-primary transition-all hover:bg-secondary/30 rounded-xl"
                              >
                                Alterar forma de pagamento
                              </button>
                            )}
                          </div>
                        )}

                        {/* Manual PIX Premium - For orders below R$15 */}
                        {paymentStatus === "manual" && manualPixCode && (
                          <div className="space-y-5 animate-in fade-in duration-500">
                            {/* Header Premium */}
                            <div className="text-center border-b border-primary/10 pb-4">
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="text-2xl">💠</span>
                                <h4 className="font-black text-foreground text-xl">Pagamento via PIX Manual</h4>
                              </div>
                              <p className="text-xs text-muted-foreground bg-secondary/40 inline-block px-3 py-1 rounded-full">
                                Pedidos abaixo de R$ 15,00
                              </p>
                            </div>

                            {/* QR Code Premium */}
                            <div className="flex flex-col items-center">
                              <p className="text-sm text-muted-foreground mb-4">Escaneie o QR Code para pagar</p>
                              <div className="relative bg-white p-5 rounded-2xl shadow-2xl shadow-primary/20 glow-primary">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-2xl blur-sm -z-10" />
                                <QRCodeSVG
                                  value={manualPixCode}
                                  size={180}
                                  level="M"
                                  includeMargin={false}
                                />
                              </div>
                            </div>

                            {/* Dados do recebedor Premium */}
                            <div className="space-y-3">
                              <div className="bg-gradient-to-r from-input/80 to-input/50 rounded-xl px-4 py-3.5 border border-border/30">
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <User className="w-3 h-3" />
                                  Nome do Recebedor
                                </p>
                                <p className="font-bold text-foreground mt-1">{PIX_MANUAL_NAME}</p>
                              </div>

                              <div className="flex items-center justify-between bg-gradient-to-r from-input/80 to-input/50 rounded-xl px-4 py-3.5 border border-border/30">
                                <div>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Phone className="w-3 h-3" />
                                    Chave PIX (Telefone)
                                  </p>
                                  <p className="font-mono font-bold text-foreground mt-1">{PIX_MANUAL_KEY}</p>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(PIX_MANUAL_KEY, setCopiedManualKey)}
                                  className={`premium-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                                    copiedManualKey 
                                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30'
                                      : 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/30'
                                  }`}
                                >
                                  {copiedManualKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                  {copiedManualKey ? "Copiado!" : "Copiar"}
                                </button>
                              </div>

                              <div className="bg-gradient-to-r from-primary/15 to-primary/5 rounded-xl px-4 py-4 border border-primary/25">
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <CreditCard className="w-3 h-3" />
                                  Valor do Pedido
                                </p>
                                <p className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mt-1">{formatCurrency(getTotal())}</p>
                              </div>
                            </div>

                            {/* Codigo PIX Copia e Cola Premium */}
                            <div className="bg-gradient-to-br from-input/80 to-input/50 rounded-xl p-5 space-y-4 border border-border/30">
                              <p className="font-bold text-foreground flex items-center gap-2">
                                <Copy className="w-4 h-4 text-primary" />
                                Codigo PIX Copia e Cola
                              </p>
                              <div className="bg-background/60 rounded-xl p-4 max-h-24 overflow-y-auto border border-border/20">
                                <p className="font-mono text-xs text-muted-foreground break-all select-all leading-relaxed">
                                  {manualPixCode}
                                </p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(manualPixCode, setCopiedManualCode)}
                                className={`premium-btn w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold transition-all active:scale-[0.98] ${
                                  copiedManualCode
                                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30'
                                    : 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/30'
                                }`}
                              >
                                {copiedManualCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                {copiedManualCode ? "Copiado com sucesso!" : "Copiar Codigo PIX"}
                              </button>
                            </div>

                            {/* Aviso Premium */}
                            <div className="bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/25 rounded-xl p-4">
                              <p className="text-sm text-foreground text-center font-medium">
                                Apos o pagamento, envie o comprovante no WhatsApp para agilizar a confirmacao do pedido.
                              </p>
                            </div>

                            {/* Botao WhatsApp Premium */}
                            <button
                              onClick={sendManualPayment}
                              className="premium-btn w-full py-5 bg-gradient-to-r from-green-500 to-green-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all hover:shadow-2xl hover:shadow-green-500/40 active:scale-[0.98] relative overflow-hidden group"
                            >
                              <Send className="w-5 h-5" />
                              Enviar Comprovante no WhatsApp
                            </button>
                          </div>
                        )}

                        {/* Idle State - Show button to generate PIX */}
                        {paymentStatus === "idle" && (
                          <div className="text-center py-4">
                            {/* Esconder botao PIX automatico durante cooldown */}
                            {isInCooldown ? (
                              <div className="space-y-2 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                <p className="text-muted-foreground text-sm">
                                  PIX automatico bloqueado por mais{" "}
                                  <span className="font-mono font-medium text-amber-400">
                                    {Math.floor(pixCooldownLeft / 60).toString().padStart(2, '0')}:{(pixCooldownLeft % 60).toString().padStart(2, '0')}
                                  </span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Escolha Dinheiro, Cartao ou PIX manual acima.
                                </p>
                              </div>
                            ) : (
                              <>
                                <p className="text-muted-foreground mb-4 text-sm">
                                  {getTotal() < MIN_VALUE_FOR_ASAAS 
                                    ? "Clique abaixo para ver os dados do PIX" 
                                    : "Clique abaixo para gerar o PIX automatico"}
                                </p>
                                
                                {/* Aviso de dados nao confirmados */}
                                {!isDataConfirmed && (
                                  <div className="mb-4 p-3 bg-yellow-500/15 border border-yellow-500/30 rounded-xl">
                                    <p className="text-sm text-yellow-400 text-center font-medium">
                                      {needsAddressChoice 
                                        ? "Confirme seus dados de entrega acima para continuar"
                                        : "Preencha todos os campos de endereco para continuar"}
                                    </p>
                                  </div>
                                )}
                                
                                <button
                                  onClick={createPixCharge}
                                  disabled={!isDataConfirmed}
                                  className={`premium-btn w-full py-4 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-black rounded-2xl flex items-center justify-center gap-3 transition-all relative overflow-hidden group ${!isDataConfirmed ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:shadow-primary/25 active:scale-[0.98] shadow-lg shadow-primary/15'}`}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                  <span className="text-xl relative">💠</span>
                                  <span className="relative text-base">{getTotal() < MIN_VALUE_FOR_ASAAS ? "Ver PIX Manual" : "Gerar PIX Automatico"}</span>
                                </button>
                                {getTotal() < MIN_VALUE_FOR_ASAAS && (
                                  <p className="text-xs text-muted-foreground mt-3 text-center">
                                    Pedidos abaixo de R$ 15 usam PIX manual
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* Fallback Button Premium */}
                        {(paymentStatus === "awaiting" || paymentStatus === "error") && (
                          <button
                            onClick={sendManualPayment}
                            className="w-full py-3.5 bg-secondary/80 text-foreground rounded-xl flex items-center justify-center gap-2.5 text-sm font-bold transition-all hover:bg-secondary active:scale-[0.98] border border-border/30"
                          >
                            <Phone className="w-4 h-4" />
                            Problema com o Pix? Pagar pelo WhatsApp
                          </button>
                        )}
                      </div>
                    )}
                  </section>

                  {/* Submit Button for non-PIX payments - Premium */}
                  {formData.pagamento !== "pix" && (
                    <>
                      {/* Aviso de dados nao confirmados */}
                      {!isDataConfirmed && (
                        <div className="mb-4 p-3 bg-yellow-500/15 border border-yellow-500/30 rounded-xl animate-scale-in" style={{ animationDelay: '0.25s' }}>
                          <p className="text-sm text-yellow-400 text-center font-medium">
                            {needsAddressChoice 
                              ? "Confirme seus dados de entrega acima para continuar"
                              : "Preencha todos os campos de endereco para continuar"}
                          </p>
                        </div>
                      )}
                      <button
                        onClick={handleManualPayment}
                        disabled={!isDataConfirmed}
                        className={`premium-btn w-full py-5 bg-gradient-to-r from-green-500 to-green-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all relative overflow-hidden group animate-scale-in ${!isDataConfirmed ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-2xl hover:shadow-green-500/40 active:scale-[0.98]'}`}
                        style={{ animationDelay: '0.25s' }}
                      >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <Send className="w-5 h-5 relative" />
                      <span className="relative text-base">Finalizar Pedido no WhatsApp</span>
                    </button>
                    </>
                  )}
                      </>
                    )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmacao para alterar forma de pagamento */}
      {showChangePaymentModal && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">Alterar Forma de Pagamento</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Se voce alterar a forma de pagamento, so sera possivel gerar um novo PIX automatico apos 5 minutos.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => setShowChangePaymentModal(false)}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                  Continuar com este PIX
                </button>
                <button
                  onClick={handleChangePaymentMethod}
                  className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
                >
                  Alterar forma de pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmacao para fechar com PIX ativo */}
      {/* Modal de aviso PIX ativo */}
      {showCloseConfirmModal && (
        <ConfirmPixActiveModal
          onClose={() => setShowCloseConfirmModal(false)}
          onNewOrder={() => {
            setShowCloseConfirmModal(false)
            setShowNewOrderModal(true)
          }}
        />
      )}

      {/* Modal de opcoes para novo pedido */}
      {showNewOrderModal && (
        <NewOrderOptionsModal
          onStartFromScratch={startNewOrderFromScratch}
          onKeepData={startNewOrderKeepingData}
          onCancel={() => setShowNewOrderModal(false)}
        />
      )}

      {/* Modal de Login */}
      {showLoginModal && (
        <CustomerLoginModal
          loginStep={loginStep}
          loginPhone={loginPhone}
          loginPin={loginPin}
          loginName={loginName}
          loginError={loginError}
          loginLoading={loginLoading}
          onPhoneChange={setLoginPhone}
          onPinChange={setLoginPin}
          onNameChange={setLoginName}
          onLoginNext={handleLoginNext}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onBack={() => {
            setLoginStep("phone")
            setLoginPin("")
            setLoginName("")
            setLoginError("")
          }}
          onClose={() => {
            setShowLoginModal(false)
            resetLoginForm()
          }}
        />
      )}

      {/* Modal Minha Conta */}
      {showMyAccountModal && customer && (
        <MyAccountModal
          customer={customer}
          products={products}
          onClose={() => setShowMyAccountModal(false)}
        />
      )}

      {/* Modal Meus Pedidos */}
      {showMyOrdersModal && customer && (
        <MyOrdersModal
          orders={customerOrders}
          loadingOrders={loadingOrders}
          onClose={() => setShowMyOrdersModal(false)}
          onRepeatOrder={repeatOrder}
        />
      )}

      {/* Modal Confirmar Repetir Pedido */}
      {showRepeatConfirm && orderToRepeat && (
        <RepeatOrderModal
          order={orderToRepeat}
          onConfirm={confirmRepeatOrder}
          onCancel={() => {
            setShowRepeatConfirm(false)
            setOrderToRepeat(null)
          }}
        />
      )}

      {/* Toast de Notificacao */}
      {toastMessage && <Toast message={toastMessage} />}
      
      {/* Toast de Adicao ao Carrinho */}
      {addToast.show && <AddToCartToast />}
    </main>
  )
}
