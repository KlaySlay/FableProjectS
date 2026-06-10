'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProfile, getCurrentProfile, isUsernameTaken } from '@/lib/supabase/userStorage'
import { createCommunity, joinCommunityByCode } from '@/lib/supabase/communityStorage'
import { updateProfile } from '@/lib/supabase/userStorage'
import { ACCENT_PRESETS } from '@/lib/hooks/useTheme'

const AVATAR_COLORS = ['#c084fc', '#fb923c', '#38bdf8', '#34d399', '#fb7185', '#fbbf24']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Step 1
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0])

  // Step 2
  const [spaceMode, setSpaceMode] = useState<'create' | 'join' | null>(null)
  const [spaceName, setSpaceName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null)
  const [spaceDone, setSpaceDone] = useState(false)

  // Step 3
  const [accent, setAccent] = useState(ACCENT_PRESETS[0].hex)

  async function completeStep1() {
    setError(null)
    const name = displayName.trim()
    const uname = username.trim().toLowerCase()
    if (!name || !uname) {
      setError('Both fields are required.')
      return
    }
    if (!/^[a-z0-9_]{2,24}$/.test(uname)) {
      setError('Username: 2–24 chars, letters, numbers, underscores.')
      return
    }
    setBusy(true)
    try {
      if (await isUsernameTaken(uname)) {
        setError('That username is taken.')
        return
      }
      // Profile is created now so community FK constraints are satisfied
      const existing = await getCurrentProfile()
      if (!existing) {
        await createProfile({ username: uname, displayName: name, avatarColor, accentColor: accent })
      }
      setStep(1)
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateSpace() {
    if (!spaceName.trim()) return
    setBusy(true)
    setError(null)
    try {
      const profile = await getCurrentProfile()
      if (!profile) throw new Error('no profile')
      const community = await createCommunity(spaceName.trim(), profile.id)
      setCreatedInviteCode(community.inviteCode)
      setSpaceDone(true)
    } catch {
      setError("Couldn't create the space. Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function handleJoinSpace() {
    if (!inviteCode.trim()) return
    setBusy(true)
    setError(null)
    try {
      const id = await joinCommunityByCode(inviteCode.trim().toLowerCase())
      if (!id) {
        setError("That code doesn't match any space.")
        return
      }
      setSpaceDone(true)
      setStep(2)
    } catch {
      setError("Couldn't join. Check the code.")
    } finally {
      setBusy(false)
    }
  }

  async function handleSkip() {
    setBusy(true)
    setError(null)
    try {
      const profile = await getCurrentProfile()
      if (!profile) throw new Error('no profile')
      await createCommunity(`${profile.displayName}'s space`, profile.id)
      setSpaceDone(true)
      setStep(2)
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function finish() {
    setBusy(true)
    try {
      await updateProfile({ accentColor: accent })
      router.replace('/')
      router.refresh()
    } catch {
      setError("Couldn't save. Try again.")
      setBusy(false)
    }
  }

  return (
    <main className="flex h-[100dvh] flex-col bg-bg px-6 pb-10 pt-16">
      <div className="flex-1">
        {step === 0 && (
          <section className="animate-fade-in space-y-5">
            <h1 className="text-2xl font-bold text-ink">Who are you?</h1>
            <input
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-2xl border border-edge bg-surface px-5 py-4 text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
            <input
              placeholder="Username"
              value={username}
              autoCapitalize="none"
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl border border-edge bg-surface px-5 py-4 text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
            <div>
              <p className="mb-3 text-sm text-ink-muted">Avatar colour</p>
              <div className="flex gap-3">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    aria-label={`Colour ${c}`}
                    onClick={() => setAvatarColor(c)}
                    className="h-10 w-10 rounded-full transition-transform"
                    style={{
                      backgroundColor: c,
                      transform: avatarColor === c ? 'scale(1.2)' : 'scale(1)',
                      outline: avatarColor === c ? '2px solid var(--text)' : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={completeStep1}
              disabled={busy}
              className="w-full rounded-2xl bg-accent py-4 font-semibold text-zinc-950 disabled:opacity-60"
            >
              Continue
            </button>
          </section>
        )}

        {step === 1 && (
          <section className="animate-fade-in space-y-5">
            <h1 className="text-2xl font-bold text-ink">Your space</h1>

            {createdInviteCode ? (
              <div className="space-y-5 rounded-2xl bg-surface p-6 text-center">
                <p className="text-sm text-ink-muted">Share this code with your people</p>
                <p className="text-3xl font-bold tracking-[0.3em] text-accent">{createdInviteCode}</p>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: 'Join my Project S space', text: `Use invite code ${createdInviteCode}` })
                    } else {
                      navigator.clipboard.writeText(createdInviteCode)
                    }
                  }}
                  className="w-full rounded-2xl bg-surface-2 py-3 font-medium text-ink"
                >
                  Share
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="w-full rounded-2xl bg-accent py-3 font-semibold text-zinc-950"
                >
                  Continue
                </button>
              </div>
            ) : spaceMode === 'create' ? (
              <div className="space-y-4">
                <input
                  placeholder="Space name"
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  className="w-full rounded-2xl border border-edge bg-surface px-5 py-4 text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
                <button
                  onClick={handleCreateSpace}
                  disabled={busy || !spaceName.trim()}
                  className="w-full rounded-2xl bg-accent py-4 font-semibold text-zinc-950 disabled:opacity-60"
                >
                  Create
                </button>
              </div>
            ) : spaceMode === 'join' ? (
              <div className="space-y-4">
                <input
                  placeholder="Invite code"
                  value={inviteCode}
                  autoCapitalize="none"
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full rounded-2xl border border-edge bg-surface px-5 py-4 text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
                <button
                  onClick={handleJoinSpace}
                  disabled={busy || !inviteCode.trim()}
                  className="w-full rounded-2xl bg-accent py-4 font-semibold text-zinc-950 disabled:opacity-60"
                >
                  Join
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => setSpaceMode('create')}
                  className="w-full rounded-2xl bg-surface p-6 text-left"
                >
                  <p className="text-lg font-semibold text-ink">Start a new space</p>
                  <p className="text-sm text-ink-muted">Create a private group and invite others</p>
                </button>
                <button
                  onClick={() => setSpaceMode('join')}
                  className="w-full rounded-2xl bg-surface p-6 text-left"
                >
                  <p className="text-lg font-semibold text-ink">Join a space</p>
                  <p className="text-sm text-ink-muted">Got an invite code? Enter it here</p>
                </button>
                <button onClick={handleSkip} disabled={busy} className="w-full py-3 text-sm text-ink-muted">
                  Skip for now
                </button>
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="animate-fade-in space-y-6">
            <h1 className="text-2xl font-bold text-ink">Pick your accent</h1>
            <div className="grid grid-cols-4 gap-4">
              {ACCENT_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  aria-label={preset.name}
                  onClick={() => setAccent(preset.hex)}
                  className="mx-auto h-12 w-12 rounded-full transition-transform"
                  style={{
                    backgroundColor: preset.hex,
                    transform: accent === preset.hex ? 'scale(1.18)' : 'scale(1)',
                    outline: accent === preset.hex ? '2px solid var(--text)' : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>

            {/* Live preview: fake day cell */}
            <div className="flex justify-center pt-2">
              <div className="relative h-24 w-24 rounded-2xl bg-surface p-1.5">
                <div className="grid h-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-xl">
                  {[0.5, 0.35, 0.42, 0.28].map((opacity, i) => (
                    <div key={i} className="bg-surface-2" style={{ opacity: 1 - opacity }} />
                  ))}
                </div>
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: `conic-gradient(${accent} 0deg 118deg, transparent 118deg 122deg, ${accent}66 122deg 238deg, transparent 238deg 242deg, ${accent}33 242deg 358deg, transparent 358deg 360deg)`,
                    WebkitMask: 'radial-gradient(closest-side, transparent calc(100% - 3px), black calc(100% - 3px))',
                    mask: 'radial-gradient(closest-side, transparent calc(100% - 3px), black calc(100% - 3px))',
                    borderRadius: '16px',
                  }}
                />
                <span
                  className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[9px] font-semibold text-zinc-950"
                  style={{ backgroundColor: accent }}
                >
                  Today
                </span>
              </div>
            </div>

            <button
              onClick={finish}
              disabled={busy || !spaceDone}
              className="w-full rounded-2xl py-4 font-semibold text-zinc-950 disabled:opacity-60"
              style={{ backgroundColor: accent }}
            >
              Let&apos;s go
            </button>
          </section>
        )}
      </div>

      {error && <p className="pb-3 text-center text-sm text-rose-400">{error}</p>}

      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full transition-colors"
            style={{ backgroundColor: i === step ? 'var(--accent)' : 'var(--surface-2)' }}
          />
        ))}
      </div>
    </main>
  )
}
