import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { defaultCustomization, StoreCustomization } from "@/lib/config-types"

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// GET - Buscar configuracoes de customizacao
export async function GET() {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ customization: defaultCustomization })
    }

    const { data, error } = await supabase
      .from("store_settings")
      .select(`
        store_name,
        subtitle,
        slogan,
        instagram,
        address,
        whatsapp,
        logo_url,
        favicon_url,
        cover_image_url,
        color_primary,
        color_secondary,
        color_accent,
        color_background,
        color_foreground,
        color_card,
        color_muted,
        color_border,
        theme_mode,
        layout_type,
        border_radius,
        cards_shadow,
        banner_height,
        show_bestseller_badge,
        show_promo_badge,
        show_new_badge,
        show_reviews,
        show_categories,
        show_descriptions,
        show_promo_banner,
        show_bestsellers_section,
        show_featured_section,
        promo_message,
        facebook,
        tiktok,
        delivery_policy,
        footer_text,
        gateway_mercadopago_enabled,
        gateway_pagbank_enabled,
        gateway_stripe_enabled,
        hero_title,
        hero_subtitle,
        hero_badge_1_text,
        hero_badge_1_icon,
        hero_badge_1_enabled,
        hero_badge_2_text,
        hero_badge_2_icon,
        hero_badge_2_enabled,
        hero_badge_3_text,
        hero_badge_3_icon,
        hero_badge_3_enabled
      `)
      .order('id', { ascending: true })
      .limit(1)
      .single()

    if (error) {
      console.error("Erro ao buscar customizacao:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Mapear do banco para o formato da interface
    const customization: StoreCustomization = {
      identity: {
        storeName: data?.store_name || "",
        subtitle: data?.subtitle || "",
        slogan: data?.slogan || "",
        logoUrl: data?.logo_url || "",
        faviconUrl: data?.favicon_url || "",
        coverImageUrl: data?.cover_image_url || "",
      },
      colors: {
        primary: data?.color_primary || defaultCustomization.colors.primary,
        secondary: data?.color_secondary || defaultCustomization.colors.secondary,
        accent: data?.color_accent || defaultCustomization.colors.accent,
        background: data?.color_background || defaultCustomization.colors.background,
        foreground: data?.color_foreground || defaultCustomization.colors.foreground,
        card: data?.color_card || defaultCustomization.colors.card,
        muted: data?.color_muted || defaultCustomization.colors.muted,
        border: data?.color_border || defaultCustomization.colors.border,
      },
      theme: {
        mode: data?.theme_mode || "dark",
        layoutType: data?.layout_type || "premium",
        borderRadius: data?.border_radius ?? 16,
        cardsShadow: data?.cards_shadow ?? true,
        bannerHeight: data?.banner_height || "medium",
      },
      elements: {
        showBestsellerBadge: data?.show_bestseller_badge ?? true,
        showPromoBadge: data?.show_promo_badge ?? true,
        showNewBadge: data?.show_new_badge ?? true,
        showReviews: data?.show_reviews ?? true,
        showCategories: data?.show_categories ?? true,
        showDescriptions: data?.show_descriptions ?? true,
        showPromoBanner: data?.show_promo_banner ?? true,
        showBestsellersSection: data?.show_bestsellers_section ?? true,
        showFeaturedSection: data?.show_featured_section ?? true,
        promoMessage: data?.promo_message || "",
      },
      social: {
        instagram: data?.instagram || "",
        facebook: data?.facebook || "",
        tiktok: data?.tiktok || "",
        whatsapp: data?.whatsapp || "",
        address: data?.address || "",
        deliveryPolicy: data?.delivery_policy || "",
        footerText: data?.footer_text || "",
      },
      gateways: {
        mercadopagoEnabled: data?.gateway_mercadopago_enabled ?? false,
        pagbankEnabled: data?.gateway_pagbank_enabled ?? false,
        stripeEnabled: data?.gateway_stripe_enabled ?? false,
      },
      hero: {
        title: data?.hero_title || "",
        subtitle: data?.hero_subtitle || "",
        badge1: {
          text: data?.hero_badge_1_text || "30-45 min",
          icon: data?.hero_badge_1_icon || "clock",
          enabled: data?.hero_badge_1_enabled ?? true,
        },
        badge2: {
          text: data?.hero_badge_2_text || "Geladinho",
          icon: data?.hero_badge_2_icon || "snowflake",
          enabled: data?.hero_badge_2_enabled ?? true,
        },
        badge3: {
          text: data?.hero_badge_3_text || "Premium",
          icon: data?.hero_badge_3_icon || "award",
          enabled: data?.hero_badge_3_enabled ?? true,
        },
      },
    }

    return NextResponse.json({ customization })
  } catch (err) {
    console.error("Erro ao buscar customizacao:", err)
    return NextResponse.json({ error: "Erro interno ao buscar customizacao" }, { status: 500 })
  }
}

