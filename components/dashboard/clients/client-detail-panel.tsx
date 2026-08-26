'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  X, Pencil, Check, Loader2, Mail, Phone, Building2,
  Calendar, FileText, History, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateClientContext } from '@/lib/supabase/actions'
import { validateClient, toClientInput, type ClientFieldErrors } from '@/lib/clients/validation'
import { useToast } from '@/components/ui/toast'
import { CLIENT_OFFERS, type ClientContext, type ClientContextInput } from '@/lib/types/sav'
import { OfferBadge, avatarGradient, initials, formatDateTime } from './shared'

interface Props {
  client:    ClientContext | null
  onClose:   () => void
  onUpdated: (client: ClientContext) => void
}

function emptyForm(c: ClientContext | null): ClientContextInput {
  return {
    full_name:       c?.full_name       ?? '',
    email:           c?.email           ?? '',
    phone:           c?.phone           ?? '',
    company:         c?.company         ?? '',
    offer:           c?.offer           ?? '',
    context_summary: c?.context_summary ?? '',
  }
}

const inputBase =
  'w-full text-sm bg-white/60 dark:bg-white/[0.06] border border-white/70 dark:border-white/10 rounded-xl px-3 py-2 ' +
  'text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow'

function Field({
  icon: Icon, label, children,
}: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5">
        <Icon size={11} />
        {label}
      </p>
      {children}
    </div>
  )
}

function ReadValue({ value, href }: { value: string | null; href?: string }) {
  if (!value) return <p className="text-sm text-muted-foreground/50 italic">Non renseigné</p>
  if (href) {
    return (
      <a href={href} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all">
        {value}
      </a>
    )
  }
  return <p className="text-sm text-foreground break-words">{value}</p>
}

/** Rend `raw_history` lisible quel que soit son contenu (tableau de messages ou JSON libre). */
function RawHistory({ raw }: { raw: unknown }) {
  const isEmpty =
    raw === null || raw === undefined ||
    (Array.isArray(raw) && raw.length === 0) ||
    (typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw as object).length === 0)

  if (isEmpty) {
    return <p className="text-sm text-muted-foreground/50 italic">Aucun historique</p>
  }

  const messages =
    Array.isArray(raw) && raw.every(m => m && typeof m === 'object' && 'content' in (m as object))
      ? (raw as Array<{ role?: string; content?: string; ts?: string }>)
      : null

  if (messages) {
    return (
      <div className="space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              'rounded-xl px-3 py-2 text-sm border',
              m.role === 'assistant' || m.role === 'agent'
                ? 'bg-indigo-50/70 border-indigo-100/70 dark:bg-indigo-900/20 dark:border-indigo-800/40'
                : 'bg-white/50 border-white/60 dark:bg-white/[0.04] dark:border-white/10'
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
              {m.role ?? 'message'}
            </p>
            <p className="whitespace-pre-wrap break-words text-foreground/90">{m.content}</p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <pre className="text-[11px] font-mono bg-white/50 dark:bg-white/[0.04] border border-white/60 dark:border-white/10 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-words">
      {JSON.stringify(raw, null, 2)}
    </pre>
  )
}

