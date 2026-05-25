"use client"

import { useState, useEffect, useCallback } from "react"
import type { SiteConfig } from "@/lib/config-types"
import { defaultConfig } from "@/lib/config-types"

interface UseAdminAuthResult {
  isAuthenticated: boolean
  sessionPassword: string
  password: string
  setPassword: (password: string) => void
  authError: string
  loading: boolean
  handleLogin: (e: React.FormEvent) => Promise<void>
  handleLogout: () => void
}

export function useAdminAuth(
  onAuthSuccess: (password: string) => void,
  setConfig: React.Dispatch<React.SetStateAction<SiteConfig>>
): UseAdminAuthResult {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionPassword, setSessionPassword] = useState("")
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [loading, setLoading] = useState(false)

  // Verificar sessao persistente ao carregar
  useEffect(() => {
    const sessionData = localStorage.getItem("admin_session")
    if (sessionData) {
      try {
        const { password: savedPassword, expiry } = JSON.parse(sessionData)
        if (new Date().getTime() < expiry) {
          setSessionPassword(savedPassword)
          setIsAuthenticated(true)
          onAuthSuccess(savedPassword)
        } else {
          localStorage.removeItem("admin_session")
        }
      } catch {
        localStorage.removeItem("admin_session")
      }
    }
  }, [onAuthSuccess])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError("")
    setLoading(true)

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (data.success) {
        setIsAuthenticated(true)
        setSessionPassword(password)
        onAuthSuccess(password)
        setPassword("")
        // Salvar sessao por 1 hora
        const expiry = new Date().getTime() + (60 * 60 * 1000)
        localStorage.setItem("admin_session", JSON.stringify({ password, expiry }))
      } else {
        setAuthError("Senha incorreta")
      }
    } catch {
      setAuthError("Erro ao autenticar")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false)
    setSessionPassword("")
    setConfig(defaultConfig)
    localStorage.removeItem("admin_session")
  }, [setConfig])

  return {
    isAuthenticated,
    sessionPassword,
    password,
    setPassword,
    authError,
    loading,
    handleLogin,
    handleLogout,
  }
}
