'use client'

import { useState, useTransition } from 'react'
import { useTheme } from 'next-themes'
import {
  Settings, User, Palette, Radio, Database,
  MessageCircle, Mail, Sun, Moon, Monitor,
  Check, ChevronRight, LogOut, Shield, Zap, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateProfile } from '@/lib/supabase/actions'
import type { Profile } from '@/lib/types/sav'

// ── Toggle switch ─────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40',
        checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
      )}
    >
      <span className={cn(
        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200',
        checked ? 'translate-x-4' : 'translate-x-0'
      )} />
    </button>
  )
}

// ── Section wrapper ───────────────────────────────────────────

function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/40 dark:border-white/[0.06]">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="divide-y divide-white/30 dark:divide-white/[0.05]">{children}</div>
    </div>
  )
}

function Row({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ── Canal status ──────────────────────────────────────────────

function ChannelStatus({ connected, since }: { connected: boolean; since?: string }) {
  return (
    <div className="flex items-center gap-3">
      {since && connected && (
        <span className="text-xs text-muted-foreground hidden sm:block">depuis {since}</span>
      )}
      <span className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl border',
        connected
          ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'bg-slate-100/80 text-slate-500 border-slate-200/60 dark:bg-slate-800/60 dark:text-slate-400'
      )}>
        <span className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400')} />
        {connected ? 'Connecté' : 'Non connecté'}
      </span>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(d))
}

const GRADIENTS = [
  'from-violet-400 to-purple-500', 'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
]
function avatarGrad(n: string | null) {
  if (!n) return GRADIENTS[0]
  return GRADIENTS[n.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length]
}
function initials(n: string | null) {
  if (!n) return '?'
  return n.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase()
}

const ROLE_LABELS: Record<string, string> = { admin: 'Administrateur', agent: 'Agent SAV', viewer: 'Observateur' }

// ── Nav sections ──────────────────────────────────────────────

const SECTIONS = [
  { id: 'profil',    label: 'Profil',    icon: User     },
  { id: 'apparence', label: 'Apparence', icon: Palette  },
  { id: 'canaux',    label: 'Canaux',    icon: Radio    },
  { id: 'donnees',   label: 'Données',   icon: Database },
  { id: 'compte',    label: 'Compte',    icon: Shield   },
]

// ── Props ─────────────────────────────────────────────────────

interface Props {
  authUser: { id: string; email: string; created_at: string }
  profile:  Profile | null
}

// ── Client component ──────────────────────────────────────────

