import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEscalationById } from '@/lib/supabase/queries'
import { isClientRole, normalizeHistory } from '@/lib/conversation'
import { groupAttachmentsByMessage, normalizeAttachments } from '@/lib/media'
import { StatusChanger } from '@/components/dashboard/status-changer'
import { AgentReplyPanel } from '@/components/dashboard/agent-reply-panel'
import { AttachmentsMenu, MessageAttachments, OrphanAttachments } from '@/components/dashboard/message-attachments'
import {
  ArrowLeft, MessageCircle, Mail, Instagram,
  Hash, Tag, Clock, Calendar, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Helpers ──────────────────────────────────────────────────

function formatDate(d: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long', timeStyle: 'short',
  }).format(new Date(d))
}

function ChannelIcon({ channel }: { channel: string }) {
  const lower = (channel ?? '').toLowerCase()
  if (lower === 'whatsapp')  return <MessageCircle size={13} />
  if (lower === 'email')     return <Mail size={13} />
  if (lower === 'instagram') return <Instagram size={13} />
  return null
}

function channelColor(channel: string) {
  const lower = (channel ?? '').toLowerCase()
  if (lower === 'whatsapp')  return 'bg-green-100/80 text-green-700 border-green-200/60 dark:bg-green-900/30 dark:text-green-300'
  if (lower === 'email')     return 'bg-blue-100/80 text-blue-700 border-blue-200/60 dark:bg-blue-900/30 dark:text-blue-300'
  if (lower === 'instagram') return 'bg-purple-100/80 text-purple-700 border-purple-200/60 dark:bg-purple-900/30 dark:text-purple-300'
  return 'bg-slate-100/80 text-slate-600 border-slate-200/60'
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/50 dark:bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-foreground mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}

// ── Contenu dynamique ─────────────────────────────────────────

async function EscalationDetail({ id }: { id: number }) {
  const { escalation: esc, conversation, error } = await getEscalationById(id)

  if (error || !esc) notFound()

  // Priorité : history sur l'escalade, sinon fallback sur la conversation liée
  const escHistory  = normalizeHistory(esc.history)
  const rawHistory  = escHistory.length > 0 ? escHistory : normalizeHistory(conversation?.history)
  const attachments = normalizeAttachments(conversation?.attachments)

  // Les PJ vivent sur la conversation : on les rattache par horodatage.
  const { byIndex, orphans } = groupAttachmentsByMessage(rawHistory, attachments)

  // On conserve les messages sans texte qui portent une PJ.
  const history = rawHistory
    .map((msg, index) => ({ msg, index, attachments: byIndex.get(index) ?? [] }))
    .filter(m => (m.msg.content?.trim() ?? '') !== '' || m.attachments.length > 0)

  return (
    <div className="space-y-5">
      {/* Statut */}
      <div className="glass rounded-2xl p-5">
        <StatusChanger id={esc.id} currentStatus={esc.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">

        {/* Colonne gauche — infos contact */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
              Informations contact
            </h2>

            {/* Avatar + nom */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold shadow-md">
                {esc.contact_name?.slice(0, 2).toUpperCase() ?? '??'}
              </div>
              <div>
                <p className="font-semibold text-foreground">{esc.contact_name ?? '—'}</p>
                <span className={cn(
                  'inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md font-medium border',
                  channelColor(esc.channel)
                )}>
                  <ChannelIcon channel={esc.channel} />
                  {esc.channel}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <InfoRow icon={Hash}     label="ID contact"   value={esc.contact_id} />
              <InfoRow icon={Tag}      label="Catégorie"    value={esc.category !== esc.contact_name ? esc.category : null} />
              <InfoRow icon={Clock}    label="Priorité"     value={esc.priority} />
              <InfoRow icon={Calendar} label="Créé le"      value={formatDate(esc.created_at)} />
              <InfoRow icon={RefreshCw} label="Mis à jour"  value={formatDate(esc.updated_at)} />
            </div>
          </div>

          {/* Réponse agent */}
          {esc.agent_response && (
            <div className="glass rounded-2xl p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">
                Réponse agent
              </h2>
              <p className="text-sm text-foreground leading-relaxed">{esc.agent_response}</p>
            </div>
          )}
        </div>

        {/* Colonne droite — messages */}
        <div className="space-y-4">

          {/* Message original */}
          {esc.original_message && (
            <div className="glass rounded-2xl p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">
                Message original
              </h2>
              <div className="bg-white/40 dark:bg-white/[0.04] rounded-xl p-4 border border-white/60 dark:border-white/10">
                <p className="text-sm text-foreground leading-relaxed italic">
                  &ldquo;{esc.original_message}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Résumé IA */}
          {esc.summary && (
            <div className="glass rounded-2xl p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">
                Résumé IA
              </h2>
              <p className="text-sm text-foreground leading-relaxed">{esc.summary}</p>
            </div>
          )}

          {/* Historique conversation */}
          {(history.length > 0 || orphans.length > 0) && (
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                  Historique conversation ({history.length} messages)
                </h2>
                <AttachmentsMenu attachments={attachments} />
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {history.map(({ msg, index, attachments: msgAttachments }) => {
                  // Rôles client : user, customer, client, human
                  // Rôles agent  : assistant, agent, bot, system — tout le reste
                  const isClient = isClientRole(msg.role)
                  const content  = msg.content?.trim() ?? ''

                  return (
                    <div
                      key={index}
                      className={cn(
                        'flex gap-2.5 items-end',
                        isClient ? 'justify-start' : 'justify-end'
                      )}
                    >
                      {/* Avatar — affiché à gauche pour client, droite pour agent */}
                      {isClient && (
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                          C
                        </div>
                      )}

                      {/* Bulle + pièces jointes */}
                      <div className={cn(
                        'max-w-[75%] flex flex-col',
                        isClient ? 'items-start' : 'items-end'
                      )}>
                        {content && (
                          <div className={cn(
                            'px-3.5 py-2.5 text-sm leading-relaxed',
                            isClient
                              ? 'bg-white/60 dark:bg-white/[0.07] text-foreground border border-white/70 dark:border-white/10 rounded-2xl rounded-bl-sm'
                              : 'bg-indigo-600 text-white rounded-2xl rounded-br-sm shadow-md shadow-indigo-500/20'
                          )}>
                            {content}
                          </div>
                        )}

                        <MessageAttachments
                          attachments={msgAttachments}
                          align={isClient ? 'start' : 'end'}
                        />
                      </div>

                      {isClient ? null : (
                        <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          A
                        </div>
                      )}
                    </div>
                  )
                })}

                <OrphanAttachments attachments={orphans} />
              </div>
            </div>
          )}

          {/* Panneau réponse agent */}
          <AgentReplyPanel escalation={esc} conversation={conversation} />

        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────

export default async function EscalationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) notFound()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/besoin-humain"
          className="w-9 h-9 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Détail escalade #{id}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/dashboard/besoin-humain" className="hover:underline">
              Besoin humain
            </Link>
            {' / '}#{id}
          </p>
        </div>
      </div>

      <Suspense fallback={
        <div className="space-y-4">
          <div className="glass rounded-2xl h-24 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
            <div className="glass rounded-2xl h-64 animate-pulse" />
            <div className="space-y-4">
              <div className="glass rounded-2xl h-32 animate-pulse" />
              <div className="glass rounded-2xl h-32 animate-pulse" />
            </div>
          </div>
        </div>
      }>
        <EscalationDetail id={id} />
      </Suspense>
    </div>
  )
}
