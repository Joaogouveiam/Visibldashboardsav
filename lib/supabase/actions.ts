'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Profile } from '@/lib/types/sav'

export type UpdateStatusResult = { success: boolean; error?: string }

export async function updateEscalationStatus(
  id: number,
  status: string
): Promise<UpdateStatusResult> {
  const supabase = await createClient()

  // Récupère contact_id avant la mise à jour pour la sync conversations
  const { data: esc } = await supabase
    .from('human_escalations')
    .select('contact_id')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('human_escalations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[updateEscalationStatus]', error.message)
    return { success: false, error: error.message }
  }

  // Quand l'escalade est clôturée, on reprend le chatbot (paused = false)
  if ((status === 'resolved' || status === 'closed') && esc?.contact_id) {
    const { error: convErr } = await supabase
      .from('conversations')
      .update({ paused: false })
      .eq('contact_id', esc.contact_id)

    if (convErr) console.error('[updateEscalationStatus] unpause conversation', convErr.message)
  }

  revalidatePath('/dashboard/besoin-humain')
  revalidatePath(`/dashboard/besoin-humain/${id}`)
  return { success: true }
}

// ── Profil ────────────────────────────────────────────────────

export async function updateProfile(
  data: Pick<Profile, 'full_name' | 'role'>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { success: false, error: 'Non authentifié' }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, full_name: data.full_name, role: data.role, updated_at: new Date().toISOString() })

  if (error) { console.error('[updateProfile]', error.message); return { success: false, error: error.message } }

  revalidatePath('/dashboard/parametres')
  return { success: true }
}
