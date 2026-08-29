'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { canReplyTo, replyChannel } from '@/lib/reply'
import { postJson, uploadAttachment, type UploadTicket } from '@/lib/upload-client'
import { AttachmentButton, FilePreview } from '@/components/dashboard/attachment-picker'
import type { Escalation, Conversation } from '@/lib/types/sav'

function textToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

interface AgentReplyPanelProps {
  escalation:   Escalation
  conversation: Conversation | null
}

type SendState = 'idle' | 'uploading' | 'sending' | 'success' | 'error'

/** Champs de PJ attendus par n8n, à plat et nommés selon le canal. */
function attachmentFields(channel: string, attachment: UploadTicket | null) {
  if (!attachment) return {}
  if (channel === 'whatsapp') return { mediaUrl: attachment.url }
  return {
    attachmentUrl:      attachment.url,
    attachmentName:     attachment.name,
    attachmentMimeType: attachment.mimeType,
  }
}

export function AgentReplyPanel({ escalation, conversation }: AgentReplyPanelProps) {
  const channel = replyChannel(escalation.channel)
  const isEmail = channel === 'email'

  // Les PJ ne partent que sur les canaux qui savent porter un média, vers un
  // contact connu et un dossier non clos — exactement ce que /api/upload
  // exige, autant ne pas proposer un bouton qui échouerait.
  const canAttach = channel !== null && canReplyTo(escalation)

  const [message,     setMessage]     = useState('')
  const [file,        setFile]        = useState<File | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [state,       setState]       = useState<SendState>('idle')
  const [errorMsg,    setErrorMsg]    = useState('')

  const busy    = state === 'uploading' || state === 'sending'
  // Une PJ seule suffit sur WhatsApp ; l'email exige un corps de message.
  const canSend = !busy && (message.trim() !== '' || (file !== null && channel === 'whatsapp'))

  async function handleSend() {
    if (!canSend) return

    setErrorMsg('')

    try {
      let attachment: UploadTicket | null = null
      if (file) {
        setState('uploading')
        attachment = await uploadAttachment({ escalation_id: escalation.id }, file)
      }

      setState('sending')
      await postJson('/api/send-response', {
        escalation,
        conversation,
        history:       escalation.history ?? conversation?.history ?? [],
        agent_message: isEmail ? textToHtml(message.trim()) : message.trim(),
        sent_at:       new Date().toISOString(),
        // Champs ajoutés pour le routage et la PJ côté n8n.
        channel:         escalation.channel,
        conversation_id: conversation?.id ?? null,
        to:              escalation.contact_id,
        ...attachmentFields(escalation.channel, attachment),
      })

      setState('success')
      setMessage('')
      setFile(null)
      setTimeout(() => setState(s => (s === 'success' ? 'idle' : s)), 4000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue')
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
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
          Répondre au client
        </h2>
        {isEmail && message.trim() && (
          <button
            onClick={() => setShowPreview(v => !v)}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
            {showPreview ? 'Masquer la preview' : 'Aperçu HTML'}
          </button>
        )}
      </div>

      <div className="relative">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy || state === 'success'}
          placeholder={`Rédigez votre réponse pour ${escalation.contact_name ?? 'le client'}…`}
          rows={5}
          className={cn(
            'w-full resize-none rounded-xl px-4 py-3 text-sm leading-relaxed',
            'bg-white/50 dark:bg-white/[0.04] border border-white/60 dark:border-white/10',
            'placeholder:text-muted-foreground/40 text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-150'
          )}
        />
        <span className="absolute bottom-2.5 right-3 text-[10px] text-muted-foreground/40 select-none">
          Ctrl+Entrée pour envoyer
        </span>
      </div>

      {file && <FilePreview file={file} disabled={busy} onRemove={() => setFile(null)} />}

      {isEmail && showPreview && message.trim() && (
        <div className="rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-white/60 dark:bg-white/[0.04] overflow-hidden">
          <div className="px-3 py-1.5 bg-blue-50/80 dark:bg-blue-900/20 border-b border-blue-200/60 dark:border-blue-800/40">
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Aperçu email HTML
            </span>
          </div>
          <div
            className="px-4 py-3 text-sm text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: textToHtml(message) }}
          />
        </div>
      )}

      {state === 'success' && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={15} />
          Message transmis à n8n.
        </div>
      )}
      {state === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle size={15} className="shrink-0" />
          {errorMsg || "Échec de l'envoi. Réessayez."}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {canAttach ? (
          <AttachmentButton
            channel={channel}
            file={file}
            disabled={busy}
            onPick={picked => { setFile(picked); setState('idle'); setErrorMsg('') }}
            onError={msg => { setErrorMsg(msg); setState('error') }}
          />
        ) : <span />}

        <button
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
          {!busy                 && <><Send size={14} /> Envoyer la réponse</>}
        </button>
      </div>
    </div>
  )
}
