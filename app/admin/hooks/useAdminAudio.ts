"use client"

import { useState, useCallback } from "react"
import { NOTIFICATION_FREQUENCIES_STRONG, NOTIFICATION_FREQUENCIES_WEAK, VIBRATION_PATTERN } from "../constants"

interface UseAdminAudioResult {
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
  soundActivated: boolean
  strongNotification: boolean
  setStrongNotification: (strong: boolean) => void
  activateSound: () => void
  playNotificationSound: () => void
  playTestSound: () => void
}

export function useAdminAudio(showToast: (message: string) => void): UseAdminAudioResult {
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [soundActivated, setSoundActivated] = useState(false)
  const [strongNotification, setStrongNotification] = useState(true)

  const playBeepSequence = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const volume = strongNotification ? 0.8 : 0.4
      const frequencies = strongNotification 
        ? NOTIFICATION_FREQUENCIES_STRONG 
        : NOTIFICATION_FREQUENCIES_WEAK
      
      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          try {
            const oscillator = ctx.createOscillator()
            const gainNode = ctx.createGain()
            oscillator.connect(gainNode)
            gainNode.connect(ctx.destination)
            oscillator.frequency.value = freq
            oscillator.type = "sine"
            gainNode.gain.setValueAtTime(volume, ctx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
            oscillator.start()
            oscillator.stop(ctx.currentTime + 0.35)
          } catch {
            // Ignorar erro de tom individual
          }
        }, index * 350)
      })
    } catch {
      // Audio nao suportado
    }
  }, [strongNotification])

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled || !soundActivated) return
    
    // Vibracao no celular (se suportado)
    if (strongNotification && navigator.vibrate) {
      navigator.vibrate(VIBRATION_PATTERN)
    }
    
    playBeepSequence()
  }, [soundEnabled, soundActivated, strongNotification, playBeepSequence])

  const playTestSound = useCallback(() => {
    if (!soundActivated) {
      showToast("Ative o som primeiro!")
      return
    }
    playBeepSequence()
    showToast("Som de teste tocado!")
  }, [soundActivated, playBeepSequence, showToast])

  const activateSound = useCallback(() => {
    setSoundActivated(true)
    setSoundEnabled(true)
    try {
      const ctx = new AudioContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.value = 600
      oscillator.type = "sine"
      gainNode.gain.value = 0.3
      oscillator.start()
      setTimeout(() => {
        oscillator.stop()
        setTimeout(() => {
          const osc2 = ctx.createOscillator()
          const gain2 = ctx.createGain()
          osc2.connect(gain2)
          gain2.connect(ctx.destination)
          osc2.frequency.value = 800
          osc2.type = "sine"
          gain2.gain.value = 0.3
          osc2.start()
          setTimeout(() => osc2.stop(), 150)
        }, 200)
      }, 150)
    } catch {
      // Ignorar erro
    }
    showToast("Som ativado! Voce ouvira alertas de novos pedidos.")
  }, [showToast])

  return {
    soundEnabled,
    setSoundEnabled,
    soundActivated,
    strongNotification,
    setStrongNotification,
    activateSound,
    playNotificationSound,
    playTestSound,
  }
}