export function ClientDetailPanel({ client, onClose, onUpdated }: Props) {
  const { toast } = useToast()
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState<ClientContextInput>(emptyForm(client))
  const [errors, setErrors]     = useState<ClientFieldErrors>({})
  const [isPending, startTransition] = useTransition()

  const open = client !== null

  // Réinitialise le formulaire à chaque changement de client sélectionné
  useEffect(() => {
    setForm(emptyForm(client))
    setEditing(false)
    setErrors({})
  }, [client])

  // Échap ferme le panel (sauf en cours d'édition, pour éviter la perte de saisie)
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !editing) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, editing, onClose])

  function set<K extends keyof ClientContextInput>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function handleCancel() {
    setForm(emptyForm(client))
    setErrors({})
    setEditing(false)
  }

  function handleSave() {
    if (!client) return

    const input = toClientInput(form as unknown as Record<string, unknown>)
    const validation = validateClient(input)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    startTransition(async () => {
      const result = await updateClientContext(client.id, input)
      if (result.success) {
        onUpdated(result.client)
        setEditing(false)
        setErrors({})
        toast({ variant: 'success', title: 'Client mis à jour' })
      } else {
        toast({ variant: 'error', title: 'Échec de la mise à jour', description: result.error })
      }
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => !editing && onClose()}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Détail du client"
        className={cn(
          'glass fixed right-0 top-0 h-screen w-full sm:w-[440px] z-40 flex flex-col',
          'border-l shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {client && (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/50 dark:border-white/[0.06] flex items-start gap-3 shrink-0">
              <div className={cn(
                'w-10 h-10 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0',
                'text-white text-sm font-bold shadow-lg',
                avatarGradient(client.full_name)
              )}>
                {initials(client.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold tracking-tight truncate">
                  {client.full_name ?? 'Client sans nom'}
                </h2>
                <div className="mt-1">
                  <OfferBadge offer={client.offer} />
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Fermer le panneau"
                className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-muted-foreground/60 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-foreground transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Barre d'actions */}
            <div className="px-5 py-3 border-b border-white/40 dark:border-white/[0.05] flex items-center gap-2 shrink-0">
              {editing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                  >
                    {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Enregistrer
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-white/50 dark:hover:bg-white/[0.06] disabled:opacity-60 transition-colors"
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/60 dark:bg-white/[0.06] border border-white/70 dark:border-white/10 text-foreground hover:bg-white/80 dark:hover:bg-white/[0.1] transition-colors"
                >
                  <Pencil size={12} />
                  Modifier
                </button>
              )}
            </div>

            {/* Contenu */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              <Field icon={Pencil} label="Nom complet">
                {editing ? (
                  <>
                    <input
                      value={form.full_name ?? ''}
                      onChange={e => set('full_name', e.target.value)}
                      className={cn(inputBase, errors.full_name && 'ring-2 ring-red-500/50')}
                      placeholder="Nom du client"
                    />
                    {errors.full_name && <FieldError message={errors.full_name} />}
                  </>
                ) : (
                  <ReadValue value={client.full_name} />
                )}
              </Field>

              <Field icon={Mail} label="Email">
                {editing ? (
                  <>
                    <input
                      type="email"
                      value={form.email ?? ''}
                      onChange={e => set('email', e.target.value)}
                      className={cn(inputBase, errors.email && 'ring-2 ring-red-500/50')}
                      placeholder="client@exemple.fr"
                    />
                    {errors.email && <FieldError message={errors.email} />}
                  </>
                ) : (
                  <ReadValue value={client.email} href={client.email ? `mailto:${client.email}` : undefined} />
                )}
              </Field>

              <Field icon={Phone} label="Téléphone">
                {editing ? (
                  <>
                    <input
                      type="tel"
                      value={form.phone ?? ''}
                      onChange={e => set('phone', e.target.value)}
                      className={cn(inputBase, errors.phone && 'ring-2 ring-red-500/50')}
                      placeholder="+33 6 12 34 56 78"
                    />
                    {errors.phone && <FieldError message={errors.phone} />}
                  </>
                ) : (
                  <ReadValue value={client.phone} href={client.phone ? `tel:${client.phone}` : undefined} />
                )}
              </Field>

              <Field icon={Building2} label="Entreprise">
                {editing ? (
                  <input
                    value={form.company ?? ''}
                    onChange={e => set('company', e.target.value)}
                    className={inputBase}
                    placeholder="Nom de l'entreprise"
                  />
                ) : (
                  <ReadValue value={client.company} />
                )}
              </Field>

              <Field icon={FileText} label="Offre">
                {editing ? (
                  <select
                    value={form.offer ?? ''}
                    onChange={e => set('offer', e.target.value)}
                    className={cn(inputBase, 'cursor-pointer')}
                  >
                    <option value="">Aucune offre</option>
                    {CLIENT_OFFERS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <OfferBadge offer={client.offer} />
                )}
              </Field>

              <Field icon={FileText} label="Résumé de contexte">
                {editing ? (
                  <textarea
                    value={form.context_summary ?? ''}
                    onChange={e => set('context_summary', e.target.value)}
                    rows={5}
                    className={cn(inputBase, 'resize-y min-h-[100px]')}
                    placeholder="Notes sur le client…"
                  />
                ) : client.context_summary ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words bg-white/40 dark:bg-white/[0.04] border border-white/60 dark:border-white/10 rounded-xl px-3 py-2">
                    {client.context_summary}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground/50 italic">Non renseigné</p>
                )}
              </Field>

              {client.tags && client.tags.length > 0 && (
                <Field icon={FileText} label="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {client.tags.map(tag => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 rounded-lg font-medium bg-indigo-100/70 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50">
                        {tag}
                      </span>
                    ))}
                  </div>
                </Field>
              )}

              <Field icon={History} label="Historique brut">
                <RawHistory raw={client.raw_history} />
              </Field>

              <div className="pt-2 border-t border-white/40 dark:border-white/[0.05] space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar size={11} />
                  Créé le {formatDateTime(client.created_at)}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar size={11} />
                  Modifié le {formatDateTime(client.updated_at)}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground/40 break-all pt-1">
                  {client.id}
                </p>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
      <AlertCircle size={11} />
      {message}
    </p>
  )
}
