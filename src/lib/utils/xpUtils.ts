import type { XPLevel } from '@/types'
import { dateKey, addDays } from './dateUtils'

export const LEVELS: XPLevel[] = [
  { level: 1, label: 'Starting out', minXP: 0, maxXP: 100 },
  { level: 2, label: 'Getting going', minXP: 100, maxXP: 250 },
  { level: 3, label: 'Building habits', minXP: 250, maxXP: 500 },
  { level: 4, label: 'Consistent', minXP: 500, maxXP: 1000 },
  { level: 5, label: 'Unstoppable', minXP: 1000, maxXP: Infinity },
]

export function getLevelForXP(xp: number): XPLevel {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i]
  }
  return LEVELS[0]
}

/**
 * Streak: unbroken chain of consecutive days with uploads ending on today
 * (or yesterday, if today has no upload yet).
 * @param distinctDates - distinct "YYYY-MM-DD" upload dates, any order
 */
export function computeStreak(distinctDates: string[]): number {
  const dates = new Set(distinctDates)
  const today = new Date()
  let cursor = dates.has(dateKey(today)) ? today : addDays(today, -1)
  let streak = 0
  while (dates.has(dateKey(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}
