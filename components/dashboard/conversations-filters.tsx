'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { SlidersHorizontal, Search } from 'lucide-react'

const STATUS_TABS = [
  { value: 'all',      label: 'Toutes'  },
  { value: 'active',   label: 'Active'  },
  { value: 'resolved', label: 'Résolue' },
  { value: 'closed',   label: 'Fermée'  },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Plus récent' },
  { value: 'oldest', label: 'Plus ancien' },
]

const DEFAULTS: Record<string, string> = {
  status: 'all', sort: 'newest', channel: 'all', client: '',
}

interface Props {
  channels?: string[]
}

export function ConversationsFilters({ channels = [] }: Props) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const currentStatus  = searchParams.get('status')  ?? 'all'
  const currentSort    = searchParams.get('sort')    ?? 'newest'
  const currentChannel = searchParams.get('channel') ?? 'all'
  const currentClient  = searchParams.get('client')  ?? ''

  const [clientInput, setClientInput] = useState(currentClient)
  useEffect(() => { setClientInput(currentClient) }, [currentClient])

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === DEFAULTS[key]) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const commitClient = useCallback(() => {
    update('client', clientInput.trim())
  }, [clientInput, update])

  const sel = 'text-xs font-semibold bg-white/50 dark:bg-white/5 border border-white/70 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50'

  return (
    <div className="glass rounded-2xl px-4 py-3 space-y-3">

      {/* Ligne 1 : statut */}
      <div className="flex items-center gap-3 flex-wrap">
        <SlidersHorizontal size={14} className="text-muted-foreground shrink-0" />
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => update('status', tab.value)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150',
                currentStatus === tab.value
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-muted-foreground hover:bg-white/50 dark:hover:bg-white/5'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ligne 2 : canal, tri, client */}
      <div className="flex items-center gap-3 flex-wrap pl-5">

        {/* Canal */}
        {channels.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Canal :</span>
            <select value={currentChannel} onChange={e => update('channel', e.target.value)} className={sel}>
              <option value="all">Tous</option>
              {channels.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        <div className="w-px h-4 bg-border hidden sm:block" />

        {/* Tri */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">Tri :</span>
          <select value={currentSort} onChange={e => update('sort', e.target.value)} className={sel}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="w-px h-4 bg-border hidden sm:block" />

        {/* Client */}
        <div className="flex items-center gap-1.5">
          <Search size={12} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Rechercher un client…"
            value={clientInput}
            onChange={e => setClientInput(e.target.value)}
            onBlur={commitClient}
            onKeyDown={e => e.key === 'Enter' && commitClient()}
            className="text-xs bg-white/50 dark:bg-white/5 border border-white/70 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-44 placeholder:text-muted-foreground/50"
          />
        </div>
      </div>
    </div>
  )
}
