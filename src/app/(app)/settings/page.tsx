'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useActiveUser } from '@/lib/hooks/useActiveUser'
import { useTheme, ACCENT_PRESETS } from '@/lib/hooks/useTheme'
import { useToast } from '@/components/shared/Toast'
import { getSupabase } from '@/lib/supabase/client'
import { isUsernameTaken, signOut, updateProfile } from '@/lib/supabase/userStorage'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import type { StudyTopic, ThemePreference } from '@/types'

const NUDGE_PREF_KEY = 'ps_nudge_enabled'

export default function SettingsPage() {
  const router = useRouter()
  const { user, refreshUser } = useActiveUser()
  const { accent, themePreference, setLocalAccent, setLocalTheme } = useTheme()
  const { showToast } = useToast()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [customHex, setCustomHex] = useState('')
  const [topics, setTopics] = useState<StudyTopic[]>([])
  const [editingTopic, setEditingTopic] = useState<string | null>(null)
  const [topicExam, setTopicExam] = useState('')
  const [topicSubject, setTopicSubject] = useState('')
  const [addingTopic, setAddingTopic] = useState(false)
  const [nudgeEnabled, setNudgeEnabled] = useState(true)
  const { status: pushStatus, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications()

  useEffect(() => {
    if (!user) return
    setDisplayName(user.displayName)
    setUsername(user.username)
    setNudgeEnabled(localStorage.getItem(NUDGE_PREF_KEY) !== 'off')
    loadTopics(user.id)
  }, [user])

  async function loadTopics(userId: string) {
    const { data } = await getSupabase()
      .from('study_topics')
      .select('id, exam_name, subject')
      .eq('user_id', userId)
    setTopics(
      ((data ?? []) as { id: string; exam_name: string; subject: string }[]).map((t) => ({
        id: t.id,
        examName: t.exam_name,
        subject: t.subject,
      })),
    )
  }

  async function saveDisplayName() {
    if (!user || !displayName.trim() || displayName === user.displayName) return
    await updateProfile({ displayName: displayName.trim() })
    await refreshUser()
    showToast('Name updated')
  }

  async function saveUsername() {
    if (!user || !username.trim() || username === user.username) return
    const candidate = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{2,24}$/.test(candidate)) {
      showToast('Invalid username')
      setUsername(user.username)
      return
    }
    if (await isUsernameTaken(candidate)) {
      showToast('That username is taken')
      setUsername(user.username)
      return
    }
    await updateProfile({ username: candidate })
    await refreshUser()
    showToast('Username updated')
  }

  async function applyAccent(hex: string) {
    setLocalAccent(hex)
    await updateProfile({ accentColor: hex })
    await refreshUser()
  }

  async function applyTheme(pref: ThemePreference) {
    setLocalTheme(pref)
    await updateProfile({ themePreference: pref })
  }

  async function saveTopic() {
    if (!user || !topicExam.trim() || !topicSubject.trim()) return
    const supabase = getSupabase()
    if (editingTopic) {
      await supabase
        .from('study_topics')
        .update({ exam_name: topicExam.trim(), subject: topicSubject.trim() })
        .eq('id', editingTopic)
    } else {
      await supabase
        .from('study_topics')
        .insert({ user_id: user.id, exam_name: topicExam.trim(), subject: topicSubject.trim() })
    }
    setEditingTopic(null)
    setAddingTopic(false)
    setTopicExam('')
    setTopicSubject('')
    loadTopics(user.id)
  }

  async function handleSignOut() {
    await signOut()
    router.replace('/login')
  }

  return (
    <main className="px-4 pb-10" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
      <header className="mb-5 flex items-center gap-3">
        <button aria-label="Back" onClick={() => router.back()} className="text-2xl text-ink">
          ←
        </button>
        <h1 className="text-xl font-bold text-ink">Settings</h1>
      </header>

      <div className="space-y-7">
        {/* Account */}
        <section>
          <h2 className="mb-2.5 text-sm font-semibold text-ink-muted">Account</h2>
          <div className="space-y-2">
            <label className="block rounded-2xl bg-surface px-4 py-3">
              <span className="text-[10px] text-ink-muted">Display name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={saveDisplayName}
                className="w-full bg-transparent text-sm text-ink focus:outline-none"
              />
            </label>
            <label className="block rounded-2xl bg-surface px-4 py-3">
              <span className="text-[10px] text-ink-muted">Username</span>
              <input
                value={username}
                autoCapitalize="none"
                onChange={(e) => setUsername(e.target.value)}
                onBlur={saveUsername}
                className="w-full bg-transparent text-sm text-ink focus:outline-none"
              />
            </label>
            <button
              onClick={handleSignOut}
              className="w-full rounded-2xl bg-surface px-4 py-3.5 text-left text-sm font-medium text-rose-400"
            >
              Sign out
            </button>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2 className="mb-2.5 text-sm font-semibold text-ink-muted">Appearance</h2>
          <div className="space-y-3 rounded-2xl bg-surface p-4">
            <div>
              <p className="mb-2 text-xs text-ink-muted">Theme</p>
              <div className="flex gap-2">
                {(['light', 'dark', 'system'] as const).map((pref) => (
                  <button
                    key={pref}
                    onClick={() => applyTheme(pref)}
                    className="flex-1 rounded-xl py-2.5 text-xs font-medium capitalize"
                    style={{
                      backgroundColor: themePreference === pref ? 'var(--accent)' : 'var(--surface-2)',
                      color: themePreference === pref ? '#09090b' : 'var(--text)',
                    }}
                  >
                    {pref}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-ink-muted">Accent colour</p>
              <div className="mb-3 flex flex-wrap gap-2.5">
                {ACCENT_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    aria-label={preset.name}
                    onClick={() => applyAccent(preset.hex)}
                    className="h-8 w-8 rounded-full"
                    style={{
                      backgroundColor: preset.hex,
                      outline: accent === preset.hex ? '2px solid var(--text)' : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="#a1b2c3"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="flex-1 rounded-xl border border-edge bg-surface-2 px-3 py-2.5 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (/^#[0-9a-fA-F]{6}$/.test(customHex.trim())) {
                      applyAccent(customHex.trim())
                    } else {
                      showToast('Enter a hex like #a1b2c3')
                    }
                  }}
                  className="rounded-xl bg-surface-2 px-4 py-2.5 text-xs font-medium text-ink"
                >
                  Apply
                </button>
              </div>
            </div>
            {/* Live preview */}
            <div className="flex justify-center pt-1">
              <div className="relative h-16 w-16 rounded-xl bg-surface-2">
                <div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: `conic-gradient(${accent} 0deg 200deg, transparent 200deg 204deg, ${accent}55 204deg 358deg, transparent 358deg 360deg)`,
                    WebkitMask: 'radial-gradient(closest-side, transparent calc(100% - 2.5px), black calc(100% - 2.5px))',
                    mask: 'radial-gradient(closest-side, transparent calc(100% - 2.5px), black calc(100% - 2.5px))',
                  }}
                />
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-px text-[7px] font-semibold text-zinc-950"
                  style={{ backgroundColor: accent }}
                >
                  Today
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Study prep */}
        <section>
          <h2 className="mb-2.5 text-sm font-semibold text-ink-muted">Study prep</h2>
          <div className="space-y-2">
            {topics.map((topic) =>
              editingTopic === topic.id ? (
                <TopicForm
                  key={topic.id}
                  exam={topicExam}
                  subject={topicSubject}
                  setExam={setTopicExam}
                  setSubject={setTopicSubject}
                  onSave={saveTopic}
                  onCancel={() => setEditingTopic(null)}
                />
              ) : (
                <div key={topic.id} className="flex items-center rounded-2xl bg-surface px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{topic.examName}</p>
                    <p className="text-xs text-ink-muted">{topic.subject}</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingTopic(topic.id)
                      setTopicExam(topic.examName)
                      setTopicSubject(topic.subject)
                      setAddingTopic(false)
                    }}
                    className="text-xs font-medium text-accent"
                  >
                    Edit
                  </button>
                </div>
              ),
            )}
            {addingTopic ? (
              <TopicForm
                exam={topicExam}
                subject={topicSubject}
                setExam={setTopicExam}
                setSubject={setTopicSubject}
                onSave={saveTopic}
                onCancel={() => setAddingTopic(false)}
              />
            ) : (
              <button
                onClick={() => {
                  setAddingTopic(true)
                  setEditingTopic(null)
                  setTopicExam('')
                  setTopicSubject('')
                }}
                className="w-full rounded-2xl bg-surface px-4 py-3 text-left text-sm font-medium text-accent"
              >
                + Add another topic
              </button>
            )}
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="mb-2.5 text-sm font-semibold text-ink-muted">Notifications</h2>
          <div className="space-y-2">
            <button
              onClick={() => {
                const next = !nudgeEnabled
                setNudgeEnabled(next)
                localStorage.setItem(NUDGE_PREF_KEY, next ? 'on' : 'off')
              }}
              className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3.5"
            >
              <span className="text-sm font-medium text-ink">Daily nudge banner</span>
              <span
                className="relative h-6 w-11 rounded-full transition-colors"
                style={{ backgroundColor: nudgeEnabled ? 'var(--accent)' : 'var(--surface-2)' }}
              >
                <span
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
                  style={{ left: nudgeEnabled ? '22px' : '2px' }}
                />
              </span>
            </button>

            {pushStatus !== 'unsupported' && (
              <button
                disabled={pushStatus === 'loading' || pushStatus === 'denied'}
                onClick={pushStatus === 'subscribed' ? unsubscribePush : subscribePush}
                className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3.5 disabled:opacity-50"
              >
                <div>
                  <span className="text-sm font-medium text-ink">Push notifications</span>
                  {pushStatus === 'denied' && (
                    <p className="text-[11px] text-ink-muted">Blocked — allow in browser settings</p>
                  )}
                </div>
                {pushStatus === 'loading' ? (
                  <span className="text-xs text-ink-muted">…</span>
                ) : (
                  <span
                    className="relative h-6 w-11 rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        pushStatus === 'subscribed' ? 'var(--accent)' : 'var(--surface-2)',
                    }}
                  >
                    <span
                      className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
                      style={{ left: pushStatus === 'subscribed' ? '22px' : '2px' }}
                    />
                  </span>
                )}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function TopicForm({
  exam,
  subject,
  setExam,
  setSubject,
  onSave,
  onCancel,
}: {
  exam: string
  subject: string
  setExam: (v: string) => void
  setSubject: (v: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-2 rounded-2xl bg-surface p-4">
      <input
        placeholder="Exam name"
        value={exam}
        onChange={(e) => setExam(e.target.value)}
        className="w-full rounded-xl border border-edge bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
      />
      <input
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full rounded-xl border border-edge bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={!exam.trim() || !subject.trim()}
          className="flex-1 rounded-xl bg-accent py-2.5 text-xs font-semibold text-zinc-950 disabled:opacity-60"
        >
          Save
        </button>
        <button onClick={onCancel} className="flex-1 rounded-xl bg-surface-2 py-2.5 text-xs font-medium text-ink">
          Cancel
        </button>
      </div>
    </div>
  )
}
