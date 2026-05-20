"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { Minus, Plus, ShoppingCart, Send, MapPin, User, CreditCard, MessageSquare, X, Copy, Check, Loader2, MapPinned, Phone, Home as HomeIcon, AlertCircle } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

interface Product {
  id: number
  name: string
  price: number
  description: string
}

const products: Product[] = [
  {
    id: 1,
    name: "Açaí Tradicional",
    price: 15,
    description: "Açaí puro e cremoso",
  },
  {
    id: 2,
    name: "Açaí Ovomaltine",
    price: 15,
    description: "Açaí cremoso com Ovomaltine crocante",
  },
  {
    id: 3,
    name: "Mousse Maracujá",
    price: 6,
    description: "Mousse cremoso de maracujá",
  },
  {
    id: 4,
    name: "Mousse Morango",
    price: 6,
    description: "Mousse cremoso de morango",
  },
]

const WHATSAPP_NUMBER = "5511918505799"
const PIX_RECEIVER_NAME = "Ailton Fernandes Miranda"
const MIN_VALUE_FOR_ASAAS = 15

// Dados para PIX Manual (pedidos abaixo de R$15)
const PIX_MANUAL_KEY = "11918505799"
const PIX_MANUAL_KEY_FULL = "+5511918505799"
const PIX_MANUAL_NAME = "Carina Karen da Silva"

type PaymentStatus = "idle" | "loading" | "awaiting" | "confirmed" | "error" | "manual"
type DeliveryType = "entrega" | "retirada"

