"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, ShoppingCart, Send, MapPin, User, CreditCard, MessageSquare, X, Copy, Check, Loader2, MapPinned, Phone, Home as HomeIcon, AlertCircle, Tag, Truck, MessageCircle, Clock, ChevronRight, Package, Zap } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

// Types, Constants e Utils da area do cliente
import type { PaymentStatus, DeliveryType, OrderSnapshot, PixData, Coupon, FormData } from "../types"
import { ORDER_STORAGE_KEY, DEFAULT_FORM_DATA } from "../constants"
import { formatCurrency, generateOrderId, generatePixCode } from "../utils"

// Providers
import { useStore } from "../providers/StoreProvider"
import { useCustomer } from "../providers/CustomerProvider"
import { useCartContext } from "../providers/CartProvider"

// Components
import { HeroBanner, StoreClosedBanner, PromoBanner, ProductList, CategoryNav, CartSummary, FloatingCartButton, StoreFooter, StoreHeader, FeaturedSections } from "./index"
import { ConfirmPixActiveModal, NewOrderOptionsModal, CustomerLoginModal, MyAccountModal, MyOrdersModal, RepeatOrderModal, Toast, AddToCartToast } from "./modals"

export function StorePageContent() {
  // ============================================================
  // PROVIDERS - Estados globais seguros
  // ============================================================
  const { siteConfig, isStoreOpen, toastMessage, showToast, isClient } = useStore()
  
  const {
    customer, setCustomer, saveCustomerSession, logout,
    toggleFavorite,
    showProfileMenu, setShowProfileMenu,
    showLoginModal, setShowLoginModal,
    showMyAccountModal, setShowMyAccountModal,
    showMyOrdersModal, setShowMyOrdersModal,
    loginStep, setLoginStep, loginPhone, setLoginPhone,
    loginPin, setLoginPin, loginName, setLoginName,
    loginLoading, setLoginLoading, loginError, setLoginError,
    resetLoginForm,
    customerOrders, setCustomerOrders, loadingOrders, setLoadingOrders,
    showRepeatConfirm, setShowRepeatConfirm, orderToRepeat, setOrderToRepeat
  } = useCustomer()
  
  const {
    quantities, setQuantities, showCart, setShowCart,
    updateQuantity, clearCart, getTotalItems, getSubtotal, getCartItems,
    addToast, addToCartAudioRef
  } = useCartContext()

  // ============================================================
  // DADOS DERIVADOS DA CONFIG
  // ============================================================
  const allProducts = siteConfig.products
    .filter(p => p.active !== false)
    .filter(p => !p.outOfStock)
    .sort((a, b) => {
      // Prioriza display_order, senao usa order como fallback
      const orderA = a.displayOrder ?? a.order ?? 0
      const orderB = b.displayOrder ?? b.order ?? 0
      return orderA - orderB
    })
    
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

  // ============================================================
  // ESTADOS LOCAIS - Checkout e PIX (NAO movidos para providers)
  // ============================================================
  const [formData, setFormData] = useState<FormData>({ ...DEFAULT_FORM_DATA })
  
  // Cupom
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponError, setCouponError] = useState("")
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(DELIVERY_ENABLED ? "entrega" : "retirada")
  const [showCheckout, setShowCheckout] = useState(false)
  const [useSavedData, setUseSavedData] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  
  // Asaas PIX states - CRITICOS, mantidos locais
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle")
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string>("")
  const [pixData, setPixData] = useState<PixData | null>(null)
  const [orderId, setOrderId] = useState<string>("")
  const [paymentTime, setPaymentTime] = useState<string>("")
  const [manualPixCode, setManualPixCode] = useState<string>("")
  const [copiedManualKey, setCopiedManualKey] = useState(false)
  const [copiedManualCode, setCopiedManualCode] = useState(false)
  
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
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false)
  
  // Filtro por categoria
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  
  // Produtos filtrados por categoria
  const products = selectedCategory 
    ? allProducts.filter(p => p.categoryId === selectedCategory)
    : allProducts
  
  // Verifica se esta em cooldown (bloqueio anti-spam)
  const isInCooldown = pixCooldownEnd !== null && pixCooldownLeft > 0
  
  // Pedido bloqueado = PIX ativo OU em cooldown
  const isOrderBlocked = isOrderLocked || isInCooldown

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pixTimerRef = useRef<NodeJS.Timeout | null>(null)

  // ============================================================
  // FUNCOES DE CHECKOUT E PIX - Mantidas locais (logica critica)
  // ============================================================
  
  // Funcao para preencher dados do cliente no formulario
  const fillFormWithCustomerData = (customerData: typeof customer) => {
    if (!customerData) return
    setFormData(prev => ({
      ...prev,
      nome: customerData.name || prev.nome,
      telefone: customerData.phone || prev.telefone,
      endereco: customerData.savedAddress?.endereco || prev.endereco,
      numero: customerData.savedAddress?.numero || prev.numero,
      referencia: customerData.savedAddress?.referencia || prev.referencia,
      bairro: customerData.savedAddress?.bairro || prev.bairro,
    }))
  }

  // Quando o cliente muda, preencher o formulario
  useEffect(() => {
    if (customer) {
      fillFormWithCustomerData(customer)
    }
  }, [customer])

  // Som de confirmacao
  const playConfirmSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }
  }, [])

  // Gera codigo PIX EMV para pagamento manual - wrapper usando util importado
  const generateManualPixCode = (amount: number) => generatePixCode(amount, PIX_MANUAL_KEY_FULL)

  // Calculos do carrinho usando o provider
  const getTotal = () => {
    const subtotal = getSubtotal(products)
    const fee = deliveryType === "entrega" ? DELIVERY_FEE : 0
    const discount = appliedCoupon ? (appliedCoupon.type === "percentage" 
      ? subtotal * (appliedCoupon.value / 100) 
      : appliedCoupon.value) : 0
    return Math.max(0, subtotal + fee - discount)
  }

  // Funcao helper para obter taxa de entrega baseada no bairro
  const getDeliveryFee = () => {
    if (deliveryType !== "entrega") return 0
    
    // Verificar se bairros estao configurados
    const neighborhoodFees = siteConfig.delivery?.neighborhoodFees
    if (neighborhoodFees && neighborhoodFees.length > 0 && formData.bairro) {
      const selectedNeighborhood = neighborhoodFees.find(
        n => n.name.toLowerCase() === formData.bairro.toLowerCase()
      )
      if (selectedNeighborhood) {
        return selectedNeighborhood.fee
      }
    }
    
    return DELIVERY_FEE
  }
  
  // Calcular total com taxa de entrega por bairro
  const calculateTotalWithDelivery = () => {
    const subtotal = getSubtotal(products)
    const fee = getDeliveryFee()
    const discount = appliedCoupon ? (appliedCoupon.type === "percentage" 
      ? subtotal * (appliedCoupon.value / 100) 
      : appliedCoupon.value) : 0
    return Math.max(0, subtotal + fee - discount)
  }

  // ============================================================
  // FUNCOES DE PEDIDOS E CLIENTE - Mantidas locais
  // ============================================================
  
  // Carregar pedidos do cliente
  const loadCustomerOrders = async () => {
    if (!customer?.phone) return
    
    setLoadingOrders(true)
    try {
      // Usa API correta com telefone como parametro
      const response = await fetch(`/api/customers/orders?phone=${encodeURIComponent(customer.phone)}`)
      if (response.ok) {
        const data = await response.json()
        setCustomerOrders(data.orders || [])
      }
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error)
    } finally {
      setLoadingOrders(false)
    }
  }

  // Abrir modal de repetir pedido
  const openRepeatConfirm = (order: typeof customerOrders[0]) => {
    setOrderToRepeat(order)
    setShowRepeatConfirm(true)
    setShowMyOrdersModal(false)
  }

  // Confirmar repeticao do pedido
  const confirmRepeatOrder = () => {
    if (!orderToRepeat?.itemsDetailed) return
    
    // Limpar carrinho atual
    const newQuantities: Record<number, number> = {}
    
    // Adicionar itens do pedido anterior
    orderToRepeat.itemsDetailed.forEach(item => {
      const product = products.find(p => p.id === item.productId)
      if (product) {
        newQuantities[item.productId] = item.quantity
      }
    })
    
    setQuantities(newQuantities)
    setShowRepeatConfirm(false)
    setOrderToRepeat(null)
    showToast("Itens adicionados ao carrinho!")
  }

  const repeatOrder = (order: typeof customerOrders[0]) => {
    openRepeatConfirm(order)
  }

  // ============================================================
  // FUNCOES DE LOGIN - Mantidas locais
  // ============================================================
  
  const handleLoginNext = async () => {
    if (!loginPhone || loginPhone.length < 10) {
      setLoginError("Digite um telefone valido")
      return
    }
    
    setLoginLoading(true)
    setLoginError("")
    
    try {
      const response = await fetch(`/api/customers/check?phone=${encodeURIComponent(loginPhone)}`)
      const data = await response.json()
      
      if (data.exists) {
        setLoginStep("pin")
      } else {
        setLoginStep("register")
      }
    } catch (error) {
      setLoginError("Erro ao verificar telefone")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogin = async () => {
    if (loginPin.length !== 4) {
      setLoginError("Digite o PIN de 4 digitos")
      return
    }
    
    setLoginLoading(true)
    setLoginError("")
    
    try {
      const response = await fetch("/api/customers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginPhone, pin: loginPin })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        saveCustomerSession(data)
        fillFormWithCustomerData(data)
        setShowLoginModal(false)
        resetLoginForm()
        showToast(`Bem-vindo(a), ${data.name}!`)
      } else {
        setLoginError(data.error || "PIN incorreto")
      }
    } catch (error) {
      setLoginError("Erro ao fazer login")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!loginName.trim()) {
      setLoginError("Digite seu nome")
      return
    }
    if (loginPin.length !== 4) {
      setLoginError("Crie um PIN de 4 digitos")
      return
    }
    
    setLoginLoading(true)
    setLoginError("")
    
    try {
      const response = await fetch("/api/customers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: loginPhone, 
          pin: loginPin,
          name: loginName.trim()
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        saveCustomerSession(data)
        fillFormWithCustomerData(data)
        setShowLoginModal(false)
        resetLoginForm()
        showToast(`Conta criada! Bem-vindo(a), ${data.name}!`)
      } else {
        setLoginError(data.error || "Erro ao criar conta")
      }
    } catch (error) {
      setLoginError("Erro ao criar conta")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleCustomerLogout = () => {
    logout()
    setShowProfileMenu(false)
    showToast("Voce saiu da sua conta")
  }

  // ============================================================
  // FUNCOES DE NOVO PEDIDO
  // ============================================================
  
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
    clearCart()
    
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

  const startNewOrderKeepingData = () => {
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
    
    // Limpar carrinho MAS manter dados de entrega
    clearCart()
    
    // Limpar cupom
    setAppliedCoupon(null)
    setCouponCode("")
    setCouponError("")
    
    // Parar polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    
    // Fechar modais
    setShowNewOrderModal(false)
    setShowCloseConfirmModal(false)
    setShowCheckout(false)
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
    clearCart()
    
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
    
    // Fechar tudo
    setShowCheckout(false)
  }

  // Abrir checkout
  const openCheckout = () => {
    // Pre-preencher com dados do cliente se logado
    if (customer && !formData.nome) {
      fillFormWithCustomerData(customer)
    }
    setShowCheckout(true)
  }

  // ============================================================
  // O RESTO DO CODIGO DO CHECKOUT SERA IMPORTADO DO PAGE.TSX ORIGINAL
  // Por seguranca, a logica de PIX, cupons e finalizacao permanece no arquivo original
  // Este componente apenas demonstra a estrutura com providers
  // ============================================================

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Audio elements */}
      <audio ref={audioRef} src="/confirm.mp3" preload="auto" />
      <audio ref={addToCartAudioRef} src="/add-to-cart.mp3" preload="auto" />

      {/* Header Premium */}
      <StoreHeader
        storeName={STORE_NAME}
        storeSubtitle={siteConfig.banner?.secondaryText}
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

      {/* Banner Promocional */}
      <PromoBanner
        message={siteConfig.customization?.elements?.promoMessage}
        icon="truck"
        enabled={siteConfig.customization?.elements?.showPromoBanner !== false}
      />

      {/* Hero - Cinematografico Premium */}
      <HeroBanner 
        storeName={STORE_NAME}
        storeSlogan={siteConfig.banner?.secondaryText}
        banner={siteConfig.banner}
      />

      {/* Aviso Loja Fechada Premium */}
      {!isStoreOpen && (
        <StoreClosedBanner 
          closedMessage={siteConfig.storeHours?.closedMessage}
          openTime={siteConfig.storeHours?.openTime}
          closeTime={siteConfig.storeHours?.closeTime}
        />
      )}

      {/* Category Navigation */}
      <div className="px-4">
        <CategoryNav
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>

      {/* Featured Sections - Mais Vendidos, Promocoes, Novidades */}
      {!selectedCategory && (
        <FeaturedSections
          products={allProducts}
          quantities={quantities}
          onUpdateQuantity={updateQuantity}
          customerFavorites={customer?.favorites || []}
          onToggleFavorite={toggleFavorite}
          showBestsellers={siteConfig.customization?.elements?.showBestsellersSection !== false}
          showPromos={siteConfig.customization?.elements?.showPromoBadge !== false}
          showNew={siteConfig.customization?.elements?.showNewBadge !== false}
        />
      )}

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

      {/* Spacer for fixed button */}
      <div className="h-24" />

      {/* Footer Premium */}
      <StoreFooter
        storeName={STORE_NAME}
        slogan={siteConfig.banner?.secondaryText}
        whatsapp={WHATSAPP_NUMBER}
        instagram={siteConfig.customization?.social?.instagram || siteConfig.instagram}
        facebook={siteConfig.customization?.social?.facebook}
        tiktok={siteConfig.customization?.social?.tiktok}
        address={siteConfig.customization?.social?.address || siteConfig.address}
        openTime={siteConfig.storeHours?.openTime}
        closeTime={siteConfig.storeHours?.closeTime}
        footerText={siteConfig.customization?.social?.footerText}
      />

      {/* Fixed Bottom Button */}
      <FloatingCartButton
        isStoreOpen={isStoreOpen}
        totalItems={getTotalItems()}
        total={getTotal()}
        onOpenCheckout={openCheckout}
      />

      {/* Modais */}
      {showCloseConfirmModal && (
        <ConfirmPixActiveModal
          onClose={() => setShowCloseConfirmModal(false)}
          onNewOrder={() => {
            setShowCloseConfirmModal(false)
            setShowNewOrderModal(true)
          }}
        />
      )}

      {showNewOrderModal && (
        <NewOrderOptionsModal
          onStartFromScratch={startNewOrderFromScratch}
          onKeepData={startNewOrderKeepingData}
          onCancel={() => setShowNewOrderModal(false)}
        />
      )}

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

      {showMyAccountModal && customer && (
        <MyAccountModal
          customer={customer}
          products={products}
          onClose={() => setShowMyAccountModal(false)}
        />
      )}

      {showMyOrdersModal && customer && (
        <MyOrdersModal
          orders={customerOrders}
          loadingOrders={loadingOrders}
          onClose={() => setShowMyOrdersModal(false)}
          onRepeatOrder={repeatOrder}
        />
      )}

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
    </div>
  )
}
