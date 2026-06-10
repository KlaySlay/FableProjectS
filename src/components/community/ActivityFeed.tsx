'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getRecentPhotos, subscribeToPhotos } from '@/lib/supabase/photoStorage'
import { useCommunity } from '@/lib/hooks/useCommunity'
import { relativeTime } from '@/lib/utils/dateUtils'
import type { Photo } from '@/types'

export function ActivityFeed() {
  const { community } = useCommunity()
  const [photos, setPhotos] = useState<Photo[]>([])

  const load = useCallback(async () => {
    if (!community) return
    setPhotos(await getRecentPhotos(community.id, 20))
  }, [community])

  useEffect(() => {
    load()
  }, [load])

  // Live updates
  useEffect(() => {
    if (!community) return
    return subscribeToPhotos(community.id, {
      onInsert: (photo) => setPhotos((prev) => [photo, ...prev].slice(0, 20)),
      onDelete: (id) => setPhotos((prev) => prev.filter((p) => p.id !== id)),
    })
  }, [community?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!community) return null

  const memberById = new Map(community.members.map((m) => [m.id, m]))
  const categoryById = new Map(community.categories.map((c) => [c.id, c]))

  return (
    <section>
      <h2 className="mb-2.5 text-sm font-semibold text-ink-muted">Recent activity</h2>
      {photos.length === 0 && <p className="text-sm text-ink-muted">No uploads yet.</p>}
      <div className="space-y-1">
        {photos.map((photo) => {
          const member = memberById.get(photo.userId)
          const category = categoryById.get(photo.categoryId)
          return (
            <Link
              key={photo.id}
              href={`/day/${photo.date}`}
              className="flex items-center gap-3 rounded-xl px-2 py-2 active:bg-surface"
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: member?.avatarColor ?? '#a1a1aa' }} />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                <span className="font-medium">{member?.displayName ?? 'Someone'}</span>{' '}
                <span>{category?.emoji}</span>{' '}
                <span className="text-xs text-ink-muted">{relativeTime(photo.createdAt)}</span>
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.publicUrl} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" loading="lazy" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
