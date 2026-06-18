import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPush } from '@/lib/webpush'
import type webpush from 'web-push'

const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (!WEBHOOK_SECRET || auth !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const payload = await request.json()
  if (payload.type !== 'INSERT' || payload.table !== 'photos') {
    return NextResponse.json({ ok: true })
  }

  const photo = payload.record as {
    id: string
    user_id: string
    community_id: string
    date: string
    category_id: string
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const [{ data: uploader }, { data: category }, { data: otherMembers }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', photo.user_id).single(),
    supabase.from('categories').select('label, emoji').eq('id', photo.category_id).single(),
    supabase
      .from('community_members')
      .select('user_id')
      .eq('community_id', photo.community_id)
      .neq('user_id', photo.user_id),
  ])

  const otherUserIds = ((otherMembers ?? []) as { user_id: string }[]).map((m) => m.user_id)
  if (otherUserIds.length === 0) return NextResponse.json({ ok: true })

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .in('user_id', otherUserIds)

  const uploaderName = (uploader as { display_name: string } | null)?.display_name ?? 'Your partner'
  const cat = category as { label: string; emoji: string } | null
  const catLabel = cat ? `${cat.emoji} ${cat.label}` : 'a workout'

  const sends: Promise<void>[] = []
  for (const row of (subscriptions ?? []) as { subscription: webpush.PushSubscription }[]) {
    sends.push(
      sendPush(row.subscription, {
        title: 'Project S',
        body: `${uploaderName} just logged ${catLabel} 💪`,
      }).catch(() => {}),
    )
  }
  await Promise.all(sends)

  // Check if every community member has now logged today → send "both done" to all
  const { data: allMembers } = await supabase
    .from('community_members')
    .select('user_id')
    .eq('community_id', photo.community_id)

  const allUserIds = ((allMembers ?? []) as { user_id: string }[]).map((m) => m.user_id)

  const { data: todayPhotos } = await supabase
    .from('photos')
    .select('user_id')
    .eq('community_id', photo.community_id)
    .eq('date', photo.date)

  const loggedToday = new Set(((todayPhotos ?? []) as { user_id: string }[]).map((p) => p.user_id))
  const allDone = allUserIds.length > 1 && allUserIds.every((uid) => loggedToday.has(uid))

  if (allDone) {
    const { data: allSubs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .in('user_id', allUserIds)

    const bothSends: Promise<void>[] = []
    for (const row of (allSubs ?? []) as { subscription: webpush.PushSubscription }[]) {
      bothSends.push(
        sendPush(row.subscription, {
          title: 'Project S',
          body: "You're both done for today! 🎉",
        }).catch(() => {}),
      )
    }
    await Promise.all(bothSends)
  }

  return NextResponse.json({ ok: true })
}
