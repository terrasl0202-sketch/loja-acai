"use client";

import { useState, useMemo } from "react";
import { Minus, Plus, ShoppingCart, MapPin, CreditCard, Banknote, QrCode, Copy, Check, X, Send, Ticket, User, Home, MessageSquare } from "lucide-react";

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
  emoji: string;
}

const products: Product[] = [
  { id: "acai-tradicional", name: "Açaí Tradicional", price: 15, emoji: "🍇" },
  { id: "acai-ovomaltine", name: "Açaí Ovomaltine", price: 15, emoji: "🍫" },
  { id: "mousse-maracuja", name: "Mousse Maracujá", price: 6, emoji: "🥭" },
  { id: "mousse-morango", name: "Mousse Morango", price: 6, emoji: "🍓" },
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
const WHATSAPP_NUMBER = "5511966095057";

export default function LojaDelivery() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [delivery, setDelivery] = useState<string>("barnabes");
  const [payment, setPayment] = useState<string>("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerObs, setCustomerObs] = useState("");

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
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
    
    let message = `*🍇 Pedido P.K Gostosuras*\n\n`;
    message += `*👤 Cliente:* ${customerName || "Não informado"}\n`;
    if (delivery === "barnabes" && customerAddress) {
      message += `*📍 Endereço:* ${customerAddress}\n`;
    }
    if (customerObs) {
      message += `*📝 Observação:* ${customerObs}\n`;
    }
    message += `\n*🛒 Itens:*\n`;
    cart.forEach((item) => {
      message += `• ${item.quantity}x ${item.name} - R$${(item.price * item.quantity).toFixed(2)}\n`;
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
    message += `\n\n*💰 Total: R$${total.toFixed(2)}*`;
    message += `\n\n*💳 Pagamento:* ${paymentMethod?.name}`;
    
    if (payment === "pix") {
      message += `\n\n✅ Pagamento via Pix. Já fiz o Pix e vou enviar o comprovante.`;
    }
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, "_blank");
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(180deg, #0d0517 0%, #1a0a2e 50%, #0d0517 100%)",
      paddingBottom: totalItems > 0 ? "100px" : "20px"
    }}>
      {/* Header */}
      <header style={{ 
        background: "linear-gradient(135deg, #2d1b4e 0%, #1a0a2e 100%)",
        padding: "24px 16px",
        textAlign: "center",
        borderBottom: "2px solid #8b5cf6",
        boxShadow: "0 4px 20px rgba(139, 92, 246, 0.3)"
      }}>
        <h1 style={{ 
          fontSize: "32px", 
          fontWeight: "800", 
          color: "#a855f7",
          textShadow: "0 0 20px rgba(168, 85, 247, 0.5)",
          marginBottom: "4px"
        }}>
          P.K Gostosuras
        </h1>
        <p style={{ color: "#c4b5fd", fontSize: "14px" }}>
          Paulo e Karina • Delivery no Barnabés
        </p>
      </header>

      {/* Products Section */}
      <section style={{ padding: "20px 16px", maxWidth: "500px", margin: "0 auto" }}>
        <h2 style={{ 
          color: "#fff", 
          fontSize: "20px", 
          fontWeight: "700", 
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span style={{ fontSize: "24px" }}>🍨</span> Cardápio
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {products.map((product) => {
            const quantity = getQuantity(product.id);
            return (
              <div
                key={product.id}
                style={{
                  background: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 100%)",
                  borderRadius: "16px",
                  padding: "16px",
                  border: quantity > 0 ? "2px solid #8b5cf6" : "1px solid #3b1f6b",
                  boxShadow: quantity > 0 ? "0 0 15px rgba(139, 92, 246, 0.4)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "36px" }}>{product.emoji}</span>
                  <div>
                    <h3 style={{ color: "#fff", fontWeight: "600", fontSize: "16px" }}>
                      {product.name}
                    </h3>
                    <p style={{ 
                      color: "#a855f7", 
                      fontWeight: "700", 
                      fontSize: "18px",
                      textShadow: "0 0 10px rgba(168, 85, 247, 0.3)"
                    }}>
                      R$ {product.price.toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {quantity > 0 && (
                    <>
                      <button
                        onClick={() => removeFromCart(product.id)}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "#dc2626",
                          border: "none",
                          color: "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 0 10px rgba(220, 38, 38, 0.5)"
                        }}
                      >
                        <Minus size={18} />
                      </button>
                      <span style={{ 
                        color: "#fff", 
                        fontWeight: "800", 
                        fontSize: "20px",
                        minWidth: "30px",
                        textAlign: "center"
                      }}>
                        {quantity}
                      </span>
                    </>
                  )}
                  <button
                    onClick={() => addToCart(product)}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 15px rgba(139, 92, 246, 0.5)"
                    }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Fixed Cart Bar */}
      {totalItems > 0 && !showCheckout && (
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 100%)",
          borderTop: "2px solid #8b5cf6",
          padding: "16px",
          boxShadow: "0 -4px 20px rgba(139, 92, 246, 0.4)",
          zIndex: 50
        }}>
          <button
            onClick={() => setShowCheckout(true)}
            style={{
              width: "100%",
              maxWidth: "500px",
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
              border: "none",
              borderRadius: "16px",
              padding: "18px 24px",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(139, 92, 246, 0.5)"
            }}
          >
            <ShoppingCart size={24} color="#fff" />
            <span style={{ color: "#fff", fontWeight: "700", fontSize: "18px" }}>
              Ver Carrinho
            </span>
            <span style={{
              background: "#fff",
              color: "#7c3aed",
              padding: "6px 14px",
              borderRadius: "20px",
              fontWeight: "800",
              fontSize: "14px"
            }}>
              {totalItems} {totalItems === 1 ? "item" : "itens"} • R$ {subtotal.toFixed(2)}
            </span>
          </button>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(180deg, #0d0517 0%, #1a0a2e 50%, #0d0517 100%)",
          zIndex: 100,
          overflowY: "auto"
        }}>
          <div style={{ maxWidth: "500px", margin: "0 auto", padding: "16px", paddingBottom: "32px" }}>
            {/* Checkout Header */}
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between", 
              marginBottom: "20px",
              paddingBottom: "16px",
              borderBottom: "1px solid #3b1f6b"
            }}>
              <h2 style={{ color: "#fff", fontSize: "24px", fontWeight: "700" }}>
                Finalizar Pedido
              </h2>
              <button
                onClick={() => setShowCheckout(false)}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#2d1b4e",
                  border: "1px solid #3b1f6b",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Cart Items */}
            <div style={{
              background: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 100%)",
              borderRadius: "16px",
              padding: "16px",
              marginBottom: "16px",
              border: "1px solid #3b1f6b"
            }}>
              <h3 style={{ color: "#fff", fontWeight: "600", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <ShoppingCart size={18} color="#a855f7" /> Seu Pedido
              </h3>
              {cart.map((item) => (
                <div key={item.id} style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid #3b1f6b"
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: "#fff", fontWeight: "500" }}>{item.name}</p>
                    <p style={{ color: "#a78bfa", fontSize: "14px" }}>R$ {item.price.toFixed(2)} cada</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "#dc2626",
                        border: "none",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ color: "#fff", fontWeight: "700", minWidth: "24px", textAlign: "center" }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => addToCart(products.find((p) => p.id === item.id)!)}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "#8b5cf6",
                        border: "none",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <p style={{ color: "#a855f7", fontWeight: "700", marginLeft: "12px", minWidth: "70px", textAlign: "right" }}>
                    R$ {(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* Customer Info */}
            <div style={{
              background: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 100%)",
              borderRadius: "16px",
              padding: "16px",
              marginBottom: "16px",
              border: "1px solid #3b1f6b"
            }}>
              <h3 style={{ color: "#fff", fontWeight: "600", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <User size={18} color="#a855f7" /> Seus Dados
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ color: "#a78bfa", fontSize: "14px", marginBottom: "4px", display: "block" }}>
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Seu nome"
                    style={{
                      width: "100%",
                      background: "#0d0517",
                      border: "1px solid #3b1f6b",
                      borderRadius: "12px",
                      padding: "14px",
                      color: "#fff",
                      fontSize: "16px",
                      outline: "none"
                    }}
                  />
                </div>
                {delivery === "barnabes" && (
                  <div>
                    <label style={{ color: "#a78bfa", fontSize: "14px", marginBottom: "4px", display: "block" }}>
                      Endereço completo *
                    </label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Rua, número, complemento"
                      style={{
                        width: "100%",
                        background: "#0d0517",
                        border: "1px solid #3b1f6b",
                        borderRadius: "12px",
                        padding: "14px",
                        color: "#fff",
                        fontSize: "16px",
                        outline: "none"
                      }}
                    />
                  </div>
                )}
                <div>
                  <label style={{ color: "#a78bfa", fontSize: "14px", marginBottom: "4px", display: "block" }}>
                    Observação (opcional)
                  </label>
                  <textarea
                    value={customerObs}
                    onChange={(e) => setCustomerObs(e.target.value)}
                    placeholder="Ex: Sem granola, mais leite condensado..."
                    rows={2}
                    style={{
                      width: "100%",
                      background: "#0d0517",
                      border: "1px solid #3b1f6b",
                      borderRadius: "12px",
                      padding: "14px",
                      color: "#fff",
                      fontSize: "16px",
                      outline: "none",
                      resize: "none"
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Coupon */}
            <div style={{
              background: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 100%)",
              borderRadius: "16px",
              padding: "16px",
              marginBottom: "16px",
              border: "1px solid #3b1f6b"
            }}>
              <h3 style={{ color: "#fff", fontWeight: "600", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Ticket size={18} color="#a855f7" /> Cupom de Desconto
              </h3>
              {appliedCoupon ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(34, 197, 94, 0.2)",
                  border: "1px solid rgba(34, 197, 94, 0.5)",
                  borderRadius: "12px",
                  padding: "12px"
                }}>
                  <div>
                    <p style={{ color: "#22c55e", fontWeight: "700" }}>{appliedCoupon}</p>
                    <p style={{ color: "#a78bfa", fontSize: "14px" }}>
                      {coupons[appliedCoupon].type === "fixed"
                        ? `R$${coupons[appliedCoupon].discount} de desconto`
                        : "Frete grátis"}
                    </p>
                  </div>
                  <button
                    onClick={removeCoupon}
                    style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer" }}
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Digite o cupom"
                    style={{
                      flex: 1,
                      background: "#0d0517",
                      border: "1px solid #3b1f6b",
                      borderRadius: "12px",
                      padding: "14px",
                      color: "#fff",
                      fontSize: "16px",
                      outline: "none"
                    }}
                  />
                  <button
                    onClick={applyCoupon}
                    style={{
                      background: "#8b5cf6",
                      border: "none",
                      borderRadius: "12px",
                      padding: "14px 20px",
                      color: "#fff",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              )}
              {couponError && (
                <p style={{ color: "#ef4444", fontSize: "14px", marginTop: "8px" }}>{couponError}</p>
              )}
            </div>

            {/* Delivery */}
            <div style={{
              background: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 100%)",
              borderRadius: "16px",
              padding: "16px",
              marginBottom: "16px",
              border: "1px solid #3b1f6b"
            }}>
              <h3 style={{ color: "#fff", fontWeight: "600", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <MapPin size={18} color="#a855f7" /> Entrega
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {deliveryOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setDelivery(option.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: delivery === option.id ? "rgba(139, 92, 246, 0.2)" : "#0d0517",
                      border: delivery === option.id ? "2px solid #8b5cf6" : "1px solid #3b1f6b",
                      borderRadius: "12px",
                      padding: "16px",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <span style={{ color: "#fff", fontWeight: "500" }}>{option.name}</span>
                    <span style={{ 
                      color: delivery === option.id ? "#a855f7" : "#a78bfa", 
                      fontWeight: delivery === option.id ? "700" : "500" 
                    }}>
                      {option.price === 0 ? "Grátis" : `R$ ${option.price.toFixed(2)}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment */}
            <div style={{
              background: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 100%)",
              borderRadius: "16px",
              padding: "16px",
              marginBottom: "16px",
              border: "1px solid #3b1f6b"
            }}>
              <h3 style={{ color: "#fff", fontWeight: "600", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <CreditCard size={18} color="#a855f7" /> Forma de Pagamento
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setPayment(method.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: payment === method.id ? "rgba(139, 92, 246, 0.2)" : "#0d0517",
                        border: payment === method.id ? "2px solid #8b5cf6" : "1px solid #3b1f6b",
                        borderRadius: "12px",
                        padding: "16px",
                        cursor: "pointer"
                      }}
                    >
                      <Icon size={24} color={payment === method.id ? "#a855f7" : "#a78bfa"} />
                      <span style={{ color: "#fff", fontWeight: "500" }}>{method.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Pix Details */}
              {payment === "pix" && (
                <div style={{
                  marginTop: "16px",
                  background: "#0d0517",
                  borderRadius: "16px",
                  padding: "20px",
                  border: "2px solid #8b5cf6",
                  boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)"
                }}>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ color: "#a855f7", fontWeight: "700", fontSize: "18px", marginBottom: "16px" }}>
                      QR Code Pix
                    </p>
                    <div style={{
                      background: "#fff",
                      borderRadius: "16px",
                      padding: "16px",
                      display: "inline-block",
                      marginBottom: "16px"
                    }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=00020126580014br.gov.bcb.pix0136${PIX_KEY}`}
                        alt="QR Code Pix"
                        width={180}
                        height={180}
                        crossOrigin="anonymous"
                      />
                    </div>
                    <div style={{ marginBottom: "16px" }}>
                      <p style={{ color: "#a78bfa", fontSize: "14px" }}>Chave Pix (Telefone)</p>
                      <p style={{ 
                        color: "#fff", 
                        fontSize: "24px", 
                        fontWeight: "800",
                        fontFamily: "monospace",
                        textShadow: "0 0 10px rgba(168, 85, 247, 0.5)"
                      }}>
                        {PIX_KEY}
                      </p>
                      <p style={{ color: "#a78bfa", fontSize: "14px", marginTop: "4px" }}>
                        Nome: <strong style={{ color: "#fff" }}>{PIX_NAME}</strong>
                      </p>
                    </div>
                    <button
                      onClick={copyPixKey}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        background: copied ? "#22c55e" : "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                        border: "none",
                        borderRadius: "12px",
                        padding: "16px",
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "16px",
                        cursor: "pointer",
                        boxShadow: copied ? "0 0 15px rgba(34, 197, 94, 0.5)" : "0 0 15px rgba(139, 92, 246, 0.5)"
                      }}
                    >
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                      {copied ? "Chave Copiada!" : "Copiar Chave Pix"}
                    </button>
                    <p style={{ 
                      color: "#fbbf24", 
                      fontSize: "14px", 
                      marginTop: "16px",
                      padding: "12px",
                      background: "rgba(251, 191, 36, 0.1)",
                      borderRadius: "8px",
                      border: "1px solid rgba(251, 191, 36, 0.3)"
                    }}>
                      Após pagar, envie o comprovante pelo WhatsApp
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Total Summary */}
            <div style={{
              background: "linear-gradient(135deg, #2d1b4e 0%, #1a0a2e 100%)",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "16px",
              border: "2px solid #8b5cf6",
              boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#a78bfa" }}>Subtotal</span>
                <span style={{ color: "#fff" }}>R$ {subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "#22c55e" }}>Desconto ({appliedCoupon})</span>
                  <span style={{ color: "#22c55e" }}>-R$ {discount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ color: "#a78bfa" }}>Entrega</span>
                <span style={{ color: appliedCoupon === "FRETEGRATIS" && subtotal >= 40 ? "#22c55e" : "#fff" }}>
                  {deliveryPrice === 0 ? "Grátis" : `R$ ${deliveryPrice.toFixed(2)}`}
                </span>
              </div>
              <div style={{ 
                borderTop: "2px solid #8b5cf6", 
                paddingTop: "12px",
                display: "flex",
                justifyContent: "space-between"
              }}>
                <span style={{ color: "#fff", fontSize: "20px", fontWeight: "700" }}>Total</span>
                <span style={{ 
                  color: "#a855f7", 
                  fontSize: "24px", 
                  fontWeight: "800",
                  textShadow: "0 0 15px rgba(168, 85, 247, 0.5)"
                }}>
                  R$ {total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* WhatsApp Button */}
            <button
              onClick={sendToWhatsApp}
              disabled={cart.length === 0 || !payment || !customerName}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                background: (cart.length === 0 || !payment || !customerName) 
                  ? "#374151" 
                  : "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                border: "none",
                borderRadius: "16px",
                padding: "20px",
                cursor: (cart.length === 0 || !payment || !customerName) ? "not-allowed" : "pointer",
                opacity: (cart.length === 0 || !payment || !customerName) ? 0.5 : 1,
                boxShadow: (cart.length === 0 || !payment || !customerName) 
                  ? "none" 
                  : "0 4px 20px rgba(37, 211, 102, 0.4)"
              }}
            >
              <Send size={24} color="#fff" />
              <span style={{ color: "#fff", fontWeight: "700", fontSize: "18px" }}>
                Finalizar Pedido no WhatsApp
              </span>
            </button>
            
            {(!payment || !customerName) && cart.length > 0 && (
              <p style={{ 
                color: "#fbbf24", 
                fontSize: "14px", 
                textAlign: "center", 
                marginTop: "12px" 
              }}>
                {!customerName && !payment 
                  ? "Preencha seu nome e selecione a forma de pagamento"
                  : !customerName 
                    ? "Preencha seu nome para continuar"
                    : "Selecione a forma de pagamento para continuar"
                }
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
