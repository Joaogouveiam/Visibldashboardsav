import { createClient } from '@/lib/supabase/client'
import { ATTACHMENTS_BUCKET } from '@/lib/reply'

export interface UploadTicket {
  path:     string
  token:    string
  url:      string
  name:     string
  mimeType: string
}

/** Cible de l'envoi : une conversation, ou une escalade « Besoin humain ». */
export type ReplyTarget =
  | { conversation_id: string }
  | { escalation_id: number }

/**
 * Le proxy d'authentification redirige toute requête sans session vers
 * /auth/login. Sans ce contrôle du type de réponse, la page HTML de connexion
 * arriverait en 200 et serait prise pour un envoi réussi.
 */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  if (!res.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Session expirée — reconnectez-vous pour envoyer.')
  }

  const data = await res.json().catch(() => null)
  if (!res.ok || !data) {
    throw new Error(data?.error ?? `Échec de la requête (HTTP ${res.status})`)
  }
  return data as T
}

/**
 * Téléverse le fichier en direct vers Storage via une URL signée à usage
 * unique : les octets ne transitent pas par Next.js, ce qui évite la limite de
 * corps des fonctions serverless face aux 25 Mo autorisés en email.
 */
export async function uploadAttachment(target: ReplyTarget, file: File): Promise<UploadTicket> {
  const ticket = await postJson<UploadTicket>('/api/upload', {
    ...target,
    name: file.name,
    type: file.type,
    size: file.size,
  })

  const { error } = await createClient()
    .storage.from(ATTACHMENTS_BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: ticket.mimeType })

  if (error) {
    console.error('[reply] upload Storage', error.message)
    throw new Error("Le fichier n'a pas pu être téléversé. Réessayez.")
  }

  return ticket
}
