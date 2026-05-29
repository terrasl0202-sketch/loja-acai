"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Wallet, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Phone, 
  Mail, 
  Key, 
  Building2, 
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import type { PixManualKey, PixKeyType } from "@/lib/config-types"

interface AdminPixWalletProps {
  onKeyChange?: () => void
}

const KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  telefone: "Telefone",
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  aleatoria: "Chave Aleatoria",
}

const KEY_TYPE_ICONS: Record<PixKeyType, React.ReactNode> = {
  telefone: <Phone className="w-4 h-4" />,
  cpf: <CreditCard className="w-4 h-4" />,
  cnpj: <Building2 className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  aleatoria: <Key className="w-4 h-4" />,
}

const KEY_TYPE_PLACEHOLDERS: Record<PixKeyType, string> = {
  telefone: "11999999999",
  cpf: "12345678901",
  cnpj: "12345678000190",
  email: "email@exemplo.com",
  aleatoria: "abc123-xyz-456",
}

// Mascara a chave para exibicao
function maskKey(value: string, type: PixKeyType): string {
  if (!value) return ""
  
  switch (type) {
    case "telefone":
      // Mostra primeiros 4 e ultimos 2 digitos
      const digits = value.replace(/\D/g, "")
      if (digits.length >= 6) {
        return `${digits.slice(0, 4)}****${digits.slice(-2)}`
      }
      return value
    case "cpf":
      // Mostra primeiros 3 e ultimos 2 digitos
      const cpf = value.replace(/\D/g, "")
      if (cpf.length >= 5) {
        return `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}`
      }
      return value
    case "cnpj":
      // Mostra primeiros 2 e ultimos 2 digitos
      const cnpj = value.replace(/\D/g, "")
      if (cnpj.length >= 4) {
        return `${cnpj.slice(0, 2)}.***.***/****.${cnpj.slice(-2)}`
      }
      return value
    case "email":
      // Mostra primeiras 2 letras e dominio
      const parts = value.split("@")
      if (parts.length === 2) {
        return `${parts[0].slice(0, 2)}***@${parts[1]}`
      }
      return value
    case "aleatoria":
      // Mostra primeiros 8 caracteres
      if (value.length > 8) {
        return `${value.slice(0, 8)}...`
      }
      return value
    default:
      return value
  }
}

