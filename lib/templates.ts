// ============================================
// TEMPLATES PROFISSIONAIS - WHITE LABEL
// ============================================

import { StoreCustomization } from "./config-types"

export interface StoreTemplate {
  id: string
  name: string
  description: string
  icon: string
  heroImage: string  // URL da imagem padrao do hero
  previewColors: {
    primary: string
    secondary: string
    accent: string
  }
  // Customizacao parcial que sera mesclada com a config existente
  customization: Partial<StoreCustomization>
}

export const STORE_TEMPLATES: StoreTemplate[] = [
  {
    id: "acai",
    name: "Acaiteria",
    description: "Cores vibrantes e tropicais para lojas de acai e frutas",
    icon: "grape",
    heroImage: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1200&h=600&fit=crop&q=80",
    previewColors: {
      primary: "#7C3AED",
      secondary: "#A855F7",
      accent: "#F59E0B",
    },
    customization: {
      colors: {
        primary: "#7C3AED",
        secondary: "#A855F7",
        accent: "#F59E0B",
        background: "#09090B",
        foreground: "#FAFAFA",
        card: "#18181B",
        muted: "#A1A1AA",
        border: "#27272A",
      },
      hero: {
        title: "Acai Premium",
        subtitle: "O melhor acai da cidade, feito com amor e fruta de qualidade",
        badge1: { text: "30-45 min", icon: "clock", enabled: true },
        badge2: { text: "Geladinho", icon: "snowflake", enabled: true },
        badge3: { text: "Premium", icon: "award", enabled: true },
      },
    },
  },
  {
    id: "marmitaria",
    name: "Marmitaria",
    description: "Visual caseiro e acolhedor para comida de verdade",
    icon: "utensils",
    heroImage: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=600&fit=crop&q=80",
    previewColors: {
      primary: "#DC2626",
      secondary: "#F97316",
      accent: "#FACC15",
    },
    customization: {
      colors: {
        primary: "#DC2626",
        secondary: "#F97316",
        accent: "#FACC15",
        background: "#09090B",
        foreground: "#FAFAFA",
        card: "#18181B",
        muted: "#A1A1AA",
        border: "#27272A",
      },
      hero: {
        title: "Comida de Verdade",
        subtitle: "Marmitas feitas com carinho, tempero caseiro e ingredientes frescos",
        badge1: { text: "Almoco", icon: "clock", enabled: true },
        badge2: { text: "Caseiro", icon: "heart", enabled: true },
        badge3: { text: "Fresco", icon: "award", enabled: true },
      },
    },
  },
  {
    id: "hamburgueria",
    name: "Hamburgueria",
    description: "Visual gourmet e marcante para hamburguerias artesanais",
    icon: "beef",
    heroImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&h=600&fit=crop&q=80",
    previewColors: {
      primary: "#B91C1C",
      secondary: "#1F2937",
      accent: "#FBBF24",
    },
    customization: {
      colors: {
        primary: "#B91C1C",
        secondary: "#1F2937",
        accent: "#FBBF24",
        background: "#0A0A0A",
        foreground: "#FAFAFA",
        card: "#171717",
        muted: "#A3A3A3",
        border: "#262626",
      },
      hero: {
        title: "Burgers Artesanais",
        subtitle: "Hamburguer gourmet feito com blend exclusivo e ingredientes premium",
        badge1: { text: "40-55 min", icon: "clock", enabled: true },
        badge2: { text: "Artesanal", icon: "award", enabled: true },
        badge3: { text: "Gourmet", icon: "star", enabled: true },
      },
    },
  },
  {
    id: "pizzaria",
    name: "Pizzaria",
    description: "Cores quentes e apetitosas para pizzarias tradicionais",
    icon: "pizza",
    heroImage: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&h=600&fit=crop&q=80",
    previewColors: {
      primary: "#DC2626",
      secondary: "#EA580C",
      accent: "#FDE047",
    },
    customization: {
      colors: {
        primary: "#DC2626",
        secondary: "#EA580C",
        accent: "#FDE047",
        background: "#0C0A09",
        foreground: "#FAFAF9",
        card: "#1C1917",
        muted: "#A8A29E",
        border: "#292524",
      },
      hero: {
        title: "Pizza Artesanal",
        subtitle: "Massa fresca, molho especial e ingredientes selecionados",
        badge1: { text: "45-60 min", icon: "clock", enabled: true },
        badge2: { text: "Forno a lenha", icon: "flame", enabled: true },
        badge3: { text: "Tradicional", icon: "award", enabled: true },
      },
    },
  },
  {
    id: "sorveteria",
    name: "Sorveteria",
    description: "Tons gelados e refrescantes para sorveterias e gelaterias",
    icon: "ice-cream-cone",
    heroImage: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=1200&h=600&fit=crop&q=80",
    previewColors: {
      primary: "#06B6D4",
      secondary: "#EC4899",
      accent: "#FBBF24",
    },
    customization: {
      colors: {
        primary: "#06B6D4",
        secondary: "#EC4899",
        accent: "#FBBF24",
        background: "#09090B",
        foreground: "#FAFAFA",
        card: "#18181B",
        muted: "#A1A1AA",
        border: "#27272A",
      },
      hero: {
        title: "Sorvetes Artesanais",
        subtitle: "Sabores exclusivos feitos com ingredientes naturais e muito cremosos",
        badge1: { text: "Gelado", icon: "snowflake", enabled: true },
        badge2: { text: "Natural", icon: "heart", enabled: true },
        badge3: { text: "Cremoso", icon: "award", enabled: true },
      },
    },
  },
  {
    id: "cafeteria",
    name: "Cafeteria",
    description: "Tons terrosos e aconchegantes para cafeterias e padarias",
    icon: "coffee",
    heroImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&h=600&fit=crop&q=80",
    previewColors: {
      primary: "#78350F",
      secondary: "#92400E",
      accent: "#D97706",
    },
    customization: {
      colors: {
        primary: "#78350F",
        secondary: "#92400E",
        accent: "#D97706",
        background: "#0C0A09",
        foreground: "#FAFAF9",
        card: "#1C1917",
        muted: "#A8A29E",
        border: "#292524",
      },
      hero: {
        title: "Cafe Especial",
        subtitle: "Graos selecionados, torrefacao artesanal e preparo com carinho",
        badge1: { text: "Fresquinho", icon: "clock", enabled: true },
        badge2: { text: "Artesanal", icon: "heart", enabled: true },
        badge3: { text: "Especial", icon: "award", enabled: true },
      },
    },
  },
]

