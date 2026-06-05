import { cn } from '@/lib/utils'
import type { Escalation } from '@/lib/types/sav'
import { MessageCircle, Mail, Instagram } from 'lucide-react'

const statusConfig: Record<string, { label: string; classes: string; dot: string }> = {
  pending:     { label: 'En attente', classes: 'bg-indigo-100/70 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',   dot: 'bg-indigo-500' },
  in_progress: { label: 'En cours',   classes: 'bg-amber-100/70 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',       dot: 'bg-amber-400'  },
  resolved:    { label: 'Résolu',     classes: 'bg-emerald-100/70 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-500' },
  closed:      { label: 'Fermé',      classes: 'bg-slate-100/70 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400',         dot: 'bg-slate-400'  },
}

const priorityConfig: Record<string, { label: string; dot: string; text: string }> = {
  urgent: { label: 'Urgente', dot: 'bg-red-500',    text: 'text-red-600 dark:text-red-400'       },
  high:   { label: 'Haute',   dot: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' },
  medium: { label: 'Moyenne', dot: 'bg-amber-400',  text: 'text-amber-600 dark:text-amber-400'   },
  low:    { label: 'Basse',   dot: 'bg-slate-400',  text: 'text-slate-500 dark:text-slate-400'   },
}

function ChannelBadge({ channel }: { channel: string }) {
  const lower = channel?.toLowerCase() ?? ''
  if (lower === 'whatsapp') return (
    <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-lg bg-green-100/70 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-medium">
      <MessageCircle size={10} />WA
    </span>
  )
  if (lower === 'email') return (
    <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-lg bg-blue-100/70 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
      <Mail size={10} />Mail
    </span>
  )
  if (lower === 'instagram') return (
    <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-lg bg-purple-100/70 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-medium">
      <Instagram size={10} />IG
    </span>
  )
  return <span className="text-xs text-muted-foreground">{channel}</span>
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const avatarPalette = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

function avatarColor(name: string | null) {
  if (!name) return avatarPalette[0]
  return avatarPalette[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % avatarPalette.length]
}

export function RecentEscalationsTable({ escalations }: { escalations: Escalation[] }) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/50 dark:border-white/[0.06] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Dernières escalades</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{escalations.length} plus récentes</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/40 dark:border-white/[0.05] bg-white/20 dark:bg-white/[0.02]">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Contact</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Résumé</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Catégorie</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Canal</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Statut</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Priorité</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap hidden lg:table-cell">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {escalations.map(esc => {
              const status   = statusConfig[esc.status]   ?? statusConfig['pending']
              const priority = priorityConfig[esc.priority ?? 'medium'] ?? priorityConfig['medium']
              return (
                <tr
                  key={esc.id}
                  className="border-b border-white/30 dark:border-white/[0.04] last:border-b-0 hover:bg-white/30 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0', avatarColor(esc.contact_name))}>
                        {initials(esc.contact_name)}
                      </span>
                      <span className="text-sm font-medium">{esc.contact_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 max-w-[240px] hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors truncate block" title={esc.summary ?? ''}>
                      {esc.summary ?? <span className="italic opacity-50">Aucun résumé</span>}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground capitalize">{esc.category ?? '—'}</span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap hidden md:table-cell">
                    <ChannelBadge channel={esc.channel} />
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', status.classes)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', status.dot)} />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={cn('flex items-center gap-1.5 text-xs font-medium', priority.text)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', priority.dot)} />
                      {priority.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs text-muted-foreground hidden lg:table-cell">
                    {formatDate(esc.created_at)}
                  </td>
                </tr>
              )
            })}
            {escalations.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Aucune escalade pour le moment
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
