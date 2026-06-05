import { Suspense } from 'react'
import Link from 'next/link'
import {
  getFilteredConversations,
  getDistinctConversationChannels,
  type ConversationFilters,
} from '@/lib/supabase/queries'
import type { Conversation } from '@/lib/types/sav'
import { ConversationsFilters } from '@/components/dashboard/conversations-filters'
import { BarChart2, MessageCircle, Mail, Instagram, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Helpers ──────────────────────────────────────────────────

function timeAgo(d: string | null) {
  if (!d) return '—'
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

function ChannelBadge({ channel }: { channel: string }) {
  const lower = (channel ?? '').toLowerCase()
  const base = 'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg font-medium border'
  if (lower === 'whatsapp')  return <span className={cn(base, 'bg-green-100/80 text-green-700 border-green-200/60 dark:bg-green-900/30 dark:text-green-300')}><MessageCircle size={10} />WhatsApp</span>
  if (lower === 'email')     return <span className={cn(base, 'bg-blue-100/80 text-blue-700 border-blue-200/60 dark:bg-blue-900/30 dark:text-blue-300')}><Mail size={10} />Email</span>
  if (lower === 'instagram') return <span className={cn(base, 'bg-purple-100/80 text-purple-700 border-purple-200/60 dark:bg-purple-900/30 dark:text-purple-300')}><Instagram size={10} />Instagram</span>
  return <span className={cn(base, 'bg-slate-100/80 text-slate-600 border-slate-200/60')}>{channel || 'Inconnu'}</span>
}

function statusStyle(s: string | null) {
  if (s === 'active')   return 'bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-300'
  if (s === 'closed')   return 'bg-slate-100/80 text-slate-500 border-slate-200/60'
  if (s === 'resolved') return 'bg-blue-100/80 text-blue-700 border-blue-200/60'
  return 'bg-slate-100/80 text-slate-500 border-slate-200/60'
}

function statusLabel(s: string | null) {
  if (s === 'active')   return 'Active'
  if (s === 'closed')   return 'Fermée'
  if (s === 'resolved') return 'Résolue'
  return s ?? 'Inconnue'
}

function lastMessage(history: Conversation['history']): string | null {
  if (!Array.isArray(history) || history.length === 0) return null
  const last = history[history.length - 1]
  return last?.content ?? null
}

// ── Carte conversation ────────────────────────────────────────

function ConversationCard({ conv }: { conv: Conversation }) {
  const preview  = lastMessage(conv.history)
  const msgCount = Array.isArray(conv.history) ? conv.history.length : 0

  return (
    <div className="glass rounded-2xl flex overflow-hidden group hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200 relative">
      <Link
        href={`/dashboard/statistiques/${conv.id}`}
        className="absolute inset-0 z-0"
        aria-label={`Voir conversation de ${conv.contact_name}`}
      />

      {/* Barre canal */}
      <div className={cn(
        'w-1.5 shrink-0',
        (conv.channel ?? '').toLowerCase() === 'whatsapp'  ? 'bg-gradient-to-b from-green-400 to-emerald-500' :
        (conv.channel ?? '').toLowerCase() === 'email'     ? 'bg-gradient-to-b from-blue-400 to-sky-500' :
        (conv.channel ?? '').toLowerCase() === 'instagram' ? 'bg-gradient-to-b from-purple-400 to-pink-500' :
        'bg-gradient-to-b from-slate-400 to-slate-500'
      )} />

      <div className="flex-1 min-w-0 p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md',
              avatarGrad(conv.contact_name)
            )}>
              {initials(conv.contact_name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {conv.contact_name ?? 'Contact inconnu'}
              </p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                <Clock size={9} />{timeAgo(conv.last_message_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end relative z-10">
            <ChannelBadge channel={conv.channel} />
            {conv.status && (
              <span className={cn(
                'text-[11px] px-2 py-0.5 rounded-lg font-medium border',
                statusStyle(conv.status)
              )}>
                {statusLabel(conv.status)}
              </span>
            )}
          </div>
        </div>

        {preview && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-1 ml-[52px]">
            {preview}
          </p>
        )}

        <div className="flex items-center justify-between mt-3 ml-[52px]">
          <span className="text-[11px] text-muted-foreground/60">
            {msgCount} message{msgCount > 1 ? 's' : ''}
          </span>
          <Link
            href={`/dashboard/statistiques/${conv.id}`}
            className="relative z-10 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-colors"
          >
            Voir chat
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Contenu ───────────────────────────────────────────────────

async function ConversationsContent({ filters }: { filters: ConversationFilters }) {
  const { items: conversations, error } = await getFilteredConversations(filters)

  if (error) {
    return (
      <div className="glass rounded-2xl p-6 flex items-start gap-3 border border-red-200/60">
        <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">Erreur de chargement</p>
          <p className="text-xs font-mono text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
          <MessageCircle size={22} />
        </div>
        <h3 className="text-base font-semibold mb-1">Aucune conversation</h3>
        <p className="text-sm text-muted-foreground">Aucun résultat pour ce filtre.</p>
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-muted-foreground px-1">
        <span className="font-semibold text-foreground">{conversations.length}</span>{' '}
        conversation{conversations.length > 1 ? 's' : ''}
      </p>
      <div className="space-y-3">
        {conversations.map(conv => (
          <ConversationCard key={conv.id} conv={conv} />
        ))}
      </div>
    </>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="glass rounded-2xl h-28 animate-pulse" />
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    channel?: string
    status?:  string
    sort?:    string
    client?:  string
  }>
}

export default async function StatistiquesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filters: ConversationFilters = {
    channel: params.channel,
    status:  params.status,
    sort:    params.sort,
    client:  params.client,
  }

  const channels = await getDistinctConversationChannels()

  const suspenseKey = [
    params.channel ?? 'all',
    params.status  ?? 'all',
    params.sort    ?? 'newest',
    params.client  ?? '',
  ].join('-')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <BarChart2 size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistiques</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Toutes les conversations du chatbot</p>
        </div>
      </div>

      <ConversationsFilters channels={channels} />

      <Suspense key={suspenseKey} fallback={<Skeleton />}>
        <ConversationsContent filters={filters} />
      </Suspense>
    </div>
  )
}
