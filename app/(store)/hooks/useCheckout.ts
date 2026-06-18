"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { type Coupon, type SiteConfig, type Product } from "@/lib/config-types"
import { ORDER_STORAGE_KEY, PIX_COOLDOWN_DURATION, PIX_CHECK_INTERVAL } from "../constants"
import { generateOrderId, generatePixCode } from "../utils"
import type {
  PaymentStatus,
  DeliveryType,
  FormData,
  OrderSnapshot,
  PixData,
  SavedOrder,
} from "../types"

export interface UseCheckoutReturn {
  showCheckout: boolean
  setShowCheckout: (show: boolean) => void
  paymentStatus: PaymentStatus
  setPaymentStatus: (status: PaymentStatus) => void
  paymentErrorMessage: string
  pixData: PixData | null
  setPixData: (data: PixData | null) => void
  orderId: string
  setOrderId: (id: string) => void
  paymentTime: string
  manualPixCode: string
  copiedManualKey: boolean
  copiedManualCode: boolean
  setCopiedManualKey: (copied: boolean) => void
  setCopiedManualCode: (copied: boolean) => void
  pixTimeLeft: number
  pixExpired: boolean
  setPixExpired: (expired: boolean) => void
  orderSnapshot: OrderSnapshot | null
  setOrderSnapshot: (snapshot: OrderSnapshot | null) => void
  isOrderLocked: boolean
  pixCooldownEnd: number | null
  pixCooldownLeft: number
  isInCooldown: boolean
  isOrderBlocked: boolean
  showNewOrderModal: boolean
  setShowNewOrderModal: (show: boolean) => void
  showCloseConfirmModal: boolean
  setShowCloseConfirmModal: (show: boolean) => void
  showChangePaymentModal: boolean
  setShowChangePaymentModal: (show: boolean) => void
  showManualPixDuringCooldown: boolean
  setShowManualPixDuringCooldown: (show: boolean) => void
  appliedCoupon: Coupon | null
  setAppliedCoupon: (coupon: Coupon | null) => void
  couponCode: string
  setCouponCode: (code: string) => void
  couponError: string
  setCouponError: (error: string) => void
  applyCoupon: (coupons: Coupon[], subtotal: number) => void
  getDiscount: (subtotal: number) => number
  createPixCharge: (params: CreatePixParams) => Promise<void>
  handleCloseCheckout: () => void
  handleChangePaymentMethod: () => void
  startNewOrderFromScratch: (clearForm: () => void) => void
  startNewOrderKeepingData: (formData: FormData, setFormData: (data: FormData) => void) => void
  openCheckout: (totalItems: number, subtotal: number, minimumOrder: number, isStoreOpen: boolean) => void
  playConfirmSound: () => void
  audioRef: React.RefObject<HTMLAudioElement | null>
  // Premium - Cashback e Pontos
  cashbackUsed: number
  setCashbackUsed: (value: number) => void
  pointsRewardUsed: number
  setPointsRewardUsed: (value: number) => void
  getPremiumDiscount: () => number
}

interface CreatePixParams {
  formData: FormData
  deliveryType: DeliveryType
  products: Product[]
  quantities: Record<number, number>
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  minValueForAsaas: number
  pixKeyFull: string
  appliedCoupon: Coupon | null
  customer?: { id?: string; phone?: string } | null
  cashbackUsed?: number
  pointsRewardUsed?: number
}

