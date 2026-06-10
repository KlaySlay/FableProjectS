'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useCommunity } from '@/lib/hooks/useCommunity'
import { useActiveUser } from '@/lib/hooks/useActiveUser'
import { createCommunity, joinCommunityByCode } from '@/lib/supabase/communityStorage'
import { useToast } from '@/components/shared/Toast'

export function CommunitySwitch() {
  const { community, myCommunities, switchCommunity, refreshCommunity } = useCommunity()
  const { user } = useActiveUser()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'list' | 'create' | 'join'>('list')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  function close() {
    setOpen(false)
    setMode('list')
    setInput('')
  }

  async function handleCreate() {
    if (!user || !input.trim() || busy) return
    setBusy(true)
    try {
      const created = await createCommunity(input.trim(), user.id)
      await switchCommunity(created.id)
      await refreshCommunity()
      showToast(`Invite code: ${created.inviteCode}`)
      close()
    } catch {
      showToast("Couldn't create the space")
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin() {
    if (!input.trim() || busy) return
    setBusy(true)
    try {
      const id = await joinCommunityByCode(input.trim().toLowerCase())
      if (!id) {
        showToast("That code doesn't match any space")
      } else {
        await switchCommunity(id)
        await refreshCommunity()
        close()
      }
    } catch {
      showToast("Couldn't join the space")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="max-w-[40vw] truncate rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink"
      >
        {community?.name ?? '…'}
      </button>

      <BottomSheet open={open} onClose={close} title="Spaces">
        {mode === 'list' && (
          <div className="space-y-2">
            {myCommunities.map((c) => (
              <button
                key={c.id}
                onClick={async () => {
                  await switchCommunity(c.id)
                  close()
                }}
                className="flex w-full items-center justify-between rounded-2xl bg-surface-2 px-4 py-3.5"
              >
                <span className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                  <span className="text-sm font-medium text-ink">{c.name}</span>
                  <span className="text-xs text-ink-muted">
                    {c.memberCount} member{c.memberCount === 1 ? '' : 's'}
                  </span>
                </span>
                {community?.id === c.id && <span className="text-accent">✓</span>}
              </button>
            ))}
            <button onClick={() => setMode('create')} className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-accent">
              + Create a space
            </button>
            <button onClick={() => setMode('join')} className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-accent">
              → Join a space
            </button>
          </div>
        )}

        {mode !== 'list' && (
          <div className="space-y-3">
            <input
              autoFocus
              placeholder={mode === 'create' ? 'Space name' : 'Invite code'}
              value={input}
              autoCapitalize="none"
              onChange={(e) => setInput(e.target.value)}
              className="w-full rounded-2xl border border-edge bg-surface-2 px-4 py-3.5 text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
            <button
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={busy || !input.trim()}
              className="w-full rounded-2xl bg-accent py-3.5 font-semibold text-zinc-950 disabled:opacity-60"
            >
              {mode === 'create' ? 'Create' : 'Join'}
            </button>
            <button onClick={() => setMode('list')} className="w-full py-2 text-sm text-ink-muted">
              Back
            </button>
          </div>
        )}
      </BottomSheet>
    </>
  )
}
