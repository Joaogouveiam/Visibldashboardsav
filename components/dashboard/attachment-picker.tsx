'use client'

import { useEffect, useRef, useState } from 'react'
import { Paperclip, X, FileText, Music } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CHANNEL_RULES, formatBytes, validateFile, type ReplyChannel } from '@/lib/reply'

/** Aperçu du fichier sélectionné : vignette pour une image, icône sinon. */
export function FilePreview({
  file, disabled, onRemove,
}: {
  file: File; disabled: boolean; onRemove: () => void
}) {
  const [thumb, setThumb] = useState<string | null>(null)

  useEffect(() => {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setThumb(url)
    return () => { URL.revokeObjectURL(url); setThumb(null) }
  }, [file])

  const Icon = file.type.startsWith('audio/') ? Music : FileText

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/70 dark:border-white/10 bg-white/60 dark:bg-white/[0.06] px-3 py-2">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          className="w-9 h-9 rounded-lg object-cover border border-white/70 dark:border-white/10 shrink-0"
        />
      ) : (
        <span className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-white/10 flex items-center justify-center shrink-0">
          <Icon size={14} className="text-indigo-600 dark:text-indigo-400" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
        <p className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</p>
      </div>

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        title="Retirer la pièce jointe"
        aria-label="Retirer la pièce jointe"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/70 dark:hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}

/**
 * Bouton « Joindre un fichier » + champ masqué. La validation (type, taille)
 * est faite ici pour un retour immédiat ; la route d'upload la refait côté
 * serveur, le contrôle navigateur n'étant qu'un confort.
 */
export function AttachmentButton({
  channel, file, disabled, onPick, onError, showHint = true,
}: {
  channel:   ReplyChannel
  file:      File | null
  disabled:  boolean
  onPick:    (file: File) => void
  onError:   (message: string) => void
  showHint?: boolean
}) {
  const rules = CHANNEL_RULES[channel]
  const input = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    // Le champ est remis à zéro pour que re-sélectionner le même fichier
    // après l'avoir retiré déclenche bien un nouvel événement `change`.
    e.target.value = ''
    if (!picked) return

    const invalid = validateFile({ name: picked.name, type: picked.type, size: picked.size }, channel)
    if (invalid) { onError(invalid); return }
    onPick(picked)
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <input
        ref={input}
        type="file"
        accept={rules.accept || undefined}
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
          'bg-white/60 dark:bg-white/[0.07] border border-white/70 dark:border-white/10 text-foreground',
          'hover:bg-white/80 dark:hover:bg-white/[0.12] hover:border-indigo-300/60',
          'disabled:opacity-40 disabled:cursor-not-allowed'
        )}
      >
        <Paperclip size={13} className="text-indigo-600 dark:text-indigo-400" />
        {file ? 'Changer la PJ' : 'Joindre un fichier'}
      </button>
      {showHint && (
        <span className="text-[10px] text-muted-foreground/50 truncate hidden md:block">
          {channel === 'whatsapp' ? 'Images, PDF, audio' : 'Tous formats'} · max {formatBytes(rules.maxBytes)}
        </span>
      )}
    </div>
  )
}
