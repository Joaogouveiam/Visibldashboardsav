import { MessageCircle, Mail, Instagram } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Présentation d'un canal, partagée entre le rendu serveur du détail de
 * conversation et la vue chat côté client. Aucun hook ici : le module est
 * importable des deux côtés.
 */

export function channelLabel(channel: string): string {
  const lower = (channel ?? '').toLowerCase()
  if (lower === 'whatsapp')  return 'WhatsApp'
  if (lower === 'email')     return 'Email'
  if (lower === 'instagram') return 'Instagram'
  return channel || 'Inconnu'
}

export function channelColor(channel: string): string {
  const lower = (channel ?? '').toLowerCase()
  if (lower === 'whatsapp')  return 'bg-green-100/80 text-green-700 border-green-200/60 dark:bg-green-900/30 dark:text-green-300'
  if (lower === 'email')     return 'bg-blue-100/80 text-blue-700 border-blue-200/60 dark:bg-blue-900/30 dark:text-blue-300'
  if (lower === 'instagram') return 'bg-purple-100/80 text-purple-700 border-purple-200/60 dark:bg-purple-900/30 dark:text-purple-300'
  return 'bg-slate-100/80 text-slate-600 border-slate-200/60'
}

export function ChannelIcon({ channel, size = 12 }: { channel: string; size?: number }) {
  const lower = (channel ?? '').toLowerCase()
  if (lower === 'whatsapp')  return <MessageCircle size={size} />
  if (lower === 'email')     return <Mail size={size} />
  if (lower === 'instagram') return <Instagram size={size} />
  return null
}

export function ChannelTag({ channel, className }: { channel: string; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg font-medium border',
      channelColor(channel),
      className,
    )}>
      <ChannelIcon channel={channel} />
      {channelLabel(channel)}
    </span>
  )
}
