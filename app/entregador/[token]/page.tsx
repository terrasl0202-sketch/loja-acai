"use client"

import { useState, useEffect, use } from "react"
import { 
  Package, 
  MapPin, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  Loader2,
  Lock,
  Navigation,
  Clock,
  AlertCircle,
  Play,
  XCircle
} from "lucide-react"

interface Pedido {
  id: string
  customerName: string
  customerPhone: string
  address?: string
  neighborhood?: string
  reference?: string
  items: string
  total: number
  paymentMethod: string
  observation?: string
  status: string
  saiuParaEntregaEm?: string
  createdAt: string
}

interface EntregadorInfo {
  id: string
  nome: string
}

export default function PainelEntregador({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pin, setPin] = useState("")
  const [pinError, setPinError] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingAuth, setLoadingAuth] = useState(false)
  const [entregador, setEntregador] = useState<EntregadorInfo | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [tokenValido, setTokenValido] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null)
  const [cancelObservacao, setCancelObservacao] = useState("")
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Verificar se token existe
  useEffect(() => {
    const verificarToken = async () => {
      try {
        const res = await fetch(`/api/entregador/${token}`)
        if (res.ok) {
          const data = await res.json()
          setEntregador(data.entregador)
        } else {
          setTokenValido(false)
        }
      } catch {
        setTokenValido(false)
      } finally {
        setLoading(false)
      }
    }
    verificarToken()
  }, [token])

  // Autenticar com PIN
  const autenticar = async () => {
    if (pin.length < 4) {
      setPinError("PIN deve ter 4 digitos")
      return
    }

    setLoadingAuth(true)
    setPinError("")

    try {
      const res = await fetch(`/api/entregador/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setIsAuthenticated(true)
        setEntregador(data.entregador)
        setPedidos(data.pedidos || [])
        // Salvar PIN em sessionStorage para recarregar pedidos
        sessionStorage.setItem(`entregador_pin_${token}`, pin)
      } else {
        setPinError("PIN incorreto")
      }
    } catch {
      setPinError("Erro ao autenticar")
    } finally {
      setLoadingAuth(false)
    }
  }

  // Recarregar pedidos
  const recarregarPedidos = async () => {
    const savedPin = sessionStorage.getItem(`entregador_pin_${token}`)
    if (!savedPin) return

    try {
      const res = await fetch(`/api/entregador/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: savedPin }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setPedidos(data.pedidos || [])
      }
    } catch {
      console.error("Erro ao recarregar pedidos")
    }
  }

  // Mostrar toast
  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Executar acao no pedido
  const executarAcao = async (orderId: string, action: "iniciar" | "finalizar" | "cancelar", observacao?: string) => {
    const savedPin = sessionStorage.getItem(`entregador_pin_${token}`)
    if (!savedPin) return

    setActionLoading(`${orderId}-${action}`)

    try {
      const res = await fetch(`/api/entregador/${token}/entregar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: savedPin, orderId, action, observacao }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        showToast(data.message)
        
        if (action === "iniciar") {
          // Atualizar status local para delivering
          setPedidos(prev => prev.map(p => 
            p.id === orderId ? { ...p, status: "delivering", saiuParaEntregaEm: new Date().toISOString() } : p
          ))
        } else {
          // Remover pedido da lista (finalizado ou cancelado)
          setPedidos(prev => prev.filter(p => p.id !== orderId))
        }
        
        // Fechar modal de cancelamento se estiver aberto
        if (action === "cancelar") {
          setShowCancelModal(null)
          setCancelObservacao("")
        }
      } else {
        showToast(data.error || "Erro ao executar acao")
      }
    } catch {
      showToast("Erro de conexao")
    } finally {
      setActionLoading(null)
    }
  }

  // Iniciar entrega
  const iniciarEntrega = (orderId: string) => executarAcao(orderId, "iniciar")

  // Finalizar entrega
  const finalizarEntrega = (orderId: string) => executarAcao(orderId, "finalizar")

  // Cancelar pedido
  const cancelarPedido = (orderId: string) => {
    if (!cancelObservacao.trim()) {
      showToast("Digite o motivo do cancelamento")
      return
    }
    executarAcao(orderId, "cancelar", cancelObservacao)
  }

  // Normalizar telefone para WhatsApp
  const normalizePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "")
    if (digits.length === 11) return "55" + digits
    if (digits.length === 13 && digits.startsWith("55")) return digits
    return digits
  }

  // Abrir WhatsApp do cliente
  const abrirWhatsApp = (phone: string, nome: string) => {
    const cleanPhone = normalizePhone(phone)
    const message = `Ola ${nome}, sou o entregador. Estou chegando com seu pedido!`
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank")
  }

  // Abrir Google Maps
  const abrirMaps = (address: string, neighborhood?: string) => {
    const endereco = `${address}${neighborhood ? `, ${neighborhood}` : ""}`
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`, "_blank")
  }

  // Calcular tempo decorrido
  const calcularTempo = (dataISO: string) => {
    const diff = Date.now() - new Date(dataISO).getTime()
    const minutos = Math.floor(diff / 60000)
    if (minutos < 1) return "Agora"
    if (minutos < 60) return `${minutos} min`
    const horas = Math.floor(minutos / 60)
    return `${horas}h ${minutos % 60}min`
  }

  // Loading inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  // Token invalido
  if (!tokenValido) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Link invalido</h1>
          <p className="text-zinc-400">Este link de acesso nao existe ou foi desativado.</p>
        </div>
      </div>
    )
  }

  // Tela de PIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-purple-400" />
              </div>
              <h1 className="text-xl font-bold text-white">Painel do Entregador</h1>
              {entregador && (
                <p className="text-zinc-400 mt-1">Ola, {entregador.nome}</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 block mb-2">Digite seu PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    setPinError("")
                  }}
                  onKeyDown={(e) => e.key === "Enter" && autenticar()}
                  placeholder="****"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {pinError && (
                  <p className="text-red-400 text-sm mt-2 text-center">{pinError}</p>
                )}
              </div>

              <button
                onClick={autenticar}
                disabled={loadingAuth || pin.length < 4}
                className="w-full py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingAuth ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Entrar"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Painel principal
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Minhas Entregas</h1>
            <p className="text-xs text-zinc-400">{entregador?.nome}</p>
          </div>
          <button
            onClick={recarregarPedidos}
            className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <Loader2 className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </header>

      {/* Lista de pedidos */}
      <main className="max-w-lg mx-auto p-4 space-y-4">
        {pedidos.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400">Nenhum pedido para entregar</p>
            <button
              onClick={recarregarPedidos}
              className="mt-4 px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors"
            >
              Atualizar
            </button>
          </div>
        ) : (
          pedidos.map((pedido) => (
            <div key={pedido.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              {/* Header do pedido */}
              <div className="p-4 border-b border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white">{pedido.id}</span>
                  {pedido.saiuParaEntregaEm && (
                    <span className="text-xs text-purple-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {calcularTempo(pedido.saiuParaEntregaEm)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    pedido.status === "delivering" 
                      ? "bg-purple-500/20 text-purple-400" 
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {pedido.status === "delivering" ? "Em Entrega" : "Aguardando"}
                  </span>
                  <span className="text-xs text-zinc-500">{pedido.paymentMethod}</span>
                </div>
              </div>

              {/* Cliente */}
              <div className="p-4 border-b border-zinc-800">
                <p className="text-sm text-zinc-400 mb-1">Cliente</p>
                <p className="text-white font-medium">{pedido.customerName}</p>
                <p className="text-zinc-400 text-sm">{pedido.customerPhone}</p>
              </div>

              {/* Endereco */}
              {pedido.address && (
                <div className="p-4 border-b border-zinc-800">
                  <p className="text-sm text-zinc-400 mb-1">Endereco</p>
                  <p className="text-white">{pedido.address}</p>
                  {pedido.neighborhood && (
                    <p className="text-zinc-400 text-sm">Bairro: {pedido.neighborhood}</p>
                  )}
                  {pedido.reference && (
                    <p className="text-yellow-400 text-sm">Ref: {pedido.reference}</p>
                  )}
                </div>
              )}

              {/* Itens */}
              <div className="p-4 border-b border-zinc-800">
                <p className="text-sm text-zinc-400 mb-1">Itens</p>
                <p className="text-white whitespace-pre-wrap text-sm">{pedido.items}</p>
              </div>

              {/* Total */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">Total</span>
                <span className="text-xl font-bold text-white">R$ {pedido.total.toFixed(2)}</span>
              </div>

              {/* Observacao */}
              {pedido.observation && (
                <div className="p-4 border-b border-zinc-800 bg-yellow-500/5">
                  <p className="text-sm text-yellow-400 mb-1">Observacao</p>
                  <p className="text-white text-sm">{pedido.observation}</p>
                </div>
              )}

              {/* Acoes rapidas */}
              <div className="p-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => abrirWhatsApp(pedido.customerPhone, pedido.customerName)}
                  className="flex items-center justify-center gap-2 py-3 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
                {pedido.address && (
                  <button
                    onClick={() => abrirMaps(pedido.address!, pedido.neighborhood)}
                    className="flex items-center justify-center gap-2 py-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    Rota
                  </button>
                )}
              </div>

              {/* Botoes de acao principais */}
              <div className="p-4 pt-0 space-y-2">
                {/* Botao Iniciar Entrega - so mostra se status NAO e delivering */}
                {pedido.status !== "delivering" && (
                  <button
                    onClick={() => iniciarEntrega(pedido.id)}
                    disabled={actionLoading === `${pedido.id}-iniciar`}
                    className="w-full py-3 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading === `${pedido.id}-iniciar` ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Iniciar Entrega
                      </>
                    )}
                  </button>
                )}

                {/* Botao Finalizar Entrega - so mostra se status E delivering */}
                {pedido.status === "delivering" && (
                  <button
                    onClick={() => finalizarEntrega(pedido.id)}
                    disabled={actionLoading === `${pedido.id}-finalizar`}
                    className="w-full py-4 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg uppercase tracking-wide"
                  >
                    {actionLoading === `${pedido.id}-finalizar` ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-6 h-6" />
                        ENTREGUE
                      </>
                    )}
                  </button>
                )}

                {/* Botao Problema/Cancelar */}
                <button
                  onClick={() => setShowCancelModal(pedido.id)}
                  className="w-full py-3 bg-red-500/20 text-red-400 font-medium rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Problema / Cancelar
                </button>
              </div>
            </div>
          ))
        )}

        {/* Modal de Cancelamento */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="p-4 border-b border-zinc-800">
                <h3 className="text-lg font-bold text-white">Cancelar Pedido</h3>
                <p className="text-sm text-zinc-400">Informe o motivo do cancelamento</p>
              </div>
              <div className="p-4">
                <textarea
                  value={cancelObservacao}
                  onChange={(e) => setCancelObservacao(e.target.value)}
                  placeholder="Ex: Cliente nao atendeu, endereco incorreto, cliente cancelou..."
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  rows={3}
                />
              </div>
              <div className="p-4 pt-0 flex gap-2">
                <button
                  onClick={() => {
                    setShowCancelModal(null)
                    setCancelObservacao("")
                  }}
                  className="flex-1 py-3 bg-zinc-800 text-white font-medium rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={() => cancelarPedido(showCancelModal)}
                  disabled={actionLoading === `${showCancelModal}-cancelar` || !cancelObservacao.trim()}
                  className="flex-1 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === `${showCancelModal}-cancelar` ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Confirmar"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-zinc-800 text-white rounded-lg shadow-lg border border-zinc-700 z-50">
            {toastMessage}
          </div>
        )}
      </main>
    </div>
  )
}
