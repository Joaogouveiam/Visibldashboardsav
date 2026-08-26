import { cn } from '@/lib/utils'

/** Badge d'offre — gris / bleu / violet, aligné sur les badges des autres onglets. */
const OFFER_STYLES: Record<string, string> = {
  "L'Essentiel":
    'bg-slate-100/80 text-slate-600 border-slate-200/60 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60',
  'Visibilité Google':
    'bg-blue-100/80 text-blue-700 border-blue-200/60 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/60',
  'E-commerce':
    'bg-purple-100/80 text-purple-700 border-purple-200/60 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/60',
}

const OFFER_FALLBACK =
  'bg-slate-100/60 text-slate-500 border-slate-200/50 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/50'

export function OfferBadge({ offer, className }: { offer: string | null; className?: string }) {
  if (!offer) return <span className="text-xs text-muted-foreground/50">—</span>

  return (
    <span
      className={cn(
        'inline-flex items-center text-[11px] px-2 py-0.5 rounded-lg font-medium border whitespace-nowrap',
        OFFER_STYLES[offer] ?? OFFER_FALLBACK,
        className
      )}
    >
      {offer}
    </span>
  )
}

const GRADIENTS = [
  'from-violet-400 to-purple-500', 'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',     'from-cyan-400 to-blue-500',
]

export function avatarGradient(name: string | null) {
  if (!name) return GRADIENTS[0]
  return GRADIENTS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length]
}

export function initials(name: string | null) {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase()
}

// Fuseau figé : ces dates sont rendues côté serveur *et* côté client
// (composants 'use client'). Sans timeZone explicite, un serveur en UTC et un
// navigateur en Europe/Paris produisent des jours différents autour de minuit
// — ce qui casse l'hydratation.
const TZ = 'Europe/Paris'

export function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ,
  }).format(new Date(iso))
}

export function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: TZ,
  }).format(new Date(iso))
}
