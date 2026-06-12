// The ONLY file that reads or writes Supabase Storage or the photos table.
import { getSupabase } from './client'
import type { Photo } from '@/types'

type PhotoRow = {
  id: string
  user_id: string
  community_id: string
  date: string
  category_id: string
  storage_path: string
  public_url: string
  created_at: string
}

function rowToPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    userId: row.user_id,
    communityId: row.community_id,
    date: row.date,
    categoryId: row.category_id,
    publicUrl: row.public_url,
    createdAt: row.created_at,
  }
}

export async function uploadPhoto(params: {
  blob: Blob
  userId: string
  communityId: string
  date: string // YYYY-MM-DD
  categoryId: string
}): Promise<Photo> {
  const supabase = getSupabase()
  const photoId = crypto.randomUUID()
  const storagePath = `${params.communityId}/${params.userId}/${params.date}/${photoId}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(storagePath, params.blob, { contentType: 'image/jpeg' })
  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from('photos').getPublicUrl(storagePath)

  const { data, error } = await supabase
    .from('photos')
    .insert({
      id: photoId,
      user_id: params.userId,
      community_id: params.communityId,
      date: params.date,
      category_id: params.categoryId,
      storage_path: storagePath,
      public_url: urlData.publicUrl,
    })
    .select()
    .single()
  if (error) throw error
  return rowToPhoto(data as PhotoRow)
}

export async function getPhotosForMonth(
  communityId: string,
  year: number,
  month: number, // 0-indexed
): Promise<Photo[]> {
  const supabase = getSupabase()
  const first = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const last = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('community_id', communityId)
    .gte('date', first)
    .lte('date', last)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as PhotoRow[]).map(rowToPhoto)
}

export async function getPhotosForDate(communityId: string, date: string): Promise<Photo[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('community_id', communityId)
    .eq('date', date)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as PhotoRow[]).map(rowToPhoto)
}

export async function getRecentPhotos(communityId: string, limit = 20): Promise<Photo[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as PhotoRow[]).map(rowToPhoto)
}

export async function deletePhotos(photoIds: string[]): Promise<void> {
  if (photoIds.length === 0) return
  const supabase = getSupabase()

  const { data: rows, error: fetchError } = await supabase
    .from('photos')
    .select('id, storage_path')
    .in('id', photoIds)
  if (fetchError) throw fetchError

  const paths = (rows ?? []).map((r: { storage_path: string }) => r.storage_path)
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from('photos').remove(paths)
    if (storageError) throw storageError
  }

  const { error } = await supabase.from('photos').delete().in('id', photoIds)
  if (error) throw error
}

export async function updatePhotoCategory(photoId: string, categoryId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('photos')
    .update({ category_id: categoryId })
    .eq('id', photoId)
  if (error) throw error
}

export async function getCategoryCounts(userId: string): Promise<Record<string, number>> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('photos')
    .select('category_id')
    .eq('user_id', userId)
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const row of data as { category_id: string }[]) {
    counts[row.category_id] = (counts[row.category_id] ?? 0) + 1
  }
  return counts
}

export async function getDistinctUploadDates(userId: string): Promise<string[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('photos')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) throw error
  return Array.from(new Set((data as { date: string }[]).map((r) => r.date)))
}

/** Subscribe to INSERT/DELETE on photos for a community. Returns unsubscribe fn. */
export function subscribeToPhotos(
  communityId: string,
  handlers: {
    onInsert?: (photo: Photo) => void
    onDelete?: (photoId: string) => void
  },
  channelSuffix?: string,
): () => void {
  const supabase = getSupabase()
  const channelName = channelSuffix ? `photos-${communityId}-${channelSuffix}` : `photos-${communityId}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'photos', filter: `community_id=eq.${communityId}` },
      (payload) => handlers.onInsert?.(rowToPhoto(payload.new as PhotoRow)),
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'photos' },
      (payload) => handlers.onDelete?.((payload.old as { id: string }).id),
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
