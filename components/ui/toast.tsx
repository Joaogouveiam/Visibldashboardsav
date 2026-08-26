'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id:       number
  variant:  ToastVariant
  title:    string
  description?: string
  duration: number
}

type ToastInput = Omit<Toast, 'id' | 'duration'> & { duration?: number }

const ToastContext = createContext<{ toast: (t: ToastInput) => void } | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé dans un <ToastProvider>')
  return ctx
}

const VARIANTS: Record<ToastVariant, { icon: typeof CheckCircle2; ring: string; iconColor: string }> = {
  success: {
    icon: CheckCircle2,
    ring: 'border-emerald-300/60 dark:border-emerald-500/30',
    iconColor: 'text-emerald-500',
  },
  error: {
    icon: AlertCircle,
    ring: 'border-red-300/60 dark:border-red-500/30',
    iconColor: 'text-red-500',
  },
  info: {
    icon: Info,
    ring: 'border-indigo-300/60 dark:border-indigo-500/30',
    iconColor: 'text-indigo-500',
  },
}

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((input: ToastInput) => {
    const id = ++nextId
    const duration = input.duration ?? 5000
    setToasts(prev => [...prev, { ...input, id, duration }])
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
  }, [dismiss])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted && createPortal(
        <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[min(360px,calc(100vw-2.5rem))] pointer-events-none">
          {toasts.map(t => {
            const { icon: Icon, ring, iconColor } = VARIANTS[t.variant]
            return (
              <div
                key={t.id}
                role="status"
                className={cn(
                  'glass rounded-2xl px-4 py-3 flex items-start gap-3 pointer-events-auto',
                  'animate-in slide-in-from-bottom-3 fade-in duration-200 border',
                  ring
                )}
              >
                <Icon size={16} className={cn('shrink-0 mt-0.5', iconColor)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Fermer la notification"
                  className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors -mr-1 -mt-0.5 p-1"
                >
                  <X size={13} />
                </button>
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
