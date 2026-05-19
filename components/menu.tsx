"use client";

import { useState } from "react";

const categories = ["Todos", "Bowls", "Cremes", "Bebidas", "Adicionais"];

const menuItems = [
  {
    id: 1,
    name: "Bowl Tradicional",
    description: "Açaí puro com banana, granola e mel",
    price: "R$ 18,90",
    category: "Bowls",
    popular: true,
  },
  {
    id: 2,
    name: "Bowl Premium",
    description: "Açaí com morango, kiwi, granola, leite condensado e nutella",
    price: "R$ 28,90",
    category: "Bowls",
    popular: true,
  },
  {
    id: 3,
    name: "Bowl Fitness",
    description: "Açaí zero açúcar com frutas vermelhas, chia e whey protein",
    price: "R$ 32,90",
    category: "Bowls",
    popular: false,
  },
  {
    id: 4,
    name: "Creme 300ml",
    description: "Açaí cremoso puro para você personalizar",
    price: "R$ 12,90",
    category: "Cremes",
    popular: false,
  },
  {
    id: 5,
    name: "Creme 500ml",
    description: "Açaí cremoso puro para você personalizar",
    price: "R$ 18,90",
    category: "Cremes",
    popular: true,
  },
  {
    id: 6,
    name: "Creme 1L",
    description: "Açaí cremoso puro para toda a família",
    price: "R$ 32,90",
    category: "Cremes",
    popular: false,
  },
  {
    id: 7,
    name: "Smoothie de Açaí",
    description: "Açaí batido com leite de coco e banana",
    price: "R$ 16,90",
    category: "Bebidas",
    popular: false,
  },
  {
    id: 8,
    name: "Suco de Açaí",
    description: "Açaí puro batido com água de coco",
    price: "R$ 14,90",
    category: "Bebidas",
    popular: false,
  },
  {
    id: 9,
    name: "Granola Artesanal",
    description: "100g de granola crocante feita na casa",
    price: "R$ 4,90",
    category: "Adicionais",
    popular: false,
  },
  {
    id: 10,
    name: "Frutas Extras",
    description: "Porção extra de frutas frescas",
    price: "R$ 6,90",
    category: "Adicionais",
    popular: false,
  },
];

export function Menu() {
  const [activeCategory, setActiveCategory] = useState("Todos");

  const filteredItems = activeCategory === "Todos"
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

  return (
    <section id="cardapio" className="py-20 bg-[hsl(var(--card))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] rounded-full text-sm font-medium mb-4">
            Nosso Cardápio
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[hsl(var(--foreground))] text-balance">
            Escolha Seu Favorito
          </h2>
          <p className="mt-4 text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto">
            Todos os nossos produtos são feitos com açaí 100% natural, direto da Amazônia
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === category
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                  : "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--primary))]/10"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group relative bg-[hsl(var(--background))] rounded-2xl p-6 hover:shadow-xl transition-shadow"
            >
              {item.popular && (
                <span className="absolute top-4 right-4 px-3 py-1 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] rounded-full text-xs font-medium">
                  Popular
                </span>
              )}
              <div className="w-16 h-16 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center mb-4">
                <span className="text-3xl">
                  {item.category === "Bowls" && "🥣"}
                  {item.category === "Cremes" && "🍦"}
                  {item.category === "Bebidas" && "🥤"}
                  {item.category === "Adicionais" && "✨"}
                </span>
              </div>
              <h3 className="font-serif text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
                {item.name}
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4 leading-relaxed">
                {item.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-[hsl(var(--primary))]">
                  {item.price}
                </span>
                <button className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
                  Adicionar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
