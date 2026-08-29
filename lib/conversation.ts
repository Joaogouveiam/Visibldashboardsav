import type { ChatMessage } from '@/lib/types/sav'

const CLIENT_ROLES = ['user', 'customer', 'client', 'human']

/** Rôle écrit par le dashboard quand Jean répond lui-même au client. */
export const AGENT_HUMAN_ROLE = 'agent_human'

const AGENT_HUMAN_ROLES = [AGENT_HUMAN_ROLE, 'agent-human', 'agenthuman', 'human_agent']

/** Rôles côté client — tout le reste (assistant, agent, bot, system) est côté agent. */
export function isClientRole(role: string | null | undefined): boolean {
  return CLIENT_ROLES.includes((role ?? '').toLowerCase())
}

/**
 * Distingue une réponse humaine d'une réponse de l'agent IA : les deux sont du
 * côté agent de la conversation, mais ne s'affichent pas avec le même avatar.
 * `human` seul reste côté client (rôle historique du client dans n8n).
 */
export function isHumanAgentRole(role: string | null | undefined): boolean {
  return AGENT_HUMAN_ROLES.includes((role ?? '').toLowerCase())
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
    const record = item as Record<string, unknown>
    const { role, content, ts, timestamp } = record
    return [{
      role:      str(role)    ?? '',
      content:   str(content) ?? '',
      ts:        str(ts),
      timestamp: str(timestamp),
      // Renseignés par n8n sur les réponses envoyées depuis le dashboard.
      attachmentUrl:  str(record.attachmentUrl)  ?? str(record.attachment_url),
      attachmentName: str(record.attachmentName) ?? str(record.attachment_name),
      subject:        str(record.subject),
    }]
  })
}

/**
 * Objet du dernier email connu de la conversation, pour pré-remplir le « Re: »
 * de la zone de réponse. Aucune colonne `subject` n'existe sur `conversations` :
 * la seule source possible est un message d'historique que n8n a annoté.
 */
export function lastKnownSubject(history: ChatMessage[]): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const subject = history[i].subject?.trim()
    if (subject) return subject
  }
  return null
}

/** L'horodatage d'un message s'appelle `ts` ou `timestamp` selon la source. */
export function messageTimestamp(msg: ChatMessage): string | null {
  return msg.ts ?? msg.timestamp ?? null
}
