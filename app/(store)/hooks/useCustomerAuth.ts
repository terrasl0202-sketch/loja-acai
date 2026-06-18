"use client"

import { useState, useEffect, useCallback } from "react"
import { type Customer } from "@/lib/config-types"
import { CUSTOMER_SESSION_KEY } from "../constants"
import type { FormData, CustomerOrder } from "../types"

export interface UseCustomerAuthReturn {
  customer: Customer | null
  showProfileMenu: boolean
  showLoginModal: boolean
  showMyOrdersModal: boolean
  showMyAccountModal: boolean
  loginStep: "phone" | "pin" | "register"
  loginPhone: string
  loginPin: string
  loginName: string
  loginLoading: boolean
  loginError: string
  customerOrders: CustomerOrder[]
  loadingOrders: boolean
  setShowProfileMenu: (show: boolean) => void
  setShowLoginModal: (show: boolean) => void
  setShowMyOrdersModal: (show: boolean) => void
  setShowMyAccountModal: (show: boolean) => void
  setLoginPhone: (phone: string) => void
  setLoginPin: (pin: string) => void
  setLoginName: (name: string) => void
  handleCustomerLogout: () => void
  handleLogin: () => Promise<void>
  handleRegister: () => Promise<void>
  handleLoginNext: () => Promise<void>
  resetLoginForm: () => void
  loadCustomerOrders: () => Promise<void>
  toggleFavorite: (productId: number) => Promise<void>
  saveCustomerSession: (customerData: Customer) => void
  fillFormWithCustomerData: (customerData: Customer, setFormData: React.Dispatch<React.SetStateAction<FormData>>) => void
}

