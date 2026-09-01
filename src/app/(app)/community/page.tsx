'use client'

import { useState } from 'react'
import { CommunityCard } from '@/components/community/CommunityCard'
import { CreateJoinSheet } from '@/components/community/CreateJoinSheet'
import { useCommunity } from '@/lib/hooks/useCommunity'

export default function CommunityPage() {
  const { community, myCommunities, loading } = useCommunity()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <main className="px-4 pb-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Communities</h1>
        <button
          aria-label="Add a community"
          onClick={() => setAddOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-xl text-ink"
        >
          +
        </button>
      </header>

      {loading && <p className="text-sm text-ink-muted">Loading…</p>}

      {!loading && myCommunities.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface px-6 py-10 text-center">
          <p className="text-sm text-ink-muted">You&apos;re not part of any community yet.</p>
          <button
            onClick={() => setAddOpen(true)}
            className="rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-zinc-950"
          >
            Get started
          </button>
        </div>
      )}

      <div className="space-y-3">
        {myCommunities.map((c) => (
          <CommunityCard
            key={c.id}
            summary={c}
            preloaded={c.id === community?.id ? community : null}
            isActive={c.id === community?.id}
          />
        ))}
      </div>

      <CreateJoinSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </main>
  )
}
