import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('pending_escalations')
    .select('*', { count: 'exact', head: true })

  if (error) {
    // fallback sur human_escalations
    const { count: c2 } = await supabase
      .from('human_escalations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    return NextResponse.json({ count: c2 ?? 0 })
  }

  return NextResponse.json({ count: count ?? 0 })
}
