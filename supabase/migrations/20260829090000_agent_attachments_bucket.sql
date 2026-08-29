-- Bucket des pièces jointes envoyées par l'agent humain depuis le dashboard.
--
-- Public : Twilio doit pouvoir télécharger le média depuis l'URL transmise
-- dans `mediaUrl`, sans en-tête d'authentification. Les chemins contiennent un
-- timestamp et l'UUID de la conversation, donc ne sont pas énumérables.
--
-- `file_size_limit` est le seul garde-fou dur sur la taille : l'upload se fait
-- en direct navigateur → Storage via URL signée, les octets ne transitent pas
-- par Next.js. 25 Mo = plafond du canal email (WhatsApp est bridé à 16 Mo
-- côté application, cf. lib/reply.ts).

insert into storage.buckets (id, name, public, file_size_limit)
values ('agent-attachments', 'agent-attachments', true, 26214400)
on conflict (id) do update
  set public          = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- Les agents connectés au dashboard déposent et relisent les PJ. La lecture
-- anonyme (Twilio, Gmail) passe par l'endpoint public du bucket, qui ne
-- dépend pas de ces policies.

drop policy if exists "agent_attachments_insert" on storage.objects;
create policy "agent_attachments_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'agent-attachments');

drop policy if exists "agent_attachments_select" on storage.objects;
create policy "agent_attachments_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'agent-attachments');