// Funcao para mesclar template com customizacao existente
export function applyTemplate(
  currentCustomization: StoreCustomization,
  template: StoreTemplate
): StoreCustomization {
  const currentHero = currentCustomization.hero || {
    title: "",
    subtitle: "",
    badge1: { text: "", icon: "clock", enabled: true },
    badge2: { text: "", icon: "snowflake", enabled: true },
    badge3: { text: "", icon: "award", enabled: true },
  }
  
  const templateHero = template.customization.hero
  
  return {
    ...currentCustomization,
    colors: {
      ...currentCustomization.colors,
      ...(template.customization.colors || {}),
    },
    identity: {
      ...currentCustomization.identity,
      // Aplica imagem do hero do template se nao houver imagem personalizada
      coverImageUrl: currentCustomization.identity?.coverImageUrl || template.heroImage,
    },
    hero: {
      title: templateHero?.title ?? currentHero.title,
      subtitle: templateHero?.subtitle ?? currentHero.subtitle,
      badge1: templateHero?.badge1 ?? currentHero.badge1,
      badge2: templateHero?.badge2 ?? currentHero.badge2,
      badge3: templateHero?.badge3 ?? currentHero.badge3,
    },
    // Mantemos theme, elements, social e gateways intactos
  }
}

// Funcao para obter imagem padrao do hero baseado no template
export function getTemplateHeroImage(templateId: string): string {
  const template = STORE_TEMPLATES.find(t => t.id === templateId)
  return template?.heroImage || STORE_TEMPLATES[0].heroImage
}
