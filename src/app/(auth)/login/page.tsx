'use client'

import { useState } from 'react'
import Image from 'next/image'
import { sendMagicLink } from '@/lib/supabase/userStorage'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      await sendMagicLink(email.trim())
      setSent(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message || "Couldn't send the link. Check the email and try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="flex h-[100dvh] flex-col items-center justify-center bg-bg px-8">
      <Image src="/logo.png" alt="Project S" width={96} height={96} className="mb-4" priority />
      <p className="mb-12 text-sm text-ink-muted">Your shared accountability journal</p>

      <form onSubmit={handleSend} className="w-full max-w-sm space-y-4" suppressHydrationWarning>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl border border-edge bg-surface px-5 py-4 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
        />
        {sent ? (
          <div className="w-full rounded-2xl bg-surface-2 py-4 text-center text-base font-medium text-ink">
            Check your email ✓
          </div>
        ) : (
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-2xl bg-accent py-4 text-base font-semibold text-zinc-950 transition-opacity disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send magic link'}
          </button>
        )}
        {error && <p className="text-center text-sm text-rose-400">{error}</p>}
      </form>
    </main>
  )
}
