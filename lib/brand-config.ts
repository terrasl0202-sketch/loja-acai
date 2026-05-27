/**
 * WHITE LABEL BRAND CONFIGURATION
 * 
 * Este arquivo centraliza toda a identidade visual da loja.
 * Para criar uma nova loja, basta editar as configuracoes abaixo.
 * 
 * IMPORTANTE: Esta e uma configuracao local/mockada.
 * No futuro, podera ser carregada de um banco de dados para multi-tenancy.
 */

export interface BrandConfig {
  // Identificacao
  id: string
  slug: string
  
  // Informacoes basicas
  name: string
  shortName: string
  subtitle: string
  slogan: string
  description: string
  
  // Contato
  whatsapp: string
  whatsappFormatted: string
  instagram?: string
  email?: string
  address?: string
  
  // Visual - Cores (usadas para gerar CSS variables)
  colors: {
    primary: string        // Cor principal (botoes, destaques)
    primaryForeground: string
    secondary: string      // Cor secundaria
    secondaryForeground: string
    accent: string         // Cor de destaque
    accentForeground: string
    background: string     // Fundo principal
    foreground: string     // Texto principal
    card: string           // Fundo de cards
    cardForeground: string
    muted: string          // Elementos sutis
    mutedForeground: string
    border: string         // Bordas
    destructive: string    // Erros/alertas
    destructiveForeground: string
  }
  
  // Visual - Imagens
  images: {
    logo: string           // Logo principal
    logoWhite?: string     // Logo para fundo escuro
    favicon: string        // Favicon
    banner: string         // Banner do hero
    ogImage?: string       // Imagem para compartilhamento
  }
  
  // Textos do Hero/Banner
  hero: {
    title: string
    subtitle: string
    ctaText: string
    promoText?: string
    promoPrice?: number
  }
  
  // Configuracoes de negocio
  business: {
    currency: string           // BRL, USD, EUR
    currencySymbol: string     // R$, $, €
    currencyLocale: string     // pt-BR, en-US
    deliveryFeeDefault: number // Taxa de entrega padrao
    minimumOrder: number       // Pedido minimo
    estimatedTime: string      // Tempo estimado
  }
  
  // Textos customizaveis
  texts: {
    emptyCart: string
    emptyCartCta: string
    checkoutTitle: string
    orderSuccess: string
    storeClosed: string
    deliveryLabel: string
    pickupLabel: string
  }
  
  // Tema
  theme: {
    mode: "dark" | "light"
    borderRadius: string      // rounded-xl, rounded-2xl, etc.
    fontFamily: string        // Geist, Inter, etc.
  }
  
  // SEO
  seo: {
    title: string
    description: string
    keywords: string[]
  }
}

// ============================================
// CONFIGURACAO DA LOJA ATUAL
// Edite aqui para personalizar a identidade
// ============================================