export function AdminPixWallet({ onKeyChange }: AdminPixWalletProps) {
  const [keys, setKeys] = useState<PixManualKey[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estado do formulario
  const [showForm, setShowForm] = useState(false)
  const [editingKey, setEditingKey] = useState<PixManualKey | null>(null)
  const [formData, setFormData] = useState({
    alias: "",
    keyType: "telefone" as PixKeyType,
    keyValue: "",
    receiverName: "",
    city: "SAO PAULO",
  })

  // Carregar chaves
  const loadKeys = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/pix-keys")
      const data = await res.json()
      
      if (data.error) {
        // Se a tabela nao existe, mostrar lista vazia
        if (data.error.includes("does not exist")) {
          setKeys([])
          return
        }
        throw new Error(data.error)
      }
      
      setKeys(data.keys || [])
    } catch (err) {
      console.error("Erro ao carregar chaves:", err)
      setKeys([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  // Limpar mensagens apos 3 segundos
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  // Resetar formulario
  const resetForm = () => {
    setFormData({
      alias: "",
      keyType: "telefone",
      keyValue: "",
      receiverName: "",
      city: "SAO PAULO",
    })
    setEditingKey(null)
    setShowForm(false)
  }

  // Abrir formulario para editar
  const openEditForm = (key: PixManualKey) => {
    setFormData({
      alias: key.alias,
      keyType: key.keyType,
      keyValue: key.keyValue,
      receiverName: key.receiverName,
      city: key.city,
    })
    setEditingKey(key)
    setShowForm(true)
  }

  // Salvar chave
  const saveKey = async () => {
    if (!formData.keyValue.trim()) {
      setError("Preencha a chave PIX")
      return
    }
    if (!formData.receiverName.trim()) {
      setError("Preencha o nome do recebedor")
      return
    }

    try {
      setSaving(true)
      setError(null)

      const method = editingKey ? "PUT" : "POST"
      const body = editingKey 
        ? { ...formData, id: editingKey.id }
        : { ...formData, isActive: keys.length === 0 } // Primeira chave fica ativa

      const res = await fetch("/api/pix-keys", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setSuccess(editingKey ? "Chave atualizada!" : "Chave cadastrada!")
      resetForm()
      loadKeys()
      onKeyChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  // Ativar chave
  const activateKey = async (key: PixManualKey) => {
    try {
      setSaving(true)
      
      const res = await fetch("/api/pix-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: key.id, isActive: true }),
      })

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setSuccess(`Chave "${key.alias}" ativada!`)
      loadKeys()
      onKeyChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao ativar")
    } finally {
      setSaving(false)
    }
  }

  // Excluir chave
  const deleteKey = async (key: PixManualKey) => {
    if (!confirm(`Deseja excluir a chave "${key.alias}"?`)) return

    try {
      setSaving(true)
      
      const res = await fetch(`/api/pix-keys?id=${key.id}`, {
        method: "DELETE",
      })

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setSuccess("Chave excluida!")
      loadKeys()
      onKeyChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Carteira PIX Manual</h3>
        </div>
        
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Chave
          </button>
        )}
      </div>

      {/* Mensagens */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-500 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="p-4 bg-card/50 border border-border/50 rounded-xl space-y-4">
          <h4 className="font-medium text-foreground">
            {editingKey ? "Editar Chave" : "Nova Chave PIX"}
          </h4>

          {/* Apelido */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Apelido da chave</label>
            <input
              type="text"
              value={formData.alias}
              onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
              placeholder="Ex: Pix do Ailton, Conta Mercado Pago"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
            />
          </div>

          {/* Tipo de chave */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Tipo da chave</label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(KEY_TYPE_LABELS) as PixKeyType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFormData(prev => ({ ...prev, keyType: type, keyValue: "" }))}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
                    formData.keyType === type
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-input border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {KEY_TYPE_ICONS[type]}
                  <span className="text-[10px] font-medium">{KEY_TYPE_LABELS[type]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Valor da chave */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Chave PIX ({KEY_TYPE_LABELS[formData.keyType]})
            </label>
            <input
              type="text"
              value={formData.keyValue}
              onChange={(e) => setFormData(prev => ({ ...prev, keyValue: e.target.value }))}
              placeholder={KEY_TYPE_PLACEHOLDERS[formData.keyType]}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm font-mono"
            />
            {formData.keyType === "telefone" && formData.keyValue && (
              <p className="text-xs text-muted-foreground mt-1">
                No PIX sera usada: <span className="font-mono text-green-600">+55{formData.keyValue.replace(/\D/g, "")}</span>
              </p>
            )}
          </div>

          {/* Nome do recebedor */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Nome do recebedor</label>
            <input
              type="text"
              value={formData.receiverName}
              onChange={(e) => setFormData(prev => ({ ...prev, receiverName: e.target.value }))}
              placeholder="Nome que aparece no PIX"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
            />
          </div>

          {/* Cidade */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Cidade</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              placeholder="SAO PAULO"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
            />
          </div>

          {/* Botoes */}
          <div className="flex gap-2">
            <button
              onClick={saveKey}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {editingKey ? "Atualizar" : "Cadastrar"}
            </button>
            <button
              onClick={resetForm}
              disabled={saving}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Lista de chaves */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma chave PIX cadastrada</p>
          <p className="text-xs mt-1">Clique em "Nova Chave" para adicionar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className={`p-4 rounded-xl border transition-colors ${
                key.isActive
                  ? "bg-green-500/5 border-green-500/30"
                  : "bg-card/50 border-border/50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{key.alias}</span>
                    {key.isActive && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-500 rounded-full text-[10px] font-bold">
                        ATIVA
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {KEY_TYPE_ICONS[key.keyType]}
                    <span>{KEY_TYPE_LABELS[key.keyType]}</span>
                    <span className="font-mono">{maskKey(key.keyValue, key.keyType)}</span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-1">
                    Recebedor: <span className="text-foreground">{key.receiverName}</span>
                    {" | "}
                    Cidade: <span className="text-foreground">{key.city}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!key.isActive && (
                    <button
                      onClick={() => activateKey(key)}
                      disabled={saving}
                      className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                      title="Usar esta chave"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openEditForm(key)}
                    disabled={saving}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteKey(key)}
                    disabled={saving}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-muted-foreground text-center">
        Apenas uma chave PIX pode estar ativa por vez. O checkout usara a chave ativa.
      </p>
    </div>
  )
}
