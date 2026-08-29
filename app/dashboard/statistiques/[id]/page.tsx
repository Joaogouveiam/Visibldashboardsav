import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getConversationById } from '@/lib/supabase/queries'
import { isClientRole, isHumanAgentRole, lastKnownSubject, normalizeHistory } from '@/lib/conversation'
import { groupAttachmentsByMessage, normalizeAttachments } from '@/lib/media'
import { ConversationChat, type ChatEntry } from '@/components/dashboard/conversation-chat'
import { ChannelTag } from '@/components/dashboard/channel'
import { ArrowLeft, Hash, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Helpers ──────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long', timeStyle: 'short',
  }).format(new Date(d))
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

function statusLabel(s: string | null) {
  if (s === 'active')   return 'Active'
  if (s === 'closed')   return 'Fermée'
  if (s === 'resolved') return 'Résolue'
  return s ?? 'Inconnue'
}

function statusStyle(s: string | null) {
  if (s === 'active')   return 'bg-emerald-400'
  if (s === 'closed')   return 'bg-slate-400'
  if (s === 'resolved') return 'bg-blue-400'
  return 'bg-slate-400'
}

function InfoRow({
  icon: Icon, label, value,
}: {
  icon: React.ElementType; label: string; value: string | null | undefined
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-white/50 dark:bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={12} className="text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-foreground mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}

function StatTile({ value, label, accent }: { value: number; label: string; accent?: string }) {
  return (
    <div className="bg-white/40 dark:bg-white/5 rounded-xl p-3 text-center">
      <p className={cn('text-xl font-bold', accent ?? 'text-foreground')}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

// ── Contenu dynamique ─────────────────────────────────────────

async function ConversationDetail({ id }: { id: string }) {
  const { conversation: conv, error } = await getConversationById(id)
  if (error || !conv) notFound()

  // Normalise l'historique (peut être jsonb string ou array)
  const rawHistory  = normalizeHistory(conv.history)
  const attachments = normalizeAttachments(conv.attachments)

  // Les PJ sont rattachées par horodatage : le regroupement se fait sur
  // l'historique brut pour que les index restent valides.
  const { byIndex, orphans } = groupAttachmentsByMessage(rawHistory, attachments)

  const entries: ChatEntry[] = rawHistory.map((msg, index) => ({
    msg,
    attachments: byIndex.get(index) ?? [],
  }))

  const grad = avatarGrad(conv.contact_name)

  // On garde les messages vides qui portent une PJ (photo envoyée sans texte).
  const counted    = entries.filter(e => (e.msg.content?.trim() ?? '') !== '' || e.attachments.length > 0 || e.msg.attachmentUrl)
  const clientMsgs = counted.filter(e => isClientRole(e.msg.role)).length
  const humanMsgs  = counted.filter(e => isHumanAgentRole(e.msg.role)).length
  const aiMsgs     = counted.length - clientMsgs - humanMsgs

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 h-[calc(100vh-180px)]">

      {/* Panneau gauche — infos */}
      <div className="space-y-4 overflow-y-auto">

        {/* Contact */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Contact
          </h2>

          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold shadow-md',
              grad
            )}>
              {initials(conv.contact_name)}
            </div>
            <div>
              <p className="font-semibold text-foreground">{conv.contact_name ?? 'Inconnu'}</p>
              <ChannelTag channel={conv.channel} className="mt-1" />
            </div>
          </div>

          <div className="space-y-3">
            <InfoRow icon={Hash}     label="ID contact"  value={conv.contact_id} />
            <InfoRow icon={Calendar} label="Créé le"     value={formatDate(conv.created_at)} />
            <InfoRow icon={Calendar} label="Dernier msg" value={formatDate(conv.last_message_at)} />
          </div>

          {/* Statut */}
          {conv.status && (
            <div className="flex items-center gap-2 pt-1">
              <span className={cn('w-2 h-2 rounded-full', statusStyle(conv.status))} />
              <span className="text-sm font-medium text-foreground">{statusLabel(conv.status)}</span>
            </div>
          )}
        </div>

        {/* Stats conversation */}
        <div className="glass rounded-2xl p-5 space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Statistiques
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <StatTile value={counted.length} label="Total" />
            <StatTile value={clientMsgs}     label="Client" />
            <StatTile value={aiMsgs}         label="Agent IA" accent="text-indigo-600 dark:text-indigo-400" />
            <StatTile value={humanMsgs}      label="Jean"     accent="text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Panneau droit — chat + zone de réponse */}
      <ConversationChat
        conversation={{
          id:           conv.id,
          channel:      conv.channel,
          status:       conv.status,
          contact_id:   conv.contact_id,
          contact_name: conv.contact_name,
        }}
        entries={entries}
        orphans={orphans}
        allAttachments={attachments}
        avatarGradient={grad}
        defaultSubject={lastKnownSubject(rawHistory)}
      />
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/statistiques"
          className="w-9 h-9 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Détail conversation</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/dashboard/statistiques" className="hover:underline">
              Statistiques
            </Link>
            {' / '}{id}
          </p>
        </div>
      </div>

      <Suspense fallback={
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 h-[calc(100vh-180px)]">
          <div className="space-y-4">
            <div className="glass rounded-2xl h-64 animate-pulse" />
            <div className="glass rounded-2xl h-32 animate-pulse" />
          </div>
          <div className="glass rounded-2xl animate-pulse" />
        </div>
      }>
        <ConversationDetail id={id} />
      </Suspense>
    </div>
  )
}
