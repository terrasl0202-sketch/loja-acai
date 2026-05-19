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
  category: string;
}

const products: Product[] = [
  { id: "acai-tradicional", name: "Açaí Tradicional", price: 15, category: "Açaí" },
  { id: "acai-ovomaltine", name: "Açaí Ovomaltine", price: 15, category: "Açaí" },
  { id: "mousse-maracuja", name: "Mousse Maracujá", price: 6, category: "Mousse" },
  { id: "mousse-morango", name: "Mousse Morango", price: 6, category: "Mousse" },
];

const deliveryOptions = [
  { id: "barnabés", name: "Entrega Barnabés", price: 10 },
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
  const [delivery, setDelivery] = useState<string>("barnabés");
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

  const copyPixKey = () => {
    navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <main className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-4">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-2xl font-bold text-primary">P.K Gostosuras</h1>
          <p className="text-sm text-muted-foreground">Paulo e Karina • Delivery no Barnabés</p>
        </div>
      </header>

      {/* Products */}
      <section className="max-w-lg mx-auto px-4 py-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Cardápio</h2>
        <div className="space-y-3">
          {products.map((product) => {
            const quantity = getQuantity(product.id);
            return (
              <div
                key={product.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-medium text-foreground">{product.name}</h3>
                  <p className="text-primary font-semibold">R$ {product.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {quantity > 0 && (
                    <>
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-border transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center font-semibold text-foreground">{quantity}</span>
                    </>
                  )}
                  <button
                    onClick={() => addToCart(product)}
                    className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-accent transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cart Bar */}
      {totalItems > 0 && !showCheckout && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full bg-primary hover:bg-accent text-primary-foreground font-semibold py-4 rounded-xl flex items-center justify-center gap-3 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Ver Carrinho</span>
              <span className="bg-accent px-3 py-1 rounded-full text-sm">
                {totalItems} {totalItems === 1 ? "item" : "itens"} • R$ {subtotal.toFixed(2)}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
          <div className="max-w-lg mx-auto px-4 py-6 pb-32">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Finalizar Pedido</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="bg-card border border-border rounded-xl p-4 mb-4">
              <h3 className="font-semibold mb-3 text-foreground">Seu Pedido</h3>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">R$ {item.price.toFixed(2)} cada</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-border transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-semibold text-foreground">{item.quantity}</span>
                      <button
                        onClick={() => addToCart(products.find((p) => p.id === item.id)!)}
                        className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-accent transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="w-20 text-right font-semibold text-primary">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Coupon */}
            <div className="bg-card border border-border rounded-xl p-4 mb-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                <Ticket className="w-4 h-4 text-primary" />
                Cupom de Desconto
              </h3>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-success/20 border border-success/30 rounded-lg p-3">
                  <div>
                    <p className="font-semibold text-success">{appliedCoupon}</p>
                    <p className="text-sm text-muted-foreground">
                      {coupons[appliedCoupon].type === "fixed"
                        ? `R$${coupons[appliedCoupon].discount} de desconto`
                        : "Frete grátis"}
                    </p>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
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
                    className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={applyCoupon}
                    className="bg-primary hover:bg-accent text-primary-foreground px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              )}
              {couponError && <p className="text-red-400 text-sm mt-2">{couponError}</p>}
            </div>

            {/* Delivery */}
            <div className="bg-card border border-border rounded-xl p-4 mb-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                Entrega
              </h3>
              <div className="space-y-2">
                {deliveryOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setDelivery(option.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      delivery === option.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary hover:border-muted-foreground"
                    }`}
                  >
                    <span className="font-medium text-foreground">{option.name}</span>
                    <span className={delivery === option.id ? "text-primary font-semibold" : "text-muted-foreground"}>
                      {option.price === 0 ? "Grátis" : `R$ ${option.price.toFixed(2)}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment */}
            <div className="bg-card border border-border rounded-xl p-4 mb-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                <CreditCard className="w-4 h-4 text-primary" />
                Pagamento
              </h3>
              <div className="space-y-2">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setPayment(method.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        payment === method.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary hover:border-muted-foreground"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${payment === method.id ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="font-medium text-foreground">{method.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Pix Details */}
              {payment === "pix" && (
                <div className="mt-4 p-4 bg-secondary rounded-xl border border-border">
                  <div className="text-center mb-4">
                    <div className="w-40 h-40 mx-auto bg-white rounded-xl p-2 mb-3">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=00020126580014br.gov.bcb.pix0136${PIX_KEY}5204000053039865802BR5913${encodeURIComponent(PIX_NAME)}6008SAOPAULO62070503***6304`}
                        alt="QR Code Pix"
                        className="w-full h-full"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Chave Pix (Telefone)</p>
                    <p className="font-mono font-semibold text-foreground text-lg">{PIX_KEY}</p>
                    <p className="text-sm text-muted-foreground mt-1">Nome: {PIX_NAME}</p>
                  </div>
                  <button
                    onClick={copyPixKey}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
                      copied
                        ? "bg-success text-success-foreground"
                        : "bg-primary hover:bg-accent text-primary-foreground"
                    }`}
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
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    Após pagar, envie o comprovante pelo WhatsApp
                  </p>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="bg-card border border-border rounded-xl p-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Desconto ({appliedCoupon})</span>
                    <span>-R$ {discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Entrega</span>
                  <span className={appliedCoupon === "FRETEGRATIS" && subtotal >= 40 ? "text-success" : ""}>
                    {deliveryPrice === 0 ? "Grátis" : `R$ ${deliveryPrice.toFixed(2)}`}
                  </span>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold text-foreground">
                    <span>Total</span>
                    <span className="text-primary">R$ {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp Button */}
            <button
              onClick={sendToWhatsApp}
              disabled={cart.length === 0 || !payment}
              className="w-full bg-[#25D366] hover:bg-[#20BD5A] disabled:bg-muted disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-3 transition-colors"
            >
              <Send className="w-5 h-5" />
              Enviar Pedido no WhatsApp
            </button>
            {!payment && cart.length > 0 && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                Selecione a forma de pagamento para continuar
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
