"use client";

import { useState } from "react";
import { MapPin, Phone, Clock, Send } from "lucide-react";

export function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    alert("Mensagem enviada com sucesso!");
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <section id="contato" className="py-20 bg-[hsl(var(--primary))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="text-[hsl(var(--primary-foreground))]">
            <span className="inline-block px-4 py-1.5 bg-[hsl(var(--primary-foreground))]/10 text-[hsl(var(--primary-foreground))] rounded-full text-sm font-medium mb-4">
              Fale Conosco
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-6 text-balance">
              Entre em Contato
            </h2>
            <p className="text-[hsl(var(--primary-foreground))]/80 mb-8 leading-relaxed">
              Tem alguma dúvida ou sugestão? Estamos sempre prontos para atender você!
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[hsl(var(--primary-foreground))]/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Endereço</h3>
                  <p className="text-sm text-[hsl(var(--primary-foreground))]/80">
                    Rua das Palmeiras, 123 - Centro
                    <br />
                    São Paulo - SP
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[hsl(var(--primary-foreground))]/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Telefone</h3>
                  <p className="text-sm text-[hsl(var(--primary-foreground))]/80">
                    (11) 99999-9999
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[hsl(var(--primary-foreground))]/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Horário de Funcionamento</h3>
                  <p className="text-sm text-[hsl(var(--primary-foreground))]/80">
                    Segunda a Sábado: 10h às 22h
                    <br />
                    Domingo: 12h às 20h
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-[hsl(var(--card))] rounded-3xl p-8">
            <h3 className="font-serif text-2xl font-bold text-[hsl(var(--foreground))] mb-6">
              Envie sua Mensagem
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[hsl(var(--secondary))] border-0 focus:ring-2 focus:ring-[hsl(var(--primary))] outline-none transition-shadow"
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[hsl(var(--secondary))] border-0 focus:ring-2 focus:ring-[hsl(var(--primary))] outline-none transition-shadow"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  Mensagem
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-[hsl(var(--secondary))] border-0 focus:ring-2 focus:ring-[hsl(var(--primary))] outline-none transition-shadow resize-none"
                  placeholder="Sua mensagem..."
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                <Send className="w-5 h-5" />
                Enviar Mensagem
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
