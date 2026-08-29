import { NextRequest, NextResponse } from 'next/server'
import { fail, resolveReplyContext } from '@/lib/reply-server'
import { CHANNEL_RULES, isAgentAttachmentUrl, type ReplyChannel } from '@/lib/reply'
import { AGENT_HUMAN_ROLE } from '@/lib/conversation'
import { mimeTypeFromName } from '@/lib/media'

const TIMEOUT_MS = 20_000

interface IncomingAttachment {
  url:      string
  name:     string
  mimeType: string
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * La PJ est décrite par le navigateur : son URL est revalidée contre notre
 * bucket public avant d'être transmise. Sans ce contrôle, n'importe quelle URL
 * pourrait être relayée par Twilio ou Gmail depuis notre compte.
 */
function parseAttachment(raw: unknown): IncomingAttachment | null | 'invalid' {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== 'object') return 'invalid'

  const record = raw as Record<string, unknown>
  const url    = str(record.url)
  if (!url) return 'invalid'

  if (!isAgentAttachmentUrl(url, process.env.SUPABASE_URL ?? '')) return 'invalid'

  const name = str(record.name) || 'piece-jointe'
  return {
    url,
    name,
    mimeType: str(record.mimeType) || mimeTypeFromName(name) || 'application/octet-stream',
  }
}

function buildPayload(
  channel:        ReplyChannel,
  conversationId: string,
  to:             string,
  message:        string,
  subject:        string,
  attachment:     IncomingAttachment | null,
) {
  if (channel === 'whatsapp') {
    return {
      channel,
      conversation_id: conversationId,
      to,
      message,
      ...(attachment ? { mediaUrl: attachment.url } : {}),
    }
  }

  return {
    channel,
    conversation_id: conversationId,
    to,
    subject,
    message,
    ...(attachment ? {
      attachmentUrl:      attachment.url,
      attachmentName:     attachment.name,
      attachmentMimeType: attachment.mimeType,
    } : {}),
  }
}

/**
 * Envoi d'une réponse humaine au client. Un seul webhook n8n gère les deux
 * canaux : le champ `channel` du payload lui indique s'il doit router vers
 * Twilio ou Gmail.
 *
 * L'écriture du message dans `conversations.history` est faite par n8n après
 * l'envoi réel ; le dashboard se contente d'afficher le message renvoyé ici en
 * optimistic update.
 */
export async function POST(req: NextRequest) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) {
    console.error('[reply] N8N_WEBHOOK_URL non configurée')
    return fail("Envoi non configuré (N8N_WEBHOOK_URL manquante).", 500)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return fail('Corps de requête invalide', 400)
  }

  const { context, error } = await resolveReplyContext({ conversation_id: body.conversation_id })
  if (error) return error

  const { channel, conversationId, to, supabase } = context
  const rules = CHANNEL_RULES[channel]

  const attachment = parseAttachment(body.attachment)
  if (attachment === 'invalid') return fail('Pièce jointe invalide', 400)

  const message = str(body.message)
  if (!message && (rules.messageRequired || !attachment)) {
    return fail(
      rules.messageRequired
        ? 'Le message est obligatoire pour un email.'
        : 'Saisissez un message ou joignez un fichier.',
      400,
    )
  }

  const subject = rules.hasSubject ? str(body.subject) : ''

  let res: Response
  try {
    res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(buildPayload(channel, conversationId!, to, message, subject, attachment)),
      cache:   'no-store',
      signal:  AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    const timedOut = name === 'TimeoutError' || name === 'AbortError'
    console.error('[reply]', timedOut ? 'timeout n8n' : 'n8n injoignable')
    return fail(
      timedOut ? "Délai dépassé — l'envoi n'a pas été confirmé." : 'Service d\'envoi injoignable.',
      timedOut ? 504 : 502,
    )
  }

  if (!res.ok) {
    console.error('[reply] réponse n8n', res.status, (await res.text()).slice(0, 500))
    return fail("Le service d'envoi a refusé la demande.", 502)
  }

  // Journalise qui a répondu : `supabase.auth.getUser()` a déjà validé la
  // session dans resolveReplyContext, on réutilise le même client.
  const { data: { user } } = await supabase.auth.getUser()
  console.info('[reply] envoyé', { channel, conversationId, by: user?.id, attachment: Boolean(attachment) })

  return NextResponse.json({
    ok: true,
    message: {
      role:      AGENT_HUMAN_ROLE,
      content:   message,
      timestamp: new Date().toISOString(),
      ...(attachment ? {
        attachmentUrl:  attachment.url,
        attachmentName: attachment.name,
      } : {}),
      ...(subject ? { subject } : {}),
    },
  })
}
