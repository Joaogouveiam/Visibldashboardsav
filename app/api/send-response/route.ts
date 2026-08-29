import { NextRequest, NextResponse } from 'next/server'
import { isAgentAttachmentUrl } from '@/lib/reply'

/** Champs de PJ que le panneau « Besoin humain » peut joindre au payload. */
const ATTACHMENT_URL_FIELDS = ['mediaUrl', 'attachmentUrl'] as const

/**
 * Relais vers le webhook n8n pour le panneau de réponse des escalades.
 *
 * Le corps est transmis tel quel — le workflow n8n consomme la forme
 * historique (`escalation`, `history`, `agent_message`…). Seules les URLs de
 * pièce jointe sont revalidées : ce sont elles que Twilio ou Gmail iront
 * chercher, et une URL arbitraire ferait relayer n'importe quel contenu depuis
 * notre compte.
 */
export async function POST(req: NextRequest) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({ error: 'N8N_WEBHOOK_URL not configured' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    for (const field of ATTACHMENT_URL_FIELDS) {
      const value = record[field]
      if (value === undefined || value === null) continue
      if (typeof value !== 'string' || !isAgentAttachmentUrl(value, process.env.SUPABASE_URL ?? '')) {
        return NextResponse.json({ error: 'Pièce jointe invalide' }, { status: 400 })
      }
    }
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[send-response] n8n error', res.status, text)
    return NextResponse.json({ error: 'Webhook error', details: text }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