export function useCheckout(
  showToast: (message: string) => void
): UseCheckoutReturn {
  const [showCheckout, setShowCheckout] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle")
  const [paymentErrorMessage, setPaymentErrorMessage] = useState("")
  const [pixData, setPixData] = useState<PixData | null>(null)
  const [orderId, setOrderId] = useState("")
  const [paymentTime, setPaymentTime] = useState("")
  const [manualPixCode, setManualPixCode] = useState("")
  const [copiedManualKey, setCopiedManualKey] = useState(false)
  const [copiedManualCode, setCopiedManualCode] = useState(false)
  const [pixTimeLeft, setPixTimeLeft] = useState(0)
  const [pixExpired, setPixExpired] = useState(false)
  const [orderSnapshot, setOrderSnapshot] = useState<OrderSnapshot | null>(null)
  const [pixCooldownEnd, setPixCooldownEnd] = useState<number | null>(null)
  const [pixCooldownLeft, setPixCooldownLeft] = useState(0)
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false)
  const [showChangePaymentModal, setShowChangePaymentModal] = useState(false)
  const [showManualPixDuringCooldown, setShowManualPixDuringCooldown] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponCode, setCouponCode] = useState("")
  const [couponError, setCouponError] = useState("")
  
  // Premium - Cashback e Pontos
  const [cashbackUsed, setCashbackUsed] = useState(0)
  const [pointsRewardUsed, setPointsRewardUsed] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pixTimerRef = useRef<NodeJS.Timeout | null>(null)

  const isOrderLocked = orderSnapshot !== null && paymentStatus === "awaiting" && !pixExpired
  const isInCooldown = pixCooldownEnd !== null && pixCooldownLeft > 0
  const isOrderBlocked = isOrderLocked || isInCooldown

  // Som de confirmacao
  const playConfirmSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }
  }, [])

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

  // Timer do cooldown
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

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // Aplicar cupom
  const applyCoupon = useCallback(
    (coupons: Coupon[], subtotal: number) => {
      setCouponError("")
      const coupon = coupons.find(
        (c) => c.code.toLowerCase() === couponCode.toLowerCase() && c.active
      )

      if (!coupon) {
        setCouponError("Cupom invalido ou expirado")
        return
      }

      if (coupon.minimumOrder > 0 && subtotal < coupon.minimumOrder) {
        setCouponError(`Pedido minimo de R$ ${coupon.minimumOrder.toFixed(2)} para este cupom`)
        return
      }

      setAppliedCoupon(coupon)
      setCouponCode("")
    },
    [couponCode]
  )

  // Calcular desconto
  const getDiscount = useCallback(
    (subtotal: number) => {
      if (!appliedCoupon) return 0
      if (appliedCoupon.type === "percentage") {
        return subtotal * (appliedCoupon.value / 100)
      }
      return Math.min(appliedCoupon.value, subtotal)
    },
    [appliedCoupon]
  )

  // Polling para verificar pagamento
  const startPaymentPolling = useCallback(
    (paymentId: string, currentOrderId: string) => {
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

            // Atualizar pedido como confirmado no Supabase
            console.log("[useCheckout] Pix confirmado! orderCode:", currentOrderId, "paymentId:", paymentId)
            
            if (!currentOrderId) {
              console.error("[useCheckout] ERRO CRITICO: orderCode esta vazio!")
            } else {
              try {
                const confirmPayload = {
                  orderCode: currentOrderId,  // PK20260528... - campo principal
                  paymentId: paymentId,       // pay_xxx do Asaas
                }
                console.log("[useCheckout] Enviando para /api/orders/confirm:", JSON.stringify(confirmPayload))
                
                const confirmResponse = await fetch("/api/orders/confirm", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(confirmPayload),
                })
                const confirmData = await confirmResponse.json()
                console.log("[useCheckout] Resposta da API:", JSON.stringify(confirmData))
                
                if (confirmData.success) {
                  console.log("[useCheckout] Supabase atualizado! status:", confirmData.order?.status)
                } else {
                  console.error("[useCheckout] Erro ao atualizar Supabase:", confirmData.error)
                }
              } catch (confirmError) {
                console.error("[useCheckout] Erro de rede ao confirmar:", confirmError)
              }
            }
          }
        } catch (error) {
          console.error("Erro ao verificar pagamento:", error)
        }
      }, PIX_CHECK_INTERVAL)
    },
    [playConfirmSound]
  )

  // Criar cobranca PIX
  const createPixCharge = useCallback(
    async (params: CreatePixParams) => {
      const {
        formData,
        deliveryType,
        products,
        quantities,
        subtotal,
        discount,
        deliveryFee,
        total,
        minValueForAsaas,
        pixKeyFull,
        appliedCoupon,
        customer,
      } = params

      // Verificar se ja existe PIX ativo
      if (isOrderBlocked) {
        showToast("Ja existe um PIX ativo. Aguarde o pagamento ou cancele.")
        return
      }

      // Verificar cooldown
      if (pixCooldownEnd && Date.now() < pixCooldownEnd) {
        const minutes = Math.floor(pixCooldownLeft / 60)
        const seconds = pixCooldownLeft % 60
        showToast(`Aguarde ${minutes}:${seconds.toString().padStart(2, "0")} para gerar um novo PIX.`)
        return
      }

      // Validacoes
      if (!formData.nome) {
        showToast("Por favor, preencha seu nome!")
        return
      }

      const cleanPhone = formData.telefone.replace(/\D/g, "")
      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        showToast("Por favor, preencha um telefone valido!")
        return
      }

      if (deliveryType === "entrega" && (!formData.endereco || !formData.numero || !formData.referencia)) {
        showToast("Por favor, preencha todos os campos de entrega!")
        return
      }

      if (deliveryType === "entrega" && !formData.bairro) {
        showToast("Por favor, selecione seu bairro para calcular a entrega!")
        return
      }

      const newOrderId = generateOrderId()
      setOrderId(newOrderId)

      // Se valor for menor que minimo, usar PIX manual
      if (total < minValueForAsaas) {
        const pixCode = generatePixCode(total, pixKeyFull)
        setManualPixCode(pixCode)
        setPaymentStatus("manual")
        return
      }

      setPaymentStatus("loading")

      // Criar snapshot do pedido
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

      const orderDescription = orderItems.map((i) => `${i.quantity}x ${i.name}`).join(", ")

      try {
        const response = await fetch("/api/asaas/create-pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            value: Number(total),
            description: `Pedido ${newOrderId} - ${orderDescription}`,
            customerName: formData.nome,
            customerPhone: cleanPhone,
            externalReference: newOrderId,
            // Dados completos do pedido: persistidos no servidor ANTES do PIX
            order: {
              customerName: formData.nome,
              customerPhone: formData.telefone,
              customerId: customer?.id,
              itemsDetailed: snapshot.items,
              total: snapshot.total,
              paymentMethod: "PIX Asaas",
              address:
                deliveryType === "entrega"
                  ? `${formData.endereco}, ${formData.numero} - ${formData.bairro} (Ref: ${formData.referencia})`
                  : "Retirada no local",
              neighborhood: formData.bairro,
              cashbackUsed: cashbackUsed || 0,
              pointsRewardUsed: pointsRewardUsed || 0,
            },
          }),
        })

        const data = await response.json()

        if (!response.ok || data.error) {
          const errorMsg = data.error || data.details || ""
          if (errorMsg.toLowerCase().includes("phone") || errorMsg.toLowerCase().includes("telefone")) {
            setPaymentErrorMessage("Telefone invalido. Verifique o numero com DDD.")
          } else if (errorMsg.toLowerCase().includes("cpf") || errorMsg.toLowerCase().includes("document")) {
            setPaymentErrorMessage("CPF/CNPJ invalido.")
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
          // O pedido ja foi persistido no servidor por /api/asaas/create-pix
          // (com asaas_payment_id e order_code) ANTES de o PIX ser exibido.
          // Por isso nao ha mais POST /api/orders aqui.
          setOrderSnapshot(snapshot)
          setPaymentStatus("awaiting")

          startPaymentPolling(data.paymentId, newOrderId)
        } else {
          setPaymentStatus("error")
        }
      } catch {
        setPaymentErrorMessage("Erro de conexao. Verifique sua internet.")
        setPaymentStatus("error")
      }
    },
    [isOrderBlocked, pixCooldownEnd, pixCooldownLeft, showToast, startPaymentPolling]
  )

  // Fechar checkout
  const handleCloseCheckout = useCallback(() => {
    if (paymentStatus === "confirmed") {
      setShowNewOrderModal(true)
      return
    }
    if (isOrderBlocked) {
      setShowCloseConfirmModal(true)
      return
    }
    setShowCheckout(false)
    setPaymentStatus("idle")
    setPixData(null)
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
  }, [paymentStatus, isOrderBlocked])

  // Alterar forma de pagamento
  const handleChangePaymentMethod = useCallback(() => {
    setPixData(null)
    setPaymentStatus("idle")
    setOrderSnapshot(null)
    setPixExpired(false)
    setPixTimeLeft(0)

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    setPixCooldownEnd(Date.now() + PIX_COOLDOWN_DURATION)
    setShowChangePaymentModal(false)
  }, [])

  // Novo pedido do zero
  const startNewOrderFromScratch = useCallback(
    (clearForm: () => void) => {
      localStorage.removeItem(ORDER_STORAGE_KEY)
      setPixData(null)
      setPaymentStatus("idle")
      setOrderSnapshot(null)
      setPixExpired(false)
      setPixTimeLeft(0)
      setOrderId("")
      setPixCooldownEnd(null)
      setPixCooldownLeft(0)
      setShowManualPixDuringCooldown(false)
      setAppliedCoupon(null)
      setCouponCode("")
      setCouponError("")

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }

      clearForm()
      setShowNewOrderModal(false)
      setShowCloseConfirmModal(false)
      setShowCheckout(false)
    },
    []
  )

  // Novo pedido mantendo dados
  const startNewOrderKeepingData = useCallback(
    (formData: FormData, setFormData: (data: FormData) => void) => {
      localStorage.removeItem(ORDER_STORAGE_KEY)
      
      const savedData = {
        nome: formData.nome,
        telefone: formData.telefone,
        endereco: formData.endereco,
        numero: formData.numero,
        referencia: formData.referencia,
        localizacao: formData.localizacao,
      }

      setPixData(null)
      setPaymentStatus("idle")
      setOrderSnapshot(null)
      setPixExpired(false)
      setPixTimeLeft(0)
      setOrderId("")
      setPixCooldownEnd(null)
      setPixCooldownLeft(0)
      setShowManualPixDuringCooldown(false)
      setAppliedCoupon(null)
      setCouponCode("")
      setCouponError("")

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }

      setFormData({
        ...savedData,
        pagamento: "pix",
        observacao: "",
        bairro: "",
      })

      setShowNewOrderModal(false)
      setShowCloseConfirmModal(false)
      setShowCheckout(false)
    },
    []
  )

  // Abrir checkout
  const openCheckout = useCallback(
    (totalItems: number, subtotal: number, minimumOrder: number, isStoreOpen: boolean) => {
      if (!isStoreOpen) {
        showToast("A loja esta fechada no momento")
        return
      }
      if (totalItems === 0) {
        showToast("Adicione pelo menos um item ao carrinho!")
        return
      }
      if (minimumOrder > 0 && subtotal < minimumOrder) {
        showToast(`Pedido minimo de R$ ${minimumOrder.toFixed(2)}`)
        return
      }
      setShowCheckout(true)
      setPaymentStatus("idle")
      setPixData(null)
      setAppliedCoupon(null)
      setCouponCode("")
      setCouponError("")
    },
    [showToast]
  )

  // Premium - Calcular desconto total de cashback + pontos
  const getPremiumDiscount = useCallback(() => {
    return cashbackUsed + pointsRewardUsed
  }, [cashbackUsed, pointsRewardUsed])

  return {
    showCheckout,
    setShowCheckout,
    paymentStatus,
    setPaymentStatus,
    paymentErrorMessage,
    pixData,
    setPixData,
    orderId,
    setOrderId,
    paymentTime,
    manualPixCode,
    copiedManualKey,
    copiedManualCode,
    setCopiedManualKey,
    setCopiedManualCode,
    pixTimeLeft,
    pixExpired,
    setPixExpired,
    orderSnapshot,
    setOrderSnapshot,
    isOrderLocked,
    pixCooldownEnd,
    pixCooldownLeft,
    isInCooldown,
    isOrderBlocked,
    showNewOrderModal,
    setShowNewOrderModal,
    showCloseConfirmModal,
    setShowCloseConfirmModal,
    showChangePaymentModal,
    setShowChangePaymentModal,
    showManualPixDuringCooldown,
    setShowManualPixDuringCooldown,
    appliedCoupon,
    setAppliedCoupon,
    couponCode,
    setCouponCode,
    couponError,
    setCouponError,
    applyCoupon,
    getDiscount,
    createPixCharge,
    handleCloseCheckout,
    handleChangePaymentMethod,
    startNewOrderFromScratch,
    startNewOrderKeepingData,
    openCheckout,
    playConfirmSound,
    audioRef,
    // Premium - Cashback e Pontos
    cashbackUsed,
    setCashbackUsed,
    pointsRewardUsed,
    setPointsRewardUsed,
    getPremiumDiscount,
  }
}
