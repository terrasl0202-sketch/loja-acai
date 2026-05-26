"use client"

import { X, Loader2, Phone, Lock, User, ArrowLeft, Sparkles } from "lucide-react"

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
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl p-6 max-w-sm w-full border border-border animate-in fade-in zoom-in duration-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {loginStep !== "phone" && (
              <button
                onClick={onBack}
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {loginStep === "phone" && "Entrar ou Criar Conta"}
                {loginStep === "pin" && "Digite seu PIN"}
                {loginStep === "register" && "Criar Conta"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loginStep === "phone" && "Use seu telefone para acessar"}
                {loginStep === "pin" && "Insira seu codigo de 4 digitos"}
                {loginStep === "register" && "Preencha seus dados"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {loginStep === "phone" && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                Telefone
              </label>
              <input
                type="tel"
                value={loginPhone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="(11) 99999-9999"
                autoFocus
                className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-400">{loginError}</p>
              </div>
            )}
            <button
              onClick={onLoginNext}
              disabled={loginLoading || loginPhone.length < 10}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {loginLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Continuar</>
              )}
            </button>
          </div>
        )}
        
        {loginStep === "pin" && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                PIN de acesso
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={loginPin}
                onChange={(e) => onPinChange(e.target.value.replace(/\D/g, ""))}
                placeholder="****"
                autoFocus
                className="w-full px-4 py-4 bg-secondary/50 border border-border rounded-xl text-foreground text-center text-3xl tracking-[0.5em] font-bold placeholder:text-muted-foreground placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Digite os 4 digitos do seu PIN
              </p>
            </div>
            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-400">{loginError}</p>
              </div>
            )}
            <button
              onClick={onLogin}
              disabled={loginLoading || loginPin.length !== 4}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {loginLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Entrar</>
              )}
            </button>
          </div>
        )}
        
        {loginStep === "register" && (
          <div className="space-y-5">
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">
                Telefone nao encontrado. Crie sua conta para acompanhar pedidos e ganhar beneficios!
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Seu nome
              </label>
              <input
                type="text"
                value={loginName}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Como podemos te chamar?"
                autoFocus
                className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Crie um PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={loginPin}
                onChange={(e) => onPinChange(e.target.value.replace(/\D/g, ""))}
                placeholder="****"
                className="w-full px-4 py-4 bg-secondary/50 border border-border rounded-xl text-foreground text-center text-3xl tracking-[0.5em] font-bold placeholder:text-muted-foreground placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Use este PIN para acessar sua conta
              </p>
            </div>
            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-400">{loginError}</p>
              </div>
            )}
            <button
              onClick={onRegister}
              disabled={loginLoading || loginPin.length !== 4 || !loginName.trim()}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {loginLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Criar Conta</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