// PUT - Salvar configuracoes de customizacao
export async function PUT(req: NextRequest) {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase nao configurado" }, { status: 500 })
    }

    const body = await req.json()
    const { customization } = body as { customization: Partial<StoreCustomization> }

    // Construir objeto de update
    const updateData: Record<string, unknown> = {}

    // Identity
    if (customization.identity) {
      if (customization.identity.logoUrl !== undefined) updateData.logo_url = customization.identity.logoUrl
      if (customization.identity.faviconUrl !== undefined) updateData.favicon_url = customization.identity.faviconUrl
      if (customization.identity.coverImageUrl !== undefined) updateData.cover_image_url = customization.identity.coverImageUrl
    }

    // Colors
    if (customization.colors) {
      if (customization.colors.primary !== undefined) updateData.color_primary = customization.colors.primary
      if (customization.colors.secondary !== undefined) updateData.color_secondary = customization.colors.secondary
      if (customization.colors.accent !== undefined) updateData.color_accent = customization.colors.accent
      if (customization.colors.background !== undefined) updateData.color_background = customization.colors.background
      if (customization.colors.foreground !== undefined) updateData.color_foreground = customization.colors.foreground
      if (customization.colors.card !== undefined) updateData.color_card = customization.colors.card
      if (customization.colors.muted !== undefined) updateData.color_muted = customization.colors.muted
      if (customization.colors.border !== undefined) updateData.color_border = customization.colors.border
    }

    // Theme
    if (customization.theme) {
      if (customization.theme.mode !== undefined) updateData.theme_mode = customization.theme.mode
      if (customization.theme.layoutType !== undefined) updateData.layout_type = customization.theme.layoutType
      if (customization.theme.borderRadius !== undefined) updateData.border_radius = customization.theme.borderRadius
      if (customization.theme.cardsShadow !== undefined) updateData.cards_shadow = customization.theme.cardsShadow
      if (customization.theme.bannerHeight !== undefined) updateData.banner_height = customization.theme.bannerHeight
    }

    // Elements
    if (customization.elements) {
      if (customization.elements.showBestsellerBadge !== undefined) updateData.show_bestseller_badge = customization.elements.showBestsellerBadge
      if (customization.elements.showPromoBadge !== undefined) updateData.show_promo_badge = customization.elements.showPromoBadge
      if (customization.elements.showNewBadge !== undefined) updateData.show_new_badge = customization.elements.showNewBadge
      if (customization.elements.showReviews !== undefined) updateData.show_reviews = customization.elements.showReviews
      if (customization.elements.showCategories !== undefined) updateData.show_categories = customization.elements.showCategories
      if (customization.elements.showDescriptions !== undefined) updateData.show_descriptions = customization.elements.showDescriptions
      if (customization.elements.showPromoBanner !== undefined) updateData.show_promo_banner = customization.elements.showPromoBanner
      if (customization.elements.showBestsellersSection !== undefined) updateData.show_bestsellers_section = customization.elements.showBestsellersSection
      if (customization.elements.showFeaturedSection !== undefined) updateData.show_featured_section = customization.elements.showFeaturedSection
      if (customization.elements.promoMessage !== undefined) updateData.promo_message = customization.elements.promoMessage
    }

    // Social
    if (customization.social) {
      if (customization.social.facebook !== undefined) updateData.facebook = customization.social.facebook
      if (customization.social.tiktok !== undefined) updateData.tiktok = customization.social.tiktok
      if (customization.social.deliveryPolicy !== undefined) updateData.delivery_policy = customization.social.deliveryPolicy
      if (customization.social.footerText !== undefined) updateData.footer_text = customization.social.footerText
    }

    // Gateways
    if (customization.gateways) {
      if (customization.gateways.mercadopagoEnabled !== undefined) updateData.gateway_mercadopago_enabled = customization.gateways.mercadopagoEnabled
      if (customization.gateways.pagbankEnabled !== undefined) updateData.gateway_pagbank_enabled = customization.gateways.pagbankEnabled
      if (customization.gateways.stripeEnabled !== undefined) updateData.gateway_stripe_enabled = customization.gateways.stripeEnabled
    }

    // Hero Banner
    if (customization.hero) {
      if (customization.hero.title !== undefined) updateData.hero_title = customization.hero.title
      if (customization.hero.subtitle !== undefined) updateData.hero_subtitle = customization.hero.subtitle
      if (customization.hero.badge1) {
        if (customization.hero.badge1.text !== undefined) updateData.hero_badge_1_text = customization.hero.badge1.text
        if (customization.hero.badge1.icon !== undefined) updateData.hero_badge_1_icon = customization.hero.badge1.icon
        if (customization.hero.badge1.enabled !== undefined) updateData.hero_badge_1_enabled = customization.hero.badge1.enabled
      }
      if (customization.hero.badge2) {
        if (customization.hero.badge2.text !== undefined) updateData.hero_badge_2_text = customization.hero.badge2.text
        if (customization.hero.badge2.icon !== undefined) updateData.hero_badge_2_icon = customization.hero.badge2.icon
        if (customization.hero.badge2.enabled !== undefined) updateData.hero_badge_2_enabled = customization.hero.badge2.enabled
      }
      if (customization.hero.badge3) {
        if (customization.hero.badge3.text !== undefined) updateData.hero_badge_3_text = customization.hero.badge3.text
        if (customization.hero.badge3.icon !== undefined) updateData.hero_badge_3_icon = customization.hero.badge3.icon
        if (customization.hero.badge3.enabled !== undefined) updateData.hero_badge_3_enabled = customization.hero.badge3.enabled
      }
    }

    // Atualizar apenas se houver dados
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, message: "Nenhuma alteracao" })
    }

    updateData.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from("store_settings")
      .update(updateData)
      .eq("id", "main")

    if (error) {
      console.error("Erro ao salvar customizacao:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Erro ao salvar customizacao:", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
