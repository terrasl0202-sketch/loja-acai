"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { type Customer, type CustomerOrder } from "../types"
import { CUSTOMER_SESSION_KEY } from "../constants"

// ============================================================
// CUSTOMER PROVIDER
// Gerencia: sessao do cliente, favoritos, modais de conta
// NAO gerencia: PIX, checkout, pedidos em si, APIs criticas
// ============================================================

interface CustomerContextValue {
  // Cliente atual
  customer: Customer | null
  setCustomer: (customer: Customer | null) => void
  
  // Sessao
  saveCustomerSession: (customer: Customer) => void
  logout: () => void
  
  // Favoritos
  toggleFavorite: (productId: number) => void
  
  // Modais de conta
  showProfileMenu: boolean
  setShowProfileMenu: (show: boolean) => void
  showLoginModal: boolean
  setShowLoginModal: (show: boolean) => void
  showMyAccountModal: boolean
  setShowMyAccountModal: (show: boolean) => void
  showMyOrdersModal: boolean
  setShowMyOrdersModal: (show: boolean) => void
  
  // Login form state
  loginStep: "phone" | "pin" | "register"
  setLoginStep: (step: "phone" | "pin" | "register") => void
  loginPhone: string
  setLoginPhone: (phone: string) => void
  loginPin: string
  setLoginPin: (pin: string) => void
  loginName: string
  setLoginName: (name: string) => void
  loginLoading: boolean
  setLoginLoading: (loading: boolean) => void
  loginError: string
  setLoginError: (error: string) => void
  resetLoginForm: () => void
  
  // Pedidos do cliente (apenas leitura)
  customerOrders: CustomerOrder[]
  setCustomerOrders: (orders: CustomerOrder[]) => void
  loadingOrders: boolean
  setLoadingOrders: (loading: boolean) => void
  
  // Repetir pedido
  showRepeatConfirm: boolean
  setShowRepeatConfirm: (show: boolean) => void
  orderToRepeat: CustomerOrder | null
  setOrderToRepeat: (order: CustomerOrder | null) => void
}

const CustomerContext = createContext<CustomerContextValue | null>(null)

export function useCustomer() {
  const context = useContext(CustomerContext)
  if (!context) {
    throw new Error("useCustomer must be used within a CustomerProvider")
  }
  return context
}

interface CustomerProviderProps {
  children: ReactNode
  onCustomerChange?: (customer: Customer | null) => void
}

export function CustomerProvider({ children, onCustomerChange }: CustomerProviderProps) {
  // Cliente atual
  const [customer, setCustomerState] = useState<Customer | null>(null)
  
  // Modais
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showMyAccountModal, setShowMyAccountModal] = useState(false)
  const [showMyOrdersModal, setShowMyOrdersModal] = useState(false)
  
  // Login form
  const [loginStep, setLoginStep] = useState<"phone" | "pin" | "register">("phone")
  const [loginPhone, setLoginPhone] = useState("")
  const [loginPin, setLoginPin] = useState("")
  const [loginName, setLoginName] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState("")
  
  // Pedidos
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  
  // Repetir pedido
  const [showRepeatConfirm, setShowRepeatConfirm] = useState(false)
  const [orderToRepeat, setOrderToRepeat] = useState<CustomerOrder | null>(null)

  // Carregar sessao ao iniciar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSession = localStorage.getItem(CUSTOMER_SESSION_KEY)
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession) as Customer
          setCustomerState(parsed)
          onCustomerChange?.(parsed)
        } catch {
          localStorage.removeItem(CUSTOMER_SESSION_KEY)
        }
      }
    }
  }, [onCustomerChange])

  // Set customer com callback
  const setCustomer = useCallback((newCustomer: Customer | null) => {
    setCustomerState(newCustomer)
    onCustomerChange?.(newCustomer)
  }, [onCustomerChange])

  // Salvar sessao
  const saveCustomerSession = useCallback((customerData: Customer) => {
    setCustomerState(customerData)
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(customerData))
    onCustomerChange?.(customerData)
  }, [onCustomerChange])

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem(CUSTOMER_SESSION_KEY)
    setCustomerState(null)
    setShowProfileMenu(false)
    onCustomerChange?.(null)
  }, [onCustomerChange])

  // Toggle favorito
  const toggleFavorite = useCallback(async (productId: number) => {
    if (!customer) {
      setShowLoginModal(true)
      return
    }

    const isFavorite = customer.favorites.includes(productId)
    const newFavorites = isFavorite
      ? customer.favorites.filter(id => id !== productId)
      : [...customer.favorites, productId]

    const updatedCustomer = { ...customer, favorites: newFavorites }
    saveCustomerSession(updatedCustomer)

    // Atualizar no servidor (fire and forget)
    try {
      await fetch("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: customer.phone,
          favorites: newFavorites
        })
      })
    } catch {
      // Silently fail - o estado local ja foi atualizado
    }
  }, [customer, saveCustomerSession])

  // Reset login form
  const resetLoginForm = useCallback(() => {
    setLoginStep("phone")
    setLoginPhone("")
    setLoginPin("")
    setLoginName("")
    setLoginError("")
    setLoginLoading(false)
  }, [])

  const value: CustomerContextValue = {
    customer,
    setCustomer,
    saveCustomerSession,
    logout,
    toggleFavorite,
    showProfileMenu,
    setShowProfileMenu,
    showLoginModal,
    setShowLoginModal,
    showMyAccountModal,
    setShowMyAccountModal,
    showMyOrdersModal,
    setShowMyOrdersModal,
    loginStep,
    setLoginStep,
    loginPhone,
    setLoginPhone,
    loginPin,
    setLoginPin,
    loginName,
    setLoginName,
    loginLoading,
    setLoginLoading,
    loginError,
    setLoginError,
    resetLoginForm,
    customerOrders,
    setCustomerOrders,
    loadingOrders,
    setLoadingOrders,
    showRepeatConfirm,
    setShowRepeatConfirm,
    orderToRepeat,
    setOrderToRepeat,
  }

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  )
}
