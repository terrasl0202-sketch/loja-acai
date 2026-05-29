"use client"

import type { SiteConfig, PixKeyType } from "@/lib/config-types"
import { Phone, CreditCard, Building2, Mail, Key } from "lucide-react"

interface AdminPaymentSettingsProps {
  config: SiteConfig
  onConfigChange: (updater: (prev: SiteConfig) => SiteConfig) => void
}

const PIX_KEY_TYPES: { value: PixKeyType; label: string; icon: typeof Phone; placeholder: string; hint: string }[] = [
  { value: "telefone", label: "Telefone", icon: Phone, placeholder: "11966095057", hint: "DDD + numero (sera normalizado para +55)" },
  { value: "cpf", label: "CPF", icon: CreditCard, placeholder: "12345678901", hint: "Apenas numeros, sem pontos ou tracos" },
  { value: "cnpj", label: "CNPJ", icon: Building2, placeholder: "12345678000199", hint: "Apenas numeros, sem pontos ou tracos" },
  { value: "email", label: "Email", icon: Mail, placeholder: "seuemail@exemplo.com", hint: "Email cadastrado no PIX" },
  { value: "aleatoria", label: "Chave Aleatoria", icon: Key, placeholder: "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6", hint: "Chave aleatoria gerada pelo banco" },
]

export function AdminPaymentSettings({ config, onConfigChange }: AdminPaymentSettingsProps) {
  const currentKeyType = config.pixManual?.keyType || "telefone"
  const currentKeyConfig = PIX_KEY_TYPES.find(t => t.value === currentKeyType) || PIX_KEY_TYPES[0]

  const handleKeyTypeChange = (keyType: PixKeyType) => {
    onConfigChange(prev => ({
      ...prev,
      pixManual: { 
        ...prev.pixManual, 
        keyType,
        // Limpa a chave ao trocar de tipo para evitar confusao
        key: "",
        keyFull: ""
      }
    }))
  }

  const handleKeyChange = (value: string) => {
    onConfigChange(prev => ({
      ...prev,
      pixManual: { 
        ...prev.pixManual, 
        key: value,
        keyFull: value // keyFull sera igual a key, a normalizacao acontece na geracao do PIX
      }
    }))
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Configuracoes de Pagamento</h2>

      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Valor Minimo para PIX Asaas (R$)</label>
            <input
              type="number"
              step="0.01"
              value={config.payment?.minValueForAsaas || 15}
              onChange={(e) => onConfigChange(prev => ({
                ...prev,
                payment: { ...prev.payment, minValueForAsaas: Number(e.target.value) }
              }))}
              className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Pedidos abaixo usam PIX manual</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Tempo de Expiracao PIX (min)</label>
            <input
              type="number"
              value={config.payment?.pixExpirationMinutes || 15}
              onChange={(e) => onConfigChange(prev => ({
                ...prev,
                payment: { ...prev.payment, pixExpirationMinutes: Number(e.target.value) }
              }))}
              className="w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
          <div>
            <p className="font-medium text-foreground">PIX Manual</p>
            <p className="text-sm text-muted-foreground">Para pedidos abaixo do valor minimo</p>
          </div>
          <button
            onClick={() => onConfigChange(prev => ({
              ...prev,
              payment: { ...prev.payment, pixManualEnabled: !prev.payment?.pixManualEnabled }
            }))}
            className={`w-14 h-8 rounded-full transition-all ${
              config.payment?.pixManualEnabled ? "bg-primary" : "bg-secondary"
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                config.payment?.pixManualEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
          <div>
            <p className="font-medium text-foreground">PIX Asaas Automatico</p>
            <p className="text-sm text-muted-foreground">Para pedidos acima do valor minimo</p>
          </div>
          <button
            onClick={() => onConfigChange(prev => ({
              ...prev,
              payment: { ...prev.payment, pixAsaasEnabled: !prev.payment?.pixAsaasEnabled }
            }))}
            className={`w-14 h-8 rounded-full transition-all ${
              config.payment?.pixAsaasEnabled ? "bg-primary" : "bg-secondary"
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                config.payment?.pixAsaasEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Configuracao do PIX Manual */}
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
          <h3 className="font-medium text-foreground mb-4">Dados do PIX Manual</h3>
          
          {/* Seletor de Tipo de Chave */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-2 block">Tipo de Chave PIX</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PIX_KEY_TYPES.map((type) => {
                const Icon = type.icon
                const isSelected = currentKeyType === type.value
                return (
                  <button
                    key={type.value}
                    onClick={() => handleKeyTypeChange(type.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? "border-primary bg-primary/20 text-primary" 
                        : "border-border bg-input/50 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Campo da Chave Selecionada */}
          <div className="space-y-3">
            <div className="p-3 bg-background/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <currentKeyConfig.icon className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium text-foreground">
                  Chave {currentKeyConfig.label}
                </label>
              </div>
              <input
                type="text"
                value={config.pixManual?.key || ""}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder={currentKeyConfig.placeholder}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">{currentKeyConfig.hint}</p>
              
              {/* Preview da chave normalizada (apenas para telefone) */}
              {currentKeyType === "telefone" && config.pixManual?.key && (
                <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-xs text-green-600">
                    No PIX sera usada: <span className="font-mono font-bold">+55{config.pixManual.key.replace(/\D/g, "")}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Nome do Recebedor */}
            <div>
              <label className="text-xs text-muted-foreground">Nome do Recebedor</label>
              <input
                type="text"
                value={config.pixManual?.receiverName || ""}
                onChange={(e) => onConfigChange(prev => ({
                  ...prev,
                  pixManual: { ...prev.pixManual, receiverName: e.target.value }
                }))}
                placeholder="Nome que aparecera no PIX"
                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Cidade */}
            <div>
              <label className="text-xs text-muted-foreground">Cidade</label>
              <input
                type="text"
                value={config.pixManual?.city || ""}
                onChange={(e) => onConfigChange(prev => ({
                  ...prev,
                  pixManual: { ...prev.pixManual, city: e.target.value }
                }))}
                placeholder="SAO PAULO"
                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">Se vazio, usa SAO PAULO</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
