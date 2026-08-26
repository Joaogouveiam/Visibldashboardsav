'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
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

      {/* Sans la barre du haut, c'est le seul accès à la sidebar sur mobile */}
      <button
        className="glass md:hidden fixed top-3 left-3 z-20 w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu size={16} />
      </button>

      <div className="md:ml-60 flex flex-col min-h-screen">
        <main className="flex-1 px-4 md:px-6 pb-4 md:pb-6 pt-16 md:pt-6 max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  )
}