export const brandConfig: BrandConfig = {
  // Identificacao
  id: "acai-do-ponto",
  slug: "acai-do-ponto",
  
  // Informacoes basicas
  name: "Acai do Ponto",
  shortName: "Acai",
  subtitle: "Delivery de Acai",
  slogan: "O melhor acai da cidade",
  description: "Acai fresquinho, cremoso e com os melhores acompanhamentos. Peca agora pelo delivery!",
  
  // Contato
  whatsapp: "5511999999999",
  whatsappFormatted: "(11) 99999-9999",
  instagram: "@acaidoponto",
  email: "contato@acaidoponto.com",
  address: "Rua do Acai, 123 - Centro",
  
  // Visual - Cores (tema escuro com roxo)
  colors: {
    primary: "270 80% 60%",            // Roxo vibrante
    primaryForeground: "0 0% 100%",    // Branco
    secondary: "240 10% 16%",          // Cinza escuro
    secondaryForeground: "0 0% 95%",   // Branco suave
    accent: "270 90% 70%",             // Roxo claro
    accentForeground: "0 0% 100%",     // Branco
    background: "240 10% 8%",          // Preto suave
    foreground: "0 0% 95%",            // Branco suave
    card: "240 10% 12%",               // Cinza escuro
    cardForeground: "0 0% 95%",        // Branco suave
    muted: "240 10% 20%",              // Cinza medio
    mutedForeground: "240 5% 55%",     // Cinza claro
    border: "240 10% 20%",             // Borda sutil
    destructive: "0 80% 60%",          // Vermelho
    destructiveForeground: "0 0% 100%",// Branco
  },
  
  // Visual - Imagens
  images: {
    logo: "/logo.png",
    logoWhite: "/logo-white.png",
    favicon: "/favicon.ico",
    banner: "/banner-acai.jpg",
    ogImage: "/og-image.jpg",
  },
  
  // Textos do Hero/Banner
  hero: {
    title: "Acai Premium",
    subtitle: "Cremoso, saboroso e fresquinho",
    ctaText: "Ver Cardapio",
    promoText: "Promocao",
    promoPrice: 19.90,
  },
  
  // Configuracoes de negocio
  business: {
    currency: "BRL",
    currencySymbol: "R$",
    currencyLocale: "pt-BR",
    deliveryFeeDefault: 5.00,
    minimumOrder: 15.00,
    estimatedTime: "30-45 min",
  },
  
  // Textos customizaveis
  texts: {
    emptyCart: "Seu carrinho esta vazio",
    emptyCartCta: "Ver cardapio",
    checkoutTitle: "Finalizar Pedido",
    orderSuccess: "Pedido enviado com sucesso!",
    storeClosed: "Loja fechada no momento",
    deliveryLabel: "Entrega",
    pickupLabel: "Retirada no local",
  },
  
  // Tema
  theme: {
    mode: "dark",
    borderRadius: "rounded-2xl",
    fontFamily: "Geist",
  },
  
  // SEO
  seo: {
    title: "Acai do Ponto | Delivery de Acai Premium",
    description: "Peca o melhor acai da cidade! Cremoso, fresquinho e com entrega rapida. Diversos tamanhos e acompanhamentos.",
    keywords: ["acai", "delivery", "acai cremoso", "acai delivery", "acai perto de mim"],
  },
}

// ============================================
// FUNCOES HELPERS
// ============================================

/**
 * Formata um valor monetario usando as configuracoes da marca
 */
export function formatBrandCurrency(value: number): string {
  return new Intl.NumberFormat(brandConfig.business.currencyLocale, {
    style: "currency",
    currency: brandConfig.business.currency,
  }).format(value)
}

/**
 * Retorna a URL do WhatsApp com mensagem
 */
export function getBrandWhatsAppUrl(message?: string): string {
  const encodedMessage = encodeURIComponent(message || `Ola ${brandConfig.name}!`)
  return `https://wa.me/${brandConfig.whatsapp}?text=${encodedMessage}`
}

/**
 * Retorna as CSS variables das cores
 */
export function getBrandCSSVariables(): Record<string, string> {
  return {
    "--primary": brandConfig.colors.primary,
    "--primary-foreground": brandConfig.colors.primaryForeground,
    "--secondary": brandConfig.colors.secondary,
    "--secondary-foreground": brandConfig.colors.secondaryForeground,
    "--accent": brandConfig.colors.accent,
    "--accent-foreground": brandConfig.colors.accentForeground,
    "--background": brandConfig.colors.background,
    "--foreground": brandConfig.colors.foreground,
    "--card": brandConfig.colors.card,
    "--card-foreground": brandConfig.colors.cardForeground,
    "--muted": brandConfig.colors.muted,
    "--muted-foreground": brandConfig.colors.mutedForeground,
    "--border": brandConfig.colors.border,
    "--destructive": brandConfig.colors.destructive,
    "--destructive-foreground": brandConfig.colors.destructiveForeground,
  }
}

// Export default para facilitar imports
export default brandConfig
