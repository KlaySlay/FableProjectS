'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useToast } from '@/components/shared/Toast'
import { useCommunity } from '@/lib/hooks/useCommunity'
import { createCommunity, joinCommunityByCode } from '@/lib/supabase/communityStorage'
import { getCurrentProfile } from '@/lib/supabase/userStorage'

type Mode = 'pick' | 'create' | 'join'

export function CreateJoinSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { switchCommunity, refreshMyCommunities } = useCommunity()
  const { showToast } = useToast()
  const [mode, setMode] = useState<Mode>('pick')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  function reset() {
    setMode('pick')
    setName('')
    setCode('')
    setBusy(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleCreate() {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      const profile = await getCurrentProfile()
      if (!profile) throw new Error('no profile')
      const community = await createCommunity(name.trim(), profile.id)
      await refreshMyCommunities()
      await switchCommunity(community.id)
      showToast(`Created ${community.name}`)
      handleClose()
    } catch {
      showToast("Couldn't create the community")
      setBusy(false)
    }
  }

  async function handleJoin() {
    if (!code.trim() || busy) return
    setBusy(true)
    try {
      const id = await joinCommunityByCode(code.trim().toLowerCase())
      if (!id) {
        showToast("That code doesn't match any community")
        setBusy(false)
        return
      }
      await refreshMyCommunities()
      await switchCommunity(id)
      showToast('Joined!')
      handleClose()
    } catch {
      showToast("Couldn't join — check the code")
      setBusy(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title={mode === 'pick' ? 'Add a community' : mode === 'create' ? 'Create a community' : 'Join a community'}
    >
      {mode === 'pick' && (
        <div className="space-y-3">
          <button
            onClick={() => setMode('create')}
            className="w-full rounded-2xl bg-surface-2 p-5 text-left"
          >
            <p className="text-base font-semibold text-ink">Create a community</p>
            <p className="text-xs text-ink-muted">Start a private group and invite others</p>
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full rounded-2xl bg-surface-2 p-5 text-left"
          >
            <p className="text-base font-semibold text-ink">Join with a code</p>
            <p className="text-xs text-ink-muted">Got an invite code? Enter it here</p>
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="space-y-4">
          <input
            placeholder="Community name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-edge bg-surface-2 px-5 py-4 text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            autoFocus
          />
          <button
            onClick={handleCreate}
            disabled={busy || !name.trim()}
            className="w-full rounded-2xl bg-accent py-4 font-semibold text-zinc-950 disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="space-y-4">
          <input
            placeholder="Invite code"
            value={code}
            autoCapitalize="none"
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-2xl border border-edge bg-surface-2 px-5 py-4 text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            autoFocus
          />
          <button
            onClick={handleJoin}
            disabled={busy || !code.trim()}
            className="w-full rounded-2xl bg-accent py-4 font-semibold text-zinc-950 disabled:opacity-60"
          >
            {busy ? 'Joining…' : 'Join'}
          </button>
        </div>
      )}
    </BottomSheet>
  )
}
