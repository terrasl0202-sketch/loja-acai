"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Maria Silva",
    role: "Cliente desde 2020",
    content: "O melhor açaí que já provei! Muito cremoso e o sabor é incomparável. Virei cliente fiel!",
    rating: 5,
  },
  {
    id: 2,
    name: "João Santos",
    role: "Cliente desde 2021",
    content: "Atendimento excelente e açaí de qualidade premium. Recomendo para todos os meus amigos.",
    rating: 5,
  },
  {
    id: 3,
    name: "Ana Oliveira",
    role: "Cliente desde 2019",
    content: "Amo o bowl fitness! Perfeito para depois do treino. O açaí é puro e muito saboroso.",
    rating: 5,
  },
  {
    id: 4,
    name: "Carlos Mendes",
    role: "Cliente desde 2022",
    content: "Descobri essa loja por indicação e não me arrependo. Melhor açaí da região!",
    rating: 5,
  },
];

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section id="depoimentos" className="py-20 bg-[hsl(var(--card))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] rounded-full text-sm font-medium mb-4">
            Depoimentos
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[hsl(var(--foreground))] text-balance">
            O Que Nossos Clientes Dizem
          </h2>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Testimonial Card */}
          <div className="bg-[hsl(var(--secondary))] rounded-3xl p-8 sm:p-12">
            <div className="flex justify-center mb-6">
              {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-[hsl(var(--accent))] text-[hsl(var(--accent))]" />
              ))}
            </div>
            <blockquote className="text-xl sm:text-2xl text-center text-[hsl(var(--foreground))] font-medium mb-8 leading-relaxed">
              {`"${testimonials[currentIndex].content}"`}
            </blockquote>
            <div className="text-center">
              <p className="font-semibold text-[hsl(var(--foreground))]">
                {testimonials[currentIndex].name}
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {testimonials[currentIndex].role}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={prevTestimonial}
              className="w-12 h-12 rounded-full bg-[hsl(var(--secondary))] flex items-center justify-center hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors"
              aria-label="Depoimento anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentIndex
                      ? "bg-[hsl(var(--primary))]"
                      : "bg-[hsl(var(--border))]"
                  }`}
                  aria-label={`Ir para depoimento ${index + 1}`}
                />
              ))}
            </div>
            <button
              onClick={nextTestimonial}
              className="w-12 h-12 rounded-full bg-[hsl(var(--secondary))] flex items-center justify-center hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors"
              aria-label="Próximo depoimento"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