export function useCustomerAuth(
  showToast: (message: string) => void,
  setFormData?: React.Dispatch<React.SetStateAction<FormData>>
): UseCustomerAuthReturn {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showMyOrdersModal, setShowMyOrdersModal] = useState(false)
  const [showMyAccountModal, setShowMyAccountModal] = useState(false)
  const [loginStep, setLoginStep] = useState<"phone" | "pin" | "register">("phone")
  const [loginPhone, setLoginPhone] = useState("")
  const [loginPin, setLoginPin] = useState("")
  const [loginName, setLoginName] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  // Preencher dados do cliente no formulario
  const fillFormWithCustomerData = useCallback(
    (customerData: Customer, formSetter?: React.Dispatch<React.SetStateAction<FormData>>) => {
      const setter = formSetter || setFormData
      if (setter) {
        setter((prev) => ({
          ...prev,
          nome: customerData.name || prev.nome,
          telefone: customerData.phone || prev.telefone,
          endereco: customerData.savedAddress?.endereco || prev.endereco,
          numero: customerData.savedAddress?.numero || prev.numero,
          bairro: customerData.savedAddress?.bairro || prev.bairro,
          referencia: customerData.savedAddress?.referencia || prev.referencia,
        }))
      }
    },
    [setFormData]
  )

  // Salvar sessao do cliente
  const saveCustomerSession = useCallback(
    (customerData: Customer) => {
      setCustomer(customerData)
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(customerData))
    },
    []
  )

  // Carregar sessao ao iniciar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSession = localStorage.getItem(CUSTOMER_SESSION_KEY)
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession) as Customer
          setCustomer(parsed)
          if (setFormData) {
            fillFormWithCustomerData(parsed, setFormData)
          }
        } catch {
          localStorage.removeItem(CUSTOMER_SESSION_KEY)
        }
      }
    }
  }, [fillFormWithCustomerData, setFormData])

  // Logout
  const handleCustomerLogout = useCallback(() => {
    setCustomer(null)
    localStorage.removeItem(CUSTOMER_SESSION_KEY)
    setShowProfileMenu(false)
    showToast("Voce saiu da sua conta")
  }, [showToast])

  // Verificar telefone
  const checkPhoneExists = async (phone: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/customers?phone=${encodeURIComponent(phone)}`)
      const data = await res.json()
      return data.found === true
    } catch {
      return false
    }
  }

  // Login
  const handleLogin = useCallback(async () => {
    setLoginLoading(true)
    setLoginError("")

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          phone: loginPhone,
          pin: loginPin,
        }),
      })

      const data = await res.json()

      if (data.success) {
        saveCustomerSession(data.customer)
        if (setFormData) {
          fillFormWithCustomerData(data.customer, setFormData)
        }
        setShowLoginModal(false)
        setLoginStep("phone")
        setLoginPhone("")
        setLoginPin("")
        setLoginName("")
        setLoginError("")
        showToast(`Bem-vindo(a), ${data.customer.name}!`)
      } else {
        setLoginError(data.error || "Erro ao fazer login")
      }
    } catch {
      setLoginError("Erro de conexao")
    } finally {
      setLoginLoading(false)
    }
  }, [loginPhone, loginPin, saveCustomerSession, fillFormWithCustomerData, setFormData, showToast])

  // Registrar
  const handleRegister = useCallback(async () => {
    setLoginLoading(true)
    setLoginError("")

    if (loginPin.length !== 4) {
      setLoginError("PIN deve ter 4 digitos")
      setLoginLoading(false)
      return
    }

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          phone: loginPhone,
          name: loginName,
          pin: loginPin,
        }),
      })

      const data = await res.json()

      if (data.success) {
        saveCustomerSession(data.customer)
        if (setFormData) {
          fillFormWithCustomerData(data.customer, setFormData)
        }
        setShowLoginModal(false)
        setLoginStep("phone")
        setLoginPhone("")
        setLoginPin("")
        setLoginName("")
        setLoginError("")
        showToast("Conta criada com sucesso!")
      } else {
        setLoginError(data.error || "Erro ao criar conta")
      }
    } catch {
      setLoginError("Erro de conexao")
    } finally {
      setLoginLoading(false)
    }
  }, [loginPhone, loginPin, loginName, saveCustomerSession, fillFormWithCustomerData, setFormData, showToast])

  // Avancar no login
  const handleLoginNext = useCallback(async () => {
    if (loginStep === "phone") {
      if (!loginPhone || loginPhone.replace(/\D/g, "").length < 10) {
        setLoginError("Digite um telefone valido")
        return
      }

      setLoginLoading(true)
      const exists = await checkPhoneExists(loginPhone)
      setLoginLoading(false)

      if (exists) {
        setLoginStep("pin")
      } else {
        setLoginStep("register")
      }
    }
  }, [loginStep, loginPhone])

  // Resetar formulario
  const resetLoginForm = useCallback(() => {
    setLoginStep("phone")
    setLoginPhone("")
    setLoginPin("")
    setLoginName("")
    setLoginError("")
  }, [])

  // Carregar pedidos
  const loadCustomerOrders = useCallback(async () => {
    if (!customer) return

    setLoadingOrders(true)
    try {
      const res = await fetch(`/api/customers/orders?phone=${customer.phone}`)
      const data = await res.json()
      if (data.success) {
        setCustomerOrders(data.orders || [])
      }
    } catch {
      console.error("Erro ao carregar pedidos")
    } finally {
      setLoadingOrders(false)
    }
  }, [customer])

  // Toggle favorito
  const toggleFavorite = useCallback(
    async (productId: number) => {
      if (!customer) {
        setShowLoginModal(true)
        return
      }

      try {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            phone: customer.phone,
            toggleFavorite: productId,
          }),
        })

        const data = await res.json()
        if (data.success) {
          saveCustomerSession(data.customer)
          const isFav = data.customer.favorites.includes(productId)
          showToast(isFav ? "Adicionado aos favoritos!" : "Removido dos favoritos")
        }
      } catch {
        showToast("Erro ao atualizar favoritos")
      }
    },
    [customer, saveCustomerSession, showToast]
  )

  return {
    customer,
    showProfileMenu,
    showLoginModal,
    showMyOrdersModal,
    showMyAccountModal,
    loginStep,
    loginPhone,
    loginPin,
    loginName,
    loginLoading,
    loginError,
    customerOrders,
    loadingOrders,
    setShowProfileMenu,
    setShowLoginModal,
    setShowMyOrdersModal,
    setShowMyAccountModal,
    setLoginPhone,
    setLoginPin,
    setLoginName,
    handleCustomerLogout,
    handleLogin,
    handleRegister,
    handleLoginNext,
    resetLoginForm,
    loadCustomerOrders,
    toggleFavorite,
    saveCustomerSession,
    fillFormWithCustomerData,
  }
}
