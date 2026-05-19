"use client";

import { useState, useMemo } from "react";
import { Minus, Plus, ShoppingCart, MapPin, CreditCard, Banknote, QrCode, Copy, Check, X, Send, Ticket } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

const products: Product[] = [
  { id: "acai-tradicional", name: "Açaí Tradicional", price: 15 },
  { id: "acai-ovomaltine", name: "Açaí Ovomaltine", price: 15 },
  { id: "mousse-maracuja", name: "Mousse Maracujá", price: 6 },
  { id: "mousse-morango", name: "Mousse Morango", price: 6 },
];

const deliveryOptions = [
  { id: "barnabes", name: "Entrega Barnabés", price: 10 },
  { id: "retirada", name: "Retirada no local", price: 0 },
];

const paymentMethods = [
  { id: "pix", name: "Pix", icon: QrCode },
  { id: "dinheiro", name: "Dinheiro", icon: Banknote },
  { id: "cartao", name: "Cartão", icon: CreditCard },
];

const coupons: Record<string, { discount: number; minValue: number; type: "fixed" | "freeShipping" }> = {
  "PK5": { discount: 5, minValue: 20, type: "fixed" },
  "FRETEGRATIS": { discount: 0, minValue: 40, type: "freeShipping" },
};

const PIX_KEY = "11918505799";
const PIX_NAME = "Carina Silva";
const WHATSAPP_NUMBER = "5511918505799";

