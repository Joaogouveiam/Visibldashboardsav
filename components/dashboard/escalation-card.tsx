import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Escalation } from '@/lib/types/sav'
import { MessageCircle, Mail, Instagram, ArrowRight, Clock } from 'lucide-react'

const STANDARD: Record<string, { bar: string; badge: string; label: string }> = {
  urgent: {
    bar:   'bg-gradient-to-b from-red-500 to-rose-600',
    badge: 'bg-red-100/80 text-red-700 border border-red-200/60 dark:bg-red-900/30 dark:text-red-300',
    label: 'Urgent',
  },
  high: {
    bar:   'bg-gradient-to-b from-orange-400 to-amber-500',
    badge: 'bg-orange-100/80 text-orange-700 border border-orange-200/60 dark:bg-orange-900/30 dark:text-orange-300',
    label: 'Haute',
  },
  medium: {
    bar:   'bg-gradient-to-b from-amber-400 to-yellow-500',
    badge: 'bg-amber-100/80 text-amber-700 border border-amber-200/60 dark:bg-amber-900/30 dark:text-amber-300',
    label: 'Moyenne',
  },
  low: {
    bar:   'bg-gradient-to-b from-slate-400 to-slate-500',
    badge: 'bg-slate-100/80 text-slate-600 border border-slate-200/60 dark:bg-slate-800/60 dark:text-slate-400',
    label: 'Basse',
  },
}

const CUSTOM_BAR   = 'bg-gradient-to-b from-indigo-400 to-violet-500'
const CUSTOM_BADGE = 'bg-indigo-100/80 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-300'

function ChannelBadge({ channel }: { channel: string }) {
  const lower = (channel ?? '').toLowerCase()
  const base  = 'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg font-medium border'
  if (lower === 'whatsapp')  return <span className={cn(base, 'bg-green-100/80 text-green-700 border-green-200/60 dark:bg-green-900/30 dark:text-green-300')}><MessageCircle size={10} />WhatsApp</span>
  if (lower === 'email')     return <span className={cn(base, 'bg-blue-100/80 text-blue-700 border-blue-200/60 dark:bg-blue-900/30 dark:text-blue-300')}><Mail size={10} />Email</span>
  if (lower === 'instagram') return <span className={cn(base, 'bg-purple-100/80 text-purple-700 border-purple-200/60 dark:bg-purple-900/30 dark:text-purple-300')}><Instagram size={10} />Instagram</span>
  return <span className={cn(base, 'bg-slate-100/80 text-slate-600 border-slate-200/60')}>{channel}</span>
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(m / 60)
  const j = Math.floor(h / 24)
  if (m < 1)  return 'à l\'instant'
  if (m < 60) return `il y a ${m} min`
  if (h < 24) return `il y a ${h}h`
  return `il y a ${j}j`
}

function initials(n: string | null) {
  if (!n) return '?'
  return n.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase()
}

const GRADIENTS = [
  'from-violet-400 to-purple-500', 'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',     'from-cyan-400 to-blue-500',
]

function avatarGrad(n: string | null) {
  if (!n) return GRADIENTS[0]
  return GRADIENTS[n.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length]
}

export function EscalationCard({ esc }: { esc: Escalation }) {
  const isStd   = Object.prototype.hasOwnProperty.call(STANDARD, esc.priority ?? '')
  const cfg     = isStd ? STANDARD[esc.priority!] : null
  const barCls  = cfg ? cfg.bar   : CUSTOM_BAR
  const badgeCls = cfg ? cfg.badge : CUSTOM_BADGE
  const badgeLbl = cfg ? cfg.label : (esc.priority ?? 'En attente')
  const inProgress = esc.status === 'in_progress'

  const categoryLabel = esc.category && esc.category !== esc.contact_name ? esc.category : null

  return (
    <div className="glass rounded-2xl flex overflow-hidden group hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200 relative">
      {/* Lien couvrant toute la card */}
      <Link
        href={`/dashboard/besoin-humain/${esc.id}`}
        className="absolute inset-0 z-0"
        aria-label={`Voir escalade de ${esc.contact_name}`}
      />

      {/* Barre priorité */}
      <div className={cn('w-1.5 shrink-0', barCls)} />

      <div className="flex-1 min-w-0 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md', avatarGrad(esc.contact_name))}>
              {initials(esc.contact_name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{esc.contact_name ?? '—'}</p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                <Clock size={9} />{timeAgo(esc.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end relative z-10">
            <ChannelBadge channel={esc.channel} />
            {esc.priority && (
              <span className={cn('text-xs px-2 py-0.5 rounded-lg font-semibold', badgeCls)}>{badgeLbl}</span>
            )}
            {inProgress && (
              <span className="text-xs px-2 py-0.5 rounded-lg font-semibold bg-amber-100/80 text-amber-700 border border-amber-200/60">En cours</span>
            )}
          </div>
        </div>

        {/* Summary / original_message */}
        {esc.summary ? (
          <p className="text-sm text-foreground/75 leading-relaxed mb-3 line-clamp-2">{esc.summary}</p>
        ) : esc.original_message ? (
          <p className="text-sm text-muted-foreground italic leading-relaxed mb-3 line-clamp-2">&ldquo;{esc.original_message}&rdquo;</p>
        ) : null}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            {categoryLabel && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-white/50 dark:bg-white/5 text-muted-foreground border border-white/60 dark:border-white/10 font-medium">
                {categoryLabel}
              </span>
            )}
          </div>
          {/* Bouton au-dessus du lien (z-10) */}
          <Link
            href={`/dashboard/besoin-humain/${esc.id}`}
            className={cn(
              'relative z-10 inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all duration-150',
              inProgress
                ? 'bg-amber-100/80 text-amber-700 hover:bg-amber-200 border border-amber-200/60'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/25'
            )}
          >
            {inProgress ? 'Continuer' : 'Voir détails'}
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}
