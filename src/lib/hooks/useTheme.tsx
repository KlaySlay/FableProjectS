'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useActiveUser } from './useActiveUser'
import type { ThemePreference } from '@/types'

export const ACCENT_PRESETS = [
  { name: 'Violet', hex: '#c084fc' },
  { name: 'Ember', hex: '#fb923c' },
  { name: 'Sky', hex: '#38bdf8' },
  { name: 'Mint', hex: '#34d399' },
  { name: 'Rose', hex: '#fb7185' },
  { name: 'Amber', hex: '#fbbf24' },
  { name: 'Slate', hex: '#94a3b8' },
  { name: 'Chalk', hex: '#e2e8f0' },
]

type ThemeContextValue = {
  accent: string
  themePreference: ThemePreference
  setLocalTheme: (pref: ThemePreference) => void
  setLocalAccent: (hex: string) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  accent: '#c084fc',
  themePreference: 'system',
  setLocalTheme: () => {},
  setLocalAccent: () => {},
})

function applyTheme(pref: ThemePreference) {
  const root = document.documentElement
  const dark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('light', !dark)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useActiveUser()
  const [accent, setAccent] = useState('#c084fc')
  const [themePreference, setThemePreference] = useState<ThemePreference>('system')

  useEffect(() => {
    if (user) {
      setAccent(user.accentColor)
      setThemePreference(user.themePreference)
    }
  }, [user])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent)
  }, [accent])

  useEffect(() => {
    applyTheme(themePreference)
    if (themePreference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => applyTheme('system')
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [themePreference])

  return (
    <ThemeContext.Provider
      value={{ accent, themePreference, setLocalTheme: setThemePreference, setLocalAccent: setAccent }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
