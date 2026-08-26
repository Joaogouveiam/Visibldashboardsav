import { CLIENT_OFFERS, type ClientContextInput } from '@/lib/types/sav'

// Validation volontairement permissive : on refuse ce qui est manifestement
// invalide sans bloquer les formats internationaux exotiques.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[0-9][0-9\s.\-()]{5,19}$/

export type ClientFieldErrors = Partial<Record<keyof ClientContextInput, string>>

export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim())
}

export function isValidPhone(v: string): boolean {
  return PHONE_RE.test(v.trim())
}

/** Normalise une valeur de champ texte : trim, chaîne vide → null. */
export function normalizeField(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  return trimmed === '' ? null : trimmed
}

/** Rapproche une valeur d'offre libre (CSV) d'une offre connue, sinon la garde telle quelle. */
export function normalizeOffer(v: unknown): string | null {
  const raw = normalizeField(v)
  if (!raw) return null
  const key = raw.toLowerCase().replace(/’/g, "'")
  const match = CLIENT_OFFERS.find(o => o.toLowerCase() === key)
  return match ?? raw
}

export function isKnownOffer(v: string | null): boolean {
  return v === null || (CLIENT_OFFERS as readonly string[]).includes(v)
}

/**
 * Valide un client. `full_name` est requis ; `email` et `phone` doivent être
 * au format valide s'ils sont renseignés.
 */
export function validateClient(input: ClientContextInput): ClientFieldErrors {
  const errors: ClientFieldErrors = {}

  if (!input.full_name || input.full_name.trim() === '') {
    errors.full_name = 'Le nom est obligatoire'
  }
  if (input.email && !isValidEmail(input.email)) {
    errors.email = 'Format d\'email invalide'
  }
  if (input.phone && !isValidPhone(input.phone)) {
    errors.phone = 'Format de téléphone invalide'
  }

  return errors
}

/** Construit un input normalisé à partir de valeurs brutes (formulaire ou CSV). */
export function toClientInput(raw: Record<string, unknown>): ClientContextInput {
  return {
    full_name:       normalizeField(raw.full_name),
    email:           normalizeField(raw.email)?.toLowerCase() ?? null,
    phone:           normalizeField(raw.phone),
    company:         normalizeField(raw.company),
    offer:           normalizeOffer(raw.offer),
    context_summary: normalizeField(raw.context_summary),
  }
}
