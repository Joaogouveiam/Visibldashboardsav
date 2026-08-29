'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Paperclip, ImageOff, FileText, ExternalLink, X, Loader2, ChevronDown, Image as ImageIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Attachment } from '@/lib/types/sav'
import { attachmentKind, displayMediaUrl, isRenderableImage } from '@/lib/media'

// ── Visionneuse plein écran ───────────────────────────────────

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [broken,  setBroken]  = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  if (!mounted) return null

  // Portail obligatoire : le backdrop-filter des cartes .glass crée un bloc
  // conteneur qui piégerait un position:fixed rendu à l'intérieur.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pièce jointe en plein écran"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6 animate-in fade-in duration-150"
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          title="Ouvrir dans un nouvel onglet"
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors"
        >
          <ExternalLink size={15} />
        </a>
        <button
          type="button"
          onClick={onClose}
          title="Fermer"
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {broken ? (
        <div
          onClick={e => e.stopPropagation()}
          className="glass rounded-2xl px-6 py-8 text-center max-w-sm"
        >
          <ImageOff size={28} className="text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">Aperçu impossible</p>
          <p className="text-xs text-muted-foreground mt-1">
            Le média n&apos;a pas pu être chargé, ou n&apos;est pas une image.
          </p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            <ExternalLink size={12} />
            Ouvrir dans un nouvel onglet
          </a>
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Pièce jointe"
            onClick={e => e.stopPropagation()}
            onError={() => setBroken(true)}
            className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl"
          />
        </>
      )}
    </div>,
    document.body,
  )
}

// ── Vignette image ────────────────────────────────────────────

type LoadState = 'loading' | 'ready' | 'error'

function ImageAttachment({ src, solo, certain }: { src: string; solo: boolean; certain: boolean }) {
  const [state, setState] = useState<LoadState>('loading')
  const [open,  setOpen]  = useState(false)

  if (state === 'error') {
    // `certain` : le mimeType annonçait bien une image, l'échec est une vraie
    // erreur. Sinon la PJ n'était probablement pas une image — lien neutre.
    return certain
      ? <FallbackLink href={src} icon={ImageOff}  label="Image indisponible" hint="Ouvrir la pièce jointe" />
      : <FallbackLink href={src} icon={Paperclip} label="Voir la pièce jointe" />
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'relative block overflow-hidden rounded-xl border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 group/img',
          solo ? 'max-w-[16rem]' : 'w-full aspect-square',
          state === 'loading' && solo ? 'w-64 min-h-[7rem]' : '',
        )}
      >
        {state === 'loading' && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-white/5 animate-pulse">
            <Loader2 size={16} className="text-muted-foreground/50 animate-spin" />
          </span>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Pièce jointe"
          loading="lazy"
          onLoad={() => setState('ready')}
          onError={() => setState('error')}
          className={cn(
            'transition-opacity duration-200 group-hover/img:opacity-90',
            solo ? 'max-w-full h-auto' : 'w-full h-full object-cover',
            state === 'ready' ? 'opacity-100' : 'opacity-0',
          )}
        />
      </button>

      {open && <Lightbox src={src} onClose={() => setOpen(false)} />}
    </>
  )
}

// ── Lien (PDF, type inconnu, image en échec) ──────────────────

function FallbackLink({
  href, icon: Icon, label, hint,
}: {
  href: string
  icon: React.ElementType
  label: string
  hint?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={hint ?? label}
      className="inline-flex items-center gap-2 max-w-full px-3 py-2 rounded-xl bg-white/60 dark:bg-white/[0.07] border border-white/70 dark:border-white/10 text-xs font-medium text-foreground hover:bg-white/80 dark:hover:bg-white/[0.12] hover:border-indigo-300/60 transition-colors"
    >
      <Icon size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
      <span className="truncate">{label}</span>
      <ExternalLink size={11} className="text-muted-foreground/60 shrink-0" />
    </a>
  )
}

// ── Bloc pièces jointes d'un message ──────────────────────────

export function MessageAttachments({
  attachments,
  align = 'start',
  className,
}: {
  attachments: Attachment[]
  align?: 'start' | 'end'
  className?: string
}) {
  if (attachments.length === 0) return null

  const images = attachments.filter(isRenderableImage)
  const others = attachments.filter(a => !isRenderableImage(a))

  return (
    <div className={cn(
      'mt-1.5 flex flex-col gap-1.5 w-full max-w-[16rem]',
      align === 'end' ? 'items-end' : 'items-start',
      className,
    )}>
      {images.length > 0 && (
        <div className={cn(
          'w-full',
          images.length > 1 ? 'grid grid-cols-2 gap-1.5' : 'flex',
          align === 'end' && images.length === 1 ? 'justify-end' : '',
        )}>
          {images.map((a, i) => (
            <ImageAttachment
              key={`${a.url}-${i}`}
              src={displayMediaUrl(a.url)}
              solo={images.length === 1}
              certain={attachmentKind(a) === 'image'}
            />
          ))}
        </div>
      )}

      {others.map((a, i) => (
        <FallbackLink
          key={`${a.url}-${i}`}
          href={displayMediaUrl(a.url)}
          icon={attachmentKind(a) === 'pdf' ? FileText : Paperclip}
          // Le nom d'origine n'est connu que pour les PJ envoyées par l'agent.
          label={a.name ?? (attachmentKind(a) === 'pdf' ? 'Voir le document PDF' : 'Voir la pièce jointe')}
        />
      ))}
    </div>
  )
}

