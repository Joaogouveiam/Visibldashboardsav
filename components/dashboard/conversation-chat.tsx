'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Lock, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Attachment, ChatMessage, Conversation } from '@/lib/types/sav'
import { isClientRole, isHumanAgentRole, messageTimestamp } from '@/lib/conversation'
import { attachmentFromMessage } from '@/lib/media'
import { canReplyTo, replyChannel } from '@/lib/reply'
import { AttachmentsMenu, MessageAttachments, OrphanAttachments } from '@/components/dashboard/message-attachments'
import { ChannelTag, channelLabel } from '@/components/dashboard/channel'
import { ConversationReply } from '@/components/dashboard/conversation-reply'

// ── Helpers ──────────────────────────────────────────────────

function formatTime(d: string | null | undefined) {
  if (!d) return ''
  const t = Date.parse(d)
  if (Number.isNaN(t)) return ''
  return new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(new Date(t))
}

function initials(n: string | null) {
  if (!n) return '?'
  return n.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase()
}

/** Un message vide sans pièce jointe n'a rien à afficher. */
function isRenderable(entry: ChatEntry): boolean {
  return (entry.msg.content?.trim() ?? '') !== ''
    || entry.attachments.length > 0
    || Boolean(entry.msg.attachmentUrl)
}

// ── Bulle de message ──────────────────────────────────────────

function ChatBubble({
  msg, attachments, contactName, grad,
}: {
  msg:         ChatMessage
  attachments: Attachment[]
  contactName: string | null
  grad:        string
}) {
  const isClient = isClientRole(msg.role)
  const isHuman  = isHumanAgentRole(msg.role)
  const time     = formatTime(messageTimestamp(msg))
  const content  = msg.content?.trim() ?? ''

  // Les PJ d'une réponse d'agent sont portées par le message lui-même, celles
  // du client par la colonne `attachments` de la conversation.
  const all = msg.attachmentUrl
    ? [...attachments, attachmentFromMessage(msg.attachmentUrl, msg.attachmentName, messageTimestamp(msg))]
    : attachments

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

      <div className={cn('max-w-[72%] flex flex-col', isClient ? 'items-start' : 'items-end')}>
        {content && (
          <div className={cn(
            'px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-sm',
            isClient
              ? 'bg-white dark:bg-white/[0.09] text-foreground rounded-2xl rounded-bl-sm'
              : isHuman
                ? 'bg-emerald-600 text-white rounded-2xl rounded-br-sm shadow-emerald-500/20'
                : 'bg-indigo-600 text-white rounded-2xl rounded-br-sm shadow-indigo-500/20'
          )}>
            {content}
          </div>
        )}

        <MessageAttachments attachments={all} align={isClient ? 'start' : 'end'} />

        {(isHuman || time) && (
          <span className="text-[10px] text-muted-foreground/50 mt-1 px-1">
            {isHuman && (
              <span className="font-semibold text-emerald-600/80 dark:text-emerald-400/80">
                Jean{time && ' · '}
              </span>
            )}
            {time}
          </span>
        )}
      </div>

      {!isClient && (
        <div className={cn(
          'w-7 h-7 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm',
          isHuman ? 'bg-emerald-600' : 'bg-indigo-500'
        )}>
          {isHuman ? <UserRound size={13} /> : 'IA'}
        </div>
      )}
    </div>
  )
}

// ── Panneau chat ──────────────────────────────────────────────

export interface ChatEntry {
  msg:         ChatMessage
  attachments: Attachment[]
}

interface ConversationChatProps {
  conversation:   Pick<Conversation, 'id' | 'channel' | 'status' | 'contact_id' | 'contact_name'>
  /** Historique persisté, déjà normalisé et apparié à ses PJ côté serveur. */
  entries:        ChatEntry[]
  /** PJ qu'aucun horodatage ne rattache à un message. */
  orphans:        Attachment[]
  allAttachments: Attachment[]
  avatarGradient: string
  defaultSubject: string | null
}

export function ConversationChat({
  conversation, entries, orphans, allAttachments, avatarGradient, defaultSubject,
}: ConversationChatProps) {
  // Réponses envoyées depuis cette page : affichées immédiatement, alors que
  // l'écriture réelle dans `conversations.history` est faite par n8n après
  // l'envoi. Elles disparaissent au rechargement, remplacées par la version
  // persistée.
  const [sent, setSent] = useState<ChatMessage[]>([])

  const channel  = replyChannel(conversation.channel)
  const canReply = canReplyTo(conversation)

  const visible = entries.filter(isRenderable)
  const thread  = useRef<HTMLDivElement>(null)

  // Le fil s'ouvre sur le dernier message, et suit chaque nouvel envoi. On
  // pilote le scroll du conteneur plutôt qu'un scrollIntoView, qui ferait
  // aussi défiler la page autour du panneau.
  useEffect(() => {
    const el = thread.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: sent.length > 0 ? 'smooth' : 'auto' })
  }, [sent.length])

  const total = visible.length + sent.length

  return (
    <div className="glass rounded-2xl flex flex-col overflow-hidden">

      {/* Header chat style WhatsApp */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/[0.03] shrink-0">
        <div className={cn(
          'w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shadow-sm',
          avatarGradient
        )}>
          {initials(conversation.contact_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {conversation.contact_name ?? 'Contact inconnu'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {total} message{total > 1 ? 's' : ''} · {channelLabel(conversation.channel)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AttachmentsMenu attachments={allAttachments} />
          <ChannelTag channel={conversation.channel} />
        </div>
      </div>

      {/* Messages */}
      <div ref={thread} className="flex-1 overflow-y-auto px-5 py-5">
        {total === 0 && orphans.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <MessageCircle size={36} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucun message dans cette conversation.</p>
            </div>
          </div>
        ) : (
          <>
            {visible.map((entry, index) => (
              <ChatBubble
                key={index}
                msg={entry.msg}
                attachments={entry.attachments}
                contactName={conversation.contact_name}
                grad={avatarGradient}
              />
            ))}
            {sent.map((msg, index) => (
              <ChatBubble
                key={`sent-${index}`}
                msg={msg}
                attachments={[]}
                contactName={conversation.contact_name}
                grad={avatarGradient}
              />
            ))}
            <OrphanAttachments attachments={orphans} />
          </>
        )}
      </div>

      {/* Zone de réponse — ou mention lecture seule */}
      {canReply && channel ? (
        <ConversationReply
          conversationId={conversation.id}
          channel={channel}
          contactName={conversation.contact_name}
          defaultSubject={defaultSubject}
          onSent={msg => setSent(prev => [...prev, msg])}
        />
      ) : (
        <div className="px-5 py-3.5 border-t border-white/20 dark:border-white/10 bg-white/20 dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2.5 bg-white/50 dark:bg-white/5 rounded-xl px-4 py-2.5 border border-white/60 dark:border-white/10">
            <Lock size={13} className="text-muted-foreground/50 shrink-0" />
            <span className="text-sm text-muted-foreground/60 select-none">
              {conversation.status === 'closed'
                ? 'Lecture seule — conversation fermée'
                : `Lecture seule — réponse indisponible sur ${channelLabel(conversation.channel)}`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
