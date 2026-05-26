"use client"

import { User, Phone, MapPin, Home as HomeIcon, MapPinned, MessageSquare, Check, Plus, AlertCircle, Truck } from "lucide-react"
import { formatCurrency } from "../../utils"
import type { DeliveryType } from "../../types"

interface FormData {
  nome: string
  telefone: string
  endereco: string
  numero: string
  bairro: string
  referencia: string
  localizacao: string
  observacao: string
  pagamento: string
}

interface SavedAddress {
  endereco: string
  numero: string
  bairro: string
  referencia: string
}

interface Customer {
  name: string
  phone: string
  savedAddress?: SavedAddress
}

interface NeighborhoodFee {
  name: string
  fee: number
  active?: boolean
}

interface CustomerFormProps {
  formData: FormData
  setFormData: (data: FormData) => void
  deliveryType: DeliveryType
  isOrderBlocked?: boolean
  customer?: Customer | null
  customerOrders?: unknown[]
  useSavedData: boolean | null
  onUseSavedData: () => void
  onUseNewAddress: () => void
  onChangeSavedData: () => void
  neighborhoodFees: NeighborhoodFee[]
  deliveryFee: number
  orderSnapshotDeliveryFee?: number
  onGetLocation: () => void
}

export function CustomerForm({
  formData,
  setFormData,
  deliveryType,
  isOrderBlocked = false,
  customer,
  customerOrders = [],
  useSavedData,
  onUseSavedData,
  onUseNewAddress,
  onChangeSavedData,
  neighborhoodFees,
  deliveryFee,
  orderSnapshotDeliveryFee,
  onGetLocation
}: CustomerFormProps) {
  const showSavedDataOption = customer && (customer.savedAddress || customerOrders.length > 0) && useSavedData === null && !isOrderBlocked
  const showSavedDataIndicator = useSavedData === true
  const showFormFields = useSavedData !== null || !customer || (!customer.savedAddress && customerOrders.length === 0)

  return (
    <section className={`premium-card rounded-2xl p-5 space-y-5 animate-scale-in ${isOrderBlocked ? 'opacity-50 pointer-events-none' : ''}`} style={{ animationDelay: '0.15s' }}>
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        Seus Dados
      </h3>
      
      {/* Opcao de usar dados salvos */}
      {showSavedDataOption && (
        <div className="bg-gradient-to-br from-secondary/60 to-secondary/30 backdrop-blur-sm rounded-2xl p-5 space-y-4 border border-primary/10">
          <p className="text-sm text-foreground font-bold">Como deseja prosseguir?</p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onUseSavedData}
              className="premium-btn w-full py-4 px-4 text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all font-bold flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Check className="w-4 h-4" />
              Usar dados salvos
            </button>
            <button
              type="button"
              onClick={onUseNewAddress}
              className="w-full py-4 px-4 text-sm bg-card/80 text-foreground rounded-xl hover:bg-card transition-all border border-border/50 font-medium flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Inserir novo endereco
            </button>
          </div>
        </div>
      )}
      
      {/* Indicador de dados salvos em uso */}
      {showSavedDataIndicator && (
        <div className="flex items-center justify-between bg-gradient-to-r from-green-500/15 to-green-500/5 rounded-xl px-4 py-3 border border-green-500/25">
          <span className="text-sm text-green-400 font-bold flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Check className="w-3.5 h-3.5" />
            </div>
            Usando dados salvos
          </span>
          <button
            type="button"
            onClick={onChangeSavedData}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Alterar
          </button>
        </div>
      )}
      
      {/* Campos Premium */}
      {showFormFields && (
        <>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
              <User className="w-3 h-3" />
              Nome *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => !isOrderBlocked && setFormData({ ...formData, nome: e.target.value })}
              disabled={isOrderBlocked}
              placeholder="Seu nome completo"
              className="premium-input w-full px-4 py-3.5 bg-input/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
              <Phone className="w-3 h-3" />
              Telefone/WhatsApp *
            </label>
            <input
              type="tel"
              value={formData.telefone}
              disabled={isOrderBlocked}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 11)
                const formatted = value
                  .replace(/(\d{2})(\d)/, "($1) $2")
                  .replace(/(\d{5})(\d)/, "$1-$2")
                setFormData({ ...formData, telefone: formatted })
              }}
              placeholder="(11) 99999-9999"
              className="premium-input w-full px-4 py-3.5 bg-input/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
          </div>

          {deliveryType === "entrega" && (
            <>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                  <MapPin className="w-3 h-3" />
                  Endereco *
                </label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => !isOrderBlocked && setFormData({ ...formData, endereco: e.target.value })}
                  disabled={isOrderBlocked}
                  placeholder="Rua"
                  className="premium-input w-full px-4 py-3.5 bg-input/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                    <HomeIcon className="w-3 h-3" />
                    Numero *
                  </label>
                  <input
                    type="text"
                    value={formData.numero}
                    onChange={(e) => !isOrderBlocked && setFormData({ ...formData, numero: e.target.value })}
                    disabled={isOrderBlocked}
                    placeholder="Numero"
                    className="premium-input w-full px-4 py-3.5 bg-input/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Bairro Dropdown Premium */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                  <MapPin className="w-3 h-3" />
                  Bairro *
                </label>
                <select
                  value={formData.bairro}
                  onChange={(e) => !isOrderBlocked && setFormData({ ...formData, bairro: e.target.value })}
                  disabled={isOrderBlocked}
                  className={`premium-input w-full px-4 py-3.5 bg-input/50 border border-border/50 rounded-xl text-foreground focus:outline-none appearance-none ${isOrderBlocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '18px' }}
                >
                  <option value="">Selecione seu bairro</option>
                  {neighborhoodFees
                    .filter(n => n.active !== false)
                    .map((neighborhood) => (
                      <option key={neighborhood.name} value={neighborhood.name}>
                        {neighborhood.name} - R$ {neighborhood.fee.toFixed(2)}
                      </option>
                    ))}
                </select>
                {formData.bairro && (
                  <div className="mt-3 p-4 bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/25 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        Taxa de entrega:
                      </span>
                      <span className="font-black text-primary text-lg">
                        {formatCurrency(orderSnapshotDeliveryFee !== undefined ? orderSnapshotDeliveryFee : deliveryFee)}
                      </span>
                    </div>
                  </div>
                )}
                {!formData.bairro && !isOrderBlocked && (
                  <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Selecione seu bairro para calcular a entrega.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                  <MapPinned className="w-3 h-3" />
                  Referencia *
                </label>
                <input
                  type="text"
                  value={formData.referencia}
                  onChange={(e) => !isOrderBlocked && setFormData({ ...formData, referencia: e.target.value })}
                  disabled={isOrderBlocked}
                  placeholder="Ponto de referencia"
                  className="premium-input w-full px-4 py-3.5 bg-input/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-50"
                />
              </div>

              <button
                onClick={onGetLocation}
                disabled={isOrderBlocked}
                className={`premium-btn w-full py-4 bg-gradient-to-r from-secondary to-secondary/80 text-foreground rounded-xl flex items-center justify-center gap-2.5 font-bold border border-border/50 ${isOrderBlocked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98]'}`}
              >
                <MapPinned className="w-4 h-4" />
                Enviar minha localizacao
              </button>
              {formData.localizacao && (
                <p className="text-xs text-green-400 text-center flex items-center justify-center gap-1.5 bg-green-500/10 py-2 rounded-lg">
                  <Check className="w-3.5 h-3.5" />
                  Localizacao capturada com sucesso!
                </p>
              )}
            </>
          )}

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
              <MessageSquare className="w-3 h-3" />
              Observacoes (opcional)
            </label>
            <textarea
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              placeholder="Ex: Sem banana, mais granola..."
              rows={2}
              className="premium-input w-full px-4 py-3.5 bg-input/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground/70 focus:outline-none resize-none"
            />
          </div>
        </>
      )}
    </section>
  )
}
