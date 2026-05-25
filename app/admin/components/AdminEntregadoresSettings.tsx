"use client"

import { Plus, Eye, EyeOff, CheckCircle2, Clock as ClockIcon, Phone, Link2, MessageCircle, Trash2, Users2 } from "lucide-react"
import type { Entregador } from "@/lib/config-types"

interface AdminEntregadoresSettingsProps {
  entregadores: Entregador[]
  onAddEntregador: () => void
  onUpdateEntregador: (id: string, field: keyof Entregador, value: Entregador[keyof Entregador]) => void
  onRemoveEntregador: (id: string) => void
  getEntregadorPanelLink: (token: string) => string
  copyToClipboard: (text: string, onSuccess: () => void, onFallback: (text: string) => void) => void
  normalizePhoneForWhatsApp: (phone: string) => string
  showToast: (message: string) => void
  setManualEntregadorLink: (text: string) => void
}

export function AdminEntregadoresSettings({
  entregadores,
  onAddEntregador,
  onUpdateEntregador,
  onRemoveEntregador,
  getEntregadorPanelLink,
  copyToClipboard,
  normalizePhoneForWhatsApp,
  showToast,
  setManualEntregadorLink,
}: AdminEntregadoresSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Entregadores ({entregadores.length})</h2>
        <button
          onClick={onAddEntregador}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl transition-all hover:brightness-110"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <div className="space-y-4">
        {entregadores.map((entregador) => (
          <div
            key={entregador.id}
            className={`p-4 rounded-xl border ${
              entregador.status === "ativo" 
                ? entregador.disponibilidade === "disponivel"
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-yellow-500/30 bg-yellow-500/5"
                : "border-border/50 bg-secondary/10 opacity-60"
            }`}
          >
            <div className="grid gap-4">
              {/* Linha 1: Nome e WhatsApp */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Nome do Entregador *</label>
                  <input
                    type="text"
                    value={entregador.nome}
                    onChange={(e) => onUpdateEntregador(entregador.id, "nome", e.target.value)}
                    placeholder="Ex: Joao Silva"
                    className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">WhatsApp/Telefone *</label>
                  <input
                    type="text"
                    value={entregador.whatsapp}
                    onChange={(e) => onUpdateEntregador(entregador.id, "whatsapp", e.target.value)}
                    placeholder="Ex: 11999999999"
                    className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Linha 2: Horarios */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Horario Inicial</label>
                  <input
                    type="time"
                    value={entregador.horarioInicio}
                    onChange={(e) => onUpdateEntregador(entregador.id, "horarioInicio", e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Horario Final</label>
                  <input
                    type="time"
                    value={entregador.horarioFim}
                    onChange={(e) => onUpdateEntregador(entregador.id, "horarioFim", e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Linha 3: Observacao */}
              <div>
                <label className="text-xs text-muted-foreground">Observacao Interna</label>
                <input
                  type="text"
                  value={entregador.observacao}
                  onChange={(e) => onUpdateEntregador(entregador.id, "observacao", e.target.value)}
                  placeholder="Ex: Possui moto propria"
                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Linha 4: PIN de Acesso */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">PIN de Acesso (4 digitos)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={entregador.pin || ""}
                    onChange={(e) => {
                      const pin = e.target.value.replace(/\D/g, "").slice(0, 4)
                      onUpdateEntregador(entregador.id, "pin", pin)
                    }}
                    placeholder="Ex: 1234"
                    className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Token (automatico)</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={entregador.token || ""}
                      readOnly
                      className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-muted-foreground text-sm"
                    />
                    <button
                      onClick={() => {
                        const newToken = Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
                        onUpdateEntregador(entregador.id, "token", newToken)
                      }}
                      className="px-3 py-2 bg-secondary text-muted-foreground rounded-lg hover:bg-secondary/80 text-xs"
                    >
                      Gerar
                    </button>
                  </div>
                </div>
              </div>

              {/* Linha 5: Link do Painel */}
              {entregador.token && entregador.pin && (
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <label className="text-xs text-blue-400 font-medium">Link do Painel do Entregador</label>
                  <p className="text-xs text-muted-foreground mt-1 break-all select-all">{getEntregadorPanelLink(entregador.token)}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        const link = getEntregadorPanelLink(entregador.token!)
                        copyToClipboard(
                          link,
                          () => showToast("Link copiado!"),
                          (text) => setManualEntregadorLink(text)
                        )
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-sm font-medium"
                    >
                      <Link2 className="w-4 h-4" />
                      Copiar Link
                    </button>
                    <button
                      onClick={() => {
                        const link = getEntregadorPanelLink(entregador.token!)
                        const phone = normalizePhoneForWhatsApp(entregador.whatsapp)
                        const message = `Ola ${entregador.nome}!\n\nAcesse seu painel de entregas:\n${link}\n\nSeu PIN: ${entregador.pin}`
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank")
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 text-sm font-medium"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Enviar
                    </button>
                  </div>
                </div>
              )}

              {/* Aviso se falta PIN ou Token */}
              {entregador.token && !entregador.pin && (
                <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <p className="text-xs text-yellow-400">Defina um PIN de 4 digitos para habilitar o painel do entregador</p>
                </div>
              )}

              {/* Linha 4: Status, Disponibilidade e Acoes */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => {
                    onUpdateEntregador(
                      entregador.id,
                      "status",
                      entregador.status === "ativo" ? "inativo" : "ativo"
                    )
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    entregador.status === "ativo"
                      ? "bg-green-600/20 text-green-500"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {entregador.status === "ativo" ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {entregador.status === "ativo" ? "Ativo" : "Inativo"}
                </button>
                
                <button
                  onClick={() => {
                    onUpdateEntregador(
                      entregador.id,
                      "disponibilidade",
                      entregador.disponibilidade === "disponivel" ? "indisponivel" : "disponivel"
                    )
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    entregador.disponibilidade === "disponivel"
                      ? "bg-blue-600/20 text-blue-400"
                      : "bg-orange-500/20 text-orange-400"
                  }`}
                >
                  {entregador.disponibilidade === "disponivel" ? <CheckCircle2 className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />}
                  {entregador.disponibilidade === "disponivel" ? "Disponivel" : "Indisponivel"}
                </button>

                <button
                  onClick={() => {
                    const phone = normalizePhoneForWhatsApp(entregador.whatsapp)
                    if (phone) {
                      window.open(`https://wa.me/${phone}`, "_blank")
                    }
                  }}
                  disabled={!entregador.whatsapp}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Phone className="w-4 h-4" />
                  WhatsApp
                </button>

                <button
                  onClick={() => onRemoveEntregador(entregador.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition-colors text-sm font-medium ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}

        {entregadores.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum entregador cadastrado</p>
            <p className="text-sm">Clique em Adicionar para cadastrar um entregador</p>
          </div>
        )}
      </div>

      {/* Resumo */}
      {entregadores.length > 0 && (
        <div className="mt-6 p-4 bg-secondary/30 rounded-xl">
          <h3 className="text-sm font-medium text-foreground mb-2">Resumo</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">
                {entregadores.filter(e => e.status === "ativo").length}
              </p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">
                {entregadores.filter(e => e.status === "ativo" && e.disponibilidade === "disponivel").length}
              </p>
              <p className="text-xs text-muted-foreground">Disponiveis</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">
                {entregadores.filter(e => e.status === "ativo" && e.disponibilidade === "indisponivel").length}
              </p>
              <p className="text-xs text-muted-foreground">Indisponiveis</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
