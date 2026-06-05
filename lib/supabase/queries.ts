import { createClient } from '@/lib/supabase/server'
import type {
  Escalation,
  Conversation,
  DashboardStats,
  TimelinePoint,
  StatusDistribution,
  CategoryDistribution,
  Profile,
} from '@/lib/types/sav'

const DEFAULT_STATS: DashboardStats = {
  total_this_month:     0,
  total_last_month:     0,
  pending_count:        0,
  in_progress_count:    0,
  resolved_count:       0,
  closed_count:         0,
  avg_resolution_hours: 0,
  resolution_rate:      0,
  active_conversations: 0,
}

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0, high: 1, medium: 2, low: 3,
}

// ── Dashboard stats ───────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_dashboard_stats')
  if (error) { console.error('[getDashboardStats]', error.message); return DEFAULT_STATS }
  return (data ?? DEFAULT_STATS) as DashboardStats
}

export async function getEscalationsTimeline(): Promise<TimelinePoint[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_escalations_timeline')
  if (error) { console.error('[getEscalationsTimeline]', error.message); return [] }
  return (data ?? []).map((r: { date: string; label: string; count: number }) => ({
    date: r.date, label: r.label, count: Number(r.count),
  }))
}

export async function getStatusDistribution(): Promise<StatusDistribution[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_status_distribution')
  if (error) { console.error('[getStatusDistribution]', error.message); return [] }
  return (data ?? []).map((r: { status: string; label: string; count: number; color: string }) => ({
    status: r.status, label: r.label, count: Number(r.count), color: r.color,
  }))
}

export async function getCategoryDistribution(): Promise<CategoryDistribution[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_category_distribution')
  if (error) { console.error('[getCategoryDistribution]', error.message); return [] }
  return (data ?? []).map((r: { category: string; label: string; count: number }) => ({
    category: r.category, label: r.label, count: Number(r.count),
  }))
}

export async function getRecentEscalations(limit = 10): Promise<Escalation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('human_escalations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('[getRecentEscalations]', error.message); return [] }
  return (data ?? []) as Escalation[]
}

// ── Sidebar badge ─────────────────────────────────────────────

export async function getPendingCount(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('pending_escalations')
    .select('*', { count: 'exact', head: true })
  if (!error && count !== null) return count
  // fallback
  const { count: c2 } = await supabase
    .from('human_escalations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  return c2 ?? 0
}

// ── Page "Besoin humain" avec filtres ─────────────────────────

export interface EscalationFilters {
  status?:   string   // 'all' | 'pending' | 'in_progress' | 'resolved' | 'closed'
  sort?:     string   // 'newest' | 'oldest' | 'priority'
  channel?:  string
  priority?: string   // 'all' | 'urgent' | 'high' | 'medium' | 'low'
  category?: string
  client?:   string   // contact_name search
}

export async function getDistinctEscalationValues(): Promise<{
  channels:   string[]
  categories: string[]
}> {
  const supabase = await createClient()
  const [chRes, catRes] = await Promise.all([
    supabase.from('human_escalations').select('channel').not('channel', 'is', null),
    supabase.from('human_escalations').select('category').not('category', 'is', null),
  ])
  const channels   = [...new Set((chRes.data  ?? []).map((r: { channel:  string }) => r.channel).filter(Boolean))].sort() as string[]
  const categories = [...new Set((catRes.data ?? []).map((r: { category: string }) => r.category).filter(Boolean))].sort() as string[]
  return { channels, categories }
}

export async function getFilteredEscalations(
  filters: EscalationFilters = {}
): Promise<{ items: Escalation[]; error: string | null }> {
  const supabase = await createClient()

  let query = supabase.from('human_escalations').select('*')

  // Filtre statut
  const { status } = filters
  if (!status || status === 'all') {
    const { data: pendingView } = await supabase
      .from('pending_escalations')
      .select('id')
    const ids = (pendingView ?? []).map((r: { id: number }) => Number(r.id))

    if (ids.length > 0) {
      query = query.or(`id.in.(${ids.join(',')}),status.eq.in_progress`)
    } else {
      query = query.or('status.eq.pending,status.eq.in_progress')
    }
  } else if (status === 'pending') {
    query = query.eq('status', 'pending')
  } else if (status === 'in_progress') {
    query = query.eq('status', 'in_progress')
  } else if (status === 'resolved') {
    query = query.eq('status', 'resolved')
  } else if (status === 'closed') {
    query = query.eq('status', 'closed')
  }

  // Filtre canal
  if (filters.channel && filters.channel !== 'all') {
    query = query.ilike('channel', filters.channel)
  }

  // Filtre urgence
  if (filters.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority)
  }

  // Filtre catégorie
  if (filters.category && filters.category !== 'all') {
    query = query.ilike('category', filters.category)
  }

  // Recherche client
  if (filters.client) {
    query = query.ilike('contact_name', `%${filters.client}%`)
  }

  // Tri
  if (filters.sort === 'oldest') {
    query = query.order('created_at', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    console.error('[getFilteredEscalations]', error.message)
    return { items: [], error: error.message }
  }

  let items = (data ?? []) as Escalation[]

  if (filters.sort === 'priority') {
    items = items.sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority ?? 'zzz'] ?? 99) -
        (PRIORITY_ORDER[b.priority ?? 'zzz'] ?? 99)
    )
  }

  return { items, error: null }
}

