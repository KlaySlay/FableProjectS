'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getCommunity, getMyCommunities, subscribeToCategories } from '@/lib/supabase/communityStorage'
import { useActiveUser } from './useActiveUser'
import type { Community } from '@/types'

const ACTIVE_COMMUNITY_KEY = 'ps_active_community'

type CommunityContextValue = {
  community: Community | null
  loading: boolean
  myCommunities: { id: string; name: string; memberCount: number; role: string }[]
  switchCommunity: (communityId: string) => Promise<void>
  refreshCommunity: () => Promise<void>
}

const CommunityContext = createContext<CommunityContextValue>({
  community: null,
  loading: true,
  myCommunities: [],
  switchCommunity: async () => {},
  refreshCommunity: async () => {},
})

export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useActiveUser()
  const [community, setCommunity] = useState<Community | null>(null)
  const [myCommunities, setMyCommunities] = useState<
    { id: string; name: string; memberCount: number; role: string }[]
  >([])
  const [loading, setLoading] = useState(true)

  const loadCommunities = useCallback(async () => {
    if (!user) return
    const list = await getMyCommunities(user.id)
    setMyCommunities(list)

    const stored = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_COMMUNITY_KEY) : null
    const targetId = list.find((c) => c.id === stored)?.id ?? list[0]?.id ?? null
    if (targetId) {
      const full = await getCommunity(targetId)
      setCommunity(full)
      localStorage.setItem(ACTIVE_COMMUNITY_KEY, targetId)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadCommunities()
  }, [loadCommunities])

  // Realtime: category changes propagate to all members
  useEffect(() => {
    if (!community) return
    return subscribeToCategories(community.id, async () => {
      const full = await getCommunity(community.id)
      setCommunity(full)
    })
  }, [community?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const switchCommunity = useCallback(async (communityId: string) => {
    const full = await getCommunity(communityId)
    setCommunity(full)
    localStorage.setItem(ACTIVE_COMMUNITY_KEY, communityId)
  }, [])

  const refreshCommunity = useCallback(async () => {
    if (!community) return
    const full = await getCommunity(community.id)
    setCommunity(full)
    if (user) setMyCommunities(await getMyCommunities(user.id))
  }, [community, user])

  return (
    <CommunityContext.Provider
      value={{ community, loading, myCommunities, switchCommunity, refreshCommunity }}
    >
      {children}
    </CommunityContext.Provider>
  )
}

export function useCommunity() {
  return useContext(CommunityContext)
}
