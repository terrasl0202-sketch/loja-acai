"use client"

import { brandConfig, formatBrandCurrency, getBrandWhatsAppUrl, type BrandConfig } from "@/lib/brand-config"

/**
 * Hook para acessar as configuracoes da marca/loja
 * Centraliza o acesso ao brand config em toda a aplicacao
 */
export function useBrand() {
  return {
    // Config completa
    config: brandConfig,
    
    // Atalhos para propriedades comuns
    name: brandConfig.name,
    shortName: brandConfig.shortName,
    slogan: brandConfig.slogan,
    whatsapp: brandConfig.whatsapp,
    whatsappFormatted: brandConfig.whatsappFormatted,
    
    // Imagens
    logo: brandConfig.images.logo,
    banner: brandConfig.images.banner,
    
    // Textos
    texts: brandConfig.texts,
    hero: brandConfig.hero,
    
    // Negocio
    currencySymbol: brandConfig.business.currencySymbol,
    deliveryFee: brandConfig.business.deliveryFeeDefault,
    minimumOrder: brandConfig.business.minimumOrder,
    estimatedTime: brandConfig.business.estimatedTime,
    
    // Tema
    theme: brandConfig.theme,
    
    // SEO
    seo: brandConfig.seo,
    
    // Funcoes helpers
    formatCurrency: formatBrandCurrency,
    getWhatsAppUrl: getBrandWhatsAppUrl,
  }
}

export type { BrandConfig }
