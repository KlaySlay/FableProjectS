import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getRemainingCredits } from '@/lib/ai/rateLimit'

export async function GET() {
  const supabase = getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const remaining = await getRemainingCredits(supabase, user.id)
  return NextResponse.json({ remaining })
}
