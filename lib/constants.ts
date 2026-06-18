// Dominio publico oficial da loja
// IMPORTANTE: Este dominio deve ser usado para todos os links publicos
// que serao enviados aos clientes (links de acompanhamento, etc.)
// NUNCA usar window.location.origin ou dominios temporarios da Vercel

export const PUBLIC_SITE_URL = "https://www.pkgostosuras.shop"

// Gera link publico de acompanhamento do pedido
export const getPublicOrderTrackingLink = (orderId: string): string => {
  return `${PUBLIC_SITE_URL}/pedido/${orderId}`
}
