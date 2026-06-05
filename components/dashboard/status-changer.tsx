'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { updateEscalationStatus } from '@/lib/supabase/actions'
import { Check, Loader2 } from 'lucide-react'

const STATUSES = [
  { value: 'pending',     label: 'En attente', ring: 'ring-indigo-500',  active: 'bg-indigo-600 text-white shadow-indigo-500/30',       inactive: 'bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100' },
  { value: 'in_progress', label: 'En cours',   ring: 'ring-amber-500',   active: 'bg-amber-500 text-white shadow-amber-400/30',          inactive: 'bg-amber-50/80 text-amber-700 hover:bg-amber-100'   },
  { value: 'resolved',    label: 'Résolu',     ring: 'ring-emerald-500', active: 'bg-emerald-600 text-white shadow-emerald-500/30',      inactive: 'bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100' },
  { value: 'closed',      label: 'Fermé',      ring: 'ring-slate-400',   active: 'bg-slate-600 text-white shadow-slate-400/20',         inactive: 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'  },
]

interface StatusChangerProps {
  id: number
  currentStatus: string
}

export function StatusChanger({ id, currentStatus }: StatusChangerProps) {
  const [status, setStatus]   = useState(currentStatus)
  const [saved, setSaved]     = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleChange(newStatus: string) {
    if (newStatus === status || isPending) return
    const prev = status
    setStatus(newStatus) // optimiste
    setSaved(false)

    startTransition(async () => {
      const result = await updateEscalationStatus(id, newStatus)
      if (!result.success) {
        setStatus(prev) // rollback
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Statut du ticket
        </p>
        <div className="h-5 flex items-center">
          {isPending && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 size={11} className="animate-spin" /> Enregistrement…
            </span>
          )}
          {saved && !isPending && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <Check size={11} /> Enregistré
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => handleChange(s.value)}
            disabled={isPending}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 shadow-md',
              status === s.value
                ? `${s.active} ring-2 ${s.ring} ring-offset-2 ring-offset-transparent`
                : `${s.inactive} opacity-70`,
              isPending && 'cursor-not-allowed opacity-50'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
