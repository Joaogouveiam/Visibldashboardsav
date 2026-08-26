'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, UserPlus, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClientContext } from '@/lib/types/sav'
import { ClientFormTab } from './client-form-tab'
import { CsvImportTab } from './csv-import-tab'

type Tab = 'form' | 'csv'

const TABS: Array<{ value: Tab; label: string; icon: typeof UserPlus }> = [
  { value: 'form', label: 'Formulaire', icon: UserPlus },
  { value: 'csv',  label: 'Import CSV', icon: FileSpreadsheet },
]

interface Props {
  open:      boolean
  onClose:   () => void
  onCreated: (client: ClientContext) => void
  onImported: () => void
}

export function ClientModal({ open, onClose, onCreated, onImported }: Props) {
  const [tab, setTab] = useState<Tab>('form')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Réinitialise l'onglet actif à chaque ouverture
  useEffect(() => { if (open) setTab('form') }, [open])

  // Échap ferme, et on bloque le scroll de la page derrière la modale
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nouveau client"
        className="glass relative rounded-3xl w-full max-w-2xl my-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/50 dark:border-white/[0.06] flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
            <UserPlus size={16} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold tracking-tight">Nouveau client</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Saisie manuelle ou import en masse
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-muted-foreground/60 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Onglets */}
        <div className="px-5 sm:px-6 pt-4">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/40 dark:bg-white/[0.04] border border-white/60 dark:border-white/10 w-fit">
            {TABS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150',
                  tab === value
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-muted-foreground hover:bg-white/60 dark:hover:bg-white/[0.06]'
                )}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu */}
        <div className="px-5 sm:px-6 py-5 max-h-[70vh] overflow-y-auto">
          {tab === 'form'
            ? <ClientFormTab onCreated={onCreated} />
            : <CsvImportTab onImported={onImported} />}
        </div>
      </div>
    </div>,
    document.body
  )
}
