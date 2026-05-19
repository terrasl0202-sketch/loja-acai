import { Instagram, Facebook, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="font-serif text-2xl font-bold mb-4">
              Açaí da Terra
            </h3>
            <p className="text-[hsl(var(--background))]/70 mb-6 max-w-md leading-relaxed">
              Trazendo o melhor do açaí amazônico para sua mesa desde 2018. 
              Sabor, qualidade e tradição em cada colherada.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-[hsl(var(--background))]/10 flex items-center justify-center hover:bg-[hsl(var(--background))]/20 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-[hsl(var(--background))]/10 flex items-center justify-center hover:bg-[hsl(var(--background))]/20 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-[hsl(var(--background))]/10 flex items-center justify-center hover:bg-[hsl(var(--background))]/20 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Links Rápidos</h4>
            <ul className="space-y-3">
              <li>
                <a href="#cardapio" className="text-[hsl(var(--background))]/70 hover:text-[hsl(var(--background))] transition-colors">
                  Cardápio
                </a>
              </li>
              <li>
                <a href="#sobre" className="text-[hsl(var(--background))]/70 hover:text-[hsl(var(--background))] transition-colors">
                  Sobre Nós
                </a>
              </li>
              <li>
                <a href="#depoimentos" className="text-[hsl(var(--background))]/70 hover:text-[hsl(var(--background))] transition-colors">
                  Depoimentos
                </a>
              </li>
              <li>
                <a href="#contato" className="text-[hsl(var(--background))]/70 hover:text-[hsl(var(--background))] transition-colors">
                  Contato
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-[hsl(var(--background))]/70 hover:text-[hsl(var(--background))] transition-colors">
                  Termos de Uso
                </a>
              </li>
              <li>
                <a href="#" className="text-[hsl(var(--background))]/70 hover:text-[hsl(var(--background))] transition-colors">
                  Privacidade
                </a>
              </li>
              <li>
                <a href="#" className="text-[hsl(var(--background))]/70 hover:text-[hsl(var(--background))] transition-colors">
                  Cookies
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[hsl(var(--background))]/10 mt-12 pt-8 text-center">
          <p className="text-[hsl(var(--background))]/50 text-sm">
            &copy; {new Date().getFullYear()} Açaí da Terra. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
