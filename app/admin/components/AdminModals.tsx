"use client"

import { Truck, Trash2, AlertCircle, Loader2 } from "lucide-react"
import type { Entregador } from "@/lib/config-types"

interface AdminModalsProps {
  // Modal de confirmacao de entregador
  confirmEntregador: { entregador: Entregador; orderId: string } | null
  onCancelEntregador: () => void
  onConfirmEntregador: () => void

  // Modal de exclusao individual
  showDeleteConfirm: string | null
  onCancelDelete: () => void
  onConfirmDelete: (orderId: string) => void
  deleteLoading: boolean

  // Modal de aviso de aba diferente
  showTabWarning: boolean
  onDismissTabWarning: () => void
  onDeselectAllOrders: () => void

  // Modal de exclusao multipla
  showDeleteMultiple: boolean
  selectedOrdersCount: number
  onCancelDeleteMultiple: () => void
  onConfirmDeleteMultiple: () => void

  // Modal de arquivar relatorios
  showArchiveConfirm: boolean
  onCancelArchive: () => void
  onConfirmArchive: () => void

  // Modal de copia manual
  manualCopyText: string | null
  onCloseManualCopy: () => void

  // Modal de copia do link do entregador
  manualEntregadorLink: string | null
  onCloseEntregadorLink: () => void

  // Modal de exclusao de produto
  deleteProductId: string | null
  onCancelDeleteProduct: () => void
  onConfirmDeleteProduct: () => void
}

export function AdminModals({
  confirmEntregador,
  onCancelEntregador,
  onConfirmEntregador,
  showDeleteConfirm,
  onCancelDelete,
  onConfirmDelete,
  deleteLoading,
  showTabWarning,
  onDismissTabWarning,
  onDeselectAllOrders,
  showDeleteMultiple,
  selectedOrdersCount,
  onCancelDeleteMultiple,
  onConfirmDeleteMultiple,
  showArchiveConfirm,
  onCancelArchive,
  onConfirmArchive,
  manualCopyText,
  onCloseManualCopy,
  manualEntregadorLink,
  onCloseEntregadorLink,
  deleteProductId,
  onCancelDeleteProduct,
  onConfirmDeleteProduct,
}: AdminModalsProps) {
  return (
    <>
      {/* Modal de confirmacao de entregador */}
      {confirmEntregador && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-border">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Confirmar Entregador</h3>
            </div>
            <div className="space-y-3 mb-6">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Entregador</p>
                <p className="text-foreground font-medium">{confirmEntregador.entregador.nome}</p>
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="text-foreground">{confirmEntregador.entregador.whatsapp}</p>
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Pedido</p>
                <p className="text-foreground font-medium">{confirmEntregador.orderId}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancelEntregador}
                className="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirmEntregador}
                className="flex-1 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-all"
              >
                Confirmar Entrega
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmacao de exclusao individual */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-border">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Excluir Pedido</h3>
              <p className="text-muted-foreground mt-2">
                Tem certeza que deseja excluir o pedido <span className="font-bold text-foreground">{showDeleteConfirm}</span>?
              </p>
              <p className="text-sm text-red-400 mt-2">Esta acao nao pode ser desfeita.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancelDelete}
                disabled={deleteLoading}
                className="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => onConfirmDelete(showDeleteConfirm)}
                disabled={deleteLoading}
                className="flex-1 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de aviso de aba diferente */}
      {showTabWarning && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-border">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Selecao em outra aba</h3>
              <p className="text-muted-foreground mt-2">
                Voce ja tem pedidos selecionados em outra aba. Desmarque-os antes de selecionar nesta aba.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onDismissTabWarning}
                className="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-all"
              >
                Entendi
              </button>
              <button
                onClick={() => {
                  onDeselectAllOrders()
                  onDismissTabWarning()
                }}
                className="flex-1 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:brightness-110 transition-all"
              >
                Desmarcar todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmacao de exclusao multipla */}
      {showDeleteMultiple && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-border">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Excluir Pedidos</h3>
              <p className="text-muted-foreground mt-2">
                Tem certeza que deseja excluir <span className="font-bold text-foreground">{selectedOrdersCount}</span> pedido(s)?
              </p>
              <p className="text-sm text-red-400 mt-2">Esta acao nao pode ser desfeita.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancelDeleteMultiple}
                disabled={deleteLoading}
                className="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirmDeleteMultiple}
                disabled={deleteLoading}
                className="flex-1 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Excluir ${selectedOrdersCount}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmacao para arquivar relatorios */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-border">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Limpar Relatorios</h3>
              <p className="text-muted-foreground mt-2">
                Tem certeza que deseja limpar os relatorios? Os pedidos serao arquivados e nao aparecerao mais nas estatisticas.
              </p>
              <p className="text-sm text-red-400 mt-2">
                Essa acao nao pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancelArchive}
                className="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirmArchive}
                className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Copia Manual */}
      {manualCopyText && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-border">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-foreground">Copiar Pedido</h3>
              <p className="text-sm text-muted-foreground mt-1">Selecione e copie manualmente</p>
            </div>
            <textarea
              readOnly
              value={manualCopyText}
              className="w-full h-48 p-3 text-sm bg-secondary border border-border rounded-xl text-foreground resize-none focus:outline-none"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
            <button
              onClick={onCloseManualCopy}
              className="w-full mt-4 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Copia Manual do Link do Entregador */}
      {manualEntregadorLink && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-border">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-foreground">Copiar Link do Entregador</h3>
              <p className="text-sm text-muted-foreground mt-1">Nao foi possivel copiar automaticamente. Copie manualmente abaixo:</p>
            </div>
            <input
              type="text"
              readOnly
              value={manualEntregadorLink}
              className="w-full p-3 text-sm bg-secondary border border-border rounded-xl text-foreground focus:outline-none"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={onCloseEntregadorLink}
              className="w-full mt-4 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmacao para Excluir Produto */}
      {deleteProductId !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-foreground">Excluir Produto</h3>
              <p className="text-sm text-muted-foreground mt-2">Tem certeza que deseja excluir este produto?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancelDeleteProduct}
                className="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirmDeleteProduct}
                className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
