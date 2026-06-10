'use client'

import { useCallback, useEffect, useState } from 'react'
import { getPhotosForDate } from '@/lib/supabase/photoStorage'
import { useCommunity } from './useCommunity'
import type { CalendarPhoto, Photo } from '@/types'

/**
 * Day view data hook. Returns { photos, refresh } — refresh() must be called
 * after every mutation (delete, category change).
 */
export function usePhotosForDate(date: string): {
  photos: CalendarPhoto[]
  loading: boolean
  refresh: () => Promise<void>
} {
  const { community } = useCommunity()
  const [photos, setPhotos] = useState<CalendarPhoto[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!community) return
    const rows = await getPhotosForDate(community.id, date)
    const colorById = new Map(community.categories.map((c) => [c.id, c.color]))
    setPhotos(
      rows.map((p: Photo) => ({
        id: p.id,
        categoryId: p.categoryId,
        userId: p.userId,
        src: p.publicUrl,
        categoryColor: colorById.get(p.categoryId) ?? '#71717a',
      })),
    )
    setLoading(false)
  }, [community, date])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { photos, loading, refresh }
}
