export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[hsl(var(--secondary))]">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%235B2C6F' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <span className="inline-block px-4 py-1.5 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] rounded-full text-sm font-medium mb-6">
              100% Natural e Artesanal
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[hsl(var(--foreground))] leading-tight text-balance">
              O Melhor <span className="text-[hsl(var(--primary))]">Açaí</span> da Cidade
            </h1>
            <p className="mt-6 text-lg text-[hsl(var(--muted-foreground))] max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Direto da Amazônia para sua mesa. Açaí cremoso, puro e repleto de sabor. Monte seu bowl do seu jeito!
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a
                href="#cardapio"
                className="px-8 py-4 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-full text-base font-medium hover:opacity-90 transition-opacity"
              >
                Ver Cardápio
              </a>
              <a
                href="#sobre"
                className="px-8 py-4 border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] rounded-full text-base font-medium hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors"
              >
                Conheça Nossa História
              </a>
            </div>
          </div>

          {/* Visual Element */}
          <div className="relative">
            <div className="aspect-square max-w-md mx-auto">
              <div className="w-full h-full rounded-full bg-[hsl(var(--primary))]/20 flex items-center justify-center">
                <div className="w-4/5 h-4/5 rounded-full bg-[hsl(var(--primary))]/30 flex items-center justify-center">
                  <div className="w-4/5 h-4/5 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center shadow-2xl">
                    <span className="text-7xl sm:text-8xl">🫐</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Floating Elements */}
            <div className="absolute top-10 left-10 w-16 h-16 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-3xl shadow-lg animate-bounce" style={{ animationDelay: '0.5s' }}>
              🍓
            </div>
            <div className="absolute bottom-10 right-10 w-14 h-14 rounded-full bg-[hsl(var(--card))] flex items-center justify-center text-2xl shadow-lg animate-bounce" style={{ animationDelay: '1s' }}>
              🍌
            </div>
            <div className="absolute top-1/2 right-0 w-12 h-12 rounded-full bg-[hsl(var(--secondary))] flex items-center justify-center text-xl shadow-lg animate-bounce" style={{ animationDelay: '1.5s' }}>
              🥣
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
