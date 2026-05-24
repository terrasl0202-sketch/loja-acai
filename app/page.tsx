"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { Minus, Plus, ShoppingCart, Send, MapPin, User, CreditCard, MessageSquare, X, Copy, Check, Loader2, MapPinned, Phone, Home as HomeIcon, AlertCircle, Tag, Truck, MessageCircle, Clock, Star, LogOut, ChevronRight, Package, Heart, Zap, Snowflake, Award, Sparkles } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { type SiteConfig, type Coupon, type Customer, defaultConfig } from "@/lib/config-types"

type PaymentStatus = "idle" | "loading" | "awaiting" | "confirmed" | "error" | "manual"
type DeliveryType = "entrega" | "retirada"

// Snapshot do pedido no momento do PIX
interface OrderSnapshot {
  items: { id: number; name: string; price: number; quantity: number }[]
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  couponCode: string | null
  bairro: string
  deliveryType: DeliveryType
  customerName: string
  customerPhone: string
  address: string
  reference: string
  orderId: string
  createdAt: string
  expiresAt: string
}

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

  // Loja esta realmente aberta = status manual E dentro do horario
  // Usar isClient para evitar hydration mismatch - no servidor sempre mostra aberto
  const isStoreOpen = isClient ? (siteConfig.storeHours?.isOpen && isWithinBusinessHours()) : true

  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    endereco: "",
    numero: "",
    referencia: "",
    pagamento: "pix",
    observacao: "",
    localizacao: "",
    bairro: "",
  })
  
  // Cupom
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponError, setCouponError] = useState("")
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(DELIVERY_ENABLED ? "entrega" : "retirada")
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [useSavedData, setUseSavedData] = useState<boolean | null>(null) // null = nao escolheu, true = usar salvos, false = novo endereco
  const [copied, setCopied] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  
  // Asaas PIX states
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle")
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string>("")
  const [pixData, setPixData] = useState<{
    paymentId: string
    pixQrCode: string
    pixCopyPaste: string
    value: number
    expiresAt?: string
  } | null>(null)
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
  const [customerOrders, setCustomerOrders] = useState<Array<{
    id: string
    items: string
    itemsDetailed?: { productId: number; productName: string; quantity: number; price: number }[]
    total: number
    status: string
    paymentStatus: string
    paymentMethod?: string
    createdAt: string
    deliveryType: string
    address?: string
    neighborhood?: string
  }>>([])
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

  // Mostrar toast
  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 4000)
  }
  
  // Chave do localStorage para sessao do cliente
  const CUSTOMER_SESSION_KEY = "pk-customer-session"
  
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
  
  // Funcao para normalizar nome de produto para comparacao
  const normalizeProductName = (name: string) => {
    return name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  }
  
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
  const addToCartAudioRef = useRef<HTMLAudioElement | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pixTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Chave do localStorage para persistir pedido
  const ORDER_STORAGE_KEY = "pk-order-in-progress"
  
  // Interface do pedido salvo
  interface SavedOrder {
    quantities: Record<string, number>
    formData: typeof formData
    deliveryType: DeliveryType
    showCheckout: boolean
    paymentStatus: PaymentStatus
    pixData: typeof pixData
    orderSnapshot: OrderSnapshot | null
    orderId: string
    pixTimeLeft: number
    pixExpired: boolean
    pixCooldownEnd: number | null
    appliedCoupon: typeof appliedCoupon
    couponCode: string
    savedAt: number
  }
  
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

  // Calcula taxa de entrega baseado no bairro
  const getDeliveryFee = () => {
    if (deliveryType === "retirada") return 0
    const neighborhoodFees = siteConfig.delivery?.neighborhoodFees || []
    const fee = neighborhoodFees.find(f => 
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
    
    // Limpar formulario
    setFormData({
      nome: "",
      telefone: "",
      endereco: "",
      numero: "",
      referencia: "",
      pagamento: "pix",
      observacao: "",
      localizacao: "",
      bairro: "",
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
    
    // Limpar formulario
    setFormData({
      nome: "",
      telefone: "",
      endereco: "",
      numero: "",
      referencia: "",
      pagamento: "pix",
      observacao: "",
      localizacao: "",
      bairro: "",
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

  // Carregar config do site
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/config", { cache: "no-store" })
        const data = await response.json()
        if (data.success && data.config) {
          setSiteConfig(data.config)
        }
      } catch (error) {
        console.error("Erro ao carregar config:", error)
      } finally {
        setConfigLoaded(true)
      }
    }
    loadConfig()
  }, [])

  // Som ao adicionar item
  const playAddSound = useCallback(() => {
    if (addToCartAudioRef.current) {
      addToCartAudioRef.current.currentTime = 0
      addToCartAudioRef.current.play().catch(() => {})
    }
  }, [])

  // Som de confirmacao
  const playConfirmSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }
  }, [])

  // Estado para toast de adicao
  const [addToast, setAddToast] = useState<{ show: boolean; productName: string }>({ show: false, productName: "" })
  
  const updateQuantity = (id: number, delta: number) => {
    const newQty = Math.max(0, (quantities[id] || 0) + delta)
    setQuantities((prev) => ({
      ...prev,
      [id]: newQty,
    }))
    if (delta > 0) {
      playAddSound()
      // Mostrar toast de adicao
      const product = products.find(p => p.id === id)
      if (product) {
        setAddToast({ show: true, productName: product.name })
        setTimeout(() => setAddToast({ show: false, productName: "" }), 2000)
      }
    }
  }

  const getTotalItems = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const generateOrderId = () => {
    const now = new Date()
    const id = `PK${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`
    return id
  }

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

  // Gera codigo PIX EMV para pagamento manual
  const generateManualPixCode = (amount: number) => {
    const pixKey = PIX_MANUAL_KEY_FULL
    const merchantName = "CARINA KAREN DA SILVA"
    const merchantCity = "SAO PAULO"
    const amountStr = amount.toFixed(2)

    const crc16 = (str: string): string => {
      let crc = 0xFFFF
      for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8
        for (let j = 0; j < 8; j++) {
          if (crc & 0x8000) {
            crc = (crc << 1) ^ 0x1021
          } else {
            crc <<= 1
          }
          crc &= 0xFFFF
        }
      }
      return crc.toString(16).toUpperCase().padStart(4, "0")
    }

    const tlv = (tag: string, value: string): string => {
      return tag + value.length.toString().padStart(2, "0") + value
    }

    const gui = tlv("00", "br.gov.bcb.pix")
    const chave = tlv("01", pixKey)
    const merchantAccountInfo = tlv("26", gui + chave)

    let payload = ""
    payload += tlv("00", "01")
    payload += merchantAccountInfo
    payload += tlv("52", "0000")
    payload += tlv("53", "986")
    payload += tlv("54", amountStr)
    payload += tlv("58", "BR")
    payload += tlv("59", merchantName)
    payload += tlv("60", merchantCity)
    payload += tlv("62", tlv("05", "***"))
    payload += "6304"

    const crcValue = crc16(payload)
    return payload + crcValue
  }

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

    const whatsappUrl = `https://api.whatsapp.com/send?phone=5511918505799&text=${encodeURIComponent(message)}`
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

    const whatsappUrl = `https://api.whatsapp.com/send?phone=5511918505799&text=${encodeURIComponent(message)}`
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

    const whatsappUrl = `https://api.whatsapp.com/send?phone=5511918505799&text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
    
    // Resetar loja apos enviar para WhatsApp
    resetStoreAfterOrder()
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
      <header className="sticky top-0 z-50 glass border-b border-white/5 shadow-xl shadow-black/10">
        <div className="max-w-lg mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="relative">
              <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-purple-400 drop-shadow-sm">{STORE_NAME}</h1>
              <p className="text-[10px] text-muted-foreground/70 font-medium tracking-widest uppercase">Paulo e Karina</p>
              <div className="absolute -bottom-1 left-0 w-12 h-0.5 bg-gradient-to-r from-primary to-transparent rounded-full" />
            </div>
            <div className="flex items-center gap-2.5">
              {/* Icone de Perfil/Conta */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className={`p-2.5 rounded-xl transition-all duration-300 ${
                    customer 
                      ? "bg-primary/15 text-primary hover:bg-primary/25 shadow-lg shadow-primary/20 ring-1 ring-primary/30" 
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground hover:shadow-lg hover:shadow-primary/10"
                  }`}
                >
                  <User className="w-5 h-5" />
                  {customer?.isVip && (
                    <Star className="absolute -top-0.5 -right-0.5 w-3 h-3 text-yellow-500 fill-yellow-500" />
                  )}
                </button>
                
                {/* Menu dropdown */}
                {showProfileMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-card rounded-xl border border-border shadow-xl z-50 overflow-hidden">
                      {customer ? (
                        <>
                          <div className="p-3 border-b border-border bg-secondary/30">
                            <p className="font-medium text-foreground flex items-center gap-2">
                              {customer.name}
                              {customer.isVip && (
                                <span className="text-xs bg-yellow-500/20 text-yellow-600 px-1.5 py-0.5 rounded">VIP</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{customer.phone}</p>
                          </div>
                          <div className="py-1">
                            <button
                              onClick={() => {
                                setShowProfileMenu(false)
                                setShowMyAccountModal(true)
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 flex items-center gap-3"
                            >
                              <User className="w-4 h-4" />
                              Minha Conta
                            </button>
                            <button
                              onClick={() => {
                                setShowProfileMenu(false)
                                setShowMyOrdersModal(true)
                                loadCustomerOrders()
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 flex items-center gap-3"
                            >
                              <Package className="w-4 h-4" />
                              Meus Pedidos
                            </button>
                            <button
                              onClick={handleCustomerLogout}
                              className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-3"
                            >
                              <LogOut className="w-4 h-4" />
                              Sair
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setShowProfileMenu(false)
                              setShowLoginModal(true)
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-secondary/50 flex items-center gap-3"
                          >
                            <User className="w-4 h-4" />
                            Entrar / Criar Conta
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              {/* Carrinho */}
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative p-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/40 active:scale-95 shadow-md shadow-primary/30"
              >
                <ShoppingCart className="w-5 h-5 text-primary-foreground" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-white text-primary text-[10px] font-black min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center shadow-md ring-2 ring-primary/20 animate-[pulse_2s_ease-in-out_infinite]">
                    {getTotalItems()}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero - Cinematografico Premium */}
      <section className="relative h-48 sm:h-56 overflow-hidden">
        <Image
          src="/acai-bowl.jpg"
          alt="Acai delicioso"
          fill
          className="object-cover scale-110 animate-fade-in"
          priority
        />
        {/* Multi-layer Premium Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-transparent to-primary/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
        
        {/* Decorative glow elements */}
        <div className="absolute top-6 right-6 w-40 h-40 bg-primary/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-56 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
        
        <div className="absolute bottom-6 left-4 right-4">
          <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] tracking-tight leading-tight">
            Acai artesanal<br/>entregue geladinho
          </h2>
          <p className="text-white/50 text-xs mt-2 font-medium tracking-wide">Feito na hora com muito carinho</p>
          
          {/* Trust Badges Glass Premium */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/95 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
              <Zap className="w-3 h-3 text-amber-400 drop-shadow-glow" />
              Entrega rapida
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/95 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
              <Snowflake className="w-3 h-3 text-cyan-400 drop-shadow-glow" />
              Geladinho
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/95 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
              <Award className="w-3 h-3 text-primary drop-shadow-glow" />
              Premium
            </span>
          </div>
        </div>
      </section>

      {/* Aviso Loja Fechada Premium */}
      {!isStoreOpen && (
        <div className="mx-4 mt-5 p-5 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-purple-500/5 border border-orange-500/20 rounded-2xl backdrop-blur-sm shadow-xl shadow-red-500/5">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500/20 to-red-500/10 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/20">
                <Clock className="w-7 h-7 text-orange-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-orange-400">
                Estamos fechados no momento
              </h3>
              <p className="text-sm text-muted-foreground/80 mt-1">
                Voltaremos em breve
              </p>
            </div>
            {siteConfig.storeHours.closedMessage && (
              <p className="text-sm text-muted-foreground">
                {siteConfig.storeHours.closedMessage}
              </p>
            )}
            <div className="pt-3 border-t border-orange-500/10">
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">Horario de funcionamento</p>
              <p className="text-sm font-semibold text-foreground/90">
                {siteConfig.storeHours.openTime || "18:00"} as {siteConfig.storeHours.closeTime || "23:30"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      <section className="mt-6 space-y-3 px-3">
          <h3 className="text-lg font-black text-foreground flex items-center gap-2 mb-2">
            <span className="w-1 h-5 bg-gradient-to-b from-primary to-primary/40 rounded-full"></span>
            Cardapio
            <Sparkles className="w-4 h-4 text-primary/50" />
          </h3>
          
          {/* Produtos - Cards Premium */}
          {products.map((product, index) => (
            <div
              key={product.id}
              className="product-card p-4"
            >
              {/* Badge Premium - canto superior esquerdo */}
              {index === 0 && (
                <span className="absolute -top-0.5 left-3 premium-badge bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/30 flex items-center gap-1 z-10">
                  <Star className="w-2.5 h-2.5 fill-white" />
                  Mais vendido
                </span>
              )}
              {product.price < 20 && index !== 0 && (
                <span className="absolute -top-0.5 left-3 premium-badge bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30 z-10">
                  Otimo preco
                </span>
              )}
              
              <div className="flex justify-between items-start gap-4 relative z-[1]">
                <div className="flex-1 pr-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-base">{product.name}</h4>
                      <p className="text-[10px] text-muted-foreground/60 font-medium mt-0.5">Serve 1 pessoa</p>
                    </div>
                    <button
                      onClick={() => toggleFavorite(product.id)}
                      className={`p-1.5 rounded-xl transition-all duration-300 ${
                        customer?.favorites.includes(product.id)
                          ? "text-red-500 bg-red-500/15"
                          : "text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10"
                      }`}
                      aria-label={customer?.favorites.includes(product.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                      <Heart 
                        className={`w-4 h-4 transition-all duration-300 ${customer?.favorites.includes(product.id) ? "fill-red-500 scale-110" : "hover:scale-110"}`} 
                      />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground/80 mt-2 leading-relaxed">
                    {product.description}
                  </p>
                  <p className="text-xl font-black text-primary mt-3">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                
                <div className="flex items-center gap-1.5 bg-secondary/40 backdrop-blur-sm rounded-2xl p-1.5">
                  <button
                    onClick={() => updateQuantity(product.id, -1)}
                    className="qty-btn w-10 h-10 bg-card/90 text-foreground hover:bg-primary/15 active:bg-primary active:text-primary-foreground"
                    aria-label={`Diminuir quantidade de ${product.name}`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-9 text-center font-black text-foreground tabular-nums text-lg">
                    {quantities[product.id] || 0}
                  </span>
                  <button
                    onClick={() => updateQuantity(product.id, 1)}
                    className="qty-btn w-10 h-10 bg-primary text-primary-foreground hover:brightness-110 hover:scale-105 shadow-md shadow-primary/20"
                    aria-label={`Aumentar quantidade de ${product.name}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Cart Summary */}
        {getTotalItems() > 0 && (
          <section id="checkout-section" className="mt-8 bg-card rounded-2xl p-4 border border-primary/30 shadow-lg shadow-primary/10">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Seu Pedido</h3>
            </div>
            
            <div className="space-y-2">
              {products.map((product) => {
                const qty = quantities[product.id] || 0
                if (qty === 0) return null
                return (
                  <div key={product.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {qty}x {product.name}
                    </span>
                    <span className="text-foreground font-medium">
                      {formatCurrency(product.price * qty)}
                    </span>
                  </div>
                )
              })}
            </div>
            
            <div className="border-t border-border mt-4 pt-4 flex justify-between items-center">
              <span className="text-foreground font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(getTotal())}
              </span>
            </div>
          </section>
        )}

        {/* Spacer for fixed button - altura suficiente para nao sobrepor */}
        <div className="h-24" />

        {/* Footer */}
        <footer className="text-center py-6 border-t border-border mt-8">
          <p className="text-xs text-muted-foreground tracking-wider">
            DEVELOPED BY <span className="font-semibold text-foreground/80">AILTON</span>
          </p>
        </footer>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/5 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.2)]">
        <div className="max-w-lg mx-auto">
            {!isStoreOpen ? (
            <div className="w-full py-3 bg-gradient-to-r from-red-500/10 to-red-500/5 text-red-400 font-bold text-base rounded-xl flex items-center justify-center gap-2 border border-red-500/20">
              <X className="w-4 h-4" />
              Loja Fechada
            </div>
          ) : (
            <button
              onClick={openCheckout}
              disabled={getTotalItems() === 0}
              className="premium-btn w-full py-3.5 bg-primary text-primary-foreground font-bold text-sm rounded-2xl flex items-center justify-between px-4 transition-all duration-300 hover:brightness-110 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
            >
              {getTotalItems() > 0 ? (
                <>
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-xl text-xs font-bold tabular-nums">
                    {getTotalItems()} {getTotalItems() === 1 ? "item" : "itens"}
                  </span>
                  <span className="font-bold tracking-wide text-base">Finalizar Pedido</span>
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-xl text-xs font-bold tabular-nums">
                    {formatCurrency(getTotal())}
                  </span>
                </>
              ) : (
                <>
                  <span></span>
                  <span className="flex items-center gap-2 font-bold">
                    <ShoppingCart className="w-4 h-4" />
                    Finalizar Pedido
                  </span>
                  <span></span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

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
                      <div className="mt-4 pt-4 border-t border-border/30">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Codigo do cupom"
                            className="premium-input flex-1 px-4 py-3 bg-input/50 border border-border/50 rounded-xl text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none"
                          />
                          <button
                            onClick={applyCoupon}
                            className="premium-btn px-5 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98]"
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
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                            {(siteConfig.delivery?.neighborhoodFees || [])
                              .filter(n => n.active !== false)
                              .map((neighborhood) => (
                                <option key={neighborhood.name} value={neighborhood.name}>
                                  {neighborhood.name} - R$ {neighborhood.fee.toFixed(2)}
                                </option>
                              ))}
                          </select>
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
                          {!formData.bairro && !isOrderBlocked && (
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
                                      <p className="font-semibold text-foreground">Carina Karen da Silva</p>
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
                                      window.open(`https://api.whatsapp.com/send?phone=5511918505799&text=${message}`, "_blank")
                                      
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
                                <button
                                  onClick={createPixCharge}
                                  className="premium-btn w-full py-4 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-black rounded-2xl flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:shadow-primary/25 active:scale-[0.98] shadow-lg shadow-primary/15 relative overflow-hidden group"
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
                    <button
                      onClick={handleManualPayment}
                      className="premium-btn w-full py-5 bg-gradient-to-r from-green-500 to-green-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all hover:shadow-2xl hover:shadow-green-500/40 active:scale-[0.98] relative overflow-hidden group animate-scale-in"
                      style={{ animationDelay: '0.25s' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <Send className="w-5 h-5 relative" />
                      <span className="relative text-base">Finalizar Pedido no WhatsApp</span>
                    </button>
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
      {showCloseConfirmModal && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">PIX Ativo</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Existe um PIX ativo para este pedido. Para alterar algo, voce precisa iniciar um novo pedido.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => setShowCloseConfirmModal(false)}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                  Continuar neste pedido
                </button>
                <button
                  onClick={() => {
                    setShowCloseConfirmModal(false)
                    setShowNewOrderModal(true)
                  }}
                  className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
                >
                  Fazer novo pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de opcoes para novo pedido */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <ShoppingCart className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">Novo Pedido</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Como voce deseja comecar seu novo pedido?
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={startNewOrderFromScratch}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                  Novo pedido do zero
                </button>
                <button
                  onClick={startNewOrderKeepingData}
                  className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
                >
                  Manter dados de entrega
                </button>
                <button
                  onClick={() => setShowNewOrderModal(false)}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Login */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground">
                {loginStep === "phone" && "Entrar ou Criar Conta"}
                {loginStep === "pin" && "Digite seu PIN"}
                {loginStep === "register" && "Criar Conta"}
              </h3>
              <button
                onClick={() => {
                  setShowLoginModal(false)
                  resetLoginForm()
                }}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {loginStep === "phone" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Telefone</label>
                  <input
                    type="tel"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {loginError && (
                  <p className="text-sm text-red-500">{loginError}</p>
                )}
                <button
                  onClick={handleLoginNext}
                  disabled={loginLoading}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Continuar
                </button>
              </div>
            )}
            
            {loginStep === "pin" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">PIN de 4 digitos</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="****"
                    className="w-full px-4 py-3 bg-secondary rounded-xl text-foreground text-center text-2xl tracking-widest placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {loginError && (
                  <p className="text-sm text-red-500">{loginError}</p>
                )}
                <button
                  onClick={handleLogin}
                  disabled={loginLoading || loginPin.length !== 4}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Entrar
                </button>
                <button
                  onClick={() => {
                    setLoginStep("phone")
                    setLoginPin("")
                    setLoginError("")
                  }}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Voltar
                </button>
              </div>
            )}
            
            {loginStep === "register" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Telefone nao encontrado. Crie sua conta:
                </p>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Seu nome</label>
                  <input
                    type="text"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    placeholder="Digite seu nome"
                    className="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Crie um PIN de 4 digitos</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="****"
                    className="w-full px-4 py-3 bg-secondary rounded-xl text-foreground text-center text-2xl tracking-widest placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Use este PIN para acessar sua conta</p>
                </div>
                {loginError && (
                  <p className="text-sm text-red-500">{loginError}</p>
                )}
                <button
                  onClick={handleRegister}
                  disabled={loginLoading || loginPin.length !== 4 || !loginName.trim()}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Criar Conta
                </button>
                <button
                  onClick={() => {
                    setLoginStep("phone")
                    setLoginName("")
                    setLoginPin("")
                    setLoginError("")
                  }}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Voltar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Minha Conta */}
      {showMyAccountModal && customer && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl max-w-sm w-full border border-border animate-in fade-in zoom-in duration-200 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Minha Conta</h3>
              <button
                onClick={() => setShowMyAccountModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Info do cliente */}
              <div className="bg-secondary/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground flex items-center gap-2">
                      {customer.name}
                      {customer.isVip && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-500" /> VIP
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  </div>
                </div>
              </div>
              
              {/* Estatisticas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/30 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{customer.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-500">
                    R$ {customer.totalSpent.toFixed(2).replace(".", ",")}
                  </p>
                  <p className="text-xs text-muted-foreground">Total gasto</p>
                </div>
              </div>
              
              {/* Favoritos */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  Favoritos ({customer.favorites.length})
                </h4>
                {customer.favorites.length > 0 ? (
                  <div className="space-y-2">
                    {customer.favorites.map(favId => {
                      const product = products.find(p => p.id === favId)
                      return product ? (
                        <div key={favId} className="flex items-center justify-between bg-secondary/30 rounded-lg p-2">
                          <span className="text-sm text-foreground">{product.name}</span>
                          <span className="text-sm text-primary font-medium">
                            R$ {product.price.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      ) : null
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum favorito ainda</p>
                )}
              </div>
              
              {/* Endereco salvo */}
              {customer.savedAddress && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Endereco salvo
                  </h4>
                  <div className="bg-secondary/30 rounded-xl p-3">
                    <p className="text-sm text-foreground">
                      {customer.savedAddress.endereco}, {customer.savedAddress.numero}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {customer.savedAddress.bairro}
                      {customer.savedAddress.referencia && ` - ${customer.savedAddress.referencia}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Meus Pedidos */}
      {showMyOrdersModal && customer && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl max-w-sm w-full border border-border animate-in fade-in zoom-in duration-200 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Meus Pedidos</h3>
              <button
                onClick={() => setShowMyOrdersModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {loadingOrders ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : customerOrders.length > 0 ? (
                <div className="space-y-3">
                  {customerOrders.map(order => (
                    <div key={order.id} className="bg-secondary/30 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-muted-foreground">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          order.status === "completed" ? "bg-green-500/20 text-green-500" :
                          order.status === "cancelled" ? "bg-red-500/20 text-red-500" :
                          order.status === "delivering" ? "bg-blue-500/20 text-blue-500" :
                          "bg-yellow-500/20 text-yellow-600"
                        }`}>
                          {order.status === "completed" ? "Entregue" :
                           order.status === "cancelled" ? "Cancelado" :
                           order.status === "delivering" ? "Em entrega" :
                           order.status === "preparing" ? "Preparando" :
                           order.status === "confirmed" ? "Confirmado" :
                           "Pendente"}
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">{order.items}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="text-sm font-bold text-primary">
                          R$ {order.total.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        {order.itemsDetailed && (
                          <button
                            onClick={() => repeatOrder(order)}
                            className="flex-1 py-2 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium"
                          >
                            Pedir novamente
                          </button>
                        )}
                        {(order.status === "pending" || order.status === "confirmed" || order.status === "preparing" || order.status === "delivering") && (
                          <a
                            href={`/pedido/${order.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 text-xs bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium text-center"
                          >
                            Acompanhar
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Voce ainda nao fez nenhum pedido</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Repetir Pedido */}
      {showRepeatConfirm && orderToRepeat && (
        <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl max-w-sm w-full border border-border animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Deseja repetir este pedido?</h3>
            </div>
            
            <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
              {orderToRepeat.itemsDetailed?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {item.quantity}x {item.productName}
                  </span>
                  <span className="text-muted-foreground">
                    R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="font-medium text-foreground">Total</span>
                <span className="font-bold text-primary text-lg">
                  R$ {orderToRepeat.total.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
            
            <div className="p-4 border-t border-border flex gap-2">
              <button
                onClick={() => {
                  setShowRepeatConfirm(false)
                  setOrderToRepeat(null)
                }}
                className="flex-1 py-3 text-sm bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRepeatOrder}
                className="flex-1 py-3 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
              >
                Sim, pedir novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Notificacao */}
      {toastMessage && (
        <div className="toast animate-toast-in">
          <span className="text-sm font-medium text-foreground">{toastMessage}</span>
        </div>
      )}
      
      {/* Toast de Adicao ao Carrinho */}
      {addToast.show && (
        <div className="toast animate-toast-in flex items-center gap-2">
          <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">+1 adicionado</span>
        </div>
      )}
    </main>
  )
}
