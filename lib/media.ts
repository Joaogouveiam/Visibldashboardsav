import type { Attachment, ChatMessage } from '@/lib/types/sav'
import { isClientRole, messageTimestamp, parseJsonArray } from '@/lib/conversation'

export const TWILIO_MEDIA_HOST = 'api.twilio.com'

/**
 * Seules les URLs média Twilio sont relayées, pour que /api/media ne serve
 * pas de proxy générique. La comparaison porte sur le hostname exact : un
 * simple startsWith('https://api.twilio.com') laisserait passer
 * https://api.twilio.com.exemple.net/...
 */
export function isAllowedMediaUrl(raw: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return false
  }
  return parsed.protocol === 'https:' && parsed.hostname.toLowerCase() === TWILIO_MEDIA_HOST
}

/** URL à utiliser côté navigateur : le proxy ajoute l'auth Twilio côté serveur. */
export function mediaProxyUrl(url: string): string {
  return `/api/media?url=${encodeURIComponent(url)}`
}

/**
 * URL d'affichage d'une PJ quelle que soit sa provenance. Seuls les médias
 * Twilio ont besoin du relais authentifié ; les PJ envoyées par l'agent vivent
 * dans le bucket public `agent-attachments` et se chargent directement — les
 * faire passer par /api/media les ferait rejeter comme « URL non autorisée ».
 */
export function displayMediaUrl(url: string): string {
  return isAllowedMediaUrl(url) ? mediaProxyUrl(url) : url
}

/** Extensions reconnues, pour déduire un type MIME à partir d'un nom de fichier. */
const EXTENSION_MIME: Record<string, string> = {
  jpg:  'image/jpeg',  jpeg: 'image/jpeg', png:  'image/png',
  webp: 'image/webp',  gif:  'image/gif',
  pdf:  'application/pdf',
  mp3:  'audio/mpeg',  ogg:  'audio/ogg',  oga: 'audio/ogg',
  m4a:  'audio/mp4',   wav:  'audio/wav',
  mp4:  'video/mp4',
  doc:  'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:  'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv:  'text/csv',    txt:  'text/plain',  zip: 'application/zip',
}

/**
 * Type MIME déduit de l'extension. Nécessaire à deux endroits : la validation
 * d'un fichier dont le navigateur n'annonce aucun type (`File.type` vide), et
 * l'affichage d'une PJ d'agent dont on ne connaît que le nom.
 */
export function mimeTypeFromName(name: string | null | undefined): string | null {
  const ext = (name ?? '').toLowerCase().split('.').pop()
  return (ext && EXTENSION_MIME[ext]) ?? null
}

/** PJ portée par un message d'agent (`attachmentUrl` / `attachmentName`). */
export function attachmentFromMessage(
  url: string,
  name: string | null | undefined,
  timestamp: string | null,
): Attachment {
  return {
    url,
    mimeType: mimeTypeFromName(name),
    timestamp,
    name: name?.trim() || null,
  }
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/**
 * Le champ jsonb `attachments` existe sous deux formes selon le workflow qui
 * l'a écrit : un simple tableau d'URLs, ou un tableau d'objets
 * `{ url, mimeType, timestamp }`. Les deux sont acceptés, ainsi que les
 * variantes de nommage (`mime_type`, `contentType`, `ts`…).
 */
export function normalizeAttachments(raw: unknown): Attachment[] {
  return parseJsonArray(raw).flatMap((item): Attachment[] => {
    if (typeof item === 'string') {
      const url = str(item)
      return url ? [{ url, mimeType: null, timestamp: null, name: null }] : []
    }
    if (!item || typeof item !== 'object') return []

    const record = item as Record<string, unknown>
    const url = str(record.url)
    if (!url) return []

    return [{
      url,
      mimeType: str(record.mimeType) ?? str(record.mime_type)
             ?? str(record.contentType) ?? str(record.content_type) ?? str(record.mime),
      timestamp: str(record.timestamp) ?? str(record.ts) ?? str(record.created_at),
      name:      str(record.name) ?? str(record.filename) ?? str(record.file_name),
    }]
  })
}

/**
 * `unknown` = pièce jointe sans mimeType (tableau d'URLs nu) : on tente
 * l'affichage image, avec repli automatique sur un lien si le média n'est pas
 * une image. C'est le cas le plus fréquent sur WhatsApp.
 */
export type AttachmentKind = 'image' | 'pdf' | 'unknown' | 'other'

export function attachmentKind(a: Attachment): AttachmentKind {
  const mime = (a.mimeType ?? '').toLowerCase()
  if (mime === '')                        return 'unknown'
  if (mime.startsWith('image/'))          return 'image'
  if (mime.startsWith('application/pdf')) return 'pdf'
  return 'other'
}

/** Vrai pour tout ce qu'on peut tenter d'afficher comme une image. */
export function isRenderableImage(a: Attachment): boolean {
  const kind = attachmentKind(a)
  return kind === 'image' || kind === 'unknown'
}

/** Fenêtre de rapprochement entre l'horodatage d'une PJ et celui d'un message. */
const MATCH_WINDOW_MS = 5 * 60_000

function parseTs(value: string | null | undefined): number | null {
  if (!value) return null
  const t = Date.parse(value)
  return Number.isNaN(t) ? null : t
}

/**
 * `attachments` est stocké au niveau de la conversation, pas du message :
 * l'horodatage est le seul lien avec l'historique. Chaque PJ est rattachée au
 * message client le plus proche dans le temps (fenêtre de 5 min), sinon au
 * dernier message client qui la précède. Celles qu'on ne peut pas rattacher
 * (messages sans `ts`, horodatage absent) sont renvoyées à part pour être
 * affichées en fin de conversation plutôt que perdues.
 */
export function groupAttachmentsByMessage(
  history: ChatMessage[],
  attachments: Attachment[],
): { byIndex: Map<number, Attachment[]>; orphans: Attachment[] } {
  const byIndex = new Map<number, Attachment[]>()
  const orphans: Attachment[] = []
  if (attachments.length === 0) return { byIndex, orphans }

  const dated = history.flatMap((msg, index) => {
    if (!isClientRole(msg.role)) return []
    const at = parseTs(messageTimestamp(msg))
    return at === null ? [] : [{ index, at }]
  })

  for (const attachment of attachments) {
    const at = parseTs(attachment.timestamp)
    const index = at === null ? null : pickMessageIndex(dated, at)
    if (index === null) {
      orphans.push(attachment)
      continue
    }
    const bucket = byIndex.get(index)
    if (bucket) bucket.push(attachment)
    else byIndex.set(index, [attachment])
  }

  return { byIndex, orphans }
}

function pickMessageIndex(dated: Array<{ index: number; at: number }>, at: number): number | null {
  if (dated.length === 0) return null

  let nearest = dated[0]
  for (const candidate of dated) {
    if (Math.abs(candidate.at - at) < Math.abs(nearest.at - at)) nearest = candidate
  }
  if (Math.abs(nearest.at - at) <= MATCH_WINDOW_MS) return nearest.index

  // Hors fenêtre : une PJ suit toujours un message client, on prend le dernier.
  const preceding = dated.filter(c => c.at <= at).pop()
  return preceding ? preceding.index : null
}
