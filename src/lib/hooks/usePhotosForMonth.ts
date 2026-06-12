'use client'

import { useCallback, useEffect, useState } from 'react'
import { getPhotosForMonth, subscribeToPhotos } from '@/lib/supabase/photoStorage'
import { useCommunity } from './useCommunity'
import type { CalendarPhoto, Photo } from '@/types'

/**
 * Calendar data hook: CalendarPhoto[] keyed by date string, refreshed on
 * month change, updated live via Realtime INSERT/DELETE without refetching.
 */
export function usePhotosForMonth(
  year: number,
  month: number,
): { photosByDate: Record<string, CalendarPhoto[]>; refresh: () => Promise<void> } {
  const { community } = useCommunity()
  const [photosByDate, setPhotosByDate] = useState<Record<string, CalendarPhoto[]>>({})

  const toCalendarPhoto = useCallback(
    (p: Photo): CalendarPhoto => {
      const color = community?.categories.find((c) => c.id === p.categoryId)?.color ?? '#71717a'
      return { id: p.id, categoryId: p.categoryId, userId: p.userId, src: p.publicUrl, categoryColor: color }
    },
    [community],
  )

  const refresh = useCallback(async () => {
    if (!community) return
    const rows = await getPhotosForMonth(community.id, year, month)
    const grouped: Record<string, CalendarPhoto[]> = {}
    for (const p of rows) {
      ;(grouped[p.date] ??= []).push(toCalendarPhoto(p))
    }
    setPhotosByDate(grouped)
  }, [community, year, month, toCalendarPhoto])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!community) return
    return subscribeToPhotos(community.id, {
      onInsert: (photo) => {
        const d = new Date(photo.date + 'T00:00:00')
        if (d.getFullYear() !== year || d.getMonth() !== month) return
        setPhotosByDate((prev) => ({
          ...prev,
          [photo.date]: [...(prev[photo.date] ?? []), toCalendarPhoto(photo)],
        }))
      },
      onDelete: (photoId) => {
        setPhotosByDate((prev) => {
          const next: Record<string, CalendarPhoto[]> = {}
          for (const [date, photos] of Object.entries(prev)) {
            const filtered = photos.filter((p) => p.id !== photoId)
            if (filtered.length > 0) next[date] = filtered
          }
          return next
        })
      },
    }, `${year}-${month}`)
  }, [community, year, month, toCalendarPhoto])

  return { photosByDate, refresh }
}
