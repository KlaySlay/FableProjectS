'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getCurrentProfile } from '@/lib/supabase/userStorage'
import type { AppUser, ThemePreference } from '@/types'

type ActiveUserContextValue = {
  user: (AppUser & { themePreference: ThemePreference }) | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const ActiveUserContext = createContext<ActiveUserContextValue>({
  user: null,
  loading: true,
  refreshUser: async () => {},
})

export function ActiveUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(AppUser & { themePreference: ThemePreference }) | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const profile = await getCurrentProfile()
    setUser(profile)
    setLoading(false)
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  return (
    <ActiveUserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </ActiveUserContext.Provider>
  )
}

export function useActiveUser() {
  return useContext(ActiveUserContext)
}
