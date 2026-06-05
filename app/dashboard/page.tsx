import { Suspense } from 'react'
import { StatCard } from '@/components/dashboard/stat-card'
import { TicketsTimelineChart } from '@/components/dashboard/tickets-timeline-chart'
import { TicketsStatusChart } from '@/components/dashboard/tickets-status-chart'
import { RecentEscalationsTable } from '@/components/dashboard/recent-escalations-table'
import {
  getDashboardStats,
  getEscalationsTimeline,
  getStatusDistribution,
  getRecentEscalations,
  getUrgentCount,
  getAutomationRate,
  getAvgResolutionHours,
} from '@/lib/supabase/queries'
import { AlertCircle, Clock, Bot, CheckCircle2, Siren, Timer } from 'lucide-react'
import { CurrentMonth } from '@/components/dashboard/current-month'

// ── Helpers ───────────────────────────────────────────────────

function formatHours(h: number): string {
  if (h <= 0)    return '—'
  if (h < 1/60)  return '<1min'
  if (h < 1)     return `${Math.round(h * 60)}min`
  if (h < 24)    return `${h.toFixed(1)}h`
  return `${Math.round(h / 24)}j`
}

// ── Composants async isolés pour le streaming ─────────────────

async function KPISection() {
  const [stats, urgentCount, automationRate, avgResolutionHours] = await Promise.all([
    getDashboardStats(),
    getUrgentCount(),
    getAutomationRate(),
    getAvgResolutionHours(),
  ])

  const volumeTrend = stats.total_last_month === 0
    ? 0
    : Math.round(((stats.total_this_month - stats.total_last_month) / stats.total_last_month) * 100)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        title="Volume ce mois"
        value={stats.total_this_month}
        trend={volumeTrend}
        trendLabel="vs mois dernier"
        accent="indigo"
        icon={AlertCircle}
      />
      <StatCard
        title="Cas urgents"
        value={urgentCount}
        subtitle="En attente ou en cours"
        accent="red"
        icon={Siren}
      />
      <StatCard
        title="Temps de résolution"
        value={formatHours(avgResolutionHours)}
        subtitle="Moyenne ce mois"
        accent="sky"
        icon={Timer}
      />
      <StatCard
        title="% Automatisation"
        value={`${automationRate}%`}
        subtitle="Conversations sans escalade"
        accent="green"
        icon={Bot}
      />
      <StatCard
        title="En attente"
        value={stats.pending_count}
        subtitle="Sans agent assigné"
        accent="amber"
        icon={Clock}
      />
      <StatCard
        title="Taux de résolution"
        value={`${stats.resolution_rate}%`}
        trend={stats.resolution_rate > 0 ? 3 : undefined}
        trendLabel="vs mois dernier"
        accent="purple"
        icon={CheckCircle2}
      />
    </div>
  )
}

async function ChartsSection() {
  const [timeline, statusDistribution] = await Promise.all([
    getEscalationsTimeline(),
    getStatusDistribution(),
  ])
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
      <TicketsTimelineChart data={timeline} />
      <TicketsStatusChart   data={statusDistribution} />
    </div>
  )
}

async function TableSection() {
  const escalations = await getRecentEscalations(10)
  return <RecentEscalationsTable escalations={escalations} />
}

// ── Squelettes de chargement ──────────────────────────────────

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="glass rounded-2xl h-[130px] animate-pulse">
          <div className="h-[3px] bg-white/30 rounded-t-2xl" />
        </div>
      ))}
    </div>
  )
}

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
      <div className="glass rounded-2xl h-[300px] animate-pulse" />
      <div className="glass rounded-2xl h-[300px] animate-pulse" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="glass rounded-2xl h-[360px] animate-pulse" />
  )
}

// ── Page ─────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="space-y-7">

      {/* Header statique — s'affiche immédiatement */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            Dashboard SAV
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Vue d&apos;ensemble</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <CurrentMonth />
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full glass font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Base connectée
        </span>
      </div>

      {/* KPIs */}
      <Suspense fallback={<KPISkeleton />}>
        <KPISection />
      </Suspense>

      {/* Graphiques */}
      <Suspense fallback={<ChartsSkeleton />}>
        <ChartsSection />
      </Suspense>

      {/* Table */}
      <Suspense fallback={<TableSkeleton />}>
        <TableSection />
      </Suspense>

    </div>
  )
}
