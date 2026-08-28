import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAllowedMediaUrl } from '@/lib/media'

const TIMEOUT_MS = 15_000

/** Types servis tels quels et affichables dans l'onglet ; le reste est téléchargé. */
const INLINE_TYPES = [/^image\//, /^audio\//, /^video\//, /^application\/pdf\b/]

const EXTENSIONS: Record<string, string> = {
  'image/jpeg':      'jpg',
  'image/png':       'png',
  'image/gif':       'gif',
  'image/webp':      'webp',
  'application/pdf': 'pdf',
  'audio/ogg':       'ogg',
  'audio/mpeg':      'mp3',
  'video/mp4':       'mp4',
}

/**
 * L'URL Twilio contient l'Account SID (/Accounts/ACxxx/…) : on ne journalise
 * que l'hôte et l'identifiant du média.
 */
function redact(raw: string): string {
  try {
    const { hostname, pathname } = new URL(raw)
    return `${hostname}/…/${pathname.split('/').filter(Boolean).pop() ?? ''}`
  } catch {
    return 'url invalide'
  }
}

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Relais authentifié pour les médias Twilio : les URLs stockées dans
 * `conversations.attachments` exigent une Basic Auth qui ne doit jamais
 * atteindre le navigateur.
 */
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url')

  if (!target) return fail('Paramètre "url" manquant', 400)
  if (!isAllowedMediaUrl(target)) return fail('URL non autorisée', 400)

  // Le média appartient à un client : réservé aux utilisateurs connectés.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('Non authentifié', 401)

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) {
    console.error('[media] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN non configurés')
    return fail('Proxy média non configuré', 500)
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  let upstream: Response
  try {
    upstream = await fetch(target, {
      headers: { Authorization: `Basic ${credentials}` },
      // Twilio redirige vers un CDN signé ; fetch retire l'en-tête
      // Authorization lors d'une redirection cross-origin.
      redirect: 'follow',
      cache:    'no-store',
      signal:   AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    const timedOut = name === 'TimeoutError' || name === 'AbortError'
    console.error('[media]', timedOut ? 'timeout' : 'échec réseau', redact(target))
    return fail(timedOut ? 'Délai dépassé' : 'Média inaccessible', timedOut ? 504 : 502)
  }

  if (!upstream.ok || !upstream.body) {
    console.error('[media] réponse Twilio', upstream.status, redact(target))
    if (upstream.status === 401 || upstream.status === 403) {
      return fail('Authentification Twilio refusée', 502)
    }
    if (upstream.status === 404) return fail('Média introuvable', 404)
    return fail('Média inaccessible', 502)
  }

  const upstreamType = upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? ''
  const inline = INLINE_TYPES.some(re => re.test(upstreamType))

  // Un type inattendu (text/html…) servi depuis notre origine serait exécutable :
  // il est neutralisé en téléchargement binaire.
  const contentType = inline ? upstreamType : 'application/octet-stream'
  const mediaId = (new URL(target).pathname.split('/').filter(Boolean).pop() ?? 'media')
    .replace(/[^A-Za-z0-9._-]/g, '')
  const filename = `${mediaId || 'media'}.${EXTENSIONS[upstreamType] ?? 'bin'}`

  // Pas de Content-Length repris de Twilio : fetch décompresse le corps, la
  // taille annoncée en amont ne correspondrait plus à ce qu'on renvoie.
  const headers = new Headers({
    'Content-Type':           contentType,
    'Content-Disposition':    `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
    'X-Content-Type-Options': 'nosniff',
    // Média immuable, mais lié à un utilisateur authentifié : jamais de cache partagé.
    'Cache-Control':          'private, max-age=3600, immutable',
  })

  return new NextResponse(upstream.body, { status: 200, headers })
}