// ── Pièces jointes non rattachables à un message ──────────────

export function OrphanAttachments({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-white/30 dark:border-white/10">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
        <Paperclip size={10} />
        {attachments.length} pièce{attachments.length > 1 ? 's' : ''} jointe{attachments.length > 1 ? 's' : ''}
      </p>
      <MessageAttachments attachments={attachments} />
    </div>
  )
}

// ── Menu « Pièces jointes » de la conversation ────────────────

function formatShortDate(value: string | null): string | null {
  if (!value) return null
  const t = Date.parse(value)
  if (Number.isNaN(t)) return null
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(t))
}

/** Vignette du menu : bascule sur une icône si le média ne charge pas. */
function MenuThumb({ src, image }: { src: string; image: boolean }) {
  const [broken, setBroken] = useState(false)

  if (!image || broken) {
    return (
      <span className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-white/10 flex items-center justify-center shrink-0">
        {image
          ? <ImageOff  size={14} className="text-muted-foreground/60" />
          : <FileText  size={14} className="text-indigo-600 dark:text-indigo-400" />}
      </span>
    )
  }

  return (
    <span className="w-9 h-9 rounded-lg overflow-hidden bg-white/60 dark:bg-white/5 border border-white/70 dark:border-white/10 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        className="w-full h-full object-cover"
      />
    </span>
  )
}

interface MenuEntry {
  src:   string
  image: boolean
  label: string
  date:  string | null
}

function buildEntries(attachments: Attachment[]): MenuEntry[] {
  const images = attachments.filter(a => attachmentKind(a) === 'image').length
  const pdfs   = attachments.filter(a => attachmentKind(a) === 'pdf').length
  const others = attachments.length - images - pdfs

  let nImage = 0, nPdf = 0, nOther = 0

  return attachments.map((a) => {
    const kind = attachmentKind(a)

    // On ne numérote que s'il y a plusieurs éléments du même type.
    const label = kind === 'image' ? `Image${images > 1 ? ` ${++nImage}` : ''}`
      : kind === 'pdf'             ? `Document PDF${pdfs   > 1 ? ` ${++nPdf}`   : ''}`
      :                              `Pièce jointe${others > 1 ? ` ${++nOther}` : ''}`

    return {
      src:   displayMediaUrl(a.url),
      image: isRenderableImage(a),
      label: a.name ?? label,
      date:  formatShortDate(a.timestamp),
    }
  })
}

/**
 * Bouton d'en-tête listant toutes les PJ de la conversation. Un clic sur une
 * image l'ouvre en plein écran, un clic sur un document l'ouvre dans un
 * nouvel onglet — toujours via le proxy /api/media.
 */
export function AttachmentsMenu({
  attachments,
  className,
}: {
  attachments: Attachment[]
  className?: string
}) {
  const [preview, setPreview] = useState<string | null>(null)

  if (attachments.length === 0) return null

  const entries = buildEntries(attachments)
  const plural  = attachments.length > 1 ? 's' : ''

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title={`${attachments.length} pièce${plural} jointe${plural}`}
            className={cn(
              'inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg font-medium border transition-colors',
              'bg-indigo-100/80 text-indigo-700 border-indigo-200/60 hover:bg-indigo-200/70',
              'dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-400/20 dark:hover:bg-indigo-900/50',
              'data-[state=open]:ring-2 data-[state=open]:ring-indigo-400/40',
              className,
            )}
          >
            <Paperclip size={11} />
            {attachments.length} PJ
            <ChevronDown size={11} className="opacity-70" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64 max-h-80 p-1.5">
          <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-2 pb-1.5">
            {attachments.length} pièce{plural} jointe{plural}
          </DropdownMenuLabel>

          {entries.map((entry, i) => {
            const content = (
              <>
                <MenuThumb src={entry.src} image={entry.image} />
                <span className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-medium text-foreground truncate">{entry.label}</span>
                  {entry.date && (
                    <span className="text-[10px] text-muted-foreground/70">{entry.date}</span>
                  )}
                </span>
                {entry.image
                  ? <ImageIcon    size={12} className="text-muted-foreground/50 shrink-0" />
                  : <ExternalLink size={12} className="text-muted-foreground/50 shrink-0" />}
              </>
            )

            return entry.image ? (
              <DropdownMenuItem
                key={`${entry.src}-${i}`}
                onSelect={() => setPreview(entry.src)}
                className="h-auto py-1.5 px-2 gap-2.5 cursor-pointer"
              >
                {content}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={`${entry.src}-${i}`} asChild className="h-auto py-1.5 px-2 gap-2.5 cursor-pointer">
                <a href={entry.src} target="_blank" rel="noopener noreferrer">{content}</a>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {preview && <Lightbox src={preview} onClose={() => setPreview(null)} />}
    </>
  )
}

// ── Indicateur compact (liste des conversations) ──────────────

export function AttachmentIndicator({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span
      title={`${count} pièce${count > 1 ? 's' : ''} jointe${count > 1 ? 's' : ''}`}
      className="inline-flex items-center gap-0.5 text-[11px] text-indigo-600 dark:text-indigo-400 shrink-0"
    >
      <Paperclip size={11} />
      {count > 1 && count}
    </span>
  )
}
