import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Client `service_role`, réservé aux routes serveur. La clé contourne
 * entièrement RLS : elle ne doit jamais être exposée via `next.config.ts` ni
 * préfixée `NEXT_PUBLIC_`.
 *
 * Renvoie `null` quand `SUPABASE_SERVICE_ROLE_KEY` n'est pas configurée —
 * l'appelant retombe alors sur le client de session, qui suffit dès que les
 * policies du bucket `agent-attachments` sont en place (voir la migration
 * `supabase/migrations/*_agent_attachments_bucket.sql`).
 */
export function createAdminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null

  return createSupabaseClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
