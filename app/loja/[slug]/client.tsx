"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ShoppingCart, Plus, Minus, X, Clock, MapPin, Phone, ChevronLeft, ChevronRight } from "lucide-react"

interface StoreData {
  store: {
    id: number
    slug: string
    store_name: string
    logo_url: string | null
  }
  settings: {
    store_name: string
    store_description: string | null
    primary_color: string
    secondary_color: string
    store_open: boolean
    opening_hours: string | null
    store_phone: string | null
    store_address: string | null
    delivery_fee: number
    min_order_value: number
  } | null
  categories: Array<{
    id: number
    name: string
    description: string | null
    image_url: string | null
  }>
  products: Array<{
    id: number
    name: string
    description: string | null
    price: number
    image_url: string | null
    category_id: number
    in_stock: boolean
  }>
  banners: Array<{
    id: number
    title: string | null
    image_url: string
    link_url: string | null
  }>
}

interface CartItem {
  product: StoreData["products"][0]
  quantity: number
}

export default function StorePageClient({ data }: { data: StoreData }) {
  const { store, settings, categories, products, banners } = data
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [currentBanner, setCurrentBanner] = useState(0)

  const primaryColor = settings?.primary_color || "#8B5CF6"

  // Carrousel de banners
  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % banners.length)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [banners.length])

  const addToCart = (product: StoreData["products"][0]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === productId)
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        )
      }
      return prev.filter((item) => item.product.id !== productId)
    })
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {store.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt={store.store_name}
                  width={48}
                  height={48}
                  className="rounded-xl"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {store.store_name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="font-bold text-foreground">{settings?.store_name || store.store_name}</h1>
                {settings?.store_open ? (
                  <span className="text-xs text-green-500 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Aberto
                  </span>
                ) : (
                  <span className="text-xs text-red-500">Fechado</span>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowCart(true)}
              className="relative p-3 rounded-xl"
              style={{ backgroundColor: primaryColor + "20" }}
            >
              <ShoppingCart className="w-6 h-6" style={{ color: primaryColor }} />
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs text-white flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Banners */}
      {banners.length > 0 && (
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500"
            style={{ transform: `translateX(-${currentBanner * 100}%)` }}
          >
            {banners.map((banner) => (
              <div key={banner.id} className="w-full flex-shrink-0">
                <Image
                  src={banner.image_url}
                  alt={banner.title || "Banner"}
                  width={800}
                  height={300}
                  className="w-full h-40 md:h-56 object-cover"
                />
              </div>
            ))}
          </div>
          {banners.length > 1 && (
            <>
              <button
                onClick={() => setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentBanner((prev) => (prev + 1) % banners.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Info */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {settings?.opening_hours && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {settings.opening_hours}
            </span>
          )}
          {settings?.store_address && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {settings.store_address}
            </span>
          )}
          {settings?.store_phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              {settings.store_phone}
            </span>
          )}
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === null ? "text-white" : "bg-muted text-foreground"
              }`}
              style={selectedCategory === null ? { backgroundColor: primaryColor } : {}}
            >
              Todos
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id ? "text-white" : "bg-muted text-foreground"
                }`}
                style={selectedCategory === category.id ? { backgroundColor: primaryColor } : {}}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="max-w-4xl mx-auto px-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum produto disponivel</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map((product) => {
              const cartItem = cart.find((item) => item.product.id === product.id)
              return (
                <div
                  key={product.id}
                  className="bg-card rounded-xl border border-border p-4 flex gap-4"
                >
                  {product.image_url && (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      width={100}
                      height={100}
                      className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                    )}
                    <p className="font-bold mt-2" style={{ color: primaryColor }}>
                      {formatCurrency(product.price)}
                    </p>
                    
                    {product.in_stock ? (
                      cartItem ? (
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: primaryColor + "20", color: primaryColor }}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-medium text-foreground">{cartItem.quantity}</span>
                          <button
                            onClick={() => addToCart(product)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="mt-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Adicionar
                        </button>
                      )
                    ) : (
                      <span className="text-sm text-red-500 mt-2 block">Indisponivel</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cart Footer */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setShowCart(true)}
              className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-between px-4"
              style={{ backgroundColor: primaryColor }}
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                {cartCount} {cartCount === 1 ? "item" : "itens"}
              </span>
              <span>{formatCurrency(cartTotal)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-card w-full md:w-96 md:rounded-xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">Seu Carrinho</h2>
              <button onClick={() => setShowCart(false)} className="p-2 rounded-lg hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Carrinho vazio</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3">
                      {item.product.image_url && (
                        <Image
                          src={item.product.image_url}
                          alt={item.product.name}
                          width={60}
                          height={60}
                          className="w-14 h-14 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                        <p className="text-sm" style={{ color: primaryColor }}>
                          {formatCurrency(item.product.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: primaryColor + "20", color: primaryColor }}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium text-foreground w-5 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => addToCart(item.product)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-border space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">{formatCurrency(cartTotal)}</span>
                  </div>
                  {settings?.delivery_fee && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxa de entrega</span>
                      <span className="text-foreground">{formatCurrency(settings.delivery_fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span className="text-foreground">Total</span>
                    <span style={{ color: primaryColor }}>
                      {formatCurrency(cartTotal + (settings?.delivery_fee || 0))}
                    </span>
                  </div>
                  <button
                    className="w-full py-3 rounded-xl text-white font-medium"
                    style={{ backgroundColor: primaryColor }}
                    onClick={() => {
                      // TODO: Implementar checkout com store_id
                      alert("Checkout sera implementado na proxima fase")
                    }}
                  >
                    Finalizar Pedido
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
