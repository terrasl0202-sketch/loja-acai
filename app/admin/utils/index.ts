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

// Verificar se pedido esta confirmado (pagamento recebido)
// Considera tanto campos legados (paymentStatus, manuallyConfirmed) quanto o campo principal (status)
// NOTA: Esta funcao verifica se o pedido foi PAGO, para exibicao nas abas corretas
export const isOrderConfirmed = (o: Order): boolean => 
  o.status === "confirmed" ||        // Status principal = confirmed
  o.status === "preparing" ||        // Ja em preparacao = confirmado
  o.status === "delivering" ||       // Ja em entrega = confirmado
  o.status === "completed" ||        // Completado = confirmado
  o.paymentStatus === "confirmed" || // Campo legado
  o.manuallyConfirmed ||             // Confirmacao manual
  o.confirmedAutomatically ||        // Pix automatico
  !!o.paidAt                         // Campo legado

/**
 * REGRA OFICIAL DE FATURAMENTO:
 * Um pedido entra no faturamento se isOrderConfirmed() retornar true
 * E o pedido NAO estiver cancelado.
 * 
 * A mesma logica de "confirmado" deve valer para faturamento.
 * Se aparece como "Confirmado" no relatorio, DEVE entrar no faturamento.
 */
export const isRevenueOrder = (o: Order): boolean => {
  // Se o pedido esta confirmado (mesma logica do relatorio)
  const confirmed = isOrderConfirmed(o)
  
  // Nao contar pedidos cancelados
  const notCancelled = o.status !== "cancelled"
  
  return confirmed && notCancelled
}

/**
 * Obter o total do pedido de forma segura
 * Tenta varios campos possiveis e garante que nunca retorna NaN
 */
export const getOrderTotal = (o: Order): number => {
  // Tenta o.total primeiro (mais comum)
  if (typeof o.total === 'number' && !isNaN(o.total)) {
    return o.total
  }
  
  // Tenta converter string para numero
  if (typeof o.total === 'string') {
    const parsed = parseFloat(o.total)
    if (!isNaN(parsed)) return parsed
  }
  
  // Tenta campos alternativos (podem existir em dados legados)
  const alt = o as unknown as Record<string, unknown>
  
  if (typeof alt.totalAmount === 'number' && !isNaN(alt.totalAmount)) {
    return alt.totalAmount
  }
  if (typeof alt.total_amount === 'number' && !isNaN(alt.total_amount)) {
    return alt.total_amount
  }
  if (typeof alt.finalTotal === 'number' && !isNaN(alt.finalTotal)) {
    return alt.finalTotal
  }
  
  // Fallback: 0
  return 0
}

/**
 * Filtra pedidos que devem entrar no faturamento
 */
export const getRevenueOrders = (orders: Order[]): Order[] => {
  return orders.filter(isRevenueOrder)
}

/**
 * Calcula o faturamento total dos pedidos
 */
export const calculateRevenue = (orders: Order[]): number => {
  return getRevenueOrders(orders).reduce((sum, o) => sum + getOrderTotal(o), 0)
}

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

// Obter codigo publico do pedido
export const getOrderCode = (order: Order): string => {
  return order.orderCode || order.id
}

// Formatar itens do pedido de forma legivel
export const formatOrderItems = (order: Order): string => {
  // Se tiver itemsDetailed como array
  if (Array.isArray(order.itemsDetailed) && order.itemsDetailed.length > 0) {
    return order.itemsDetailed.map(item => {
      const name = item.productName || 'Produto'
      const qty = item.quantity || 1
      const subtotal = item.subtotal || (item.price * qty)
      return `${qty}x ${name} - R$ ${subtotal.toFixed(2)}`
    }).join(', ')
  }
  
  // Se items for string, retornar direto
  if (typeof order.items === 'string') {
    return order.items
  }
  
  // Se items for array (JSONB do Supabase)
  if (Array.isArray(order.items)) {
    return (order.items as Array<{ productName?: string; name?: string; quantity?: number; price?: number; subtotal?: number }>).map(item => {
      const name = item.productName || item.name || 'Produto'
      const qty = item.quantity || 1
      const subtotal = item.subtotal || ((item.price || 0) * qty)
      return `${qty}x ${name} - R$ ${subtotal.toFixed(2)}`
    }).join(', ')
  }
  
  return 'Sem itens'
}

// URL base publica oficial
export const getPublicBaseUrl = (): string => "https://www.pkgostosuras.shop"

// Gerar link de acompanhamento do pedido
// IMPORTANTE: Usar orderCode (codigo publico), NAO id (BIGINT interno)
export const getOrderTrackingLink = (orderCode: string): string => {
  return `${getPublicBaseUrl()}/pedido/${orderCode}`
}

// Gerar link do painel do entregador
export const getEntregadorPanelLink = (token: string): string => {
  return `${getPublicBaseUrl()}/entregador/${token}`
}

// Gerar mensagem WhatsApp para entregador
export const generateEntregadorMessage = (order: Order): string => {
  // Usar orderCode para identificar o pedido de forma amigavel
  const orderCode = getOrderCode(order)
  
  const lines = [
    `*NOVO PEDIDO - ${orderCode}*`,
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
  // Formatar itens corretamente (nao usar JSON cru)
  lines.push(formatOrderItems(order))
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
