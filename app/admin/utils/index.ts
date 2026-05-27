import type { Order } from "@/lib/config-types"

// Normalizar texto (remover acentos e converter para minusculas)
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

// Normalizar telefone para WhatsApp
export const normalizePhoneForWhatsApp = (phone: string): string => {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 11) return "55" + digits
  if (digits.length === 13 && digits.startsWith("55")) return digits
  return digits
}

// Formatar moeda
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

// Formatar data
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Calcular tempo decorrido desde saida para entrega
export const calcularTempoEntrega = (saiuParaEntregaEm: string): { minutos: number; texto: string } => {
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

// Calcular tempo desde criacao
export const getTimeSinceCreation = (createdAt: string): string => {
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

// Verificar se pedido esta confirmado
export const isOrderConfirmed = (o: Order): boolean => 
  o.paymentStatus === "confirmed" || 
  o.manuallyConfirmed || 
  o.confirmedAutomatically || 
  !!o.paidAt ||
  o.status === "completed"

// Obter cor do status
export const getStatusColor = (status: Order["status"]): string => {
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

// Obter label do status
export const getStatusLabel = (status: Order["status"]): string => {
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

// Obter cor do status de pagamento
export const getPaymentStatusColor = (status: Order["paymentStatus"]): string => {
  switch (status) {
    case "pending": return "bg-yellow-500/20 text-yellow-400"
    case "confirmed": return "bg-green-500/20 text-green-400"
    case "failed": return "bg-red-500/20 text-red-400"
    default: return "bg-gray-500/20 text-gray-400"
  }
}

// Obter label do status de pagamento
export const getPaymentStatusLabel = (status: Order["paymentStatus"]): string => {
  switch (status) {
    case "pending": return "Aguardando"
    case "confirmed": return "Pago"
    case "failed": return "Falhou"
    default: return status || ""
  }
}

// URL base publica oficial
export const getPublicBaseUrl = (): string => "https://www.pkgostosuras.shop"

// Gerar link de acompanhamento do pedido
export const getOrderTrackingLink = (orderId: string): string => {
  return `${getPublicBaseUrl()}/pedido/${orderId}`
}

// Gerar link do painel do entregador
export const getEntregadorPanelLink = (token: string): string => {
  return `${getPublicBaseUrl()}/entregador/${token}`
}

// Gerar mensagem WhatsApp para entregador
export const generateEntregadorMessage = (order: Order): string => {
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

// Copiar para clipboard com fallback robusto
export const copyToClipboardRobust = async (
  text: string, 
  onSuccess: () => void, 
  onFallback: (text: string) => void
): Promise<void> => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      onSuccess()
      return
    } catch {
      // Fallback abaixo
    }
  }
  
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
  
  onFallback(text)
}
