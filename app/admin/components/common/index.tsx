"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success" | "warning" | "ghost"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}

export function AdminButton({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: AdminButtonProps) {
  const baseStyles = "font-medium rounded-xl transition-all flex items-center justify-center gap-2"
  
  const variantStyles = {
    primary: "bg-primary text-primary-foreground hover:brightness-110",
    secondary: "bg-secondary text-foreground hover:bg-secondary/80",
    danger: "bg-destructive/20 text-destructive hover:bg-destructive/30",
    success: "bg-green-500/20 text-green-400 hover:bg-green-500/30",
    warning: "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30",
    ghost: "hover:bg-secondary/50",
  }
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  }
  
  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

// Card simples para secoes
interface AdminCardProps {
  children: React.ReactNode
  className?: string
}

export function AdminCard({ children, className }: AdminCardProps) {
  return (
    <div className={cn(
      "bg-card rounded-xl border border-border p-4",
      className
    )}>
      {children}
    </div>
  )
}

// Titulo de secao
interface AdminSectionTitleProps {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function AdminSectionTitle({ icon, title, subtitle, action }: AdminSectionTitleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

// Badge de status
interface AdminBadgeProps {
  variant?: "success" | "warning" | "danger" | "info" | "default"
  children: React.ReactNode
  className?: string
}

export function AdminBadge({ variant = "default", children, className }: AdminBadgeProps) {
  const variantStyles = {
    success: "bg-green-500/20 text-green-400",
    warning: "bg-yellow-500/20 text-yellow-400",
    danger: "bg-red-500/20 text-red-400",
    info: "bg-blue-500/20 text-blue-400",
    default: "bg-gray-500/20 text-gray-400",
  }
  
  return (
    <span className={cn(
      "px-3 py-1 text-xs font-medium rounded-full",
      variantStyles[variant],
      className
    )}>
      {children}
    </span>
  )
}

// Switch toggle
interface AdminSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: "sm" | "md"
}

export function AdminSwitch({ checked, onChange, disabled, size = "md" }: AdminSwitchProps) {
  const sizes = {
    sm: { track: "w-10 h-5", thumb: "w-4 h-4", translate: "translate-x-5" },
    md: { track: "w-14 h-7", thumb: "w-5 h-5", translate: "translate-x-8" },
  }
  
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        sizes[size].track,
        "rounded-full transition-all shadow-inner",
        checked ? "bg-primary shadow-primary/30" : "bg-secondary shadow-black/20",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div
        className={cn(
          sizes[size].thumb,
          "bg-white rounded-full shadow-md transform transition-transform",
          checked ? sizes[size].translate : "translate-x-1"
        )}
      />
    </button>
  )
}

// Estado vazio
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <div className="w-12 h-12 mx-auto mb-3 opacity-50">
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// Estado de loading
interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = "Carregando..." }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
      <span className="text-muted-foreground">{message}</span>
    </div>
  )
}

// Input estilizado
interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function AdminInput({ label, error, className, ...props }: AdminInputProps) {
  return (
    <div>
      {label && (
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full mt-1.5 px-4 py-3 bg-background/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all",
          error && "border-destructive focus:ring-destructive/30",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

// Select estilizado
interface AdminSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: Array<{ value: string | number; label: string }>
}

export function AdminSelect({ label, options, className, ...props }: AdminSelectProps) {
  return (
    <div>
      {label && (
        <label className="text-sm text-muted-foreground">{label}</label>
      )}
      <select
        className={cn(
          "w-full mt-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary",
          className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
