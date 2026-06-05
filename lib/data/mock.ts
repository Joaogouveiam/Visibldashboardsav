// Données de démonstration — conservées pour référence
// Le dashboard utilise désormais les vraies données Supabase (lib/supabase/queries.ts)
import type {
  Escalation,
  DashboardStats,
  TimelinePoint,
  StatusDistribution,
  CategoryDistribution,
} from '@/lib/types/sav'

export const mockStats: DashboardStats = {
  total_this_month:     156,
  total_last_month:     132,
  pending_count:        32,
  in_progress_count:    45,
  resolved_count:       68,
  closed_count:         11,
  avg_resolution_hours: 4.2,
  resolution_rate:      78.2,
  active_conversations: 24,
}

export const mockTimeline: TimelinePoint[] = [
  { date: '2026-04-20', label: '20 avr', count: 2 },
  { date: '2026-04-21', label: '21 avr', count: 6 },
  { date: '2026-04-22', label: '22 avr', count: 8 },
  { date: '2026-04-23', label: '23 avr', count: 7 },
  { date: '2026-04-27', label: '27 avr', count: 6 },
  { date: '2026-04-28', label: '28 avr', count: 3 },
  { date: '2026-04-29', label: '29 avr', count: 7 },
  { date: '2026-04-30', label: '30 avr', count: 5 },
  { date: '2026-05-01', label: '1 mai',  count: 4 },
  { date: '2026-05-07', label: '7 mai',  count: 9 },
  { date: '2026-05-08', label: '8 mai',  count: 6 },
  { date: '2026-05-15', label: '15 mai', count: 9 },
  { date: '2026-05-16', label: '16 mai', count: 5 },
]

export const mockStatusDistribution: StatusDistribution[] = [
  { status: 'pending',     label: 'En attente', count: 32, color: '#6366f1' },
  { status: 'in_progress', label: 'En cours',   count: 45, color: '#f59e0b' },
  { status: 'resolved',    label: 'Résolu',     count: 68, color: '#10b981' },
  { status: 'closed',      label: 'Fermé',      count: 11, color: '#64748b' },
]

export const mockCategoryDistribution: CategoryDistribution[] = [
  { category: 'produit',       label: 'Produit',       count: 48 },
  { category: 'livraison',     label: 'Livraison',     count: 31 },
  { category: 'remboursement', label: 'Remboursement', count: 27 },
  { category: 'technique',     label: 'Technique',     count: 22 },
  { category: 'garantie',      label: 'Garantie',      count: 18 },
  { category: 'autre',         label: 'Autre',         count: 10 },
]

export const mockRecentEscalations: Escalation[] = [
  {
    id:               1,
    contact_name:     'Marie Dupont',
    contact_id:       'wa_33612345678',
    category:         'produit',
    priority:         'high',
    summary:          'Écran fissuré à réception — emballage intact',
    original_message: 'Bonjour, j\'ai reçu mon colis et l\'écran est cassé.',
    agent_response:   null,
    status:           'pending',
    channel:          'whatsapp',
    mail_id:          null,
    history:          null,
    created_at:       '2026-05-16T09:14:00',
    updated_at:       '2026-05-16T09:14:00',
  },
]
