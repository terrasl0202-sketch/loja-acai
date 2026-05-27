"use client"

import { useState, useCallback } from "react"
import { TOAST_DURATION } from "../constants"

interface UseAdminToastResult {
  toastMessage: string | null
  showToast: (message: string) => void
  manualCopyText: string | null
  setManualCopyText: (text: string | null) => void
  manualEntregadorLink: string | null
  setManualEntregadorLink: (link: string | null) => void
}

export function useAdminToast(): UseAdminToastResult {
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [manualCopyText, setManualCopyText] = useState<string | null>(null)
  const [manualEntregadorLink, setManualEntregadorLink] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), TOAST_DURATION)
  }, [])

  return {
    toastMessage,
    showToast,
    manualCopyText,
    setManualCopyText,
    manualEntregadorLink,
    setManualEntregadorLink,
  }
}
