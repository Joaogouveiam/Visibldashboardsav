'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Écoute les INSERT sur human_escalations et rafraîchit l'UI.
 * La mise à jour conversations.paused = true est gérée par le trigger DB
 * (migrations/004_pause_trigger.sql), pas ici — plus fiable.
 */
export function RealtimeEscalationWatcher() {
  const router = useRouter()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()

    channelRef.current = supabase
      .channel('realtime:escalations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'human_escalations' },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        // Écoute aussi les INSERT conversations pour rafraîchir l'UI
        // quand la conversation est créée après l'escalade (trigger DB gère paused)
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        () => router.refresh()
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [router])

  return null
}
