import { Suspense } from 'react'
import {
  getFilteredEscalations,
  getDistinctEscalationValues,
  type EscalationFilters,
} from '@/lib/supabase/queries'
import { EscalationCard } from '@/components/dashboard/escalation-card'
import { EscalationsFilters } from '@/components/dashboard/escalations-filters'
import { HeartHandshake, AlertTriangle } from 'lucide-react'

async function EscalationsContent({ filters }: { filters: EscalationFilters }) {
  const { items: escalations, error } = await getFilteredEscalations(filters)

  if (error) {
    return (
      <div className="glass rounded-2xl p-6 flex items-start gap-3 border border-red-200/60">
        <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">Erreur de chargement</p>
          <p className="text-xs font-mono text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (escalations.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg shadow-lg">✓</div>
        <h3 className="text-base font-semibold mb-1">Rien ici</h3>
        <p className="text-sm text-muted-foreground">Aucune escalade pour ce filtre.</p>
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-muted-foreground px-1">
        <span className="font-semibold text-foreground">{escalations.length}</span>{' '}
        escalade{escalations.length > 1 ? 's' : ''}
      </p>
      <div className="space-y-3">
        {escalations.map(esc => (
          <EscalationCard key={esc.id} esc={esc} />
        ))}
      </div>
    </>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass rounded-2xl h-36 animate-pulse" />
      ))}
    </div>
  )
}

interface PageProps {
  searchParams: Promise<{
    status?:   string
    sort?:     string
    channel?:  string
    priority?: string
    category?: string
    client?:   string
  }>
}

export default async function BesoinHumainPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filters: EscalationFilters = {
    status:   params.status,
    sort:     params.sort,
    channel:  params.channel,
    priority: params.priority,
    category: params.category,
    client:   params.client,
  }

  const { channels, categories } = await getDistinctEscalationValues()

  const suspenseKey = [
    params.status   ?? 'all',
    params.sort     ?? 'newest',
    params.channel  ?? 'all',
    params.priority ?? 'all',
    params.category ?? 'all',
    params.client   ?? '',
  ].join('-')

  return (
    <div className="space-y-5">

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <HeartHandshake size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Besoin humain</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Escalades en attente de prise en charge</p>
        </div>
      </div>

      <EscalationsFilters channels={channels} categories={categories} />

      <Suspense key={suspenseKey} fallback={<Skeleton />}>
        <EscalationsContent filters={filters} />
      </Suspense>

    </div>
  )
}
