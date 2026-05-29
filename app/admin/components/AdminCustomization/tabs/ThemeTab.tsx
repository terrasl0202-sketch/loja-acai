"use client"

import { Sun, Moon, Monitor } from "lucide-react"
import { CustomizationTheme, ThemeMode } from "@/lib/config-types"

interface ThemeTabProps {
  theme: CustomizationTheme
  onUpdate: (updates: Partial<CustomizationTheme>) => void
}

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    id: "light", 
    label: "Claro", 
    icon: <Sun className="w-6 h-6" />,
    description: "Fundo branco com texto escuro"
  },
  { 
    id: "dark", 
    label: "Escuro", 
    icon: <Moon className="w-6 h-6" />,
    description: "Fundo escuro com texto claro"
  },
  { 
    id: "auto", 
    label: "Automatico", 
    icon: <Monitor className="w-6 h-6" />,
    description: "Segue preferencia do dispositivo"
  },
]

export function ThemeTab({ theme, onUpdate }: ThemeTabProps) {
  return (
    <div className="space-y-8">
      {/* Selecao de tema */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Modo de Tema</h3>
          <p className="text-sm text-muted-foreground">Escolha o tema padrao da sua loja</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => onUpdate({ mode: option.id })}
              className={`p-6 rounded-xl border-2 text-left transition-all ${
                theme.mode === option.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 bg-card/50"
              }`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                theme.mode === option.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}>
                {option.icon}
              </div>
              <h4 className="font-semibold text-foreground">{option.label}</h4>
              <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Preview do tema */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Preview</h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          {/* Preview Light */}
          <div className={`p-4 rounded-xl border ${theme.mode === 'light' ? 'ring-2 ring-primary' : ''}`} style={{ backgroundColor: '#fafafa', color: '#0a0a0a' }}>
            <div className="flex items-center gap-2 mb-3">
              <Sun className="w-4 h-4" />
              <span className="font-medium">Modo Claro</span>
            </div>
            <div className="space-y-2">
              <div className="h-8 rounded-lg" style={{ backgroundColor: '#f5f5f5' }} />
              <div className="h-4 w-3/4 rounded" style={{ backgroundColor: '#e5e5e5' }} />
              <div className="h-4 w-1/2 rounded" style={{ backgroundColor: '#e5e5e5' }} />
              <div className="h-10 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: '#a855f7' }}>
                Botao
              </div>
            </div>
          </div>

          {/* Preview Dark */}
          <div className={`p-4 rounded-xl border ${theme.mode === 'dark' ? 'ring-2 ring-primary' : ''}`} style={{ backgroundColor: '#0a0a0a', color: '#fafafa' }}>
            <div className="flex items-center gap-2 mb-3">
              <Moon className="w-4 h-4" />
              <span className="font-medium">Modo Escuro</span>
            </div>
            <div className="space-y-2">
              <div className="h-8 rounded-lg" style={{ backgroundColor: '#171717' }} />
              <div className="h-4 w-3/4 rounded" style={{ backgroundColor: '#262626' }} />
              <div className="h-4 w-1/2 rounded" style={{ backgroundColor: '#262626' }} />
              <div className="h-10 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: '#a855f7' }}>
                Botao
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Opcao de cliente trocar tema */}
      <div className="p-4 bg-secondary/30 rounded-xl border border-border">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-foreground">Permitir cliente trocar tema</h4>
            <p className="text-sm text-muted-foreground">O cliente podera alternar entre claro/escuro no site</p>
          </div>
          <div className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
            Em breve
          </div>
        </div>
      </div>
    </div>
  )
}
