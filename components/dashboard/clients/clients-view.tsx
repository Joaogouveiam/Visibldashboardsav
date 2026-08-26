'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Plus, Users, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, AlertTriangle, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToastProvider } from '@/components/ui/toast'
import type { ClientContext } from '@/lib/types/sav'
import { OfferBadge, avatarGradient, initials, formatDate } from './shared'
import { ClientDetailPanel } from './client-detail-panel'
import { ClientModal } from './client-modal'

const PAGE_SIZE = 20

type SortKey = 'full_name' | 'email' | 'phone' | 'company' | 'offer' | 'created_at'
type SortDir = 'asc' | 'desc'

const COLUMNS: Array<{ key: SortKey; label: string; className?: string }> = [
  { key: 'full_name',  label: 'Nom' },
  { key: 'email',      label: 'Email',      className: 'hidden md:table-cell' },
  { key: 'phone',      label: 'Téléphone',  className: 'hidden lg:table-cell' },
  { key: 'company',    label: 'Entreprise', className: 'hidden sm:table-cell' },
  { key: 'offer',      label: 'Offre' },
  { key: 'created_at', label: 'Créé le',    className: 'hidden lg:table-cell whitespace-nowrap' },
]

/** Comparateur : les valeurs vides passent toujours en fin de liste. */
function compare(a: ClientContext, b: ClientContext, key: SortKey, dir: SortDir): number {
  const av = a[key]
  const bv = b[key]

  if (!av && !bv) return 0
  if (!av) return 1
  if (!bv) return -1

  const result = key === 'created_at'
    ? new Date(av as string).getTime() - new Date(bv as string).getTime()
    : String(av).localeCompare(String(bv), 'fr', { sensitivity: 'base' })

  return dir === 'asc' ? result : -result
}

interface Props {
  initialClients: ClientContext[]
  error:          string | null
}

export function ClientsView({ initialClients, error }: Props) {
  return (
    <ToastProvider>
      <ClientsContent initialClients={initialClients} error={error} />
    </ToastProvider>
  )
}

function ClientsContent({ initialClients, error }: Props) {
  const router = useRouter()

  const [clients, setClients] = useState(initialClients)
  const [search, setSearch]   = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage]       = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen]   = useState(false)

  // Resynchronise après un router.refresh() (import CSV, revalidation serveur)
  useEffect(() => { setClients(initialClients) }, [initialClients])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(c =>
      (c.full_name ?? '').toLowerCase().includes(q) ||
      (c.email     ?? '').toLowerCase().includes(q) ||
      (c.company   ?? '').toLowerCase().includes(q)
    )
  }, [clients, search])

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => compare(a, b, sortKey, sortDir)),
    [filtered, sortKey, sortDir]
  )

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageItems  = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Un filtre ou un tri qui réduit la liste ne doit pas laisser une page vide
  useEffect(() => { setPage(1) }, [search, sortKey, sortDir])

  const selected = clients.find(c => c.id === selectedId) ?? null

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      // Une date part du plus récent ; le texte part de A→Z.
      setSortDir(key === 'created_at' ? 'desc' : 'asc')
    }
  }

  function handleCreated(client: ClientContext) {
    setClients(prev => [client, ...prev])
    setModalOpen(false)
  }

  function handleUpdated(client: ClientContext) {
    setClients(prev => prev.map(c => (c.id === client.id ? client : c)))
  }

  function handleImported() {
    router.refresh()
  }

  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Users size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Fiches clients et contexte SAV
            </p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} />
          Client
        </button>
      </div>

      {/* Recherche */}
      <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou entreprise…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-xs bg-transparent text-foreground focus:outline-none placeholder:text-muted-foreground/50 min-w-0"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Effacer la recherche"
              className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="w-px h-4 bg-border hidden sm:block" />

        <p className="text-xs text-muted-foreground shrink-0">
          <span className="font-semibold text-foreground">{sorted.length}</span>{' '}
          client{sorted.length > 1 ? 's' : ''}
          {search && clients.length !== sorted.length && ` sur ${clients.length}`}
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <div className="glass rounded-2xl p-6 flex items-start gap-3 border border-red-200/60 dark:border-red-800/40">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Erreur de chargement</p>
            <p className="text-xs font-mono text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state global */}
      {!error && clients.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
            <Users size={20} className="text-white" />
          </div>
          <h3 className="text-base font-semibold mb-1">Aucun client pour l&apos;instant</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Créez une fiche ou importez un fichier CSV pour démarrer.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-700 transition-colors"
          >
            <Plus size={14} />
            Ajouter un client
          </button>
        </div>
      )}

      {/* Tableau */}
      {!error && clients.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/40 dark:border-white/[0.05] bg-white/20 dark:bg-white/[0.02]">
                  {COLUMNS.map(col => {
                    const active = sortKey === col.key
                    const Icon = !active ? ChevronsUpDown : sortDir === 'asc' ? ChevronUp : ChevronDown
                    return (
                      <th key={col.key} className={cn('text-left px-5 py-3', col.className)}>
                        <button
                          onClick={() => toggleSort(col.key)}
                          aria-label={`Trier par ${col.label}`}
                          className={cn(
                            'inline-flex items-center gap-1 text-xs font-semibold transition-colors group/sort',
                            active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {col.label}
                          <Icon
                            size={12}
                            className={cn(
                              'shrink-0 transition-opacity',
                              active ? 'text-indigo-500 opacity-100' : 'opacity-30 group-hover/sort:opacity-60'
                            )}
                          />
                        </button>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {pageItems.map(client => (
                  <tr
                    key={client.id}
                    onClick={() => setSelectedId(client.id)}
                    tabIndex={0}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelectedId(client.id))}
                    className={cn(
                      'border-b border-white/30 dark:border-white/[0.04] last:border-b-0 cursor-pointer group transition-colors',
                      'hover:bg-white/30 dark:hover:bg-white/[0.03] focus:outline-none focus:bg-white/40 dark:focus:bg-white/[0.05]',
                      selectedId === client.id && 'bg-indigo-50/60 dark:bg-indigo-900/20'
                    )}
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className={cn(
                          'w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0 text-white text-[10px] font-bold shadow-sm',
                          avatarGradient(client.full_name)
                        )}>
                          {initials(client.full_name)}
                        </span>
                        <span className="text-sm font-medium">
                          {client.full_name ?? <span className="italic text-muted-foreground/50">Sans nom</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell max-w-[200px]">
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors truncate block" title={client.email ?? ''}>
                        {client.email ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell whitespace-nowrap text-sm text-muted-foreground">
                      {client.phone ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell max-w-[160px]">
                      <span className="text-sm text-muted-foreground truncate block" title={client.company ?? ''}>
                        {client.company ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <OfferBadge offer={client.offer} />
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(client.created_at)}
                    </td>
                  </tr>
                ))}

                {/* Empty state de recherche */}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-5 py-12 text-center">
                      <p className="text-sm font-medium text-foreground">Aucun résultat</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Aucun client ne correspond à « {search} ».
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {sorted.length > PAGE_SIZE && (
            <div className="px-5 py-3 border-t border-white/40 dark:border-white/[0.05] flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-muted-foreground">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} sur {sorted.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  aria-label="Page précédente"
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-white/50 dark:hover:bg-white/[0.06] hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-foreground px-2 tabular-nums">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  aria-label="Page suivante"
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-white/50 dark:hover:bg-white/[0.06] hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ClientDetailPanel
        client={selected}
        onClose={() => setSelectedId(null)}
        onUpdated={handleUpdated}
      />

      <ClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
        onImported={handleImported}
      />
    </div>
  )
}
