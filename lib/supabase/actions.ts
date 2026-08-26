'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validateClient } from '@/lib/clients/validation'
import type { Profile, ClientContext, ClientContextInput } from '@/lib/types/sav'

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

// ── Clients (client_contexts) ─────────────────────────────────

const CLIENTS_PATH = '/dashboard/clients'

export type ClientMutationResult =
  | { success: true; client: ClientContext }
  | { success: false; error: string }

export type ImportClientsResult = {
  inserted: number
  updated:  number
  failed:   number
  /** Détail des lignes rejetées, pour affichage dans la modale. */
  errors:   Array<{ row: number; name: string | null; message: string }>
}

/** Traduit une erreur Postgres en message lisible. */
function humanizeError(err: { code?: string; message: string; details?: string | null }): string {
  if (err.code === '23505') {
    const target = /email/i.test(err.details ?? err.message)
      ? 'email'
      : /phone/i.test(err.details ?? err.message)
        ? 'téléphone'
        : 'contact'
    return `Un client avec le même ${target} existe déjà`
  }
  if (err.code === '42P01') return 'Table client_contexts introuvable'
  if (err.code === '42501') {
    return 'Accès refusé par la sécurité Supabase (RLS) — appliquez la migration 008_client_contexts_rls.sql'
  }
  return err.message
}

/** Ne conserve que les champs renseignés — évite d'écraser l'existant avec des nulls. */
function definedFields(input: Partial<ClientContextInput>): Partial<ClientContextInput> {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== null && v !== undefined && v !== '')
  ) as Partial<ClientContextInput>
}

export async function createClientContext(
  input: ClientContextInput
): Promise<ClientMutationResult> {
  const errors = validateClient(input)
  if (Object.keys(errors).length > 0) {
    return { success: false, error: Object.values(errors)[0] as string }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('client_contexts')
    .insert({ ...input, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) {
    console.error('[createClientContext]', error.message)
    return { success: false, error: humanizeError(error) }
  }

  revalidatePath(CLIENTS_PATH)
  return { success: true, client: data as ClientContext }
}

export async function updateClientContext(
  id: string,
  input: ClientContextInput
): Promise<ClientMutationResult> {
  const errors = validateClient(input)
  if (Object.keys(errors).length > 0) {
    return { success: false, error: Object.values(errors)[0] as string }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('client_contexts')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[updateClientContext]', error.message)
    return { success: false, error: humanizeError(error) }
  }

  revalidatePath(CLIENTS_PATH)
  return { success: true, client: data as ClientContext }
}

/**
 * Import batch depuis un CSV.
 *
 * `client_contexts` porte deux contraintes uniques distinctes (email, phone) :
 * un upsert Postgres ne peut cibler qu'une seule d'entre elles. On rapproche
 * donc chaque ligne des clients existants par email *ou* téléphone, puis on
 * met à jour les correspondances et on insère le reste.
 */
export async function importClientContexts(
  rows: ClientContextInput[]
): Promise<ImportClientsResult> {
  const result: ImportClientsResult = { inserted: 0, updated: 0, failed: 0, errors: [] }
  if (rows.length === 0) return result

  const supabase = await createClient()

  const { data: existing, error: fetchErr } = await supabase
    .from('client_contexts')
    .select('id, email, phone')

  if (fetchErr) {
    console.error('[importClientContexts] fetch', fetchErr.message)
    return {
      inserted: 0, updated: 0, failed: rows.length,
      errors: [{ row: 0, name: null, message: humanizeError(fetchErr) }],
    }
  }

  // Index des clients déjà en base, par email et par téléphone.
  const byEmail = new Map<string, string>()
  const byPhone = new Map<string, string>()
  for (const c of existing ?? []) {
    if (c.email) byEmail.set(c.email.toLowerCase(), c.id)
    if (c.phone) byPhone.set(c.phone, c.id)
  }

  const toInsert: Array<{ row: number; input: ClientContextInput }> = []
  const toUpdate: Array<{ row: number; id: string; input: ClientContextInput }> = []

  rows.forEach((input, index) => {
    const rowNumber = index + 1

    const errors = validateClient(input)
    if (Object.keys(errors).length > 0) {
      result.failed++
      result.errors.push({
        row: rowNumber,
        name: input.full_name,
        message: Object.values(errors)[0] as string,
      })
      return
    }

    const id =
      (input.email ? byEmail.get(input.email.toLowerCase()) : undefined) ??
      (input.phone ? byPhone.get(input.phone) : undefined)

    if (id) {
      toUpdate.push({ row: rowNumber, id, input })
    } else {
      toInsert.push({ row: rowNumber, input })
      // Les lignes suivantes du même CSV doivent voir cette ligne comme existante
      // — sinon deux doublons internes partent tous les deux en insert et la
      // contrainte unique rejette le second.
      if (input.email) byEmail.set(input.email.toLowerCase(), '__pending__')
      if (input.phone) byPhone.set(input.phone, '__pending__')
    }
  })

  // Doublons internes au CSV : la 2e occurrence pointe sur '__pending__'.
  const pendingDupes = toUpdate.filter(u => u.id === '__pending__')
  for (const dupe of pendingDupes) {
    result.failed++
    result.errors.push({
      row: dupe.row,
      name: dupe.input.full_name,
      message: 'Doublon dans le fichier (email ou téléphone déjà présent plus haut)',
    })
  }

  const now = new Date().toISOString()

  // ── Insertions ─────────────────────────────────────────────
  if (toInsert.length > 0) {
    const payload = toInsert.map(r => ({ ...r.input, updated_at: now }))
    const { error } = await supabase.from('client_contexts').insert(payload)

    if (!error) {
      result.inserted += toInsert.length
    } else {
      // Le batch entier échoue dès qu'une ligne est invalide : on retombe
      // ligne par ligne pour importer le maximum et localiser les erreurs.
      for (const r of toInsert) {
        const { error: rowErr } = await supabase
          .from('client_contexts')
          .insert({ ...r.input, updated_at: now })
        if (rowErr) {
          result.failed++
          result.errors.push({ row: r.row, name: r.input.full_name, message: humanizeError(rowErr) })
        } else {
          result.inserted++
        }
      }
    }
  }

  // ── Mises à jour (une par client existant) ─────────────────
  for (const r of toUpdate) {
    if (r.id === '__pending__') continue

    const { error } = await supabase
      .from('client_contexts')
      .update({ ...definedFields(r.input), updated_at: now })
      .eq('id', r.id)

    if (error) {
      result.failed++
      result.errors.push({ row: r.row, name: r.input.full_name, message: humanizeError(error) })
    } else {
      result.updated++
    }
  }

  revalidatePath(CLIENTS_PATH)
  return result
}
