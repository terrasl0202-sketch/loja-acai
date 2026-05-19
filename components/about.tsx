import { Leaf, Heart, Award } from "lucide-react";

const features = [
  {
    icon: Leaf,
    title: "100% Natural",
    description: "Açaí puro da Amazônia, sem conservantes ou aditivos químicos.",
  },
  {
    icon: Heart,
    title: "Feito com Amor",
    description: "Preparamos cada bowl com carinho e atenção aos detalhes.",
  },
  {
    icon: Award,
    title: "Qualidade Premium",
    description: "Selecionamos apenas os melhores frutos para você.",
  },
];

export function About() {
  return (
    <section id="sobre" className="py-20 bg-[hsl(var(--secondary))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div>
            <span className="inline-block px-4 py-1.5 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] rounded-full text-sm font-medium mb-4">
              Nossa História
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[hsl(var(--foreground))] mb-6 text-balance">
              Tradição e Sabor em Cada Colherada
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-6 leading-relaxed">
              Desde 2018, trazemos o verdadeiro sabor do açaí amazônico para a sua cidade. 
              Nossa paixão começou em uma viagem ao Pará, onde descobrimos o açaí mais puro 
              e saboroso que já havíamos provado.
            </p>
            <p className="text-[hsl(var(--muted-foreground))] mb-8 leading-relaxed">
              Trabalhamos diretamente com produtores locais da região amazônica, garantindo 
              não apenas a melhor qualidade, mas também o desenvolvimento sustentável das 
              comunidades ribeirinhas.
            </p>
            
            {/* Features */}
            <div className="space-y-6">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-[hsl(var(--primary))]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[hsl(var(--foreground))] mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="aspect-[4/5] rounded-3xl bg-[hsl(var(--primary))]/10 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-9xl mb-4 block">🌴</span>
                  <p className="font-serif text-2xl text-[hsl(var(--primary))] font-medium">
                    Direto da Amazônia
                  </p>
                </div>
              </div>
            </div>
            {/* Stats */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[90%] bg-[hsl(var(--card))] rounded-2xl p-6 shadow-xl">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <span className="block text-2xl sm:text-3xl font-bold text-[hsl(var(--primary))]">5+</span>
                  <span className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">Anos de Experiência</span>
                </div>
                <div>
                  <span className="block text-2xl sm:text-3xl font-bold text-[hsl(var(--primary))]">50k+</span>
                  <span className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">Clientes Satisfeitos</span>
                </div>
                <div>
                  <span className="block text-2xl sm:text-3xl font-bold text-[hsl(var(--primary))]">100%</span>
                  <span className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">Natural</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
