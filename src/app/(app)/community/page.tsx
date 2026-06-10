'use client'

import { useState } from 'react'
import { ActivityFeed } from '@/components/community/ActivityFeed'
import { Leaderboard } from '@/components/community/Leaderboard'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useToast } from '@/components/shared/Toast'
import { useCommunity } from '@/lib/hooks/useCommunity'
import { useActiveUser } from '@/lib/hooks/useActiveUser'
import {
  addCategory,
  deleteCategory,
  reorderCategories,
} from '@/lib/supabase/communityStorage'

const CATEGORY_COLORS = ['#c084fc', '#fb923c', '#38bdf8', '#34d399', '#fb7185', '#fbbf24']

export default function CommunityPage() {
  const { community, refreshCommunity, myCommunities } = useCommunity()
  const { user } = useActiveUser()
  const { showToast } = useToast()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Category management state
  const [newLabel, setNewLabel] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!community) {
    return (
      <main className="flex h-[60dvh] items-center justify-center">
        <p className="text-sm text-ink-muted">Loading…</p>
      </main>
    )
  }

  const isAdmin = myCommunities.find((c) => c.id === community.id)?.role === 'admin'

  async function handleAddCategory() {
    if (!community || !newLabel.trim() || !newEmoji.trim() || busy) return
    setBusy(true)
    try {
      await addCategory({
        communityId: community.id,
        label: newLabel.trim(),
        emoji: newEmoji.trim(),
        color: newColor,
        sortOrder: community.categories.length,
      })
      await refreshCommunity()
      setNewLabel('')
      setNewEmoji('')
    } catch {
      showToast("Couldn't add the category")
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteCategory(id: string) {
    if (busy) return
    setBusy(true)
    try {
      await deleteCategory(id)
      await refreshCommunity()
    } catch {
      showToast("Couldn't delete — photos may still use it")
    } finally {
      setConfirmDeleteId(null)
      setBusy(false)
    }
  }

  async function move(categoryId: string, dir: -1 | 1) {
    if (!community) return
    const ids = community.categories.map((c) => c.id)
    const i = ids.indexOf(categoryId)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    await reorderCategories(ids)
    await refreshCommunity()
  }

  return (
    <main className="px-4 pb-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}>
      {/* Community header */}
      <header className="mb-6">
        <div className="mb-3 flex items-start justify-between">
          <h1 className="text-2xl font-bold text-ink">{community.name}</h1>
          {isAdmin && (
            <button aria-label="Community settings" onClick={() => setSettingsOpen(true)} className="p-1 text-ink-muted">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {community.members.map((m) => (
              <span
                key={m.id}
                title={m.displayName}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-bg text-xs font-bold text-zinc-950"
                style={{ backgroundColor: m.avatarColor }}
              >
                {m.displayName.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            className="rounded-full bg-surface px-4 py-2 text-xs font-semibold text-ink"
          >
            Invite
          </button>
        </div>
      </header>

      <div className="space-y-7">
        <ActivityFeed />
        <Leaderboard />
      </div>

      {/* Invite sheet */}
      <BottomSheet open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite to this space">
        <p className="mb-4 text-center text-3xl font-bold tracking-[0.3em] text-accent">
          {community.inviteCode}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(community.inviteCode)
              showToast('Code copied')
            }}
            className="flex-1 rounded-2xl bg-surface-2 py-3.5 text-sm font-medium text-ink"
          >
            Copy
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Join ${community.name} on Project S`,
                  text: `Use invite code ${community.inviteCode}`,
                  url: `${window.location.origin}/join/${community.inviteCode}`,
                })
              } else {
                navigator.clipboard.writeText(`${window.location.origin}/join/${community.inviteCode}`)
                showToast('Link copied')
              }
            }}
            className="flex-1 rounded-2xl bg-accent py-3.5 text-sm font-semibold text-zinc-950"
          >
            Share
          </button>
        </div>
      </BottomSheet>

      {/* Category management (admin) */}
      <BottomSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Categories">
        <div className="space-y-2">
          {community.categories.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
              <div className="flex flex-col">
                <button
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => move(c.id, -1)}
                  className="px-1 text-xs text-ink-muted disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  aria-label="Move down"
                  disabled={i === community.categories.length - 1}
                  onClick={() => move(c.id, 1)}
                  className="px-1 text-xs text-ink-muted disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              <span className="text-lg">{c.emoji}</span>
              <span className="flex-1 text-sm font-medium text-ink">{c.label}</span>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
              {confirmDeleteId === c.id ? (
                <>
                  <button
                    onClick={() => handleDeleteCategory(c.id)}
                    className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    Sure?
                  </button>
                  <button onClick={() => setConfirmDeleteId(null)} className="px-1 text-xs text-ink-muted">
                    ✕
                  </button>
                </>
              ) : (
                <button aria-label={`Delete ${c.label}`} onClick={() => setConfirmDeleteId(c.id)} className="px-1 text-ink-muted">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3 border-t border-edge pt-4">
          <p className="text-xs font-medium text-ink-muted">Add category</p>
          <div className="flex gap-2">
            <input
              placeholder="🏃"
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              className="w-16 rounded-xl border border-edge bg-surface-2 px-3 py-3 text-center text-ink focus:border-accent focus:outline-none"
            />
            <input
              placeholder="Label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="flex-1 rounded-xl border border-edge bg-surface-2 px-4 py-3 text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex gap-2.5">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Colour ${c}`}
                onClick={() => setNewColor(c)}
                className="h-8 w-8 rounded-full"
                style={{
                  backgroundColor: c,
                  outline: newColor === c ? '2px solid var(--text)' : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
          <button
            onClick={handleAddCategory}
            disabled={busy || !newLabel.trim() || !newEmoji.trim()}
            className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          >
            Add
          </button>
        </div>
      </BottomSheet>
    </main>
  )
}
