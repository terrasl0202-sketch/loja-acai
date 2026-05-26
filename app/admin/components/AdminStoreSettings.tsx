"use client"

import { Store, AlertCircle, Loader2, Check, WifiOff, Clock, Phone, Instagram, MapPin } from "lucide-react"
import { useStoreSettings } from "@/hooks/useStoreSettings"

// ============================================================
// ADMIN STORE SETTINGS
// Gerencia TODAS as configuracoes da loja via useStoreSettings hook
// Hook usa storage adapter -> localStorage (preparado para Supabase)
// ============================================================

export function AdminStoreSettings() {
  const { 
    settings, 
    isLoading, 
    isSaving, 
    updateSettings, 
    toggleOpen, 
    toggleManualControl,
    lastSaved 
  } = useStoreSettings()

  // Feedback visual de salvamento
  const showSaveSuccess = lastSaved && (Date.now() - new Date(lastSaved).getTime()) < 2000

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Store className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">Configuracoes da Loja</h2>
          <p className="text-xs text-muted-foreground">Gerencie as informacoes principais</p>
        </div>
        {showSaveSuccess && (
          <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
            <Check className="w-4 h-4" />
            Salvo
          </div>
        )}
        {(isLoading || isSaving) && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      </div>

      <div className="space-y-4">
        {/* Nome da Loja */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome da Loja</label>
          <input
            type="text"
            value={settings.storeName}
            onChange={(e) => updateSettings({ storeName: e.target.value })}
            disabled={isLoading}
            placeholder="Ex: Acai da Terra"
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50"
          />
        </div>

        {/* Subtitulo */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subtitulo</label>
          <input
            type="text"
            value={settings.subtitle}
            onChange={(e) => updateSettings({ subtitle: e.target.value })}
            disabled={isLoading}
            placeholder="Ex: Delivery de Acai"
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50"
          />
        </div>

        {/* Slogan */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Slogan</label>
          <input
            type="text"
            value={settings.slogan}
            onChange={(e) => updateSettings({ slogan: e.target.value })}
            disabled={isLoading}
            placeholder="Ex: O melhor acai da cidade"
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50"
          />
        </div>

        {/* Status da Loja */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-secondary/30 to-secondary/10 rounded-xl border border-border/30">
          <div>
            <p className="font-semibold text-foreground text-sm">Status da Loja</p>
            {isLoading ? (
              <p className="text-xs text-muted-foreground mt-0.5">Carregando...</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                {settings.storeOpen ? "Loja esta ABERTA" : "Loja esta FECHADA"}
              </p>
            )}
          </div>
          <button
            onClick={toggleOpen}
            disabled={isLoading}
            className={`w-14 h-7 rounded-full transition-all shadow-inner disabled:opacity-50 ${
              settings.storeOpen ? "bg-green-500 shadow-green-600/30" : "bg-red-500/80 shadow-red-600/30"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                settings.storeOpen ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Controle Manual */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-secondary/30 to-secondary/10 rounded-xl border border-border/30">
          <div>
            <p className="font-semibold text-foreground text-sm">Controle Manual</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ignorar horario automatico</p>
          </div>
          <button
            onClick={toggleManualControl}
            disabled={isLoading}
            className={`w-14 h-7 rounded-full transition-all shadow-inner disabled:opacity-50 ${
              settings.manualControl ? "bg-primary shadow-primary/30" : "bg-secondary shadow-black/20"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                settings.manualControl ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Horarios de Funcionamento */}
        <div className="p-4 bg-gradient-to-r from-secondary/30 to-secondary/10 rounded-xl border border-border/30 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <p className="font-semibold text-foreground text-sm">Horario de Funcionamento</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Abertura</label>
              <input
                type="time"
                value={settings.openTime}
                onChange={(e) => updateSettings({ openTime: e.target.value })}
                disabled={isLoading}
                className="w-full mt-1 px-3 py-2 bg-background/50 border border-border/50 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fechamento</label>
              <input
                type="time"
                value={settings.closeTime}
                onChange={(e) => updateSettings({ closeTime: e.target.value })}
                disabled={isLoading}
                className="w-full mt-1 px-3 py-2 bg-background/50 border border-border/50 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Horario atual: {settings.openTime} as {settings.closeTime}
          </p>
        </div>

        {/* Mensagem quando fechado */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensagem quando Fechado</label>
          <textarea
            value={settings.closedMessage}
            onChange={(e) => updateSettings({ closedMessage: e.target.value })}
            disabled={isLoading}
            rows={2}
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50 resize-none"
          />
        </div>

        {/* Contato - WhatsApp */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Phone className="w-3 h-3" /> WhatsApp
          </label>
          <input
            type="text"
            value={settings.whatsapp}
            onChange={(e) => updateSettings({ whatsapp: e.target.value })}
            disabled={isLoading}
            placeholder="5511999999999"
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground mt-1">Formato: 5511999999999 (com codigo do pais)</p>
        </div>

        {/* Contato - Instagram */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Instagram className="w-3 h-3" /> Instagram
          </label>
          <input
            type="text"
            value={settings.instagram}
            onChange={(e) => updateSettings({ instagram: e.target.value })}
            disabled={isLoading}
            placeholder="@suaacai"
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50"
          />
        </div>

        {/* Contato - Endereco */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Endereco
          </label>
          <input
            type="text"
            value={settings.address}
            onChange={(e) => updateSettings({ address: e.target.value })}
            disabled={isLoading}
            placeholder="Rua Principal, 123 - Centro"
            className="w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50"
          />
        </div>

        {/* Indicador de armazenamento */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <WifiOff className="w-3.5 h-3.5 text-yellow-400" />
          <span>Configuracoes salvas via: <span className="text-yellow-400">Storage Adapter</span></span>
        </div>

        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Dica</p>
              <p className="text-sm text-muted-foreground">
                Todas as informacoes salvas aqui aparecem automaticamente na loja publica.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
