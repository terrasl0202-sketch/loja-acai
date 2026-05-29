// Utils da area do cliente/loja
import { type Product } from "@/lib/config-types"

/**
 * Formata valor monetario em BRL
 */
export const formatCurrency = (value: number): string => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

/**
 * Gera ID do pedido
 */
export const generateOrderId = (): string => {
  const now = new Date()
  return `PK${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`
}

/**
 * Normaliza nome de produto para comparacao
 */
export const normalizeProductName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

/**
 * Formata telefone para display
 */
export const formatPhone = (phone: string): string => {
  const clean = phone.replace(/\D/g, "")
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
  }
  return phone
}

/**
 * Valida telefone
 */
export const isValidPhone = (phone: string): boolean => {
  const clean = phone.replace(/\D/g, "")
  return clean.length >= 10 && clean.length <= 11
}

/**
 * Calcula subtotal do carrinho
 */
export const calculateSubtotal = (
  products: Product[],
  quantities: Record<number, number>
): number => {
  return products.reduce((total, product) => {
    const price = Number(product.price) || 0
    return total + price * (quantities[product.id] || 0)
  }, 0)
}

/**
 * Calcula total de itens no carrinho
 */
export const calculateTotalItems = (quantities: Record<number, number>): number => {
  return Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
}

/**
 * Normaliza chave PIX para formato correto
 * - Telefone: adiciona +55 se necessario
 * - CPF/CNPJ/Email/Aleatoria: mantem como esta
 */
export const normalizePixKey = (key: string): string => {
  if (!key) return key
  
  // Remove espacos, parenteses, tracos
  const cleaned = key.replace(/[\s\(\)\-\.]/g, "")
  
  // Se ja tem + no inicio, mantem
  if (cleaned.startsWith("+")) {
    return cleaned
  }
  
  // Se parece com email (tem @), mantem
  if (cleaned.includes("@")) {
    return cleaned
  }
  
  // Se tem letras (chave aleatoria), mantem
  if (/[a-zA-Z]/.test(cleaned) && !cleaned.includes("@")) {
    return cleaned
  }
  
  // Apenas digitos a partir daqui
  const digits = cleaned.replace(/\D/g, "")
  
  // CPF: 11 digitos mas nao comeca com 55 (ou comeca com 0-4)
  // Telefone BR: 11 digitos comecando com DDD valido (11-99)
  // Para diferenciar: CPF nunca comeca com 55, telefone com DDI sim
  
  // Se tem 11 digitos e parece telefone brasileiro (DDD 11-99)
  const ddd = parseInt(digits.substring(0, 2), 10)
  if (digits.length === 11 && ddd >= 11 && ddd <= 99) {
    // Pode ser telefone ou CPF
    // Telefone: 3o digito e 9 (celular) ou 2-5 (fixo)
    const thirdDigit = digits[2]
    if (thirdDigit === "9" || (thirdDigit >= "2" && thirdDigit <= "5")) {
      // Provavelmente telefone - adiciona +55
      return "+" + "55" + digits
    }
  }
  
  // Se tem 13 digitos e comeca com 55 (telefone com DDI sem +)
  if (digits.length === 13 && digits.startsWith("55")) {
    return "+" + digits
  }
  
  // Se tem 10-11 digitos e nao se encaixa em telefone, pode ser CPF
  // CPF: 11 digitos
  // CNPJ: 14 digitos
  if (digits.length === 11 || digits.length === 14) {
    // Mantem como documento (sem +55)
    return digits
  }
  
  // Caso padrao: retorna limpo
  return cleaned
}

/**
 * Gera codigo PIX EMV para pagamento manual
 * Formato: BR Code EMV QRCPS-MPM
 */
export const generatePixCode = (amount: number, pixKey: string, receiverName?: string, city?: string): string => {
  // Normaliza a chave PIX (adiciona +55 se for telefone)
  const normalizedKey = normalizePixKey(pixKey)
  
  // Nome do recebedor - limpar e formatar
  const merchantName = (receiverName || "LOJA")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^A-Z0-9 ]/g, "") // Remove caracteres especiais
    .substring(0, 25) // Max 25 chars
  
  // Cidade - limpar e formatar
  const merchantCity = (city || "SAO PAULO")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^A-Z0-9 ]/g, "") // Remove caracteres especiais
    .substring(0, 15) // Max 15 chars
    
  const amountStr = amount.toFixed(2)

  // CRC16-CCITT (polinomio 0x1021)
  const crc16 = (str: string): string => {
    let crc = 0xffff
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021
        } else {
          crc <<= 1
        }
        crc &= 0xffff
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0")
  }

  // Monta TLV (Tag-Length-Value)
  const tlv = (tag: string, value: string): string => {
    return tag + value.length.toString().padStart(2, "0") + value
  }

  // Monta Merchant Account Information (tag 26)
  const gui = tlv("00", "br.gov.bcb.pix")
  const chave = tlv("01", normalizedKey)
  const merchantAccountInfo = tlv("26", gui + chave)

  // Monta payload
  let payload = ""
  payload += tlv("00", "01") // Payload Format Indicator
  payload += merchantAccountInfo // Merchant Account Information
  payload += tlv("52", "0000") // Merchant Category Code
  payload += tlv("53", "986") // Transaction Currency (BRL)
  payload += tlv("54", amountStr) // Transaction Amount
  payload += tlv("58", "BR") // Country Code
  payload += tlv("59", merchantName) // Merchant Name
  payload += tlv("60", merchantCity) // Merchant City
  payload += tlv("62", tlv("05", "***")) // Additional Data Field (txid)
  payload += "6304" // CRC placeholder

  const crcValue = crc16(payload)
  return payload + crcValue
}