export default function Home() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [delivery, setDelivery] = useState<string>("barnabes");
  const [payment, setPayment] = useState<string>("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter((item) => item.id !== productId);
    });
  };

  const getQuantity = (productId: string) => {
    return cart.find((item) => item.id === productId)?.quantity || 0;
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const deliveryPrice = useMemo(() => {
    const selectedDelivery = deliveryOptions.find((d) => d.id === delivery);
    if (appliedCoupon === "FRETEGRATIS" && subtotal >= 40) {
      return 0;
    }
    return selectedDelivery?.price || 0;
  }, [delivery, appliedCoupon, subtotal]);

  const discount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const coupon = coupons[appliedCoupon];
    if (coupon?.type === "fixed" && subtotal >= coupon.minValue) {
      return coupon.discount;
    }
    return 0;
  }, [appliedCoupon, subtotal]);

  const total = useMemo(() => {
    return subtotal + deliveryPrice - discount;
  }, [subtotal, deliveryPrice, discount]);

  const totalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const applyCoupon = () => {
    const code = couponCode.toUpperCase().trim();
    setCouponError("");
    
    if (!coupons[code]) {
      setCouponError("Cupom inválido");
      return;
    }

    const coupon = coupons[code];
    if (coupon.type === "fixed" && subtotal < coupon.minValue) {
      setCouponError(`Pedido mínimo de R$${coupon.minValue} para este cupom`);
      return;
    }
    if (coupon.type === "freeShipping" && subtotal < coupon.minValue) {
      setCouponError(`Pedido mínimo de R$${coupon.minValue} para frete grátis`);
      return;
    }

    setAppliedCoupon(code);
    setCouponCode("");
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const copyPixKey = async () => {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = PIX_KEY;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sendToWhatsApp = () => {
    const deliveryOption = deliveryOptions.find((d) => d.id === delivery);
    const paymentMethod = paymentMethods.find((p) => p.id === payment);
    
    let message = `*Pedido P.K Gostosuras*\n\n`;
    message += `*Itens:*\n`;
    cart.forEach((item) => {
      message += `${item.quantity}x ${item.name} - R$${(item.price * item.quantity).toFixed(2)}\n`;
    });
    message += `\n*Subtotal:* R$${subtotal.toFixed(2)}`;
    
    if (appliedCoupon) {
      if (coupons[appliedCoupon].type === "fixed") {
        message += `\n*Cupom ${appliedCoupon}:* -R$${discount.toFixed(2)}`;
      } else {
        message += `\n*Cupom ${appliedCoupon}:* Frete Grátis`;
      }
    }
    
    message += `\n*${deliveryOption?.name}:* ${deliveryPrice === 0 ? "Grátis" : `R$${deliveryPrice.toFixed(2)}`}`;
    message += `\n\n*Total: R$${total.toFixed(2)}*`;
    message += `\n\n*Pagamento:* ${paymentMethod?.name}`;
    
    if (payment === "pix") {
      message += `\n\nPagamento via Pix. Já fiz o Pix e vou enviar o comprovante.`;
    }
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, "_blank");
  };

  return (
    <main className="min-h-screen pb-28">
      {/* Header */}
      <header 
        className="sticky top-0 z-40 px-4 py-4 text-center"
        style={{ backgroundColor: "#1a0a2e", borderBottom: "1px solid #3b1f6b" }}
      >
        <h1 className="text-2xl font-bold" style={{ color: "#a855f7" }}>P.K Gostosuras</h1>
        <p className="text-sm" style={{ color: "#a78bfa" }}>Paulo e Karina • Delivery no Barnabés</p>
      </header>

      {/* Products */}
      <section className="max-w-lg mx-auto px-4 py-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "#f5f5f5" }}>Cardápio</h2>
        <div className="space-y-3">
          {products.map((product) => {
            const quantity = getQuantity(product.id);
            return (
              <div
                key={product.id}
                className="rounded-xl p-4 flex items-center justify-between"
                style={{ backgroundColor: "#1a0a2e", border: "1px solid #3b1f6b" }}
              >
                <div>
                  <h3 className="font-medium" style={{ color: "#f5f5f5" }}>{product.name}</h3>
                  <p className="font-semibold" style={{ color: "#a855f7" }}>R$ {product.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {quantity > 0 && (
                    <>
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                        style={{ backgroundColor: "#2d1b4e", color: "#f5f5f5" }}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center font-bold text-lg" style={{ color: "#f5f5f5" }}>{quantity}</span>
                    </>
                  )}
                  <button
                    onClick={() => addToCart(product)}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "#8b5cf6", color: "#ffffff" }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Fixed Cart Bar */}
      {totalItems > 0 && !showCheckout && (
        <div 
          className="fixed bottom-0 left-0 right-0 p-4 z-50"
          style={{ backgroundColor: "#1a0a2e", borderTop: "1px solid #3b1f6b" }}
        >
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full max-w-lg mx-auto font-semibold py-4 rounded-xl flex items-center justify-center gap-3 transition-colors"
            style={{ backgroundColor: "#8b5cf6", color: "#ffffff", display: "flex" }}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Ver Carrinho</span>
            <span 
              className="px-3 py-1 rounded-full text-sm font-bold"
              style={{ backgroundColor: "#a855f7" }}
            >
              {totalItems} {totalItems === 1 ? "item" : "itens"} • R$ {subtotal.toFixed(2)}
            </span>
          </button>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ backgroundColor: "#0d0517" }}
        >
          <div className="max-w-lg mx-auto px-4 py-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: "#f5f5f5" }}>Finalizar Pedido</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: "#1a0a2e", color: "#f5f5f5" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div 
              className="rounded-xl p-4 mb-4"
              style={{ backgroundColor: "#1a0a2e", border: "1px solid #3b1f6b" }}
            >
              <h3 className="font-semibold mb-3" style={{ color: "#f5f5f5" }}>Seu Pedido</h3>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" style={{ color: "#f5f5f5" }}>{item.name}</p>
                      <p className="text-sm" style={{ color: "#a78bfa" }}>R$ {item.price.toFixed(2)} cada</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#2d1b4e", color: "#f5f5f5" }}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold" style={{ color: "#f5f5f5" }}>{item.quantity}</span>
                      <button
                        onClick={() => addToCart(products.find((p) => p.id === item.id)!)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#8b5cf6", color: "#ffffff" }}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="w-20 text-right font-semibold" style={{ color: "#a855f7" }}>
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Coupon */}
            <div 
              className="rounded-xl p-4 mb-4"
              style={{ backgroundColor: "#1a0a2e", border: "1px solid #3b1f6b" }}
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "#f5f5f5" }}>
                <Ticket className="w-4 h-4" style={{ color: "#a855f7" }} />
                Cupom de Desconto
              </h3>
              {appliedCoupon ? (
                <div 
                  className="flex items-center justify-between rounded-lg p-3"
                  style={{ backgroundColor: "rgba(34, 197, 94, 0.2)", border: "1px solid rgba(34, 197, 94, 0.3)" }}
                >
                  <div>
                    <p className="font-semibold" style={{ color: "#22c55e" }}>{appliedCoupon}</p>
                    <p className="text-sm" style={{ color: "#a78bfa" }}>
                      {coupons[appliedCoupon].type === "fixed"
                        ? `R$${coupons[appliedCoupon].discount} de desconto`
                        : "Frete grátis"}
                    </p>
                  </div>
                  <button onClick={removeCoupon} style={{ color: "#a78bfa" }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Digite o cupom"
                    className="flex-1 rounded-lg px-4 py-2 focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: "#2d1b4e", 
                      border: "1px solid #3b1f6b", 
                      color: "#f5f5f5",
                      focusRingColor: "#8b5cf6"
                    }}
                  />
                  <button
                    onClick={applyCoupon}
                    className="px-4 py-2 rounded-lg font-semibold transition-colors"
                    style={{ backgroundColor: "#8b5cf6", color: "#ffffff" }}
                  >
                    Aplicar
                  </button>
                </div>
              )}
              {couponError && <p className="text-sm mt-2" style={{ color: "#ef4444" }}>{couponError}</p>}
            </div>

            {/* Delivery */}
            <div 
              className="rounded-xl p-4 mb-4"
              style={{ backgroundColor: "#1a0a2e", border: "1px solid #3b1f6b" }}
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "#f5f5f5" }}>
                <MapPin className="w-4 h-4" style={{ color: "#a855f7" }} />
                Entrega
              </h3>
              <div className="space-y-2">
                {deliveryOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setDelivery(option.id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg transition-colors"
                    style={{ 
                      backgroundColor: delivery === option.id ? "rgba(139, 92, 246, 0.1)" : "#2d1b4e",
                      border: delivery === option.id ? "2px solid #8b5cf6" : "1px solid #3b1f6b"
                    }}
                  >
                    <span className="font-medium" style={{ color: "#f5f5f5" }}>{option.name}</span>
                    <span style={{ color: delivery === option.id ? "#a855f7" : "#a78bfa", fontWeight: delivery === option.id ? "bold" : "normal" }}>
                      {option.price === 0 ? "Grátis" : `R$ ${option.price.toFixed(2)}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment */}
            <div 
              className="rounded-xl p-4 mb-4"
              style={{ backgroundColor: "#1a0a2e", border: "1px solid #3b1f6b" }}
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "#f5f5f5" }}>
                <CreditCard className="w-4 h-4" style={{ color: "#a855f7" }} />
                Pagamento
              </h3>
              <div className="space-y-2">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setPayment(method.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors"
                      style={{ 
                        backgroundColor: payment === method.id ? "rgba(139, 92, 246, 0.1)" : "#2d1b4e",
                        border: payment === method.id ? "2px solid #8b5cf6" : "1px solid #3b1f6b"
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: payment === method.id ? "#a855f7" : "#a78bfa" }} />
                      <span className="font-medium" style={{ color: "#f5f5f5" }}>{method.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Pix Details */}
              {payment === "pix" && (
                <div 
                  className="mt-4 p-4 rounded-xl"
                  style={{ backgroundColor: "#2d1b4e", border: "1px solid #3b1f6b" }}
                >
                  <div className="text-center mb-4">
                    <div 
                      className="w-44 h-44 mx-auto rounded-xl p-2 mb-3"
                      style={{ backgroundColor: "#ffffff" }}
                    >
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=00020126580014br.gov.bcb.pix0136${PIX_KEY}`}
                        alt="QR Code Pix"
                        className="w-full h-full"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <p className="text-sm mb-1" style={{ color: "#a78bfa" }}>Chave Pix (Telefone)</p>
                    <p className="font-mono font-bold text-xl" style={{ color: "#f5f5f5" }}>{PIX_KEY}</p>
                    <p className="text-sm mt-1" style={{ color: "#a78bfa" }}>Nome: {PIX_NAME}</p>
                  </div>
                  <button
                    onClick={copyPixKey}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors"
                    style={{ 
                      backgroundColor: copied ? "#22c55e" : "#8b5cf6", 
                      color: "#ffffff" 
                    }}
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5" />
                        Chave Copiada!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copiar Chave Pix
                      </>
                    )}
                  </button>
                  <p className="text-center text-sm mt-3" style={{ color: "#a78bfa" }}>
                    Após pagar, envie o comprovante pelo WhatsApp
                  </p>
                </div>
              )}
            </div>

            {/* Total */}
            <div 
              className="rounded-xl p-4 mb-4"
              style={{ backgroundColor: "#1a0a2e", border: "1px solid #3b1f6b" }}
            >
              <div className="space-y-2">
                <div className="flex justify-between" style={{ color: "#a78bfa" }}>
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between" style={{ color: "#22c55e" }}>
                    <span>Desconto ({appliedCoupon})</span>
                    <span>-R$ {discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between" style={{ color: "#a78bfa" }}>
                  <span>Entrega</span>
                  <span style={{ color: appliedCoupon === "FRETEGRATIS" && subtotal >= 40 ? "#22c55e" : "#a78bfa" }}>
                    {deliveryPrice === 0 ? "Grátis" : `R$ ${deliveryPrice.toFixed(2)}`}
                  </span>
                </div>
                <div className="pt-2 mt-2" style={{ borderTop: "1px solid #3b1f6b" }}>
                  <div className="flex justify-between text-xl font-bold">
                    <span style={{ color: "#f5f5f5" }}>Total</span>
                    <span style={{ color: "#a855f7" }}>R$ {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp Button */}
            <button
              onClick={sendToWhatsApp}
              disabled={cart.length === 0 || !payment}
              className="w-full font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: cart.length === 0 || !payment ? "#374151" : "#25D366", 
                color: "#ffffff" 
              }}
            >
              <Send className="w-5 h-5" />
              Enviar Pedido no WhatsApp
            </button>
            {!payment && cart.length > 0 && (
              <p className="text-center text-sm mt-2" style={{ color: "#a78bfa" }}>
                Selecione a forma de pagamento para continuar
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
