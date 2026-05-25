"use client"

import { useState, useCallback } from "react"
import type { Order } from "@/lib/config-types"
import type { DateFilterType, TabType } from "../types"
import { normalizeText, isOrderConfirmed } from "../utils"

interface UseAdminFiltersResult {
  searchInput: string
  setSearchInput: (input: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  dateFilter: DateFilterType
  setDateFilter: (filter: DateFilterType) => void
  archivedSearchInput: string
  setArchivedSearchInput: (input: string) => void
  archivedSearchQuery: string
  setArchivedSearchQuery: (query: string) => void
  filtroEntregador: string
  setFiltroEntregador: (filtro: string) => void
  filterByDate: (order: Order) => boolean
  filterBySearch: (order: Order) => boolean
  executeSearch: (orders: Order[], setActiveTab: (tab: TabType) => void) => void
}

export function useAdminFilters(): UseAdminFiltersResult {
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all")
  const [archivedSearchInput, setArchivedSearchInput] = useState("")
  const [archivedSearchQuery, setArchivedSearchQuery] = useState("")
  const [filtroEntregador, setFiltroEntregador] = useState<string>("todos")

  const filterByDate = useCallback((order: Order): boolean => {
    if (dateFilter === "all") return true
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const confirmed = isOrderConfirmed(order)
    const dateStr = confirmed && order.paidAt ? order.paidAt : order.createdAt
    const orderDate = new Date(dateStr)
    
    switch (dateFilter) {
      case "today": return orderDate >= today
      case "yesterday": return orderDate >= yesterday && orderDate < today
      case "week": return orderDate >= weekStart
      case "month": return orderDate >= monthStart
      default: return true
    }
  }, [dateFilter])

  const filterBySearch = useCallback((order: Order): boolean => {
    if (!searchQuery.trim()) return true
    
    const query = normalizeText(searchQuery)
    const normalizedId = normalizeText(order.id)
    const normalizedName = normalizeText(order.customerName)
    const normalizedPhone = order.customerPhone.replace(/\D/g, "")
    const normalizedAddress = order.address ? normalizeText(order.address) : ""
    const normalizedPayment = order.paymentMethod ? normalizeText(order.paymentMethod) : ""
    
    return (
      normalizedId.includes(query) ||
      normalizedName.includes(query) ||
      normalizedPhone.includes(query.replace(/\D/g, "")) ||
      normalizedAddress.includes(query) ||
      normalizedPayment.includes(query)
    )
  }, [searchQuery])

  const executeSearch = useCallback((orders: Order[], setActiveTab: (tab: TabType) => void) => {
    setSearchQuery(searchInput)
    
    if (!searchInput.trim()) return
    
    const query = normalizeText(searchInput)
    const matchingOrder = orders.find(o => {
      if (o.archived) return false
      
      const normalizedId = normalizeText(o.id)
      const normalizedName = normalizeText(o.customerName)
      const normalizedPhone = o.customerPhone.replace(/\D/g, "")
      const normalizedAddress = o.address ? normalizeText(o.address) : ""
      const normalizedPayment = o.paymentMethod ? normalizeText(o.paymentMethod) : ""
      
      return (
        normalizedId.includes(query) ||
        normalizedName.includes(query) ||
        normalizedPhone.includes(query.replace(/\D/g, "")) ||
        normalizedAddress.includes(query) ||
        normalizedPayment.includes(query)
      )
    })
    
    if (matchingOrder) {
      const isPendingPayment = matchingOrder.paymentStatus !== "confirmed" && 
        !matchingOrder.manuallyConfirmed &&
        !matchingOrder.confirmedAutomatically &&
        !matchingOrder.paidAt &&
        !["preparing", "delivering", "completed", "cancelled"].includes(matchingOrder.status)
      
      const isPaidWaiting = (matchingOrder.paymentStatus === "confirmed" || matchingOrder.manuallyConfirmed || matchingOrder.confirmedAutomatically || matchingOrder.paidAt) &&
        matchingOrder.status === "confirmed"
      
      if (isPendingPayment) setActiveTab("orders-pending")
      else if (isPaidWaiting) setActiveTab("orders-paid")
      else if (matchingOrder.status === "preparing") setActiveTab("orders-preparing")
      else if (matchingOrder.status === "delivering") setActiveTab("orders-delivering")
      else if (matchingOrder.status === "completed") setActiveTab("orders-completed")
      else if (matchingOrder.status === "cancelled") setActiveTab("orders-cancelled")
    }
  }, [searchInput])

  return {
    searchInput,
    setSearchInput,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    archivedSearchInput,
    setArchivedSearchInput,
    archivedSearchQuery,
    setArchivedSearchQuery,
    filtroEntregador,
    setFiltroEntregador,
    filterByDate,
    filterBySearch,
    executeSearch,
  }
}
