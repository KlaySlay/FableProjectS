'use client'

import Link from 'next/link'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useCommunity } from '@/lib/hooks/useCommunity'

export function CommunitySwitcherSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { community, myCommunities, switchCommunity } = useCommunity()

  async function handleSwitch(id: string) {
    if (id === community?.id) {
      onClose()
      return
    }
    await switchCommunity(id)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Switch community">
      <div className="space-y-2">
        {myCommunities.map((c) => (
          <button
            key={c.id}
            onClick={() => handleSwitch(c.id)}
            className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3.5 text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{c.name}</p>
              <p className="text-xs text-ink-muted">
                {c.memberCount} member{c.memberCount === 1 ? '' : 's'}
              </p>
            </div>
            {c.id === community?.id && <span className="text-accent">●</span>}
          </button>
        ))}
      </div>
      <Link
        href="/community"
        onClick={onClose}
        className="mt-4 block text-center text-sm font-medium text-accent"
      >
        Manage communities →
      </Link>
    </BottomSheet>
  )
}
