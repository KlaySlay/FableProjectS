import { getSupabase } from './client'
import { getDistinctUploadDates, getCategoryCounts } from './photoStorage'
import { computeStreak, getLevelForXP } from '@/lib/utils/xpUtils'
import { dateKey, addDays } from '@/lib/utils/dateUtils'
import type { Badge } from '@/types'

export type XPEventType =
  | 'upload'
  | 'daily_triple'
  | 'week_streak'
  | 'mcq_complete'
  | 'mcq_perfect'
  | 'meal_analysis'
  | 'routine_review'
  | 'workout_split'

export const XP_VALUES: Record<XPEventType, number> = {
  upload: 10,
  daily_triple: 25,
  week_streak: 50,
  mcq_complete: 20,
  mcq_perfect: 15,
  meal_analysis: 5,
  routine_review: 10,
  workout_split: 10,
}

export async function awardXP(
  userId: string,
  eventType: XPEventType,
  metadata?: Record<string, unknown>,
): Promise<number> {
  const supabase = getSupabase()
  const xp = XP_VALUES[eventType]
  const { error } = await supabase
    .from('xp_events')
    .insert({ user_id: userId, event_type: eventType, xp_awarded: xp, metadata: metadata ?? null })
  if (error) throw error
  await supabase.rpc('increment_xp', { uid: userId, amount: xp })
  return xp
}

export async function getXPForWeek(userId: string): Promise<{ date: string; xp: number }[]> {
  const supabase = getSupabase()
  const today = new Date()
  const start = addDays(today, -6)
  const { data, error } = await supabase
    .from('xp_events')
    .select('xp_awarded, created_at')
    .eq('user_id', userId)
    .gte('created_at', start.toISOString().slice(0, 10))
  if (error) throw error

  const byDate: Record<string, number> = {}
  for (let i = 0; i < 7; i++) byDate[dateKey(addDays(start, i))] = 0
  for (const row of data as { xp_awarded: number; created_at: string }[]) {
    const key = row.created_at.slice(0, 10)
    if (key in byDate) byDate[key] += row.xp_awarded
  }
  return Object.entries(byDate).map(([date, xp]) => ({ date, xp }))
}

export async function getWeeklyXPByUser(userIds: string[]): Promise<Record<string, number>> {
  const supabase = getSupabase()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('xp_events')
    .select('user_id, xp_awarded')
    .in('user_id', userIds)
    .gte('created_at', since)
  if (error) throw error
  const totals: Record<string, number> = {}
  for (const id of userIds) totals[id] = 0
  for (const row of data as { user_id: string; xp_awarded: number }[]) {
    totals[row.user_id] = (totals[row.user_id] ?? 0) + row.xp_awarded
  }
  return totals
}

export async function getStreak(userId: string): Promise<number> {
  const dates = await getDistinctUploadDates(userId)
  return computeStreak(dates)
}

export async function hasUploadedToday(userId: string): Promise<boolean> {
  const dates = await getDistinctUploadDates(userId)
  return dates.includes(dateKey(new Date()))
}

export async function getAllBadges(): Promise<Badge[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('badges').select('*')
  if (error) throw error
  return (data as { id: string; name: string; description: string; emoji: string; condition_type: string }[]).map(
    (b) => ({ id: b.id, name: b.name, description: b.description, emoji: b.emoji, conditionType: b.condition_type }),
  )
}

export async function getUserBadges(userId: string): Promise<Record<string, string>> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('user_badges')
    .select('badge_id, awarded_at')
    .eq('user_id', userId)
  if (error) throw error
  const result: Record<string, string> = {}
  for (const row of data as { badge_id: string; awarded_at: string }[]) {
    result[row.badge_id] = row.awarded_at
  }
  return result
}

/**
 * Check every badge condition against current state and award any newly met.
 * Never double-awards — existing rows are checked first.
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const supabase = getSupabase()
  const owned = await getUserBadges(userId)
  const newlyAwarded: string[] = []

  const award = async (badgeId: string) => {
    if (owned[badgeId]) return
    const { error } = await supabase
      .from('user_badges')
      .insert({ user_id: userId, badge_id: badgeId })
    if (!error) newlyAwarded.push(badgeId)
  }

  const [dates, categoryCounts] = await Promise.all([
    getDistinctUploadDates(userId),
    getCategoryCounts(userId),
  ])
  const totalUploads = Object.values(categoryCounts).reduce((a, b) => a + b, 0)
  const streak = computeStreak(dates)

  if (totalUploads >= 1) await award('first_upload')
  if (streak >= 7) await award('week_streak')
  if (streak >= 30) await award('month_streak')

  // Category badges need slugs — map category ids to slugs
  const catIds = Object.keys(categoryCounts)
  if (catIds.length > 0) {
    const { data: cats } = await supabase.from('categories').select('id, slug').in('id', catIds)
    const bySlug: Record<string, number> = {}
    for (const cat of (cats ?? []) as { id: string; slug: string }[]) {
      bySlug[cat.slug] = (bySlug[cat.slug] ?? 0) + (categoryCounts[cat.id] ?? 0)
    }
    if ((bySlug['gym'] ?? 0) >= 20) await award('gym_rat')
    if ((bySlug['meals'] ?? 0) >= 15) await award('clean_eater')
    if ((bySlug['study'] ?? 0) >= 10) await award('scholar')

    // all_rounder: uploads in gym+meals+study within the last 7 days
    const weekAgo = dateKey(addDays(new Date(), -6))
    const { data: weekPhotos } = await supabase
      .from('photos')
      .select('category_id')
      .eq('user_id', userId)
      .gte('date', weekAgo)
    const weekSlugs = new Set(
      ((weekPhotos ?? []) as { category_id: string }[]).map(
        (p) => ((cats ?? []) as { id: string; slug: string }[]).find((c) => c.id === p.category_id)?.slug,
      ),
    )
    if (weekSlugs.has('gym') && weekSlugs.has('meals') && weekSlugs.has('study')) {
      await award('all_rounder')
    }
  }

  // perfect_quiz
  const { data: perfect } = await supabase
    .from('mcq_attempts')
    .select('id')
    .eq('user_id', userId)
    .eq('score', 5)
    .limit(1)
  if (perfect && perfect.length > 0) await award('perfect_quiz')

  // level_5
  const { data: profile } = await supabase.from('profiles').select('xp').eq('id', userId).maybeSingle()
  if (profile && getLevelForXP(profile.xp).level >= 5) await award('level_5')

  return newlyAwarded
}
