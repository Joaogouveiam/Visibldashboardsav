'use client'

import { useState, useTransition } from 'react'
import { Loader2, AlertCircle, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClientContext } from '@/lib/supabase/actions'
import { validateClient, toClientInput, type ClientFieldErrors } from '@/lib/clients/validation'
import { useToast } from '@/components/ui/toast'
import { CLIENT_OFFERS, type ClientContext, type ClientContextInput } from '@/lib/types/sav'

const EMPTY: ClientContextInput = {
  full_name: '', email: '', phone: '', company: '', offer: '', context_summary: '',
}

const inputBase =
  'w-full text-sm bg-white/60 dark:bg-white/[0.06] border border-white/70 dark:border-white/10 rounded-xl px-3 py-2 ' +
  'text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow'

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 block mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

export function ClientFormTab({ onCreated }: { onCreated: (client: ClientContext) => void }) {
  const { toast } = useToast()
  const [form, setForm]   = useState<ClientContextInput>(EMPTY)
  const [errors, setErrors] = useState<ClientFieldErrors>({})
  const [isPending, startTransition] = useTransition()

  function set<K extends keyof ClientContextInput>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const input = toClientInput(form as unknown as Record<string, unknown>)
    const validation = validateClient(input)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    startTransition(async () => {
      const result = await createClientContext(input)
      if (result.success) {
        setForm(EMPTY)
        setErrors({})
        onCreated(result.client)
        toast({
          variant: 'success',
          title: 'Client créé',
          description: result.client.full_name ?? undefined,
        })
      } else {
        toast({ variant: 'error', title: 'Création impossible', description: result.error })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div>
        <Label required>Nom complet</Label>
        <input
          autoFocus
          value={form.full_name ?? ''}
          onChange={e => set('full_name', e.target.value)}
          className={cn(inputBase, errors.full_name && 'ring-2 ring-red-500/50')}
          placeholder="Marie Dupont"
        />
        {errors.full_name && <FieldError message={errors.full_name} />}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Email</Label>
          <input
            type="email"
            value={form.email ?? ''}
            onChange={e => set('email', e.target.value)}
            className={cn(inputBase, errors.email && 'ring-2 ring-red-500/50')}
            placeholder="marie@exemple.fr"
          />
          {errors.email && <FieldError message={errors.email} />}
        </div>

        <div>
          <Label>Téléphone</Label>
          <input
            type="tel"
            value={form.phone ?? ''}
            onChange={e => set('phone', e.target.value)}
            className={cn(inputBase, errors.phone && 'ring-2 ring-red-500/50')}
            placeholder="+33 6 12 34 56 78"
          />
          {errors.phone && <FieldError message={errors.phone} />}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Entreprise</Label>
          <input
            value={form.company ?? ''}
            onChange={e => set('company', e.target.value)}
            className={inputBase}
            placeholder="Dupont & Co"
          />
        </div>

        <div>
          <Label>Offre</Label>
          <select
            value={form.offer ?? ''}
            onChange={e => set('offer', e.target.value)}
            className={cn(inputBase, 'cursor-pointer')}
          >
            <option value="">Aucune offre</option>
            {CLIENT_OFFERS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div>
        <Label>Notes initiales</Label>
        <textarea
          value={form.context_summary ?? ''}
          onChange={e => set('context_summary', e.target.value)}
          rows={4}
          className={cn(inputBase, 'resize-y min-h-[90px]')}
          placeholder="Contexte, historique, préférences du client…"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {isPending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
          Créer le client
        </button>
      </div>
    </form>
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
