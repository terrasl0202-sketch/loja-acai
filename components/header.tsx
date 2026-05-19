"use client";

import { useState } from "react";
import { Menu as MenuIcon, X } from "lucide-react";

const navLinks = [
  { href: "#cardapio", label: "Cardápio" },
  { href: "#sobre", label: "Sobre" },
  { href: "#depoimentos", label: "Depoimentos" },
  { href: "#contato", label: "Contato" },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--card))]/95 backdrop-blur-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="font-serif text-2xl font-bold text-[hsl(var(--primary))]">
            Açaí da Terra
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#pedido"
              className="px-5 py-2.5 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Fazer Pedido
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-[hsl(var(--foreground))]"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#pedido"
                onClick={() => setIsMenuOpen(false)}
                className="px-5 py-2.5 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-full text-sm font-medium hover:opacity-90 transition-opacity text-center"
              >
                Fazer Pedido
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
