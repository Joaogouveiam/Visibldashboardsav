'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  HeartHandshake,
  BarChart2,
  Settings,
  LogOut,
  Zap,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',               label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/dashboard/besoin-humain', label: 'Besoin humain',   icon: HeartHandshake, alert: true },
  { href: '/dashboard/statistiques',  label: 'Statistiques',    icon: BarChart2 },
  { href: '/dashboard/parametres',    label: 'Paramètres',      icon: Settings },
]

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname     = usePathname()
  const [pendingCount, setPendingCount] = useState(0)

  // Fetch côté client — évite toute donnée dynamique dans le layout serveur
  useEffect(() => {
    fetch('/api/pending-count')
      .then(r => r.json())
      .then(d => setPendingCount(d.count ?? 0))
      .catch(() => {})
  }, [pathname]) // re-fetch à chaque navigation

  return (
    <aside className={cn(
      'glass-sidebar fixed left-0 top-0 h-screen w-60 flex flex-col z-20 transition-transform duration-300 ease-in-out',
      open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    )}>

      {/* Logo */}
      <div className="h-[64px] flex items-center gap-3 px-5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
          <Zap size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[18px] font-bold tracking-tight text-white">visibl</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.08] text-white/50 font-semibold border border-white/10 tracking-widest uppercase">
            SAV
          </span>
          <button
            className="md:hidden p-1 rounded-lg text-white/40 hover:text-white/70 transition-colors"
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="mx-4 h-px bg-white/[0.07]" />

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 pb-2 flex flex-col gap-0.5">
        <p className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.12em] px-3 mb-2">
          Menu
        </p>

        {navItems.map(({ href, label, icon: Icon, alert }) => {
          const isActive  = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          const showBadge = alert && pendingCount > 0

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                isActive
                  ? 'bg-white/10 text-white border border-white/10 shadow-sm'
                  : 'text-white/45 hover:text-white/75 hover:bg-white/[0.05]'
              )}
            >
              <Icon
                size={15}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={cn(
                  'shrink-0 transition-colors',
                  isActive   ? 'text-indigo-300' : 'text-white/30',
                  showBadge && !isActive && 'text-rose-400'
                )}
              />
              <span className="flex-1 truncate">{label}</span>

              {showBadge && (
                <span className={cn(
                  'min-w-[19px] h-[19px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                  isActive
                    ? 'bg-rose-500 text-white'
                    : 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                )}>
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="mx-4 h-px bg-white/[0.07]" />

      {/* User */}
      <div className="px-3 py-4 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-md shadow-indigo-500/25">
            J
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white/80 truncate">Jean</p>
            <p className="text-[11px] text-white/30 truncate">Agent SAV</p>
          </div>
        </div>
        <Link
          href="/auth/login"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-white/30 hover:bg-white/[0.05] hover:text-white/55 transition-colors w-full"
        >
          <LogOut size={14} strokeWidth={1.8} />
          Déconnexion
        </Link>
      </div>
    </aside>
  )
}
