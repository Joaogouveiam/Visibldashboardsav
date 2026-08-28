import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getConversationById } from '@/lib/supabase/queries'
import type { Attachment, ChatMessage } from '@/lib/types/sav'
import { isClientRole, messageTimestamp, normalizeHistory } from '@/lib/conversation'
import { groupAttachmentsByMessage, normalizeAttachments } from '@/lib/media'
import { AttachmentsMenu, MessageAttachments, OrphanAttachments } from '@/components/dashboard/message-attachments'
import {
  ArrowLeft, MessageCircle, Mail, Instagram,
  Hash, Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Helpers ──────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long', timeStyle: 'short',
  }).format(new Date(d))
}

function formatTime(d: string | null | undefined) {
  if (!d) return ''
  return new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(new Date(d))
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

function channelLabel(ch: string) {
  const lower = ch.toLowerCase()
  if (lower === 'whatsapp')  return 'WhatsApp'
  if (lower === 'email')     return 'Email'
  if (lower === 'instagram') return 'Instagram'
  return ch
}

function channelColor(ch: string) {
  const lower = ch.toLowerCase()
  if (lower === 'whatsapp')  return 'bg-green-100/80 text-green-700 border-green-200/60 dark:bg-green-900/30 dark:text-green-300'
  if (lower === 'email')     return 'bg-blue-100/80 text-blue-700 border-blue-200/60 dark:bg-blue-900/30 dark:text-blue-300'
  if (lower === 'instagram') return 'bg-purple-100/80 text-purple-700 border-purple-200/60 dark:bg-purple-900/30 dark:text-purple-300'
  return 'bg-slate-100/80 text-slate-600 border-slate-200/60'
}

function ChannelIcon({ channel }: { channel: string }) {
  const lower = (channel ?? '').toLowerCase()
  if (lower === 'whatsapp')  return <MessageCircle size={12} />
  if (lower === 'email')     return <Mail size={12} />
  if (lower === 'instagram') return <Instagram size={12} />
  return null
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

// ── WhatsApp-style chat ───────────────────────────────────────

function ChatBubble({
  msg,
  attachments,
  contactName,
  grad,
}: {
  msg: ChatMessage
  attachments: Attachment[]
  contactName: string | null
  grad: string
}) {
  const isClient = isClientRole(msg.role)
  const time = formatTime(messageTimestamp(msg))
  const content = msg.content?.trim() ?? ''

  return (
    <div className={cn('flex gap-2 items-end mb-2', isClient ? 'justify-start' : 'justify-end')}>
      {isClient && (
        <div className={cn(
          'w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm',
          grad
        )}>
          {initials(contactName)}
        </div>
      )}

      <div className={cn(
        'max-w-[72%] flex flex-col',
        isClient ? 'items-start' : 'items-end'
      )}>
        {content && (
          <div className={cn(
            'px-3.5 py-2.5 text-sm leading-relaxed break-words shadow-sm',
            isClient
              ? 'bg-white dark:bg-white/[0.09] text-foreground rounded-2xl rounded-bl-sm'
              : 'bg-indigo-600 text-white rounded-2xl rounded-br-sm shadow-indigo-500/20'
          )}>
            {content}
          </div>
        )}

        <MessageAttachments
          attachments={attachments}
          align={isClient ? 'start' : 'end'}
        />

        {time && (
          <span className="text-[10px] text-muted-foreground/50 mt-1 px-1">{time}</span>
        )}
      </div>

      {!isClient && (
        <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
          IA
        </div>
      )}
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

  // On garde les messages vides qui portent une PJ (photo envoyée sans texte).
  const history = rawHistory
    .map((msg, index) => ({ msg, index, attachments: byIndex.get(index) ?? [] }))
    .filter(m => (m.msg.content?.trim() ?? '') !== '' || m.attachments.length > 0)

  const grad = avatarGrad(conv.contact_name)
  const msgCount = history.length
  const clientMsgs = history.filter(m => isClientRole(m.msg.role)).length
  const agentMsgs  = msgCount - clientMsgs

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
              <span className={cn(
                'inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md font-medium border mt-1',
                channelColor(conv.channel)
              )}>
                <ChannelIcon channel={conv.channel} />
                {channelLabel(conv.channel)}
              </span>
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
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/40 dark:bg-white/5 rounded-xl p-3">
              <p className="text-xl font-bold text-foreground">{msgCount}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Total</p>
            </div>
            <div className="bg-white/40 dark:bg-white/5 rounded-xl p-3">
              <p className="text-xl font-bold text-foreground">{clientMsgs}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Client</p>
            </div>
            <div className="bg-white/40 dark:bg-white/5 rounded-xl p-3">
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{agentMsgs}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Agent IA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Panneau droit — chat */}
      <div className="glass rounded-2xl flex flex-col overflow-hidden">

        {/* Header chat style WhatsApp */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/[0.03] shrink-0">
          <div className={cn(
            'w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shadow-sm',
            grad
          )}>
            {initials(conv.contact_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {conv.contact_name ?? 'Contact inconnu'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {msgCount} message{msgCount > 1 ? 's' : ''} · {channelLabel(conv.channel)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AttachmentsMenu attachments={attachments} />
            <div className={cn(
              'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg font-medium border',
              channelColor(conv.channel)
            )}>
              <ChannelIcon channel={conv.channel} />
              {channelLabel(conv.channel)}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-5 py-5"
          style={{ background: 'transparent' }}
        >
          {history.length === 0 && orphans.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle size={36} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucun message dans cette conversation.</p>
              </div>
            </div>
          ) : (
            <>
              {history.map(({ msg, index, attachments: msgAttachments }) => (
                <ChatBubble
                  key={index}
                  msg={msg}
                  attachments={msgAttachments}
                  contactName={conv.contact_name}
                  grad={grad}
                />
              ))}
              <OrphanAttachments attachments={orphans} />
            </>
          )}
        </div>

        {/* Footer — lecture seule */}
        <div className="px-5 py-3.5 border-t border-white/20 dark:border-white/10 bg-white/20 dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3 bg-white/50 dark:bg-white/5 rounded-xl px-4 py-2.5 border border-white/60 dark:border-white/10">
            <span className="text-sm text-muted-foreground/50 flex-1 select-none">
              Lecture seule — conversation archivée
            </span>
          </div>
        </div>
      </div>
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
