import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export const DAILY_AI_LIMIT = 3

/** Count AI sessions in the last 24h. Returns remaining credits. */
export async function getRemainingCredits(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('ai_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since)
  if (error) throw error
  return Math.max(0, DAILY_AI_LIMIT - (count ?? 0))
}

export async function isRateLimited(supabase: SupabaseClient, userId: string): Promise<boolean> {
  return (await getRemainingCredits(supabase, userId)) <= 0
}
