"use client"

import { CreditCard, QrCode, Building2, Wallet, Clock, Check } from "lucide-react"
import { CustomizationGateways } from "@/lib/config-types"

interface PaymentsTabProps {
  gateways: CustomizationGateways
  onUpdate: (updates: Partial<CustomizationGateways>) => void
}

const GATEWAYS = [
  {
    id: "pix_manual" as const,
    name: "PIX Manual",
    description: "Receba via PIX com QR Code gerado automaticamente",
    icon: <QrCode className="w-6 h-6" />,
    status: "active",
    configPath: "Configuracoes > Pagamentos > PIX Manual",
  },
  {
    id: "asaas" as const,
    name: "Asaas",
    description: "PIX automatico com confirmacao instantanea",
    icon: <Building2 className="w-6 h-6" />,
    status: "active",
    configPath: "Configuracoes > Pagamentos > PIX Automatico",
  },
  {
    id: "mercadopago" as const,
    name: "Mercado Pago",
    description: "PIX, Cartao de credito e debito",
    icon: <Wallet className="w-6 h-6" />,
    status: "coming_soon",
  },
  {
    id: "pagbank" as const,
    name: "PagBank",
    description: "Solucao completa de pagamentos",
    icon: <CreditCard className="w-6 h-6" />,
    status: "coming_soon",
  },
  {
    id: "stripe" as const,
    name: "Stripe",
    description: "Pagamentos internacionais",
    icon: <CreditCard className="w-6 h-6" />,
    status: "coming_soon",
  },
]

export function PaymentsTab({ gateways, onUpdate }: PaymentsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Central de Pagamentos
        </h3>
        <p className="text-sm text-muted-foreground">Gerencie os meios de pagamento da sua loja</p>
      </div>

      {/* Cards dos Gateways */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {GATEWAYS.map((gateway) => (
          <div
            key={gateway.id}
            className={`p-5 rounded-xl border-2 transition-all ${
              gateway.status === "active"
                ? "bg-card/50 border-border hover:border-primary/50"
                : "bg-secondary/30 border-border/50 opacity-70"
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${
                gateway.status === "active"
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary text-muted-foreground"
              }`}>
                {gateway.icon}
              </div>
              
              {gateway.status === "active" ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-500 rounded-full text-xs font-medium">
                  <Check className="w-3 h-3" />
                  Disponivel
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-500 rounded-full text-xs font-medium">
                  <Clock className="w-3 h-3" />
                  Em breve
                </span>
              )}
            </div>

            {/* Info */}
            <h4 className="font-semibold text-foreground mb-1">{gateway.name}</h4>
            <p className="text-sm text-muted-foreground mb-4">{gateway.description}</p>

            {/* Acao */}
            {gateway.status === "active" && gateway.configPath && (
              <p className="text-xs text-muted-foreground">
                Configurar em: <span className="text-primary">{gateway.configPath}</span>
              </p>
            )}
            
            {gateway.status === "coming_soon" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Disponivel em breve
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Nota informativa */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
        <h4 className="font-medium text-blue-400 mb-2">Como funciona?</h4>
        <ul className="text-sm text-blue-300/80 space-y-1">
          <li>- <strong>PIX Manual</strong>: Configure sua chave PIX e receba pagamentos com QR Code</li>
          <li>- <strong>Asaas</strong>: Integracao automatica com confirmacao instantanea</li>
          <li>- <strong>Outros gateways</strong>: Serao liberados em atualizacoes futuras</li>
        </ul>
      </div>

      {/* Configuracoes adicionais - futura expansao */}
      <div className="p-4 bg-secondary/30 border border-border rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-foreground">Taxas e Configuracoes Avancadas</h4>
            <p className="text-sm text-muted-foreground">Configure taxas, limites e regras de pagamento</p>
          </div>
          <span className="px-2 py-1 bg-secondary text-muted-foreground text-xs rounded">
            Em breve
          </span>
        </div>
      </div>
    </div>
  )
}
