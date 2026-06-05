'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { TopBar } from './topbar'
import { RealtimeEscalationWatcher } from './realtime-escalation-watcher'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen">
      <RealtimeEscalationWatcher />
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-10 bg-black/50 transition-opacity duration-300 md:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setOpen(false)}
      />

      <div className="md:ml-60 flex flex-col min-h-screen">
        <TopBar onMenuClick={() => setOpen(true)} />
        <main className="flex-1 p-4 md:p-6 max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  )
}
