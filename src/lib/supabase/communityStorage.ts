import { getSupabase } from './client'
import { rowToUser } from './userStorage'
import type { Category, Community } from '@/types'

type CategoryRow = {
  id: string
  community_id: string
  slug: string
  label: string
  emoji: string
  color: string
  sort_order: number
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    communityId: row.community_id,
    slug: row.slug,
    label: row.label,
    emoji: row.emoji,
    color: row.color,
    sortOrder: row.sort_order,
  }
}

export const DEFAULT_CATEGORIES = [
  { slug: 'gym', label: 'Gym', emoji: '🏋️', color: '#c084fc', sort_order: 0 },
  { slug: 'meals', label: 'Meals', emoji: '🍽️', color: '#fb923c', sort_order: 1 },
  { slug: 'study', label: 'Study', emoji: '📚', color: '#38bdf8', sort_order: 2 },
]

export async function createCommunity(name: string, userId: string): Promise<Community> {
  const supabase = getSupabase()
  const { data: community, error } = await supabase
    .from('communities')
    .insert({ name, created_by: userId })
    .select()
    .single()
  if (error) throw error

  const { error: memberError } = await supabase
    .from('community_members')
    .insert({ community_id: community.id, user_id: userId, role: 'admin' })
  if (memberError) throw memberError

  const { error: catError } = await supabase
    .from('categories')
    .insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, community_id: community.id })))
  if (catError) throw catError

  return getCommunity(community.id) as Promise<Community>
}

export async function joinCommunityByCode(code: string): Promise<string | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase.rpc('join_community_by_code', { code })
  if (error) throw error
  return (data as string | null) ?? null
}

export async function previewCommunityByCode(
  code: string,
): Promise<{ id: string; name: string; memberCount: number } | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase.rpc('preview_community_by_code', { code })
  if (error || !data || (data as unknown[]).length === 0) return null
  const row = (data as { id: string; name: string; member_count: number }[])[0]
  return { id: row.id, name: row.name, memberCount: Number(row.member_count) }
}

export async function getCommunity(communityId: string): Promise<Community | null> {
  const supabase = getSupabase()
  const { data: community, error } = await supabase
    .from('communities')
    .select('*')
    .eq('id', communityId)
    .maybeSingle()
  if (error || !community) return null

  const [{ data: memberRows }, { data: categoryRows }] = await Promise.all([
    supabase
      .from('community_members')
      .select('user_id, role, profiles(*)')
      .eq('community_id', communityId),
    supabase
      .from('categories')
      .select('*')
      .eq('community_id', communityId)
      .order('sort_order', { ascending: true }),
  ])

  return {
    id: community.id,
    name: community.name,
    inviteCode: community.invite_code,
    members: (memberRows ?? [])
      .filter((m: { profiles: unknown }) => m.profiles)
      .map((m: { profiles: never }) => rowToUser(m.profiles)),
    categories: ((categoryRows ?? []) as CategoryRow[]).map(rowToCategory),
  }
}

export async function getMyCommunities(
  userId: string,
): Promise<{ id: string; name: string; memberCount: number; role: string }[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('community_members')
    .select('community_id, role, communities(id, name)')
    .eq('user_id', userId)
  if (error || !data) return []

  const result = []
  for (const row of data as { community_id: string; role: string; communities: { id: string; name: string } | null }[]) {
    if (!row.communities) continue
    const { count } = await supabase
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', row.community_id)
    result.push({
      id: row.communities.id,
      name: row.communities.name,
      memberCount: count ?? 1,
      role: row.role,
    })
  }
  return result
}

export async function getMyRole(communityId: string, userId: string): Promise<string | null> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .maybeSingle()
  return data?.role ?? null
}

export async function addCategory(params: {
  communityId: string
  label: string
  emoji: string
  color: string
  sortOrder: number
}): Promise<Category> {
  const supabase = getSupabase()
  const slug = params.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category'
  const { data, error } = await supabase
    .from('categories')
    .insert({
      community_id: params.communityId,
      slug,
      label: params.label,
      emoji: params.emoji,
      color: params.color,
      sort_order: params.sortOrder,
    })
    .select()
    .single()
  if (error) throw error
  return rowToCategory(data as CategoryRow)
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('categories').delete().eq('id', categoryId)
  if (error) throw error
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const supabase = getSupabase()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('categories').update({ sort_order: index }).eq('id', id),
    ),
  )
}

/** Subscribe to category changes for a community. Returns unsubscribe fn. */
export function subscribeToCategories(communityId: string, onChange: () => void): () => void {
  const supabase = getSupabase()
  const channel = supabase
    .channel(`categories-${communityId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'categories', filter: `community_id=eq.${communityId}` },
      () => onChange(),
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
