"use client"

import { useState } from "react"
import { 
  Download, 
  Upload, 
  Database, 
  Package, 
  Users, 
  ShoppingBag, 
  Tag, 
  MapPin, 
  Settings, 
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Truck
} from "lucide-react"

interface AdminBackupProps {
  sessionPassword: string
}

type BackupType = "full" | "products" | "categories" | "customers" | "orders" | "coupons" | "neighborhoods" | "settings" | "entregadores"
type ExportType = "orders" | "customers" | "products"

const backupOptions: { type: BackupType; label: string; icon: typeof Database; description: string }[] = [
  { type: "full", label: "Backup Completo", icon: Database, description: "Todos os dados do sistema" },
  { type: "products", label: "Produtos", icon: Package, description: "Catalogo de produtos" },
  { type: "categories", label: "Categorias", icon: Tag, description: "Categorias de produtos" },
  { type: "customers", label: "Clientes", icon: Users, description: "Base de clientes" },
  { type: "orders", label: "Pedidos", icon: ShoppingBag, description: "Historico de pedidos" },
  { type: "coupons", label: "Cupons", icon: Tag, description: "Cupons de desconto" },
  { type: "neighborhoods", label: "Bairros", icon: MapPin, description: "Taxas de entrega" },
  { type: "entregadores", label: "Entregadores", icon: Truck, description: "Equipe de entrega" },
  { type: "settings", label: "Configuracoes", icon: Settings, description: "Configuracoes da loja" },
]

const exportOptions: { type: ExportType; label: string; description: string }[] = [
  { type: "orders", label: "Pedidos.xlsx", description: "Relatorio de vendas" },
  { type: "customers", label: "Clientes.xlsx", description: "Base de clientes com totais" },
  { type: "products", label: "Produtos.xlsx", description: "Produtos com vendas" },
]

export function AdminBackup({ sessionPassword }: AdminBackupProps) {
  const [loadingBackup, setLoadingBackup] = useState<BackupType | null>(null)
  const [loadingExport, setLoadingExport] = useState<ExportType | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  const handleBackup = async (type: BackupType) => {
    setLoadingBackup(type)
    setMessage(null)
    
    try {
      const response = await fetch(`/api/backup?type=${type}`, {
        headers: { "x-admin-password": sessionPassword }
      })
      
      if (!response.ok) {
        throw new Error("Falha ao gerar backup")
      }
      
      // Baixar arquivo
      const blob = await response.blob()
      const filename = response.headers.get("content-disposition")?.split("filename=")[1]?.replace(/"/g, "") || `backup-${type}.json`
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setMessage({ type: "success", text: `Backup de ${type} baixado com sucesso!` })
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao gerar backup" })
      console.error(error)
    } finally {
      setLoadingBackup(null)
    }
  }
  
  const handleExport = async (type: ExportType) => {
    setLoadingExport(type)
    setMessage(null)
    
    try {
      const response = await fetch(`/api/export?type=${type}`, {
        headers: { "x-admin-password": sessionPassword }
      })
      
      if (!response.ok) {
        throw new Error("Falha ao exportar")
      }
      
      const blob = await response.blob()
      const filename = response.headers.get("content-disposition")?.split("filename=")[1]?.replace(/"/g, "") || `${type}.xlsx`
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setMessage({ type: "success", text: `${type}.xlsx exportado com sucesso!` })
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao exportar" })
      console.error(error)
    } finally {
      setLoadingExport(null)
    }
  }
  
  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    setMessage(null)
    
    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-password": sessionPassword 
        },
        body: JSON.stringify(backup)
      })
      
      const result = await response.json()
      
      if (result.success) {
        setMessage({ type: "success", text: "Backup restaurado com sucesso!" })
      } else {
        setMessage({ type: "error", text: "Alguns itens falharam na restauracao" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao restaurar backup" })
      console.error(error)
    }
    
    // Limpar input
    event.target.value = ""
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Backup e Seguranca</h2>
          <p className="text-sm text-muted-foreground">Exporte e restaure dados do sistema</p>
        </div>
      </div>
      
      {/* Mensagem */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === "success" 
            ? "bg-green-500/10 text-green-400 border border-green-500/20" 
            : "bg-red-500/10 text-red-400 border border-red-500/20"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}
      
      {/* Backup JSON */}
      <div className="bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-primary" />
          <h3 className="font-medium text-foreground">Backup JSON</h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {backupOptions.map(option => (
            <button
              key={option.type}
              onClick={() => handleBackup(option.type)}
              disabled={loadingBackup !== null}
              className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                {loadingBackup === option.type ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <option.icon className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">{option.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Exportar Excel */}
      <div className="bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-green-500" />
          <h3 className="font-medium text-foreground">Exportar Excel</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {exportOptions.map(option => (
            <button
              key={option.type}
              onClick={() => handleExport(option.type)}
              disabled={loadingExport !== null}
              className="p-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors text-left border border-green-500/20 disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                {loadingExport === option.type ? (
                  <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-green-500" />
                )}
                <span className="text-sm font-medium text-green-400">{option.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Restaurar Backup */}
      <div className="bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-amber-500" />
          <h3 className="font-medium text-foreground">Restaurar Backup</h3>
        </div>
        
        <div className="p-4 border-2 border-dashed border-border rounded-xl text-center">
          <input
            type="file"
            accept=".json"
            onChange={handleRestore}
            className="hidden"
            id="restore-input"
          />
          <label 
            htmlFor="restore-input"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Clique para selecionar arquivo .json</span>
            <span className="text-xs text-amber-500">Cuidado: isso pode sobrescrever dados existentes</span>
          </label>
        </div>
      </div>
    </div>
  )
}
