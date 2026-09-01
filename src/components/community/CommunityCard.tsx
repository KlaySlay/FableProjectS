'use client'

import { useState } from 'react'
import { ActivityFeed } from '@/components/community/ActivityFeed'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useToast } from '@/components/shared/Toast'
import { useCommunity } from '@/lib/hooks/useCommunity'
import {
  addCategory,
  deleteCategory,
  getCommunity,
  reorderCategories,
  updateCategoryMetric,
} from '@/lib/supabase/communityStorage'
import type { Community, MetricType } from '@/types'

const CATEGORY_COLORS = ['#c084fc', '#fb923c', '#38bdf8', '#34d399', '#fb7185', '#fbbf24']
const METRIC_OPTIONS: { value: MetricType; label: string }[] = [
  { value: 'none', label: 'No metric' },
  { value: 'distance_km', label: 'Distance (km)' },
  { value: 'duration_min', label: 'Duration (min)' },
]

export function CommunityCard({
  summary,
  preloaded,
  isActive,
}: {
  summary: { id: string; name: string; memberCount: number; role: string }
  preloaded?: Community | null
  isActive: boolean
}) {
  const { refreshCommunity, refreshMyCommunities } = useCommunity()
  const { showToast } = useToast()

  const [expanded, setExpanded] = useState(false)
  const [full, setFull] = useState<Community | null>(preloaded ?? null)
  const [loadingFull, setLoadingFull] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Category management state
  const [newLabel, setNewLabel] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0])
  const [newMetricType, setNewMetricType] = useState<MetricType>('none')
  const [newMetricRequired, setNewMetricRequired] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isAdmin = summary.role === 'admin'

  async function ensureLoaded() {
    if (full || loadingFull) return
    setLoadingFull(true)
    const data = await getCommunity(summary.id)
    setFull(data)
    setLoadingFull(false)
  }

  function toggleExpand() {
    const next = !expanded
    setExpanded(next)
    if (next) ensureLoaded()
  }

  async function afterMutation() {
    const data = await getCommunity(summary.id)
    setFull(data)
    await refreshMyCommunities()
    if (isActive) await refreshCommunity()
  }

  async function handleAddCategory() {
    if (!full || !newLabel.trim() || !newEmoji.trim() || busy) return
    setBusy(true)
    try {
      await addCategory({
        communityId: full.id,
        label: newLabel.trim(),
        emoji: newEmoji.trim(),
        color: newColor,
        sortOrder: full.categories.length,
        metricType: newMetricType,
        metricRequired: newMetricRequired,
      })
      await afterMutation()
      setNewLabel('')
      setNewEmoji('')
      setNewMetricType('none')
      setNewMetricRequired(false)
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
      await afterMutation()
    } catch {
      showToast("Couldn't delete — photos may still use it")
    } finally {
      setConfirmDeleteId(null)
      setBusy(false)
    }
  }

  async function handleUpdateMetric(categoryId: string, metricType: MetricType, metricRequired: boolean) {
    if (busy) return
    setBusy(true)
    try {
      await updateCategoryMetric(categoryId, metricType, metricRequired)
      await afterMutation()
    } catch {
      showToast("Couldn't update the metric")
    } finally {
      setBusy(false)
    }
  }

  async function move(categoryId: string, dir: -1 | 1) {
    if (!full) return
    const ids = full.categories.map((c) => c.id)
    const i = ids.indexOf(categoryId)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    await reorderCategories(ids)
    await afterMutation()
  }

  return (
    <div className="rounded-2xl bg-surface">
      {/* Collapsed header — always visible */}
      <button onClick={toggleExpand} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-semibold text-ink">{summary.name}</p>
            {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
          </div>
          <p className="text-xs text-ink-muted">
            {summary.memberCount} member{summary.memberCount === 1 ? '' : 's'}
          </p>
        </div>
        <span
          className="text-ink-muted transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-edge px-4 pb-4 pt-4">
          {loadingFull && !full && <p className="text-sm text-ink-muted">Loading…</p>}

          {full && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {full.members.map((m) => (
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
                <div className="flex gap-2">
                  <button
                    onClick={() => setInviteOpen(true)}
                    className="rounded-full bg-surface-2 px-4 py-2 text-xs font-semibold text-ink"
                  >
                    Invite
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setSettingsOpen(true)}
                      className="rounded-full bg-surface-2 px-4 py-2 text-xs font-semibold text-ink"
                    >
                      Categories
                    </button>
                  )}
                </div>
              </div>

              <ActivityFeed communityId={full.id} members={full.members} categories={full.categories} />
            </>
          )}
        </div>
      )}

      {/* Invite sheet */}
      {full && (
        <BottomSheet open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite to this space">
          <p className="mb-4 text-center text-3xl font-bold tracking-[0.3em] text-accent">
            {full.inviteCode}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(full.inviteCode)
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
                    title: `Join ${full.name} on Project S`,
                    text: `Use invite code ${full.inviteCode}`,
                    url: `${window.location.origin}/join/${full.inviteCode}`,
                  })
                } else {
                  navigator.clipboard.writeText(`${window.location.origin}/join/${full.inviteCode}`)
                  showToast('Link copied')
                }
              }}
              className="flex-1 rounded-2xl bg-accent py-3.5 text-sm font-semibold text-zinc-950"
            >
              Share
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Category management (admin) */}
      {full && (
        <BottomSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Categories">
          <div className="space-y-2">
            {full.categories.map((c, i) => (
              <div key={c.id} className="rounded-xl bg-surface-2 px-3 py-2.5">
                <div className="flex items-center gap-2">
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
                      disabled={i === full.categories.length - 1}
                      onClick={() => move(c.id, 1)}
                      className="px-1 text-xs text-ink-muted disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                  <span className="text-lg">{c.emoji}</span>
                  <span className="flex-1 text-sm font-medium text-ink">{c.label}</span>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <button
                    aria-label={`Metric settings for ${c.label}`}
                    onClick={() => setEditingMetricId(editingMetricId === c.id ? null : c.id)}
                    className="px-1 text-xs font-medium"
                    style={{ color: c.metricType !== 'none' ? 'var(--accent)' : 'var(--ink-muted)' }}
                  >
                    📏
                  </button>
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

                {editingMetricId === c.id && (
                  <div className="mt-2.5 space-y-2 border-t border-edge pt-2.5">
                    <div className="flex gap-1.5">
                      {METRIC_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          disabled={busy}
                          onClick={() => handleUpdateMetric(c.id, opt.value, c.metricRequired)}
                          className="flex-1 rounded-lg py-2 text-[11px] font-medium disabled:opacity-50"
                          style={{
                            background: c.metricType === opt.value ? 'var(--accent)' : 'var(--surface)',
                            color: c.metricType === opt.value ? '#09090b' : 'var(--ink-muted)',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {c.metricType !== 'none' && (
                      <button
                        disabled={busy}
                        onClick={() => handleUpdateMetric(c.id, c.metricType, !c.metricRequired)}
                        className="flex w-full items-center justify-between rounded-lg bg-surface px-3 py-2 disabled:opacity-50"
                      >
                        <span className="text-xs text-ink">Require this on upload</span>
                        <span
                          className="relative h-5 w-9 rounded-full transition-colors"
                          style={{ backgroundColor: c.metricRequired ? 'var(--accent)' : 'var(--surface-2)' }}
                        >
                          <span
                            className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                            style={{ left: c.metricRequired ? '18px' : '2px' }}
                          />
                        </span>
                      </button>
                    )}
                  </div>
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
            <div className="flex gap-1.5">
              {METRIC_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setNewMetricType(opt.value)}
                  className="flex-1 rounded-lg py-2 text-[11px] font-medium"
                  style={{
                    background: newMetricType === opt.value ? 'var(--accent)' : 'var(--surface-2)',
                    color: newMetricType === opt.value ? '#09090b' : 'var(--ink-muted)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {newMetricType !== 'none' && (
              <button
                onClick={() => setNewMetricRequired((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg bg-surface-2 px-3 py-2"
              >
                <span className="text-xs text-ink">Require this on upload</span>
                <span
                  className="relative h-5 w-9 rounded-full transition-colors"
                  style={{ backgroundColor: newMetricRequired ? 'var(--accent)' : 'var(--surface)' }}
                >
                  <span
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                    style={{ left: newMetricRequired ? '18px' : '2px' }}
                  />
                </span>
              </button>
            )}
            <button
              onClick={handleAddCategory}
              disabled={busy || !newLabel.trim() || !newEmoji.trim()}
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 disabled:opacity-60"
            >
              Add
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
