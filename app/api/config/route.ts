import { NextResponse } from "next/server"
import { type SiteConfig, defaultConfig } from "@/lib/config-types"
import { createClient } from "@supabase/supabase-js"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "PK1040CAH"
const LOCAL_CONFIG_KEY = "pk-site-config"

// Evitar cache
export const dynamic = "force-dynamic"
export const revalidate = 0

// Headers para evitar cache
const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
}

// Criar cliente Supabase (server-side)
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    return null
  }
  
  return createClient(url, key)
}

export async function GET(request: Request) {
  try {
    // Verificar senha para acesso admin (opcional)
    const url = new URL(request.url)
    const isAdmin = url.searchParams.get("admin") === "true"
    const password = url.searchParams.get("password")

    if (isAdmin && password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Tentar carregar config do Supabase
    const supabase = getSupabaseClient()
    
    if (supabase) {
      try {
        // Buscar admin_settings (configuracoes da loja)
        const { data, error } = await supabase
          .from('admin_settings')
          .select('*')
          .eq('id', 'main')
          .single()
        
        // Buscar store_settings (personalizacao)
        const { data: storeData, error: storeError } = await supabase
          .from('store_settings')
          .select('*')
          .eq('id', 'main')
          .single()
        
        if (!error && data) {
          // Mesclar dados do Supabase com defaultConfig
          const config: SiteConfig = {
            ...defaultConfig,
            storeName: data.store_name || defaultConfig.storeName,
            storeHours: {
              ...defaultConfig.storeHours,
              isOpen: data.store_open,
              manualControl: data.manual_control,
              openTime: data.opening_time || defaultConfig.storeHours.openTime,
              closeTime: data.closing_time || defaultConfig.storeHours.closeTime,
              closedMessage: data.closed_message || defaultConfig.storeHours.closedMessage,
            },
            delivery: {
              ...defaultConfig.delivery,
              defaultFee: data.delivery_fee || defaultConfig.delivery.defaultFee,
              minimumOrder: data.minimum_order || defaultConfig.delivery.minimumOrder,
            },
            whatsapp: {
              ...defaultConfig.whatsapp,
              number: data.whatsapp_number || defaultConfig.whatsapp.number,
            },
            pixManual: {
              ...defaultConfig.pixManual,
              keyType: data.pix_key_type || defaultConfig.pixManual.keyType || 'telefone',
              key: data.pix_key || defaultConfig.pixManual.key,
              keyFull: data.pix_key || defaultConfig.pixManual.keyFull,
              receiverName: data.pix_receiver_name || defaultConfig.pixManual.receiverName,
              city: data.pix_city || defaultConfig.pixManual.city || 'SAO PAULO',
            },
            // Adicionar customization de store_settings
            customization: storeData && !storeError ? {
              ...defaultConfig.customization,
              // Identidade
              identity: {
                ...defaultConfig.customization?.identity,
                storeName: storeData.store_name || defaultConfig.customization?.identity?.storeName || '',
                subtitle: storeData.subtitle || '',
                slogan: storeData.slogan || '',
                logoUrl: storeData.logo_url || storeData.store_logo || '',
                faviconUrl: storeData.favicon_url || '',
                coverImageUrl: storeData.cover_image_url || storeData.store_cover || '',
              },
              // Cores
              colors: {
                ...defaultConfig.customization?.colors,
                primary: storeData.color_primary || storeData.primary_color || '#7C3AED',
                secondary: storeData.color_secondary || storeData.secondary_color || '#A855F7',
                accent: storeData.color_accent || storeData.accent_color || '#F59E0B',
                background: storeData.color_background || storeData.background_color || '#FFFFFF',
                foreground: storeData.color_foreground || storeData.text_color || '#1F2937',
                card: storeData.color_card || '#FFFFFF',
                muted: storeData.color_muted || '#6B7280',
                border: storeData.color_border || '#E5E7EB',
              },
              // Hero
              hero: {
                ...defaultConfig.customization?.hero,
                title: storeData.hero_title || '',
                subtitle: storeData.hero_subtitle || '',
                badge1: {
                  text: storeData.hero_badge_1_text || '30-45 min',
                  icon: storeData.hero_badge_1_icon || 'clock',
                  enabled: storeData.hero_badge_1_enabled !== false,
                },
                badge2: {
                  text: storeData.hero_badge_2_text || 'Geladinho',
                  icon: storeData.hero_badge_2_icon || 'snowflake',
                  enabled: storeData.hero_badge_2_enabled !== false,
                },
                badge3: {
                  text: storeData.hero_badge_3_text || 'Premium',
                  icon: storeData.hero_badge_3_icon || 'award',
                  enabled: storeData.hero_badge_3_enabled !== false,
                },
              },
              // Elementos (toggles da UI)
              elements: {
                ...defaultConfig.customization?.elements,
                showPromoBanner: storeData.show_promo_banner === true,
                promoMessage: storeData.promo_message || '',
                showBestsellersSection: storeData.show_bestsellers_section !== false,
                showFeaturedSection: storeData.show_featured_section !== false,
                showCategories: storeData.show_categories !== false,
                showReviews: storeData.show_reviews !== false,
                showDescriptions: storeData.show_descriptions !== false,
                showBestsellerBadge: storeData.show_bestseller_badge !== false,
                showPromoBadge: storeData.show_promo_badge !== false,
                showNewBadge: storeData.show_new_badge !== false,
              },
              // Social
              social: {
                ...defaultConfig.customization?.social,
                instagram: storeData.instagram || '',
                facebook: storeData.facebook || '',
                tiktok: storeData.tiktok || '',
                whatsapp: storeData.whatsapp || '',
                address: storeData.address || storeData.store_address || '',
                footerText: storeData.footer_text || '',
                deliveryPolicy: storeData.delivery_policy || '',
              },
              // Theme (layout settings)
              theme: {
                ...defaultConfig.customization?.theme,
                mode: (storeData.theme_mode === 'dark' ? 'dark' : storeData.theme_mode === 'auto' ? 'auto' : 'light') as 'light' | 'dark' | 'auto',
                layoutType: (storeData.layout_type === 'classic' ? 'classic' : storeData.layout_type === 'minimal' ? 'minimal' : storeData.layout_type === 'premium' ? 'premium' : 'modern') as 'classic' | 'modern' | 'premium' | 'minimal',
                borderRadius: typeof storeData.border_radius === 'number' ? storeData.border_radius : 12,
                cardsShadow: storeData.cards_shadow !== false,
                bannerHeight: (storeData.banner_height === 'small' ? 'small' : storeData.banner_height === 'large' ? 'large' : 'medium') as 'small' | 'medium' | 'large',
              },
              // Gateways de pagamento
              gateways: {
                mercadopagoEnabled: storeData.gateway_mercadopago_enabled === true,
                pagbankEnabled: storeData.gateway_pagbank_enabled === true,
                stripeEnabled: storeData.gateway_stripe_enabled === true,
              },
            } : defaultConfig.customization,
          }
          
          return NextResponse.json({ success: true, config, source: 'supabase' }, { headers: noCacheHeaders })
        }
      } catch (e) {
        console.warn("[Config GET] Erro ao buscar do Supabase:", e)
      }
    }

    // Usar defaultConfig se Supabase falhar ou nao houver dados
    return NextResponse.json({ success: true, config: defaultConfig, source: 'default' }, { headers: noCacheHeaders })
  } catch (error) {
    console.error("[Config GET] Erro geral:", error)
    return NextResponse.json({ success: true, config: defaultConfig, source: 'default' }, { headers: noCacheHeaders })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { password, config } = body

    // Verificar senha
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 })
    }

    // Validar config
    if (!config) {
      return NextResponse.json({ error: "Config vazia" }, { status: 400 })
    }

    // Tentar salvar no Supabase
    const supabase = getSupabaseClient()
    
    if (supabase) {
      try {
        const updateData = {
          id: 'main',
          store_name: config.storeName,
          store_open: config.storeHours?.isOpen ?? true,
          manual_control: config.storeHours?.manualControl ?? false,
          opening_time: config.storeHours?.openTime || '14:00',
          closing_time: config.storeHours?.closeTime || '22:00',
          closed_message: config.storeHours?.closedMessage || 'Estamos fechados no momento',
          delivery_fee: config.delivery?.defaultFee || 5,
          minimum_order: config.delivery?.minimumOrder || 15,
          whatsapp_number: config.whatsapp?.number || '',
          pix_key: config.pixManual?.key || '',
          updated_at: new Date().toISOString(),
        }

        const { error } = await supabase
          .from('admin_settings')
          .upsert(updateData, { onConflict: 'id' })

        if (!error) {
          return NextResponse.json({ 
            success: true, 
            config,
            savedTo: 'supabase'
          })
        } else {
          console.warn("[Config POST] Erro Supabase:", error.message)
        }
      } catch (e) {
        console.warn("[Config POST] Excecao Supabase:", e)
      }
    }

    // Se chegou aqui, Supabase falhou - retornar sucesso mesmo assim
    // O frontend ja salvou em localStorage
    return NextResponse.json({ 
      success: true, 
      config,
      savedTo: 'local',
      warning: "Supabase indisponivel, config salva apenas localmente"
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[Config POST] ERRO:", errorMessage)
    // Mesmo com erro, retornar sucesso - frontend ja salvou localmente
    return NextResponse.json({ 
      success: true,
      savedTo: 'local',
      warning: errorMessage
    })
  }
}
