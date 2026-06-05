// ── Escalades (human_escalations) ────────────────────────────

export type EscalationStatus   = 'pending' | 'in_progress' | 'resolved' | 'closed'
export type EscalationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Escalation {
  id:               number
  contact_name:     string | null
  contact_id:       string | null
  category:         string | null
  priority:         string | null
  summary:          string | null
  original_message: string | null
  agent_response:   string | null
  status:           string
  channel:          string
  mail_id:          string | null
  history:          Array<{ role: string; content: string; ts?: string }> | null
  created_at:       string
  updated_at:       string
}

// ── Conversations (chatbot) ───────────────────────────────────

export interface Conversation {
  id:              string
  channel:         string
  contact_name:    string | null
  contact_id:      string | null
  history:         Array<{ role: string; content: string; ts?: string }>
  status:          string | null
  paused:          boolean | null
  last_message_at: string | null
  created_at:      string | null
}

// ── Profil utilisateur ────────────────────────────────────────

export interface Profile {
  id:         string
  full_name:  string | null
  role:       'admin' | 'agent' | 'viewer'
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// ── Stats dashboard ───────────────────────────────────────────

export interface DashboardStats {
  total_this_month:     number
  total_last_month:     number
  pending_count:        number
  in_progress_count:    number
  resolved_count:       number
  closed_count:         number
  avg_resolution_hours: number
  resolution_rate:      number
  active_conversations: number
}

export interface TimelinePoint {
  date:  string
  label: string
  count: number
}

export interface StatusDistribution {
  status: string
  label:  string
  count:  number
  color:  string
}

export interface CategoryDistribution {
  category: string
  label:    string
  count:    number
}