// ── Conversations filtrées ────────────────────────────────────

export interface ConversationFilters {
  channel?: string
  status?:  string   // 'all' | 'active' | 'closed' | 'resolved'
  sort?:    string   // 'newest' | 'oldest'
  client?:  string   // contact_name search
}

export async function getDistinctConversationChannels(): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('conversations').select('channel').not('channel', 'is', null)
  return [...new Set((data ?? []).map((r: { channel: string }) => r.channel).filter(Boolean))].sort() as string[]
}

export async function getFilteredConversations(
  filters: ConversationFilters = {}
): Promise<{ items: Conversation[]; error: string | null }> {
  const supabase = await createClient()

  let query = supabase.from('conversations').select('*')

  if (filters.channel && filters.channel !== 'all') {
    query = query.ilike('channel', filters.channel)
  }

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.client) {
    query = query.ilike('contact_name', `%${filters.client}%`)
  }

  if (filters.sort === 'oldest') {
    query = query.order('last_message_at', { ascending: true,  nullsFirst: false })
  } else {
    query = query.order('last_message_at', { ascending: false, nullsFirst: false })
  }

  const { data, error } = await query
  if (error) {
    console.error('[getFilteredConversations]', error.message)
    return { items: [], error: error.message }
  }
  return { items: (data ?? []) as Conversation[], error: null }
}

// ── Profil utilisateur courant ────────────────────────────────

export async function getCurrentUserProfile(): Promise<{
  user:    { id: string; email: string; created_at: string } | null
  profile: Profile | null
  error:   string | null
}> {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { user: null, profile: null, error: authErr?.message ?? 'Non authentifié' }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) { console.error('[getCurrentUserProfile]', error.message) }

  return {
    user:    { id: user.id, email: user.email ?? '', created_at: user.created_at },
    profile: (data ?? null) as Profile | null,
    error:   null,
  }
}

// ── KPIs supplémentaires ──────────────────────────────────────

export async function getAvgResolutionHours(): Promise<number> {
  const supabase = await createClient()
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('human_escalations')
    .select('created_at, updated_at')
    .in('status', ['resolved', 'closed'])
    .gte('created_at', start.toISOString())

  if (error || !data || data.length === 0) return 0

  const hours = data
    .map(r => (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 3_600_000)
    .filter(h => h > 0)

  if (hours.length === 0) return 0
  return Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10
}

export async function getUrgentCount(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('human_escalations')
    .select('*', { count: 'exact', head: true })
    .eq('priority', 'urgent')
    .in('status', ['pending', 'in_progress'])
  if (error) { console.error('[getUrgentCount]', error.message); return 0 }
  return count ?? 0
}

export async function getAutomationRate(): Promise<number> {
  const supabase = await createClient()
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)

  const [{ count: totalConv }, { count: escalated }] = await Promise.all([
    supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start.toISOString()),
    supabase
      .from('human_escalations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start.toISOString()),
  ])

  if (!totalConv || totalConv === 0) return 0
  const automated = totalConv - (escalated ?? 0)
  return Math.round(Math.max(0, (automated / totalConv) * 100))
}

// ── Toutes les conversations ──────────────────────────────────

export async function getAllConversations(): Promise<Conversation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false })
  if (error) { console.error('[getAllConversations]', error.message); return [] }
  return (data ?? []) as Conversation[]
}

export async function getConversationById(
  id: string
): Promise<{ conversation: Conversation | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single()
  if (error) { console.error('[getConversationById]', error.message); return { conversation: null, error: error.message } }
  return { conversation: data as Conversation, error: null }
}

// ── Détail d'une escalade ─────────────────────────────────────

export async function getEscalationById(
  id: number
): Promise<{ escalation: Escalation | null; conversation: Conversation | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('human_escalations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[getEscalationById]', error.message)
    return { escalation: null, conversation: null, error: error.message }
  }

  const escalation = data as Escalation

  // Chercher la conversation associée via contact_id
  let conversation: Conversation | null = null
  if (escalation.contact_id) {
    const { data: convData } = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', escalation.contact_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    conversation = convData as Conversation | null
  }

  return { escalation, conversation, error: null }
}
