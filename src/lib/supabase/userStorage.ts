// The ONLY identity accessors. No component reads supabase.auth directly.
import { getSupabase } from './client'
import type { AppUser, ThemePreference } from '@/types'

type ProfileRow = {
  id: string
  username: string
  display_name: string
  avatar_color: string
  accent_color: string
  theme_preference?: string
  xp: number
}

export function rowToUser(row: ProfileRow): AppUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    accentColor: row.accent_color,
    xp: row.xp,
  }
}

export async function getSessionUserId(): Promise<string | null> {
  const supabase = getSupabase()
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export async function getCurrentProfile(): Promise<(AppUser & { themePreference: ThemePreference }) | null> {
  const supabase = getSupabase()
  const userId = await getSessionUserId()
  if (!userId) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error || !data) return null
  const row = data as ProfileRow
  return { ...rowToUser(row), themePreference: (row.theme_preference ?? 'system') as ThemePreference }
}

export async function createProfile(params: {
  username: string
  displayName: string
  avatarColor: string
  accentColor: string
}): Promise<AppUser> {
  const supabase = getSupabase()
  const userId = await getSessionUserId()
  if (!userId) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username: params.username,
      display_name: params.displayName,
      avatar_color: params.avatarColor,
      accent_color: params.accentColor,
    })
    .select()
    .single()
  if (error) throw error
  return rowToUser(data as ProfileRow)
}

export async function updateProfile(
  updates: Partial<{
    username: string
    displayName: string
    accentColor: string
    avatarColor: string
    themePreference: ThemePreference
  }>,
): Promise<void> {
  const supabase = getSupabase()
  const userId = await getSessionUserId()
  if (!userId) throw new Error('Not authenticated')
  const row: Record<string, string> = {}
  if (updates.username !== undefined) row.username = updates.username
  if (updates.displayName !== undefined) row.display_name = updates.displayName
  if (updates.accentColor !== undefined) row.accent_color = updates.accentColor
  if (updates.avatarColor !== undefined) row.avatar_color = updates.avatarColor
  if (updates.themePreference !== undefined) row.theme_preference = updates.themePreference
  const { error } = await supabase.from('profiles').update(row).eq('id', userId)
  if (error) throw error
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const supabase = getSupabase()
  const { data, error } = await supabase.rpc('is_username_taken', { candidate: username })
  if (error) return false
  return Boolean(data)
}

export async function sendMagicLink(email: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined,
    },
  })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase()
  await supabase.auth.signOut()
}
