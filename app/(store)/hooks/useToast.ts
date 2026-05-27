"use client"

import { useState, useCallback } from "react"
import { TOAST_DURATION, ADD_TOAST_DURATION } from "../constants"

export interface UseToastReturn {
  toastMessage: string | null
  addToast: { show: boolean; productName: string }
  showToast: (message: string) => void
  showAddToast: (productName: string) => void
}

export function useToast(): UseToastReturn {
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [addToast, setAddToast] = useState<{ show: boolean; productName: string }>({
    show: false,
    productName: "",
  })

  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), TOAST_DURATION)
  }, [])

  const showAddToast = useCallback((productName: string) => {
    setAddToast({ show: true, productName })
    setTimeout(() => setAddToast({ show: false, productName: "" }), ADD_TOAST_DURATION)
  }, [])

  return {
    toastMessage,
    addToast,
    showToast,
    showAddToast,
  }
}
