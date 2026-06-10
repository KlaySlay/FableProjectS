'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  joinCommunityByCode,
  previewCommunityByCode,
} from '@/lib/supabase/communityStorage'
import { getCurrentProfile } from '@/lib/supabase/userStorage'

export default function JoinPage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()
  const [preview, setPreview] = useState<{ name: string; memberCount: number } | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'joining' | 'invalid' | 'no-profile'>('loading')

  useEffect(() => {
    ;(async () => {
      const profile = await getCurrentProfile()
      if (!profile) {
        setState('no-profile')
        return
      }
      const found = await previewCommunityByCode(params.code)
      if (!found) {
        setState('invalid')
        return
      }
      setPreview(found)
      setState('ready')
    })()
  }, [params.code])

  async function handleJoin() {
    setState('joining')
    const id = await joinCommunityByCode(params.code)
    if (id) {
      localStorage.setItem('ps_active_community', id)
      router.replace('/')
    } else {
      setState('invalid')
    }
  }

  return (
    <main className="flex h-[100dvh] flex-col items-center justify-center bg-bg px-8 text-center">
      {state === 'loading' && <p className="text-ink-muted">Looking up invite…</p>}
      {state === 'invalid' && (
        <>
          <p className="mb-4 text-lg text-ink">That invite doesn&apos;t look right.</p>
          <button onClick={() => router.replace('/')} className="text-sm text-accent">
            Go to calendar
          </button>
        </>
      )}
      {state === 'no-profile' && (
        <>
          <p className="mb-4 text-lg text-ink">Finish setting up your profile first.</p>
          <button onClick={() => router.replace('/onboarding')} className="rounded-2xl bg-accent px-6 py-3 font-semibold text-zinc-950">
            Set up profile
          </button>
        </>
      )}
      {(state === 'ready' || state === 'joining') && preview && (
        <>
          <p className="mb-1 text-sm text-ink-muted">You&apos;re invited to</p>
          <h1 className="mb-2 text-3xl font-bold text-ink">{preview.name}</h1>
          <p className="mb-8 text-sm text-ink-muted">
            {preview.memberCount} member{preview.memberCount === 1 ? '' : 's'}
          </p>
          <button
            onClick={handleJoin}
            disabled={state === 'joining'}
            className="rounded-2xl bg-accent px-10 py-4 font-semibold text-zinc-950 disabled:opacity-60"
          >
            {state === 'joining' ? 'Joining…' : 'Join space'}
          </button>
        </>
      )}
    </main>
  )
}
