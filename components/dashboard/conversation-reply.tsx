'use client'

import { useState } from 'react'
import {
  Send, Loader2, CheckCircle2, AlertCircle, MessageCircle, Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CHANNEL_RULES, type ReplyChannel } from '@/lib/reply'
import { postJson, uploadAttachment, type UploadTicket } from '@/lib/upload-client'
import { AttachmentButton, FilePreview } from '@/components/dashboard/attachment-picker'
import type { ChatMessage } from '@/lib/types/sav'

type SendState = 'idle' | 'uploading' | 'sending' | 'success' | 'error'

interface ConversationReplyProps {
  conversationId: string
  channel:        ReplyChannel
  contactName:    string | null
  /** Objet du dernier email connu, pour pré-remplir le « Re: ». */
  defaultSubject: string | null
  onSent:         (message: ChatMessage) => void
}

// ── Zone de réponse ───────────────────────────────────────────

export function ConversationReply({
  conversationId, channel, contactName, defaultSubject, onSent,
}: ConversationReplyProps) {
  const rules          = CHANNEL_RULES[channel]
  const initialSubject = defaultSubject ? `Re: ${defaultSubject}` : ''

  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState(initialSubject)
  const [file,    setFile]    = useState<File | null>(null)
  const [state,   setState]   = useState<SendState>('idle')
  const [error,   setError]   = useState('')

  const busy    = state === 'uploading' || state === 'sending'
  const canSend = !busy && (message.trim() !== '' || (!rules.messageRequired && file !== null))

  function reset() {
    setMessage('')
    setSubject(initialSubject)
    setFile(null)
  }

  async function handleSend() {
    if (!canSend) return

    setError('')

    try {
      let attachment: UploadTicket | null = null
      if (file) {
        setState('uploading')
        attachment = await uploadAttachment({ conversation_id: conversationId }, file)
      }

      setState('sending')
      const data = await postJson<{ message?: ChatMessage }>('/api/conversations/reply', {
        conversation_id: conversationId,
        message:         message.trim(),
        ...(rules.hasSubject ? { subject: subject.trim() } : {}),
        ...(attachment ? {
          attachment: {
            url:      attachment.url,
            name:     attachment.name,
            mimeType: attachment.mimeType,
          },
        } : {}),
      })

      if (!data.message) throw new Error('Réponse inattendue du serveur.')
      onSent(data.message)
      reset()
      setState('success')
      setTimeout(() => setState(s => (s === 'success' ? 'idle' : s)), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi. Réessayez.")
      setState('error')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="px-5 py-4 border-t border-white/20 dark:border-white/10 bg-white/20 dark:bg-white/[0.02] shrink-0 space-y-2.5">

      {/* Canal + raccourci */}
      <div className="flex items-center justify-between">
        <span className={cn(
          'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-lg border',
          channel === 'whatsapp'
            ? 'bg-green-100/80 text-green-700 border-green-200/60 dark:bg-green-900/30 dark:text-green-300 dark:border-green-400/20'
            : 'bg-blue-100/80 text-blue-700 border-blue-200/60 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400/20'
        )}>
          {channel === 'whatsapp' ? <MessageCircle size={11} /> : <Mail size={11} />}
          {rules.label}
        </span>
        <span className="text-[10px] text-muted-foreground/50 select-none hidden sm:block">
          Ctrl+Entrée pour envoyer
        </span>
      </div>

      {/* Objet — email uniquement */}
      {rules.hasSubject && (
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          disabled={busy}
          placeholder="Objet de l'email"
          aria-label="Objet de l'email"
          className={cn(
            'w-full rounded-xl px-4 py-2 text-sm',
            'bg-white/50 dark:bg-white/[0.04] border border-white/60 dark:border-white/10',
            'placeholder:text-muted-foreground/40 text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400',
            'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150'
          )}
        />
      )}

      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={busy}
        rows={3}
        placeholder={`${rules.placeholder} ${contactName ? `(pour ${contactName})` : ''}`.trim()}
        aria-label="Message"
        className={cn(
          'w-full resize-none rounded-xl px-4 py-3 text-sm leading-relaxed',
          'bg-white/50 dark:bg-white/[0.04] border border-white/60 dark:border-white/10',
          'placeholder:text-muted-foreground/40 text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400',
          'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150'
        )}
      />

      {file && <FilePreview file={file} disabled={busy} onRemove={() => setFile(null)} />}

      {state === 'success' && (
        <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={15} />
          Réponse envoyée au client.
        </p>
      )}
      {state === 'error' && (
        <p className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle size={15} className="shrink-0" />
          {error || "Échec de l'envoi. Réessayez."}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <AttachmentButton
          channel={channel}
          file={file}
          disabled={busy}
          onPick={picked => { setFile(picked); setState('idle'); setError('') }}
          onError={msg => { setError(msg); setState('error') }}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 shrink-0',
            'bg-indigo-600 text-white shadow-md shadow-indigo-500/30',
            'hover:bg-indigo-700 active:scale-95',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 disabled:active:scale-100'
          )}
        >
          {state === 'uploading' && <><Loader2 size={14} className="animate-spin" /> Envoi du fichier…</>}
          {state === 'sending'   && <><Loader2 size={14} className="animate-spin" /> Envoi…</>}
          {!busy                 && <><Send size={14} /> Envoyer</>}
        </button>
      </div>
    </div>
  )
}
