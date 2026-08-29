import { mimeTypeFromName } from '@/lib/media'
import type { Conversation } from '@/lib/types/sav'

/** Bucket Supabase Storage des PJ envoyées depuis le dashboard. */
export const ATTACHMENTS_BUCKET = 'agent-attachments'

/** Seuls ces deux canaux savent renvoyer un message au client via n8n. */
export type ReplyChannel = 'whatsapp' | 'email'

export interface ChannelRules {
  label:           string
  placeholder:     string
  maxBytes:        number
  /** Types MIME acceptés ; `null` = tous (email). */
  mimeTypes:       string[] | null
  /** Valeur de l'attribut `accept` du champ fichier. */
  accept:          string
  /** WhatsApp autorise une PJ sans texte ; l'email exige un corps de message. */
  messageRequired: boolean
  hasSubject:      boolean
}

export const CHANNEL_RULES: Record<ReplyChannel, ChannelRules> = {
  whatsapp: {
    label:       'Répondre sur WhatsApp',
    placeholder: 'Votre message WhatsApp…',
    maxBytes:    16 * 1024 * 1024,
    // Limites de l'API média Twilio pour WhatsApp.
    mimeTypes: [
      'image/jpeg', 'image/png', 'image/webp',
      'application/pdf',
      'audio/mpeg', 'audio/mp3', 'audio/ogg',
    ],
    accept:          'image/jpeg,image/png,image/webp,application/pdf,audio/mpeg,audio/ogg,.jpg,.jpeg,.png,.webp,.pdf,.mp3,.ogg',
    messageRequired: false,
    hasSubject:      false,
  },
  email: {
    label:           'Répondre par email',
    placeholder:     'Votre message…',
    maxBytes:        25 * 1024 * 1024,
    mimeTypes:       null,
    accept:          '',
    messageRequired: true,
    hasSubject:      true,
  },
}

export function replyChannel(raw: string | null | undefined): ReplyChannel | null {
  const lower = (raw ?? '').toLowerCase()
  return lower === 'whatsapp' || lower === 'email' ? lower : null
}

/**
 * Une conversation close est archivée : plus aucun envoi. Les canaux autres
 * que WhatsApp/email (Instagram…) n'ont pas de route d'envoi côté n8n.
 */
export function canReplyTo(
  conversation: Pick<Conversation, 'channel' | 'status' | 'contact_id'>,
): boolean {
  return replyChannel(conversation.channel) !== null
    && conversation.status !== 'closed'
    && Boolean(conversation.contact_id?.trim())
}

// ── Validation d'une pièce jointe ─────────────────────────────

export interface FileMeta {
  name: string
  type: string
  size: number
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

/**
 * Message d'erreur en français, ou `null` si le fichier passe. La même
 * fonction sert au navigateur (retour immédiat) et à la route d'upload : le
 * contrôle côté client n'est qu'un confort, jamais une garantie.
 */
export function validateFile(file: FileMeta, channel: ReplyChannel): string | null {
  const rules = CHANNEL_RULES[channel]

  if (file.size === 0) return 'Le fichier est vide.'
  if (file.size > rules.maxBytes) {
    return `Fichier trop lourd (${formatBytes(file.size)}). Maximum ${formatBytes(rules.maxBytes)} sur ce canal.`
  }

  if (rules.mimeTypes === null) return null

  // Certains navigateurs n'annoncent aucun type (File.type vide) : on retombe
  // sur l'extension plutôt que de refuser un fichier pourtant valide.
  const mime = (file.type || mimeTypeFromName(file.name) || '').toLowerCase()
  if (!rules.mimeTypes.includes(mime)) {
    return 'Type de fichier non accepté sur WhatsApp (images, PDF ou audio uniquement).'
  }
  return null
}

// ── Chemin de stockage ────────────────────────────────────────

/**
 * Supabase Storage n'accepte qu'un jeu restreint de caractères dans une clé :
 * accents, espaces et séparateurs de chemin sont normalisés, et le nom est
 * tronqué pour rester sous la limite de longueur des clés.
 */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._-]+/, '')
    .slice(-80)
  return cleaned || 'fichier'
}

/** `storageKey` : l'UUID de conversation, ou `escalade-{id}` à défaut. */
export function attachmentPath(
  channel: ReplyChannel,
  storageKey: string,
  fileName: string,
): string {
  return `${channel}/${storageKey}/${Date.now()}_${sanitizeFileName(fileName)}`
}

/**
 * Vérifie qu'une URL de PJ pointe bien vers notre bucket public avant de la
 * transmettre à n8n : sans ce contrôle, le navigateur pourrait faire relayer
 * n'importe quelle URL par Twilio ou Gmail depuis notre compte.
 */
export function isAgentAttachmentUrl(raw: string, supabaseUrl: string): boolean {
  let parsed: URL
  let base: URL
  try {
    parsed = new URL(raw)
    base   = new URL(supabaseUrl)
  } catch {
    return false
  }
  return parsed.protocol === 'https:'
    && parsed.hostname.toLowerCase() === base.hostname.toLowerCase()
    && parsed.pathname.startsWith(`/storage/v1/object/public/${ATTACHMENTS_BUCKET}/`)
}
