"use client"

import { X, Loader2 } from "lucide-react"

type LoginStep = "phone" | "pin" | "register"

interface CustomerLoginModalProps {
  loginStep: LoginStep
  loginPhone: string
  loginPin: string
  loginName: string
  loginError: string
  loginLoading: boolean
  onPhoneChange: (value: string) => void
  onPinChange: (value: string) => void
  onNameChange: (value: string) => void
  onLoginNext: () => void
  onLogin: () => void
  onRegister: () => void
  onBack: () => void
  onClose: () => void
}

export function CustomerLoginModal({
  loginStep,
  loginPhone,
  loginPin,
  loginName,
  loginError,
  loginLoading,
  onPhoneChange,
  onPinChange,
  onNameChange,
  onLoginNext,
  onLogin,
  onRegister,
  onBack,
  onClose,
}: CustomerLoginModalProps) {
  return (
    <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-foreground">
            {loginStep === "phone" && "Entrar ou Criar Conta"}
            {loginStep === "pin" && "Digite seu PIN"}
            {loginStep === "register" && "Criar Conta"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {loginStep === "phone" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Telefone</label>
              <input
                type="tel"
                value={loginPhone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {loginError && (
              <p className="text-sm text-red-500">{loginError}</p>
            )}
            <button
              onClick={onLoginNext}
              disabled={loginLoading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Continuar
            </button>
          </div>
        )}
        
        {loginStep === "pin" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">PIN de 4 digitos</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={loginPin}
                onChange={(e) => onPinChange(e.target.value.replace(/\D/g, ""))}
                placeholder="****"
                className="w-full px-4 py-3 bg-secondary rounded-xl text-foreground text-center text-2xl tracking-widest placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {loginError && (
              <p className="text-sm text-red-500">{loginError}</p>
            )}
            <button
              onClick={onLogin}
              disabled={loginLoading || loginPin.length !== 4}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Entrar
            </button>
            <button
              onClick={onBack}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Voltar
            </button>
          </div>
        )}
        
        {loginStep === "register" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Telefone nao encontrado. Crie sua conta:
            </p>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Seu nome</label>
              <input
                type="text"
                value={loginName}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Digite seu nome"
                className="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Crie um PIN de 4 digitos</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={loginPin}
                onChange={(e) => onPinChange(e.target.value.replace(/\D/g, ""))}
                placeholder="****"
                className="w-full px-4 py-3 bg-secondary rounded-xl text-foreground text-center text-2xl tracking-widest placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">Use este PIN para acessar sua conta</p>
            </div>
            {loginError && (
              <p className="text-sm text-red-500">{loginError}</p>
            )}
            <button
              onClick={onRegister}
              disabled={loginLoading || loginPin.length !== 4 || !loginName.trim()}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Criar Conta
            </button>
            <button
              onClick={onBack}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
