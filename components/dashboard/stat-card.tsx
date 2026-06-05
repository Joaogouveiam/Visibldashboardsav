import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: number
  trendLabel?: string
  accent?: 'indigo' | 'amber' | 'green' | 'red' | 'purple' | 'sky'
  icon?: LucideIcon
}

const accentConfig = {
  indigo: {
    topBar:    'from-indigo-500 to-violet-500',
    iconBg:    'bg-gradient-to-br from-indigo-500 to-violet-600',
    iconShadow:'shadow-indigo-300/40',
    value:     'text-indigo-700 dark:text-indigo-300',
    tint:      'from-indigo-50/50',
  },
  amber: {
    topBar:    'from-amber-400 to-orange-400',
    iconBg:    'bg-gradient-to-br from-amber-400 to-orange-500',
    iconShadow:'shadow-amber-300/40',
    value:     'text-amber-700 dark:text-amber-300',
    tint:      'from-amber-50/50',
  },
  green: {
    topBar:    'from-emerald-400 to-teal-500',
    iconBg:    'bg-gradient-to-br from-emerald-400 to-teal-500',
    iconShadow:'shadow-emerald-300/40',
    value:     'text-emerald-700 dark:text-emerald-300',
    tint:      'from-emerald-50/50',
  },
  red: {
    topBar:    'from-red-400 to-rose-500',
    iconBg:    'bg-gradient-to-br from-red-400 to-rose-500',
    iconShadow:'shadow-red-300/40',
    value:     'text-red-700 dark:text-red-300',
    tint:      'from-red-50/50',
  },
  purple: {
    topBar:    'from-purple-500 to-pink-500',
    iconBg:    'bg-gradient-to-br from-purple-500 to-pink-500',
    iconShadow:'shadow-purple-300/40',
    value:     'text-purple-700 dark:text-purple-300',
    tint:      'from-purple-50/50',
  },
  sky: {
    topBar:    'from-sky-400 to-cyan-500',
    iconBg:    'bg-gradient-to-br from-sky-400 to-cyan-500',
    iconShadow:'shadow-sky-300/40',
    value:     'text-sky-700 dark:text-sky-300',
    tint:      'from-sky-50/50',
  },
}

export function StatCard({ title, value, subtitle, trend, trendLabel, accent, icon: Icon }: StatCardProps) {
  const trendPos = trend !== undefined && trend > 0
  const trendNeg = trend !== undefined && trend < 0
  const cfg      = accent ? accentConfig[accent] : null

  return (
    <div className="relative glass rounded-2xl overflow-hidden flex flex-col hover:-translate-y-0.5 hover:shadow-2xl transition-all duration-200 group">
      {/* Gradient top bar */}
      {cfg ? (
        <div className={cn('h-[3px] bg-gradient-to-r w-full shrink-0', cfg.topBar)} />
      ) : (
        <div className="h-[3px] bg-gradient-to-r from-slate-300 to-slate-400 w-full shrink-0" />
      )}

      {/* Subtle tint overlay */}
      {cfg && (
        <div className={cn('absolute inset-0 bg-gradient-to-br to-transparent opacity-30 pointer-events-none', cfg.tint)} />
      )}

      <div className="p-5 relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-medium text-foreground/55 leading-tight tracking-wide">{title}</p>
          {Icon && cfg && (
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md',
              cfg.iconBg, cfg.iconShadow
            )}>
              <Icon size={16} className="text-white" />
            </div>
          )}
          {Icon && !cfg && (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-100/80 text-slate-500">
              <Icon size={16} />
            </div>
          )}
        </div>

        <p className={cn(
          'text-[1.75rem] sm:text-[2.25rem] font-extrabold tracking-tight leading-none',
          cfg ? cfg.value : 'text-foreground'
        )}>
          {value}
        </p>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground h-4">
          {trend !== undefined && (
            <>
              {trendPos && <TrendingUp  size={12} className="text-emerald-500 shrink-0" />}
              {trendNeg && <TrendingDown size={12} className="text-red-500 shrink-0" />}
              {!trendPos && !trendNeg && <Minus size={12} className="shrink-0" />}
              <span className={cn(
                'font-semibold',
                trendPos && 'text-emerald-600',
                trendNeg && 'text-red-500'
              )}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            </>
          )}
          {trendLabel && <span>{trendLabel}</span>}
          {subtitle && !trendLabel && <span>{subtitle}</span>}
        </div>
      </div>
    </div>
  )
}
