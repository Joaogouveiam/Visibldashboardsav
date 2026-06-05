'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { StatusDistribution } from '@/lib/types/sav'

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl px-3.5 py-2.5 text-sm shadow-xl">
        <p className="font-semibold text-xs" style={{ color: payload[0].payload.color }}>
          {payload[0].payload.label}
        </p>
        <p className="text-muted-foreground text-xs mt-0.5">
          <span className="font-bold text-foreground">{payload[0].value}</span> ticket{Number(payload[0].value) > 1 ? 's' : ''}
        </p>
      </div>
    )
  }
  return null
}

export function TicketsStatusChart({ data }: { data: StatusDistribution[] }) {
  const total   = data.reduce((s, d) => s + d.count, 0)
  const hasData = total > 0

  return (
    <div className="glass rounded-2xl p-5 flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-foreground">Statuts</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Distribution actuelle</p>
      </div>

      {/* Donut */}
      <div className="relative flex-1 flex items-center justify-center min-h-[160px]">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={hasData ? data : [{ label: 'Vide', count: 1, color: '#e2e8f0', status: 'empty' }]}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={hasData ? 3 : 0}
              dataKey="count"
              strokeWidth={0}
            >
              {(hasData ? data : [{ color: '#e2e8f0', status: 'empty', label: '', count: 1 }]).map(entry => (
                <Cell key={entry.status} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-extrabold text-foreground">{total}</p>
          <p className="text-[10px] text-muted-foreground font-medium">total</p>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 mt-2">
        {data.map(item => (
          <div key={item.status} className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-muted-foreground flex-1">{item.label}</span>
            <span className="text-xs font-bold text-foreground tabular-nums">{item.count}</span>
            <span className="text-[11px] text-muted-foreground/60 w-8 text-right tabular-nums">
              {total > 0 ? Math.round((item.count / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
