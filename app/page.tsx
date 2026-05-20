"use client"

import { useState } from "react"
import Image from "next/image"
import { Minus, Plus, ShoppingCart, Send, MapPin, User, CreditCard, MessageSquare, X, Copy, Check } from "lucide-react"

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

const PIX_KEY = "11918505799"
const PIX_KEY_FULL = "+5511918505799"
const PIX_NAME = "Carina Karen da Silva"
const WHATSAPP_NUMBER = "5511966095057"

export default function Home() {
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [formData, setFormData] = useState({
    nome: "",
    endereco: "",
    pagamento: "pix",
    observacao: "",
  })
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedPixCopiaECola, setCopiedPixCopiaECola] = useState(false)

  const updateQuantity = (id: number, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta),
    }))
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

  const copyPixKey = async () => {
    try {
      await navigator.clipboard.writeText(PIX_KEY)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert("Chave PIX: " + PIX_KEY)
    }
  }

  // Gera o código PIX Copia e Cola no padrão EMV BR Code
  const generatePixCopiaECola = () => {
    const pixKey = PIX_KEY_FULL
    const merchantName = "CARINA KAREN DA SILVA"
    const merchantCity = "SAO PAULO"
    const amount = getTotal().toFixed(2)
    
    // Função para calcular CRC16-CCITT-FALSE
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
      return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
    }

    // Função para criar campo TLV (Tag-Length-Value)
    const tlv = (tag: string, value: string): string => {
      const length = value.length.toString().padStart(2, '0')
      return `${tag}${length}${value}`
    }

    // GUI do PIX
    const gui = tlv("00", "br.gov.bcb.pix")
    // Chave PIX
    const chave = tlv("01", pixKey)
    // Merchant Account Information (ID 26)
    const merchantAccountInfo = tlv("26", gui + chave)

    // Monta o payload base
    let payload = ""
    payload += tlv("00", "01") // Payload Format Indicator
    payload += tlv("01", "12") // Point of Initiation Method (12 = dinâmico)
    payload += merchantAccountInfo // Merchant Account Information
    payload += tlv("52", "0000") // Merchant Category Code
    payload += tlv("53", "986") // Transaction Currency (986 = BRL)
    payload += tlv("54", amount) // Transaction Amount
    payload += tlv("58", "BR") // Country Code
    payload += tlv("59", merchantName) // Merchant Name (max 25 chars)
    payload += tlv("60", merchantCity) // Merchant City (max 15 chars)
    payload += tlv("62", tlv("05", "***")) // Additional Data Field Template
    payload += "6304" // CRC16 placeholder

    // Calcula CRC16 e substitui o placeholder
    const crcValue = crc16(payload)
    return payload.replace("6304", "6304" + crcValue).replace("63046304", "6304")
  }

  const getPixCopiaECola = () => {
    const pixKey = PIX_KEY_FULL
    const merchantName = "CARINA KAREN DA SILVA"
    const merchantCity = "SAO PAULO"
    const amount = getTotal().toFixed(2)
    
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
      return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
    }

    const tlv = (tag: string, value: string): string => {
      const length = value.length.toString().padStart(2, '0')
      return `${tag}${length}${value}`
    }

    const gui = tlv("00", "br.gov.bcb.pix")
    const chave = tlv("01", pixKey)
    const merchantAccountInfo = tlv("26", gui + chave)

    let payload = ""
    payload += tlv("00", "01")
    payload += tlv("01", "12")
    payload += merchantAccountInfo
    payload += tlv("52", "0000")
    payload += tlv("53", "986")
    payload += tlv("54", amount)
    payload += tlv("58", "BR")
    payload += tlv("59", merchantName)
    payload += tlv("60", merchantCity)
    payload += tlv("62", tlv("05", "***"))
    payload += "6304"

    const crcValue = crc16(payload)
    return payload.slice(0, -4) + "6304" + crcValue
  }

  const copyPixCopiaECola = async () => {
    try {
      const pixCode = getPixCopiaECola()
      await navigator.clipboard.writeText(pixCode)
      setCopiedPixCopiaECola(true)
      setTimeout(() => setCopiedPixCopiaECola(false), 2000)
    } catch {
      alert("Erro ao copiar. Tente novamente.")
    }
  }

  const generatePixQRCode = () => {
    const pixCode = getPixCopiaECola()
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`
  }

  const openCheckout = () => {
    if (getTotalItems() === 0) {
      alert("Adicione pelo menos um item ao carrinho!")
      return
    }
    setShowCheckout(true)
  }

  const handleSubmit = () => {
    if (!formData.nome || !formData.endereco) {
      alert("Por favor, preencha seu nome e endereço!")
      return
    }

    const orderItems = products
      .filter((p) => quantities[p.id] > 0)
      .map((p) => `${quantities[p.id]}x ${p.name}`)
      .join("\n")

    const pagamentoTexto = formData.pagamento === "pix" ? "Pix" : 
                          formData.pagamento === "dinheiro" ? "Dinheiro" : 
                          "Cartão"

    const pixMessage = formData.pagamento === "pix" ? "\n\nVou enviar o comprovante." : ""

    const message = `🛒 NOVO PEDIDO - P.K Gostosuras

Itens:
${orderItems}

💰 Total: ${formatCurrency(getTotal())}

📍 Endereço:
${formData.endereco}

💳 Pagamento:
${pagamentoTexto}

📝 Observação:
${formData.observacao || "Nenhuma"}${pixMessage}`

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
    setShowCheckout(false)
  }

  return (
    <main className="min-h-screen bg-background pb-24">
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
                <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
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
              className="bg-card rounded-2xl p-4 border border-border shadow-lg shadow-primary/5"
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
                  <h2 className="text-xl font-bold text-foreground">Finalizar Pedido</h2>
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="p-2 bg-secondary rounded-full text-foreground transition-all hover:bg-secondary/80 active:scale-95"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </header>

            <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
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

              {/* Customer Info */}
              <section className="bg-card rounded-2xl p-4 border border-border space-y-4">
                <h3 className="font-semibold text-foreground">Dados para Entrega</h3>
                
                <div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <User className="w-4 h-4" />
                    Nome
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
                    <MapPin className="w-4 h-4" />
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua, número, bairro"
                    className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <MessageSquare className="w-4 h-4" />
                    Observações (opcional)
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
                      onClick={() => setFormData({ ...formData, pagamento: option.value })}
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

                {/* PIX Info */}
                {formData.pagamento === "pix" && (
                  <div className="bg-secondary/50 rounded-xl p-4 space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-3">Escaneie o QR Code para pagar</p>
                      <div className="inline-block bg-white p-3 rounded-xl">
                        <Image
                          src={generatePixQRCode()}
                          alt="QR Code PIX"
                          width={180}
                          height={180}
                          className="mx-auto"
                          unoptimized
                        />
                      </div>
                    </div>

                    {/* Pix Copia e Cola */}
                    <div className="bg-input rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground">Pix Copia e Cola</p>
                        <button
                          onClick={copyPixCopiaECola}
                          className="flex items-center gap-1 px-3 py-1.5 bg-primary rounded-lg text-primary-foreground text-xs font-medium transition-all hover:brightness-110 active:scale-95"
                        >
                          {copiedPixCopiaECola ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copiedPixCopiaECola ? "Copiado!" : "Copiar Pix Copia e Cola"}
                        </button>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground break-all bg-background/50 p-2 rounded-lg">
                        {getPixCopiaECola()}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-input rounded-xl px-4 py-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Chave PIX (Telefone)</p>
                          <p className="font-mono font-semibold text-foreground">{PIX_KEY}</p>
                        </div>
                        <button
                          onClick={copyPixKey}
                          className="p-2 bg-primary rounded-lg text-primary-foreground transition-all hover:brightness-110 active:scale-95"
                        >
                          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>

                      <div className="bg-input rounded-xl px-4 py-3">
                        <p className="text-xs text-muted-foreground">Nome</p>
                        <p className="font-semibold text-foreground">{PIX_NAME}</p>
                      </div>

                      <div className="bg-input rounded-xl px-4 py-3">
                        <p className="text-xs text-muted-foreground">Valor</p>
                        <p className="font-bold text-lg text-primary">{formatCurrency(getTotal())}</p>
                      </div>
                    </div>

                    <div className="bg-primary/20 border border-primary/30 rounded-xl p-3">
                      <p className="text-sm text-foreground text-center">
                        Apos pagar, envie o comprovante no WhatsApp
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                className="w-full py-4 bg-primary text-primary-foreground font-bold text-lg rounded-2xl flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-[0.98] shadow-lg shadow-primary/30"
              >
                <Send className="w-5 h-5" />
                Finalizar Pedido no WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
