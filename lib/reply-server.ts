import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canReplyTo, replyChannel, type ReplyChannel } from '@/lib/reply'

type SessionClient = Awaited<ReturnType<typeof createClient>>

export function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export interface ReplyContext {
  supabase: SessionClient
  channel:  ReplyChannel
  /** Numéro WhatsApp ou adresse email du client, lu en base. */
  to:       string
  /** Conversation ciblée, quand l'envoi part du détail de conversation. */
  conversationId: string | null
  /**
   * Dossier de stockage des PJ. L'UUID de conversation quand il existe,
   * sinon l'escalade — une escalade n'a pas toujours de conversation liée.
   */
  storageKey: string
}

type Resolved =
  | { context: ReplyContext; error: null }
  | { context: null; error: NextResponse }

/**
 * Contrôles communs aux routes d'envoi : session valide, cible existante,
 * canal supporté, dossier non clos.
 *
 * Le canal et le destinataire sont relus en base plutôt que repris du corps de
 * la requête : le navigateur ne doit pouvoir choisir ni à qui ni par quel
 * canal on écrit.
 *
 * La cible est soit une conversation (`conversation_id`, détail de
 * conversation), soit une escalade (`escalation_id`, page Besoin humain).
 */
export async function resolveReplyContext(body: {
  conversation_id?: unknown
  escalation_id?:   unknown
}): Promise<Resolved> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { context: null, error: fail('Non authentifié', 401) }

  if (body.conversation_id !== undefined && body.conversation_id !== null) {
    return resolveFromConversation(supabase, body.conversation_id)
  }
  if (body.escalation_id !== undefined && body.escalation_id !== null) {
    return resolveFromEscalation(supabase, body.escalation_id)
  }
  return { context: null, error: fail('Cible de la réponse manquante', 400) }
}

async function resolveFromConversation(
  supabase: SessionClient,
  rawId:    unknown,
): Promise<Resolved> {
  if (typeof rawId !== 'string' || rawId.trim() === '') {
    return { context: null, error: fail('Identifiant de conversation invalide', 400) }
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('id, channel, status, contact_id')
    .eq('id', rawId)
    .single()

  if (error || !data) return { context: null, error: fail('Conversation introuvable', 404) }

  const channel = replyChannel(data.channel)
  if (!channel || !canReplyTo(data)) {
    return { context: null, error: fail("Cette conversation n'accepte pas de réponse", 409) }
  }

  return {
    context: {
      supabase,
      channel,
      to:             data.contact_id!.trim(),
      conversationId: data.id,
      storageKey:     data.id,
    },
    error: null,
  }
}

async function resolveFromEscalation(
  supabase: SessionClient,
  rawId:    unknown,
): Promise<Resolved> {
  const id = typeof rawId === 'number' ? rawId : Number(rawId)
  if (!Number.isInteger(id)) {
    return { context: null, error: fail("Identifiant d'escalade invalide", 400) }
  }

  const { data, error } = await supabase
    .from('human_escalations')
    .select('id, channel, status, contact_id')
    .eq('id', id)
    .single()

  if (error || !data) return { context: null, error: fail('Escalade introuvable', 404) }

  const channel = replyChannel(data.channel)
  if (!channel || !canReplyTo(data)) {
    return { context: null, error: fail("Cette escalade n'accepte pas de réponse", 409) }
  }

  // L'escalade et la conversation sont rapprochées par `contact_id`, comme
  // dans getEscalationById : le dossier de stockage suit la conversation
  // quand elle existe, pour que toutes les PJ d'un même client soient
  // regroupées au même endroit.
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('contact_id', data.contact_id!)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    context: {
      supabase,
      channel,
      to:             data.contact_id!.trim(),
      conversationId: conv?.id ?? null,
      storageKey:     conv?.id ?? `escalade-${data.id}`,
    },
    error: null,
  }
}
