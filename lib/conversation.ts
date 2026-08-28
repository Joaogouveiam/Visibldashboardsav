import type { ChatMessage } from '@/lib/types/sav'

const CLIENT_ROLES = ['user', 'customer', 'client', 'human']

/** Rôles côté client — tout le reste (assistant, agent, bot, system) est côté agent. */
export function isClientRole(role: string | null | undefined): boolean {
  return CLIENT_ROLES.includes((role ?? '').toLowerCase())
}

/**
 * Les colonnes jsonb (`history`, `attachments`) remontent parfois en tableau,
 * parfois en chaîne JSON, parfois en chaîne doublement encodée selon le
 * workflow n8n qui les a écrites. On déballe jusqu'à trouver un tableau.
 */
export function parseJsonArray(raw: unknown, maxDepth = 3): unknown[] {
  let value = raw
  for (let i = 0; i < maxDepth; i++) {
    if (Array.isArray(value)) return value
    if (typeof value !== 'string') return []
    try {
      value = JSON.parse(value)
    } catch {
      return []
    }
  }
  return Array.isArray(value) ? value : []
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

export function normalizeHistory(raw: unknown): ChatMessage[] {
  return parseJsonArray(raw).flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const { role, content, ts, timestamp } = item as Record<string, unknown>
    return [{
      role:      str(role)    ?? '',
      content:   str(content) ?? '',
      ts:        str(ts),
      timestamp: str(timestamp),
    }]
  })
}

/** L'horodatage d'un message s'appelle `ts` ou `timestamp` selon la source. */
export function messageTimestamp(msg: ChatMessage): string | null {
  return msg.ts ?? msg.timestamp ?? null
}