export default function Home() {
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    endereco: "",
    numero: "",
    referencia: "",
    pagamento: "pix",
    observacao: "",
    localizacao: "",
  })
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("entrega")
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  
  // Asaas PIX states
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle")
  const [pixData, setPixData] = useState<{
    paymentId: string
    pixQrCode: string
    pixCopyPaste: string
    value: number
  } | null>(null)
  const [orderId, setOrderId] = useState<string>("")
  const [paymentTime, setPaymentTime] = useState<string>("")
  const [manualPixCode, setManualPixCode] = useState<string>("")
  const [copiedManualKey, setCopiedManualKey] = useState(false)
  const [copiedManualCode, setCopiedManualCode] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const addToCartAudioRef = useRef<HTMLAudioElement | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

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

  const getTotal = () => {
    return products.reduce((total, product) => {
      return total + product.price * (quantities[product.id] || 0)
    }, 0)
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
      alert("Texto copiado!")
    }
  }

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalizacao nao suportada pelo navegador")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
        setFormData((prev) => ({ ...prev, localizacao: mapsUrl }))
      },
      () => {
        alert("Nao foi possivel obter sua localizacao")
      }
    )
  }

  const openCheckout = () => {
    if (getTotalItems() === 0) {
      alert("Adicione pelo menos um item ao carrinho!")
      return
    }
    setShowCheckout(true)
    setPaymentStatus("idle")
    setPixData(null)
  }

  // Criar cobranca PIX via Asaas
  const createPixCharge = async () => {
    if (!formData.nome) {
      alert("Por favor, preencha seu nome!")
      return
    }

    if (deliveryType === "entrega" && (!formData.endereco || !formData.numero || !formData.referencia)) {
      alert("Por favor, preencha todos os campos de entrega!")
      return
    }

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

    // Validar CPF para pagamento PIX Asaas (R$15 ou mais)
    const cleanCpf = formData.cpf.replace(/\D/g, "")
    if (formData.pagamento === "pix" && cleanCpf.length !== 11) {
      alert("Informe seu CPF (11 digitos) para gerar o Pix automatico.")
      return
    }

    setPaymentStatus("loading")

    const orderItems = products
      .filter((p) => quantities[p.id] > 0)
      .map((p) => `${quantities[p.id]}x ${p.name}`)
      .join(", ")

    try {
      const response = await fetch("/api/asaas/create-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: total,
          description: `Pedido ${newOrderId} - ${orderItems}`,
          customerName: formData.nome,
          customerCpf: cleanCpf,
          externalReference: newOrderId,
        }),
      })

      const data = await response.json()
      
      console.log("[v0] Resposta create-pix:", data)

      if (data.success && data.pixQrCode && data.pixCopyPaste) {
        setPixData({
          paymentId: data.paymentId,
          pixQrCode: data.pixQrCode,
          pixCopyPaste: data.pixCopyPaste,
          value: data.value,
        })
        setPaymentStatus("awaiting")
        startPaymentPolling(data.paymentId)
      } else {
        console.error("[v0] PIX incompleto ou erro:", data)
        setPaymentStatus("error")
      }
    } catch (error) {
      console.error("[v0] Erro ao criar PIX:", error)
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
  const sendConfirmedOrder = () => {
    const orderItems = products
      .filter((p) => quantities[p.id] > 0)
      .map((p) => `${quantities[p.id]}x ${p.name}`)
      .join("\n")

    const totalQty = getTotalItems()

    const deliveryInfo = deliveryType === "entrega"
      ? `Endereco: ${formData.endereco}, ${formData.numero}\nReferencia: ${formData.referencia}${formData.localizacao ? `\nLocalizacao: ${formData.localizacao}` : ""}`
      : "Retirada no local"

    const message = `━━━━━━━━━━━━━━━━━━
🟢 PEDIDO PAGO
━━━━━━━━━━━━━━━━━━

Pedido No: ${orderId}

Cliente:
${formData.nome}

Itens:
${orderItems}

Quantidade:
${totalQty} item(s)

Total:
${formatCurrency(getTotal())}

Pagamento:
PIX CONFIRMADO ✅

${deliveryType === "entrega" ? "Entrega:" : "Retirada:"}
${deliveryInfo}

Horario:
${paymentTime}

━━━━━━━━━━━━━━━━━━`

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  // Mensagem WhatsApp para problema com PIX
  const sendManualPayment = () => {
    const orderItems = products
      .filter((p) => quantities[p.id] > 0)
      .map((p) => `${quantities[p.id]}x ${p.name}`)
      .join("\n")

    const deliveryInfo = deliveryType === "entrega"
      ? `Endereco: ${formData.endereco}, ${formData.numero}\nReferencia: ${formData.referencia}${formData.localizacao ? `\nLocalizacao: ${formData.localizacao}` : ""}`
      : "Retirada no local"

    const message = `Ola! Tive problema para pagar pelo Pix automatico no site. Quero pagar manualmente meu pedido.

Nome: ${formData.nome}

Itens:
${orderItems}

Valor: ${formatCurrency(getTotal())}

${deliveryType === "entrega" ? "Entrega:" : "Retirada:"}
${deliveryInfo}

Observacao: ${formData.observacao || "Nenhuma"}`

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  // Pagamento manual (dinheiro/cartao)
  const handleManualPayment = () => {
    if (!formData.nome) {
      alert("Por favor, preencha seu nome!")
      return
    }

    if (deliveryType === "entrega" && (!formData.endereco || !formData.numero || !formData.referencia)) {
      alert("Por favor, preencha todos os campos de entrega!")
      return
    }

    const orderItems = products
      .filter((p) => quantities[p.id] > 0)
      .map((p) => `${quantities[p.id]}x ${p.name}`)
      .join("\n")

    const pagamentoTexto = formData.pagamento === "dinheiro" ? "Dinheiro" : "Cartao"

    const deliveryInfo = deliveryType === "entrega"
      ? `Endereco: ${formData.endereco}, ${formData.numero}\nReferencia: ${formData.referencia}${formData.localizacao ? `\nLocalizacao: ${formData.localizacao}` : ""}`
      : "Retirada no local"

    const message = `🛒 NOVO PEDIDO - P.K Gostosuras

Itens:
${orderItems}

Total:
${formatCurrency(getTotal())}

Dados para ${deliveryType === "entrega" ? "Entrega" : "Retirada"}:
Nome: ${formData.nome}
${deliveryInfo}

Pagamento:
${pagamentoTexto}

Observacao:
${formData.observacao || "Nenhuma"}`

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
    setShowCheckout(false)
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
              <h1 className="text-xl font-bold text-primary">P.K Gostosuras</h1>
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
            Os melhores açaís de garrafa
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Frescos e deliciosos, direto para você!
          </p>
        </div>
      </section>

      <div className="max-w-lg mx-auto px-4">
        {/* Products */}
        <section className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Cardápio</h3>
          
          {products.map((product) => (
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
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border p-4">
        <div className="max-w-lg mx-auto">
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
                    onClick={() => {
                      setShowCheckout(false)
                      setPaymentStatus("idle")
                      setPixData(null)
                      if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current)
                      }
                    }}
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
                    <div className="border-t border-border mt-3 pt-3 flex justify-between items-center">
                      <span className="text-foreground font-semibold">Total</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(getTotal())}
                      </span>
                    </div>
                  </section>

                  {/* Delivery Type */}
                  <section className="bg-card rounded-2xl p-4 border border-border space-y-4">
                    <h3 className="font-semibold text-foreground">Tipo de Entrega</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setDeliveryType("entrega")}
                        className={`py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          deliveryType === "entrega"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                        Entrega
                      </button>
                      <button
                        onClick={() => setDeliveryType("retirada")}
                        className={`py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          deliveryType === "retirada"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
                        <HomeIcon className="w-4 h-4" />
                        Retirada
                      </button>
                    </div>
                  </section>

                  {/* Customer Info */}
                  <section className="bg-card rounded-2xl p-4 border border-border space-y-4">
                    <h3 className="font-semibold text-foreground">Seus Dados</h3>
                    
                    <div>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <User className="w-4 h-4" />
                        Nome *
                      </label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Seu nome completo"
                        className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <CreditCard className="w-4 h-4" />
                        CPF * <span className="text-xs text-muted-foreground">(obrigatorio para Pix)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.cpf}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 11)
                          const formatted = value
                            .replace(/(\d{3})(\d)/, "$1.$2")
                            .replace(/(\d{3})(\d)/, "$1.$2")
                            .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
                          setFormData({ ...formData, cpf: formatted })
                        }}
                        placeholder="000.000.000-00"
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
                            onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                            placeholder="Rua, bairro"
                            className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          />
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <HomeIcon className="w-4 h-4" />
                            Numero *
                          </label>
                          <input
                            type="text"
                            value={formData.numero}
                            onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                            placeholder="Numero da casa/apartamento"
                            className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          />
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <MapPinned className="w-4 h-4" />
                            Referencia *
                          </label>
                          <input
                            type="text"
                            value={formData.referencia}
                            onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                            placeholder="Ponto de referencia"
                            className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          />
                        </div>

                        <button
                          onClick={getLocation}
                          className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-secondary/80"
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
                    
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "pix", label: "Pix" },
                        { value: "dinheiro", label: "Dinheiro" },
                        { value: "cartao", label: "Cartão" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setFormData({ ...formData, pagamento: option.value })
                            setPaymentStatus("idle")
                            setPixData(null)
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
                            <p className="text-red-400 font-medium mb-4">Erro ao gerar PIX</p>
                            <button
                              onClick={createPixCharge}
                              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg"
                            >
                              Tentar novamente
                            </button>
                          </div>
                        )}

                        {/* Awaiting Payment */}
                        {paymentStatus === "awaiting" && pixData && (
                          <div className="space-y-4 animate-in fade-in duration-300">
                            {/* Header PIX */}
                            <div className="text-center border-b border-border pb-3">
                              <h4 className="font-bold text-foreground text-lg">Pagamento via PIX</h4>
                              <div className="flex items-center justify-center gap-2 mt-2">
                                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                                <span className="text-yellow-400 font-medium">AGUARDANDO PAGAMENTO</span>
                              </div>
                            </div>

                            {/* QR Code */}
                            <div className="flex flex-col items-center">
                              <p className="text-sm text-muted-foreground mb-3">Escaneie o QR Code para pagar</p>
                              <div className="bg-white p-4 rounded-xl shadow-md">
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
                            </div>

                            {/* Dados do recebedor */}
                            <div className="space-y-2">
                              <div className="bg-input rounded-xl px-4 py-3">
                                <p className="text-xs text-muted-foreground">Nome do Recebedor</p>
                                <p className="font-semibold text-foreground">{PIX_RECEIVER_NAME}</p>
                              </div>

                              <div className="bg-input rounded-xl px-4 py-3">
                                <p className="text-xs text-muted-foreground">Valor</p>
                                <p className="font-bold text-xl text-primary">{formatCurrency(pixData.value)}</p>
                              </div>
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
                                onClick={() => copyToClipboard(pixData.pixCopyPaste, setCopiedCode)}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-primary rounded-xl text-primary-foreground font-medium transition-all hover:brightness-110 active:scale-[0.98]"
                              >
                                {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                {copiedCode ? "Copiado com sucesso!" : "Copiar Codigo PIX"}
                              </button>
                            </div>

                            {/* Aviso */}
                            <div className="bg-primary/20 border border-primary/30 rounded-xl p-3">
                              <p className="text-sm text-foreground text-center">
                                O pagamento sera confirmado automaticamente
                              </p>
                            </div>
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
    </main>
  )
}
