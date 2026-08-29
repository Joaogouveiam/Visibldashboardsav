import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fail, resolveReplyContext } from '@/lib/reply-server'
import { ATTACHMENTS_BUCKET, attachmentPath, validateFile } from '@/lib/reply'
import { mimeTypeFromName } from '@/lib/media'

/**
 * Prépare l'upload d'une pièce jointe : la route valide le fichier annoncé
 * puis renvoie une URL signée à usage unique, limitée au chemin qu'elle a
 * choisi. Le navigateur téléverse ensuite directement vers Supabase Storage.
 *
 * Pourquoi ne pas relayer les octets ? Un envoi email accepte 25 Mo, très
 * au-delà de la limite de corps d'une fonction serverless (~4,5 Mo sur
 * Vercel) : le relais casserait sur les gros fichiers.
 *
 * La taille et le type validés ici sont ceux *déclarés* par le navigateur.
 * Le garde-fou dur est le `file_size_limit` du bucket, posé par la migration ;
 * cette validation-ci sert à refuser tôt et avec un message clair.
 */
export async function POST(req: NextRequest) {
  let body: {
    conversation_id?: unknown
    escalation_id?:   unknown
    name?: unknown; type?: unknown; size?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return fail('Corps de requête invalide', 400)
  }

  const { context, error } = await resolveReplyContext(body)
  if (error) return error

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const size = typeof body.size === 'number' ? body.size : NaN
  const type = typeof body.type === 'string' ? body.type : ''

  if (!name)              return fail('Nom de fichier manquant', 400)
  if (!Number.isFinite(size) || size < 0) return fail('Taille de fichier invalide', 400)

  const invalid = validateFile({ name, type, size }, context.channel)
  if (invalid) return fail(invalid, 400)

  const path = attachmentPath(context.channel, context.storageKey, name)

  // Le client de session suffit si les policies du bucket sont en place ;
  // la clé service_role, quand elle est configurée, les court-circuite.
  const storage = (createAdminClient() ?? context.supabase).storage.from(ATTACHMENTS_BUCKET)

  const { data, error: signError } = await storage.createSignedUploadUrl(path)
  if (signError || !data) {
    console.error('[upload] création de l\'URL signée', signError?.message)
    const missingBucket = signError?.message?.toLowerCase().includes('not found')
    return fail(
      missingBucket
        ? `Bucket « ${ATTACHMENTS_BUCKET} » introuvable — appliquez la migration Storage.`
        : "Impossible de préparer l'envoi du fichier.",
      502,
    )
  }

  const { data: publicData } = storage.getPublicUrl(path)

  return NextResponse.json({
    path,
    token:    data.token,
    url:      publicData.publicUrl,
    name,
    mimeType: type || mimeTypeFromName(name) || 'application/octet-stream',
    size,
  })
}
