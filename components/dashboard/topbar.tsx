'use client'

import { useState, useEffect } from 'react'
import { Bell, Search, Menu } from 'lucide-react'

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [dateLabel, setDateLabel] = useState('')

  // new Date() uniquement côté client après hydration
  useEffect(() => {
    setDateLabel(
      new Date().toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    )
  }, [])

  return (
    <header className="glass-topbar h-[56px] sticky top-0 z-10 flex items-center justify-between px-4 md:px-6 gap-4">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
          onClick={onMenuClick}
          aria-label="Ouvrir le menu"
        >
          <Menu size={16} />
        </button>
        <p className="text-[13px] text-muted-foreground capitalize font-medium min-h-[20px] hidden sm:block">
          {dateLabel}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button className="hidden md:flex items-center gap-2 text-[12px] text-muted-foreground/60 bg-black/[0.04] dark:bg-white/[0.04] hover:bg-black/[0.07] border border-black/5 dark:border-white/5 px-3 py-1.5 rounded-xl transition-colors">
          <Search size={13} />
          <span>Rechercher…</span>
          <kbd className="text-[10px] bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded font-mono ml-2">⌘K</kbd>
        </button>

        <button className="relative hidden md:flex w-8 h-8 rounded-xl items-center justify-center text-muted-foreground/60 hover:bg-black/[0.05] transition-colors">
          <Bell size={15} strokeWidth={1.8} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow shadow-indigo-500/50" />
        </button>

        <div className="hidden md:flex w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 items-center justify-center text-white text-[12px] font-bold shadow-md shadow-indigo-200 cursor-pointer hover:scale-105 transition-transform">
          J
        </div>
      </div>
    </header>
  )
}