export function ParametresClient({ authUser, profile }: Props) {
  const { theme, setTheme } = useTheme()
  const [active, setActive] = useState('profil')
  const [isPending, startTransition] = useTransition()

  // Profil — état local initialisé depuis la DB
  const [nom,   setNom]   = useState(profile?.full_name ?? '')
  const [role,  setRole]  = useState<Profile['role']>(profile?.role ?? 'agent')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Apparence
  const [animations, setAnimations] = useState(true)

  function handleSaveProfil() {
    setSaveError(null)
    startTransition(async () => {
      const result = await updateProfile({ full_name: nom, role: role as Profile['role'] })
      if (result.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        setSaveError(result.error ?? 'Erreur inconnue')
      }
    })
  }

  const displayName = nom || (profile?.full_name ?? null)
  const grad        = avatarGrad(displayName)
  const inits       = initials(displayName)
  const roleLabel = ROLE_LABELS[role] ?? role

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg shadow-slate-500/25">
          <Settings size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configuration du dashboard SAV</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">

        {/* Sidebar nav */}
        <nav className="glass rounded-2xl p-2 h-fit">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active === id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/[0.05]'
              )}
            >
              <Icon size={15} className={cn('shrink-0', active === id ? 'text-white/80' : 'text-muted-foreground/60')} />
              {label}
              {active === id && <ChevronRight size={13} className="ml-auto" />}
            </button>
          ))}
        </nav>

        {/* Contenu */}
        <div className="space-y-4 min-w-0">

          {/* ── Profil ── */}
          {active === 'profil' && (
            <div className="space-y-4">
              <Section title="Profil utilisateur" description="Vos informations enregistrées dans la base">

                {/* Avatar + résumé */}
                <div className="px-6 py-5 flex items-center gap-5">
                  <div className={cn(
                    'w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-xl font-bold shadow-lg shrink-0',
                    grad
                  )}>
                    {inits}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">{nom || '—'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{authUser.email}</p>
                    <span className="inline-flex items-center gap-1 mt-2 text-[11px] px-2 py-0.5 rounded-lg bg-indigo-100/80 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-300 font-semibold">
                      <Zap size={9} />
                      {roleLabel}
                    </span>
                  </div>
                </div>

                {/* Champs */}
                <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide">
                      Nom complet
                    </label>
                    <input
                      value={nom}
                      onChange={e => setNom(e.target.value)}
                      placeholder="Votre nom"
                      className="w-full h-9 px-3 text-sm rounded-xl border border-white/60 dark:border-white/10 bg-white/50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide">
                      Email
                    </label>
                    <input
                      value={authUser.email}
                      readOnly
                      className="w-full h-9 px-3 text-sm rounded-xl border border-white/40 dark:border-white/[0.06] bg-white/20 dark:bg-white/[0.02] text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide">
                      Rôle
                    </label>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value as Profile['role'])}
                      className="w-full h-9 px-3 text-sm rounded-xl border border-white/60 dark:border-white/10 bg-white/50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                    >
                      <option value="agent">Agent SAV</option>
                      <option value="viewer">Observateur</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide">
                      Membre depuis
                    </label>
                    <input
                      value={formatDate(authUser.created_at)}
                      readOnly
                      className="w-full h-9 px-3 text-sm rounded-xl border border-white/40 dark:border-white/[0.06] bg-white/20 dark:bg-white/[0.02] text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                </div>
              </Section>

              {saveError && (
                <p className="text-xs text-red-600 dark:text-red-400 px-1">{saveError}</p>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSaveProfil}
                  disabled={isPending}
                  className={cn(
                    'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md disabled:opacity-60',
                    saved
                      ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/25'
                  )}
                >
                  {saved ? <><Check size={14} /> Enregistré</> : isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          {/* ── Apparence ── */}
          {active === 'apparence' && (
            <div className="space-y-4">
              <Section title="Thème" description="Apparence du dashboard">
                <div className="px-6 py-5">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light',  label: 'Clair',   icon: Sun     },
                      { value: 'dark',   label: 'Sombre',  icon: Moon    },
                      { value: 'system', label: 'Système', icon: Monitor },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setTheme(value)}
                        className={cn(
                          'flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all duration-150 font-medium text-sm',
                          theme === value
                            ? 'border-indigo-500 bg-indigo-50/80 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 shadow-md shadow-indigo-500/15'
                            : 'border-white/50 dark:border-white/10 bg-white/30 dark:bg-white/5 text-muted-foreground hover:border-indigo-300 hover:text-foreground'
                        )}
                      >
                        <Icon size={20} />
                        {label}
                        {theme === value && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              </Section>

              <Section title="Affichage" description="Préférences visuelles">
                <Row label="Animations" description="Transitions et effets de survol">
                  <Toggle checked={animations} onChange={setAnimations} />
                </Row>
                <Row label="Nombres formatés" description="Afficher 1 000 au lieu de 1000">
                  <Toggle checked={true} onChange={() => {}} />
                </Row>
              </Section>
            </div>
          )}

          {/* ── Canaux ── */}
          {active === 'canaux' && (
            <div className="space-y-4">
              <Section title="Canaux connectés" description="Intégrations actives de messagerie">
                <Row label="WhatsApp Business" description="Conversations entrantes via WhatsApp">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <MessageCircle size={15} className="text-green-600 dark:text-green-400" />
                    </div>
                    <ChannelStatus connected={true} since="jan. 2025" />
                  </div>
                </Row>
                <Row label="Email" description="Tickets entrants par email">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Mail size={15} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <ChannelStatus connected={true} since="jan. 2025" />
                  </div>
                </Row>
              </Section>

              <div className="glass rounded-2xl px-5 py-4 flex items-start gap-3">
                <Radio size={15} className="text-muted-foreground/60 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  La configuration des canaux se fait depuis votre compte n8n.
                  Ces informations sont en lecture seule.
                </p>
              </div>
            </div>
          )}

          {/* ── Données ── */}
          {active === 'donnees' && (
            <div className="space-y-4">
              <Section title="Base de données" description="Connexion Supabase">
                <Row label="Statut" description="Connexion à la base de données">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-emerald-100/80 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connectée
                  </span>
                </Row>
                <Row label="Provider" description="Infrastructure">
                  <span className="text-sm font-mono text-muted-foreground">Supabase (PostgreSQL)</span>
                </Row>
                <Row label="Tables actives" description="Tables utilisées par le dashboard">
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {['conversations', 'human_escalations', 'profiles'].map(t => (
                      <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/10 text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                </Row>
                <Row label="Dernière sync" description="Données temps réel">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw size={12} className="text-indigo-500" />
                    Temps réel
                  </div>
                </Row>
              </Section>

              <Section title="Automatisations" description="Agents IA connectés">
                <Row label="Chatbot SAV" description="Agent de traitement des demandes clients">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-indigo-100/80 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-300">
                    <Zap size={10} />Actif
                  </span>
                </Row>
                <Row label="Escalade auto" description="Détection des besoins humains">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-indigo-100/80 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-300">
                    <Zap size={10} />Actif
                  </span>
                </Row>
              </Section>
            </div>
          )}

          {/* ── Compte ── */}
          {active === 'compte' && (
            <div className="space-y-4">
              <Section title="Informations du compte" description="Données de votre compte Supabase Auth">
                <Row label="Email" description="Identifiant de connexion">
                  <span className="text-sm font-mono text-muted-foreground">{authUser.email}</span>
                </Row>
                <Row label="Identifiant" description="UUID unique">
                  <span className="text-[11px] font-mono text-muted-foreground/70 truncate max-w-[180px] block text-right">
                    {authUser.id}
                  </span>
                </Row>
                <Row label="Membre depuis" description="Date de création du compte">
                  <span className="text-sm text-muted-foreground">{formatDate(authUser.created_at)}</span>
                </Row>
                <Row label="Rôle" description="Niveau d'accès au dashboard">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-indigo-100/80 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-300">
                    <Zap size={10} />
                    {ROLE_LABELS[profile?.role ?? 'agent'] ?? 'Agent SAV'}
                  </span>
                </Row>
              </Section>

              <Section title="Sécurité">
                <Row label="Mot de passe" description="Modifier votre mot de passe de connexion">
                  <a
                    href="/auth/update-password"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 text-foreground hover:bg-white/70 transition-colors"
                  >
                    Modifier
                  </a>
                </Row>
              </Section>

              <div className="glass rounded-2xl overflow-hidden border border-red-200/40 dark:border-red-900/30">
                <div className="px-6 py-4 border-b border-red-200/30 dark:border-red-900/20">
                  <h2 className="text-sm font-bold text-red-600 dark:text-red-400">Zone dangereuse</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Actions irréversibles</p>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Déconnexion</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Fermer la session en cours</p>
                  </div>
                  <a
                    href="/auth/login"
                    className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-red-100/80 text-red-700 border border-red-200/60 hover:bg-red-200/80 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <LogOut size={14} />
                    Se déconnecter
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
