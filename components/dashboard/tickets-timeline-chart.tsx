'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { TimelinePoint } from '@/lib/types/sav'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl px-3.5 py-2.5 text-sm shadow-xl">
        <p className="font-semibold text-foreground capitalize text-xs mb-1">{label}</p>
        <p className="text-muted-foreground text-xs">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold text-base">
            {payload[0].value}
          </span>
          {' '}escalade{Number(payload[0].value) > 1 ? 's' : ''}
        </p>
      </div>
    )
  }
  return null
}

export function TicketsTimelineChart({ data }: { data: TimelinePoint[] }) {
  const chartData = data.map(d => ({ ...d, name: d.label }))
  const maxVal    = Math.max(...chartData.map(d => d.count), 1)

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-foreground">Activité sur 30 jours</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Escalades créées par jour</p>
        </div>
        <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
          {chartData.reduce((s, d) => s + d.count, 0)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-indigo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(100,80,230,0.08)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
            tickLine={false} axisLine={false} interval={5}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false} axisLine={false} allowDecimals={false}
            domain={[0, maxVal + 1]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone" dataKey="count"
            stroke="#6366f1" strokeWidth={2.5}
            fill="url(#grad-indigo)"
            dot={false}
            activeDot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
