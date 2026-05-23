"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { Minus, Plus, ShoppingCart, Send, MapPin, User, CreditCard, MessageSquare, X, Copy, Check, Loader2, MapPinned, Phone, Home as HomeIcon, AlertCircle, Tag, Truck, MessageCircle, Clock } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { type SiteConfig, type Coupon, defaultConfig } from "@/lib/config-types"

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
        
        console.log("[v0] Pedido restaurado do localStorage")
      }
    } catch (error) {
      console.error("[v0] Erro ao restaurar pedido:", error)
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

  const updateQuantity = (id: number, delta: number) => {
    const newQty = Math.max(0, (quantities[id] || 0) + delta)
    setQuantities((prev) => ({
      ...prev,
      [id]: newQty,
    }))
    if (delta > 0) {
      playAddSound()
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

    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            orderId: orderId || generateOrderId(), // ID publico PK...
            customerName: formData.nome,
            customerPhone: formData.telefone,
            items: orderItems,
            total: getTotal(),
            paymentMethod,
            deliveryType,
            address: deliveryType === "entrega" 
              ? `${formData.endereco}, ${formData.numero} - ${formData.bairro} (Ref: ${formData.referencia})`
              : "Retirada no local",
          },
        }),
      })
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
          console.log("[v0] Pedido PIX salvo no backend:", newOrderId)
        } catch (err) {
          console.error("[v0] Erro ao salvar pedido PIX:", err)
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
            console.log("[v0] Pedido confirmado no backend:", orderId)
          } catch (err) {
            console.error("[v0] Erro ao confirmar pedido:", err)
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
━━━━━━━━━━━━━━━━━━

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

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-primary">{STORE_NAME}</h1>
              <p className="text-xs text-muted-foreground">Paulo e Karina</p>
            </div>
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative p-3 bg-primary rounded-full transition-transform hover:scale-105 active:scale-95"
            >
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-48 overflow-hidden">
        <Image
          src="/acai-bowl.jpg"
          alt="Açaí delicioso"
          fill
          className="object-cover"
          priority
        />
<div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-2xl font-extrabold text-foreground drop-shadow-lg">
                  {siteConfig.banner.mainText}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {siteConfig.banner.secondaryText}
                </p>
              </div>
</section>

      {/* Aviso Loja Fechada com Horario */}
      {!isStoreOpen && (
        <div className="mx-4 mt-4 p-5 bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-red-500/40 rounded-2xl">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-red-400">
              Estamos fechados no momento
            </h3>
            {siteConfig.storeHours.closedMessage && (
              <p className="text-sm text-muted-foreground">
                {siteConfig.storeHours.closedMessage}
              </p>
            )}
            <div className="pt-2 border-t border-red-500/20">
              <p className="text-xs text-muted-foreground mb-1">Horario de funcionamento:</p>
              <p className="text-sm font-medium text-foreground">
                {siteConfig.storeHours.openTime || "18:00"} as {siteConfig.storeHours.closeTime || "23:30"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      <section className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Cardapio</h3>
          
          {/* Loading state */}
          {!configLoaded && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-card rounded-2xl p-4 border border-border shadow-lg animate-pulse"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-secondary rounded w-2/3"></div>
                      <div className="h-4 bg-secondary rounded w-full"></div>
                      <div className="h-6 bg-secondary rounded w-1/4"></div>
                    </div>
                    <div className="w-28 h-10 bg-secondary rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Products loaded */}
          {configLoaded && products.map((product) => (
            <div
              key={product.id}
              className="bg-card rounded-2xl p-4 border border-border shadow-lg shadow-primary/5 transition-all hover:shadow-primary/10"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{product.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {product.description}
                  </p>
                  <p className="text-lg font-bold text-primary mt-2">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 bg-secondary rounded-full p-1">
                  <button
                    onClick={() => updateQuantity(product.id, -1)}
                    className="w-9 h-9 flex items-center justify-center bg-card rounded-full text-foreground transition-all hover:bg-primary hover:text-primary-foreground active:scale-90"
                    aria-label={`Diminuir quantidade de ${product.name}`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-semibold text-foreground">
                    {quantities[product.id] || 0}
                  </span>
                  <button
                    onClick={() => updateQuantity(product.id, 1)}
                    className="w-9 h-9 flex items-center justify-center bg-primary rounded-full text-primary-foreground transition-all hover:brightness-110 active:scale-90"
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
          <section className="mt-8 bg-card rounded-2xl p-4 border border-primary/30 shadow-lg shadow-primary/10">
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

        {/* Spacer for fixed button */}
        <div className="h-4" />

        {/* Footer */}
        <footer className="text-center py-6 border-t border-border mt-8">
          <p className="text-xs text-muted-foreground tracking-wider">
            DEVELOPED BY <span className="font-semibold text-foreground/80">AILTON</span>
          </p>
        </footer>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border p-4">
        <div className="max-w-lg mx-auto">
            {!isStoreOpen ? (
            <div className="w-full py-4 bg-red-500/20 text-red-400 font-bold text-lg rounded-2xl flex items-center justify-center gap-3 border border-red-500/50">
              <X className="w-5 h-5" />
              Loja Fechada
            </div>
          ) : (
            <button
              onClick={openCheckout}
              disabled={getTotalItems() === 0}
              className="w-full py-4 bg-primary text-primary-foreground font-bold text-lg rounded-2xl flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
            >
              <Send className="w-5 h-5" />
              Enviar Pedido no WhatsApp
              {getTotalItems() > 0 && (
                <span className="bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm">
                  {formatCurrency(getTotal())}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-screen pb-8">
            {/* Modal Header */}
            <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border">
              <div className="max-w-lg mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">
                    {paymentStatus === "confirmed" ? "Pedido Confirmado" : "Finalizar Pedido"}
                  </h2>
                <button 
                  onClick={handleCloseCheckout}
                  className="p-2 bg-secondary rounded-full text-foreground transition-all hover:bg-secondary/80 active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
                </div>
              </div>
            </header>

            <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
              {/* Payment Confirmed Screen */}
              {paymentStatus === "confirmed" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Success Banner */}
                  <div className="bg-green-500/20 border border-green-500/50 rounded-2xl p-6 text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-400 mb-2">PAGAMENTO APROVADO</h3>
                    <p className="text-green-300">Seu pedido foi confirmado com sucesso!</p>
                  </div>

                  {/* Order Details */}
                  <div className="bg-card rounded-2xl p-4 border border-border space-y-4">
                    <div className="flex justify-between items-center border-b border-border pb-3">
                      <span className="text-muted-foreground">Pedido No</span>
                      <span className="font-bold text-primary">{orderId}</span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Cliente</p>
                      <p className="font-semibold text-foreground">{formData.nome}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Itens</p>
                      {products.map((product) => {
                        const qty = quantities[product.id] || 0
                        if (qty === 0) return null
                        return (
                          <p key={product.id} className="text-foreground">
                            {qty}x {product.name}
                          </p>
                        )
                      })}
                    </div>

                    <div className="flex justify-between items-center border-t border-border pt-3">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="text-xl font-bold text-primary">{formatCurrency(getTotal())}</span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Pagamento</p>
                      <p className="font-semibold text-green-400">PIX CONFIRMADO</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{deliveryType === "entrega" ? "Entrega" : "Retirada"}</p>
                      {deliveryType === "entrega" ? (
                        <>
                          <p className="text-foreground">{formData.endereco}, {formData.numero}</p>
                          <p className="text-muted-foreground text-sm">Ref: {formData.referencia}</p>
                          {formData.localizacao && (
                            <a href={formData.localizacao} target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline">
                              Ver no mapa
                            </a>
                          )}
                        </>
                      ) : (
                        <p className="text-foreground">Retirada no local</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Horario do pagamento</p>
                      <p className="text-foreground">{paymentTime}</p>
                    </div>
                  </div>

                  {/* Send to WhatsApp Button */}
                  <button
                    onClick={sendConfirmedOrder}
                    className="w-full py-4 bg-green-500 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-green-600 active:scale-[0.98] shadow-lg"
                  >
                    <Check className="w-6 h-6" />
                    ENVIAR PEDIDO CONFIRMADO
                  </button>
                </div>
              )}

              {/* Normal Checkout Flow */}
              {paymentStatus !== "confirmed" && (
                <>
                  {/* Order Summary */}
                  <section className="bg-card rounded-2xl p-4 border border-border">
                    <h3 className="font-semibold text-foreground mb-3">Resumo do Pedido</h3>
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
                    
                    {/* Subtotal, Desconto, Taxa, Total */}
                    <div className="border-t border-border mt-3 pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="text-foreground">{formatCurrency(getSubtotal())}</span>
                      </div>
                      {appliedCoupon && getDiscount() > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400">Cupom {appliedCoupon.code}</span>
                          <span className="text-green-400">-{formatCurrency(getDiscount())}</span>
                        </div>
                      )}
                      {deliveryType === "entrega" && getDeliveryFee() > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Taxa de entrega</span>
                          <span className="text-foreground">{formatCurrency(getDeliveryFee())}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-border">
                        <span className="text-foreground font-semibold">Total</span>
                        <span className="text-xl font-bold text-primary">{formatCurrency(getTotal())}</span>
                      </div>
                    </div>

                    {/* Cupom */}
                    {(siteConfig.coupons || []).length > 0 && !appliedCoupon && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Codigo do cupom"
                            className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground"
                          />
                          <button
                            onClick={applyCoupon}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
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
                      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-400">
                          <Tag className="w-4 h-4" />
                          <span className="text-sm font-medium">Cupom {appliedCoupon.code} aplicado</span>
                        </div>
                        <button
                          onClick={() => setAppliedCoupon(null)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </section>

                  {/* Mensagem de pedido bloqueado */}
                  {isOrderBlocked && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-amber-400 font-medium text-sm">Pedido bloqueado</p>
                          <p className="text-muted-foreground text-xs mt-1">
                            Para alterar itens ou bairro, cancele este pedido e comece um novo.
                          </p>
                          <button
                            onClick={() => setShowNewOrderModal(true)}
                            className="mt-3 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors"
                          >
                            Fazer novo pedido
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delivery Type */}
                  <section className={`bg-card rounded-2xl p-4 border border-border space-y-4 ${isOrderBlocked ? 'opacity-50 pointer-events-none' : ''}`}>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Truck className="w-5 h-5 text-primary" />
                      Tipo de Entrega
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {DELIVERY_ENABLED && (
                        <button
                          onClick={() => !isOrderBlocked && setDeliveryType("entrega")}
                          disabled={isOrderBlocked}
                          className={`py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            deliveryType === "entrega"
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                          Entrega
                          {DELIVERY_FEE > 0 && <span className="text-xs opacity-75">(+R${DELIVERY_FEE})</span>}
                        </button>
                      )}
                      {PICKUP_ENABLED && (
                        <button
                          onClick={() => !isOrderBlocked && setDeliveryType("retirada")}
                          disabled={isOrderBlocked}
                          className={`py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            deliveryType === "retirada"
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          }`}
                        >
                          <HomeIcon className="w-4 h-4" />
                          Retirada
                        </button>
                      )}
                    </div>
                    {deliveryType === "entrega" && siteConfig.delivery?.estimatedTime && (
                      <p className="text-xs text-muted-foreground text-center">
                        Tempo estimado: {siteConfig.delivery.estimatedTime}
                      </p>
                    )}
                  </section>

                  {/* Customer Info */}
                  <section className={`bg-card rounded-2xl p-4 border border-border space-y-4 ${isOrderBlocked ? 'opacity-50 pointer-events-none' : ''}`}>
                    <h3 className="font-semibold text-foreground">Seus Dados</h3>
                    
                    <div>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <User className="w-4 h-4" />
                        Nome *
                      </label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => !isOrderBlocked && setFormData({ ...formData, nome: e.target.value })}
                        disabled={isOrderBlocked}
                        placeholder="Seu nome completo"
                        className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Phone className="w-4 h-4" />
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
                        className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>

                    {deliveryType === "entrega" && (
                      <>
                        <div>
                          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <MapPin className="w-4 h-4" />
                            Endereco *
                          </label>
                          <input
                            type="text"
                            value={formData.endereco}
                            onChange={(e) => !isOrderBlocked && setFormData({ ...formData, endereco: e.target.value })}
                            disabled={isOrderBlocked}
                            placeholder="Rua"
                            className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <HomeIcon className="w-4 h-4" />
                              Numero *
                            </label>
                            <input
                              type="text"
                              value={formData.numero}
                              onChange={(e) => !isOrderBlocked && setFormData({ ...formData, numero: e.target.value })}
                              disabled={isOrderBlocked}
                              placeholder="Numero"
                              className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
                            />
                          </div>
                        </div>

                        {/* Bairro Dropdown */}
                        <div>
                          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <MapPin className="w-4 h-4" />
                            Bairro *
                          </label>
                          <select
                            value={formData.bairro}
                            onChange={(e) => !isOrderBlocked && setFormData({ ...formData, bairro: e.target.value })}
                            disabled={isOrderBlocked}
                            className={`w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none ${isOrderBlocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
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
                            <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-xl">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Truck className="w-4 h-4" />
                                  Taxa de entrega:
                                </span>
                                <span className="font-semibold text-primary">
                                  {formatCurrency(orderSnapshot ? orderSnapshot.deliveryFee : getDeliveryFee())}
                                </span>
                              </div>
                            </div>
                          )}
                          {!formData.bairro && !isOrderBlocked && (
                            <p className="text-xs text-amber-400 mt-2">
                              Selecione seu bairro para calcular a entrega.
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <MapPinned className="w-4 h-4" />
                            Referencia *
                          </label>
                          <input
                            type="text"
                            value={formData.referencia}
                            onChange={(e) => !isOrderBlocked && setFormData({ ...formData, referencia: e.target.value })}
                            disabled={isOrderBlocked}
                            placeholder="Ponto de referencia"
                            className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
                          />
                        </div>

                        <button
                          onClick={getLocation}
                          disabled={isOrderBlocked}
                          className={`w-full py-3 bg-secondary text-secondary-foreground rounded-xl flex items-center justify-center gap-2 transition-all ${isOrderBlocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary/80'}`}
                        >
                          <MapPinned className="w-4 h-4" />
                          Enviar minha localizacao
                        </button>
                        {formData.localizacao && (
                          <p className="text-xs text-green-400 text-center">Localizacao capturada com sucesso!</p>
                        )}
                      </>
                    )}

                    <div>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MessageSquare className="w-4 h-4" />
                        Observacoes (opcional)
                      </label>
                      <textarea
                        value={formData.observacao}
                        onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                        placeholder="Ex: Sem banana, mais granola..."
                        rows={2}
                        className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                      />
                    </div>
                  </section>

                  {/* Payment Method */}
                  <section className="bg-card rounded-2xl p-4 border border-border space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      Forma de Pagamento
                    </h3>
                    
                    {/* Mostrar botoes quando NAO tem PIX automatico ativo (permite durante cooldown) */}
                    {!isOrderLocked && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: "pix", label: "Pix" },
                            { value: "dinheiro", label: "Dinheiro" },
                            { value: "cartao", label: "Cartao" },
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                setFormData({ ...formData, pagamento: option.value })
                                if (!isInCooldown) {
                                  setPaymentStatus("idle")
                                  setPixData(null)
                                }
                              }}
                              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                                formData.pagamento === option.value
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Card de cooldown com PIX manual */}
                    {isInCooldown && (
                      <div className="space-y-4">
                        {/* Aviso de cooldown */}
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                          <p className="text-amber-400 text-sm text-center">
                            Novo PIX automatico disponivel em:{" "}
                            <span className="font-mono font-bold">
                              {Math.floor(pixCooldownLeft / 60).toString().padStart(2, '0')}:{(pixCooldownLeft % 60).toString().padStart(2, '0')}
                            </span>
                          </p>
                        </div>
                        
                        {/* PIX Manual durante cooldown */}
                        {formData.pagamento === "pix" && (
                          <div className="bg-secondary/50 rounded-xl p-4 space-y-4">
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground mb-3">
                                Nao quer esperar? Pague pelo PIX manual e envie o comprovante no WhatsApp.
                              </p>
                              {!showManualPixDuringCooldown ? (
                                <button
                                  onClick={() => setShowManualPixDuringCooldown(true)}
                                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                                >
                                  Pagar com PIX manual
                                </button>
                              ) : (
                                <div className="space-y-4 animate-in fade-in duration-300 border-t border-border pt-4 mt-4">
                                  <div className="text-center">
                                    <h4 className="font-bold text-foreground">PIX Manual</h4>
                                    <p className="text-xs text-muted-foreground mt-1">Pague e envie o comprovante</p>
                                  </div>
                                  
                                  <div className="flex flex-col items-center">
                                    <div className="bg-white p-4 rounded-xl shadow-md">
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

                    {/* PIX Section */}
                    {formData.pagamento === "pix" && (
                      <div className="bg-secondary/50 rounded-xl p-4 space-y-4">
                        {/* Loading State */}
                        {paymentStatus === "loading" && (
                          <div className="flex flex-col items-center py-8">
                            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                            <p className="text-foreground font-medium">Gerando PIX...</p>
                            <p className="text-sm text-muted-foreground">Aguarde um momento</p>
                          </div>
                        )}

                        {/* Error State */}
                        {paymentStatus === "error" && (
                          <div className="text-center py-4">
                            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                            <p className="text-red-400 font-medium mb-2">Erro ao gerar PIX</p>
                            {paymentErrorMessage && (
                              <p className="text-sm text-red-300 mb-4 px-4">{paymentErrorMessage}</p>
                            )}
                            <button
                              onClick={() => {
                                setPaymentStatus("idle")
                                setPaymentErrorMessage("")
                              }}
                              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg"
                            >
                              Corrigir e tentar novamente
                            </button>
                          </div>
                        )}

                        {/* Awaiting Payment */}
                        {paymentStatus === "awaiting" && pixData && (
                          <div className="space-y-4 animate-in fade-in duration-300">
                            {/* Header PIX */}
                            <div className="text-center border-b border-border pb-3">
                              <h4 className="font-bold text-foreground text-lg">Pagamento via PIX</h4>
                              {!pixExpired ? (
                                <div className="flex items-center justify-center gap-2 mt-2">
                                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                                  <span className="text-yellow-400 font-medium">AGUARDANDO PAGAMENTO</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2 mt-2">
                                  <div className="w-3 h-3 bg-red-400 rounded-full" />
                                  <span className="text-red-400 font-medium">PIX EXPIRADO</span>
                                </div>
                              )}
                              {/* Timer */}
                              {!pixExpired && pixTimeLeft > 0 && (
                                <div className="mt-2 text-sm">
                                  <span className="text-muted-foreground">Expira em: </span>
                                  <span className={`font-mono font-bold ${pixTimeLeft <= 60 ? 'text-red-400' : 'text-foreground'}`}>
                                    {Math.floor(pixTimeLeft / 60).toString().padStart(2, '0')}:{(pixTimeLeft % 60).toString().padStart(2, '0')}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* QR Code */}
                            <div className="flex flex-col items-center">
                              <p className="text-sm text-muted-foreground mb-3">
                                {pixExpired ? "PIX expirado - gere um novo" : "Escaneie o QR Code para pagar"}
                              </p>
                              <div className={`bg-white p-4 rounded-xl shadow-md ${pixExpired ? 'opacity-40 grayscale' : ''}`}>
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
                                  className="mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all"
                                >
                                  Comecar novo pedido
                                </button>
                              )}
                            </div>

                            {/* Dados do recebedor */}
                            <div className="space-y-2">
                              <div className="bg-input rounded-xl px-4 py-3">
                                <p className="text-xs text-muted-foreground">Nome do Recebedor</p>
                                <p className="font-semibold text-foreground">{PIX_RECEIVER_NAME}</p>
                              </div>

                              <div className="bg-input rounded-xl px-4 py-3">
                                <p className="text-xs text-muted-foreground">Valor do Pedido</p>
                                <p className="font-bold text-xl text-primary">{formatCurrency(orderSnapshot?.total || pixData.value)}</p>
                              </div>
                              
                              {orderSnapshot && (
                                <div className="bg-input/50 rounded-xl px-4 py-3 text-xs space-y-1">
                                  <p className="text-muted-foreground">Subtotal: {formatCurrency(orderSnapshot.subtotal)}</p>
                                  {orderSnapshot.discount > 0 && (
                                    <p className="text-green-400">Desconto: -{formatCurrency(orderSnapshot.discount)}</p>
                                  )}
                                  {orderSnapshot.deliveryFee > 0 && (
                                    <p className="text-muted-foreground">Entrega ({orderSnapshot.bairro}): {formatCurrency(orderSnapshot.deliveryFee)}</p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Codigo PIX Copia e Cola */}
                            <div className="bg-input rounded-xl p-4 space-y-3">
                              <p className="text-sm font-medium text-foreground">Codigo PIX Copia e Cola</p>
                              <div className="bg-background/50 rounded-lg p-3 max-h-24 overflow-y-auto">
                                <p className="font-mono text-xs text-muted-foreground break-all select-all">
                                  {pixData.pixCopyPaste}
                                </p>
                              </div>
                              <button
                                onClick={() => !pixExpired && copyToClipboard(pixData.pixCopyPaste, setCopiedCode)}
                                disabled={pixExpired}
                                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
                                  pixExpired 
                                    ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                                    : 'bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98]'
                                }`}
                              >
                                {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                {pixExpired ? "PIX Expirado" : copiedCode ? "Copiado com sucesso!" : "Copiar Codigo PIX"}
                              </button>
                            </div>

                            {/* Aviso */}
                            <div className="bg-primary/20 border border-primary/30 rounded-xl p-3">
                              <p className="text-sm text-foreground text-center">
                                O pagamento sera confirmado automaticamente
                              </p>
                            </div>
                            
                            {/* Botao alterar forma de pagamento */}
                            {!pixExpired && (
                              <button
                                onClick={() => setShowChangePaymentModal(true)}
                                className="w-full py-3 text-sm text-muted-foreground hover:text-primary transition-colors"
                              >
                                Alterar forma de pagamento
                              </button>
                            )}
                          </div>
                        )}

                        {/* Manual PIX - For orders below R$15 */}
                        {paymentStatus === "manual" && manualPixCode && (
                          <div className="space-y-4 animate-in fade-in duration-300">
                            {/* Header */}
                            <div className="text-center border-b border-border pb-3">
                              <h4 className="font-bold text-foreground text-lg">Pagamento via PIX Manual</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                Pedidos abaixo de R$ 15,00
                              </p>
                            </div>

                            {/* QR Code */}
                            <div className="flex flex-col items-center">
                              <p className="text-sm text-muted-foreground mb-3">Escaneie o QR Code para pagar</p>
                              <div className="bg-white p-4 rounded-xl shadow-lg">
                                <QRCodeSVG
                                  value={manualPixCode}
                                  size={180}
                                  level="M"
                                  includeMargin={false}
                                />
                              </div>
                            </div>

                            {/* Dados do recebedor */}
                            <div className="space-y-2">
                              <div className="bg-input rounded-xl px-4 py-3">
                                <p className="text-xs text-muted-foreground">Nome do Recebedor</p>
                                <p className="font-semibold text-foreground">{PIX_MANUAL_NAME}</p>
                              </div>

                              <div className="flex items-center justify-between bg-input rounded-xl px-4 py-3">
                                <div>
                                  <p className="text-xs text-muted-foreground">Chave PIX (Telefone)</p>
                                  <p className="font-mono font-semibold text-foreground">{PIX_MANUAL_KEY}</p>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(PIX_MANUAL_KEY, setCopiedManualKey)}
                                  className="flex items-center gap-2 px-3 py-2 bg-primary rounded-lg text-primary-foreground text-sm font-medium transition-all hover:brightness-110 active:scale-95"
                                >
                                  {copiedManualKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                  {copiedManualKey ? "Copiado!" : "Copiar"}
                                </button>
                              </div>

                              <div className="bg-input rounded-xl px-4 py-3">
                                <p className="text-xs text-muted-foreground">Valor do Pedido</p>
                                <p className="font-bold text-xl text-primary">{formatCurrency(getTotal())}</p>
                              </div>
                            </div>

                            {/* Codigo PIX Copia e Cola */}
                            <div className="bg-input rounded-xl p-4 space-y-3">
                              <p className="text-sm font-medium text-foreground">Codigo PIX Copia e Cola</p>
                              <div className="bg-background/50 rounded-lg p-3 max-h-24 overflow-y-auto">
                                <p className="font-mono text-xs text-muted-foreground break-all select-all">
                                  {manualPixCode}
                                </p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(manualPixCode, setCopiedManualCode)}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-primary rounded-xl text-primary-foreground font-medium transition-all hover:brightness-110 active:scale-[0.98]"
                              >
                                {copiedManualCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                {copiedManualCode ? "Copiado com sucesso!" : "Copiar Codigo PIX"}
                              </button>
                            </div>

                            {/* Aviso */}
                            <div className="bg-primary/20 border border-primary/30 rounded-xl p-4">
                              <p className="text-sm text-foreground text-center">
                                Apos o pagamento, envie o comprovante no WhatsApp para agilizar a confirmacao do pedido.
                              </p>
                            </div>

                            {/* Botao WhatsApp */}
                            <button
                              onClick={sendManualPayment}
                              className="w-full py-4 bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-green-700 active:scale-[0.98]"
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
                              <div className="space-y-3">
                                <p className="text-muted-foreground text-sm">
                                  PIX automatico bloqueado por mais{" "}
                                  <span className="font-mono font-bold text-amber-400">
                                    {Math.floor(pixCooldownLeft / 60).toString().padStart(2, '0')}:{(pixCooldownLeft % 60).toString().padStart(2, '0')}
                                  </span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Escolha Dinheiro, Cartao ou PIX manual acima.
                                </p>
                              </div>
                            ) : (
                              <>
                                <p className="text-muted-foreground mb-4">
                                  {getTotal() < MIN_VALUE_FOR_ASAAS 
                                    ? "Clique abaixo para ver os dados do PIX" 
                                    : "Clique abaixo para gerar o PIX automatico"}
                                </p>
                                <button
                                  onClick={createPixCharge}
                                  className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
                                >
                                  <CreditCard className="w-5 h-5" />
                                  {getTotal() < MIN_VALUE_FOR_ASAAS ? "Ver PIX Manual" : "Gerar PIX Automatico"}
                                </button>
                                {getTotal() < MIN_VALUE_FOR_ASAAS && (
                                  <p className="text-xs text-muted-foreground mt-3">
                                    Pedidos abaixo de R$ 15 usam PIX manual
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* Fallback Button */}
                        {(paymentStatus === "awaiting" || paymentStatus === "error") && (
                          <button
                            onClick={sendManualPayment}
                            className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl flex items-center justify-center gap-2 text-sm transition-all hover:bg-secondary/80"
                          >
                            <Phone className="w-4 h-4" />
                            Problema com o Pix? Pagar pelo WhatsApp
                          </button>
                        )}
                      </div>
                    )}
                  </section>

                  {/* Submit Button for non-PIX payments */}
                  {formData.pagamento !== "pix" && (
                    <button
                      onClick={handleManualPayment}
                      className="w-full py-4 bg-primary text-primary-foreground font-bold text-lg rounded-2xl flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-[0.98] shadow-lg shadow-primary/30"
                    >
                      <Send className="w-5 h-5" />
                      Finalizar Pedido no WhatsApp
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

      {/* Toast de Notificacao */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-card text-foreground px-4 py-3 rounded-xl shadow-lg border border-border flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-300">
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </main>
  )
}