/**
 * Copia texto para clipboard com fallback
 */
export const copyToClipboard = async (
  text: string,
  onSuccess?: () => void,
  onError?: () => void
): Promise<boolean> => {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text)
      onSuccess?.()
      return true
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
    onSuccess?.()
    return true
  } catch {
    onError?.()
    return false
  }
}

/**
 * Formata tempo restante do PIX
 */
export const formatPixTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

/**
 * Verifica se esta dentro do horario de funcionamento
 */
export const isWithinBusinessHours = (openTime: string, closeTime: string): boolean => {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentMinutes = currentHour * 60 + currentMinute

  const [openHour, openMin] = openTime.split(":").map(Number)
  const [closeHour, closeMin] = closeTime.split(":").map(Number)
  const openMinutes = openHour * 60 + openMin
  const closeMinutes = closeHour * 60 + closeMin

  // Se horario de fechamento e menor que abertura (passa da meia-noite)
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes
  } else {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes
  }
}

/**
 * Gera URL de rastreamento do pedido
 */
export const getOrderTrackingUrl = (orderId: string): string => {
  return `https://www.pkgostosuras.shop/pedido/${orderId}`
}

/**
 * Gera mensagem do WhatsApp para pedido confirmado
 */
export const buildConfirmedOrderMessage = (params: {
  orderId: string
  customerName: string
  customerPhone: string
  items: string
  totalItems: number
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  couponCode: string | null
  deliveryType: "entrega" | "retirada"
  address: string
  reference: string
  location: string
  bairro: string
  paymentTime: string
}): string => {
  const {
    orderId,
    customerName,
    customerPhone,
    items,
    totalItems,
    subtotal,
    discount,
    deliveryFee,
    total,
    couponCode,
    deliveryType,
    address,
    reference,
    location,
    bairro,
    paymentTime,
  } = params

  const deliveryInfo =
    deliveryType === "entrega"
      ? `Endereco: ${address}${bairro ? ` - ${bairro}` : ""}\nReferencia: ${reference}${location ? `\nLocalizacao: ${location}` : ""}`
      : "Retirada no local"

  let discountLine = ""
  if (couponCode && discount > 0) {
    discountLine = `\nCupom: ${couponCode} (-${formatCurrency(discount)})`
  }

  let deliveryFeeLine = ""
  if (deliveryFee > 0 && deliveryType === "entrega") {
    deliveryFeeLine = `\nTaxa de entrega: ${formatCurrency(deliveryFee)}`
  }

  return `━━━━━━━━━━━━━��━━━━
PEDIDO PAGO
━━━━━━━━━━━━━━━━━━

Pedido No: ${orderId}

Cliente:
${customerName}
Tel: ${customerPhone}

Itens:
${items}

Quantidade:
${totalItems} item(s)

Subtotal: ${formatCurrency(subtotal)}${discountLine}${deliveryFeeLine}
Total: ${formatCurrency(total)}

Pagamento:
PIX CONFIRMADO

${deliveryType === "entrega" ? "Entrega:" : "Retirada:"}
${deliveryInfo}

Horario:
${paymentTime}

Acompanhe seu pedido:
${getOrderTrackingUrl(orderId)}

━━━━━━━━━━━━━━━━━━`
}

/**
 * Gera mensagem do WhatsApp para PIX manual
 */
export const buildManualPixMessage = (params: {
  orderId: string
  customerName: string
  customerPhone: string
  items: string
  total: number
  deliveryType: "entrega" | "retirada"
  address: string
  reference: string
  location: string
  bairro: string
  observation: string
}): string => {
  const {
    orderId,
    customerName,
    customerPhone,
    items,
    total,
    deliveryType,
    address,
    reference,
    location,
    bairro,
    observation,
  } = params

  const deliveryInfo =
    deliveryType === "entrega"
      ? `Endereco: ${address}${bairro ? ` - ${bairro}` : ""}\nReferencia: ${reference}${location ? `\nLocalizacao: ${location}` : ""}`
      : "Retirada no local"

  return `Ola! Quero pagar meu pedido pelo PIX manual.

Pedido: ${orderId}

Nome: ${customerName}
Tel: ${customerPhone}

Itens:
${items}

Valor: ${formatCurrency(total)}

${deliveryType === "entrega" ? "Entrega:" : "Retirada:"}
${deliveryInfo}

Observacao: ${observation || "Nenhuma"}

Acompanhe seu pedido:
${getOrderTrackingUrl(orderId)}`
}
