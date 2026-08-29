<a href="https://demo-nextjs-with-supabase.vercel.app/">
  <img alt="Next.js and Supabase Starter Kit - the fastest way to build apps with Next.js and Supabase" src="https://demo-nextjs-with-supabase.vercel.app/opengraph-image.png">
  <h1 align="center">Next.js and Supabase Starter Kit</h1>
</a>

<p align="center">
 The fastest way to build apps with Next.js and Supabase
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#demo"><strong>Demo</strong></a> ·
  <a href="#deploy-to-vercel"><strong>Deploy to Vercel</strong></a> ·
  <a href="#clone-and-run-locally"><strong>Clone and run locally</strong></a> ·
  <a href="#feedback-and-issues"><strong>Feedback and issues</strong></a>
  <a href="#more-supabase-examples"><strong>More Examples</strong></a>
</p>
<br/>

## Features

- Works across the entire [Next.js](https://nextjs.org) stack
  - App Router
  - Pages Router
  - Proxy
  - Client
  - Server
  - It just works!
- supabase-ssr. A package to configure Supabase Auth to use cookies
- Password-based authentication block installed via the [Supabase UI Library](https://supabase.com/ui/docs/nextjs/password-based-auth)
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Components with [shadcn/ui](https://ui.shadcn.com/)
- Optional deployment with [Supabase Vercel Integration and Vercel deploy](#deploy-your-own)
  - Environment variables automatically assigned to Vercel project

## Demo

You can view a fully working demo at [demo-nextjs-with-supabase.vercel.app](https://demo-nextjs-with-supabase.vercel.app/).

## Deploy to Vercel

Vercel deployment will guide you through creating a Supabase account and project.

After installation of the Supabase integration, all relevant environment variables will be assigned to the project so the deployment is fully functioning.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&project-name=nextjs-with-supabase&repository-name=nextjs-with-supabase&demo-title=nextjs-with-supabase&demo-description=This+starter+configures+Supabase+Auth+to+use+cookies%2C+making+the+user%27s+session+available+throughout+the+entire+Next.js+app+-+Client+Components%2C+Server+Components%2C+Route+Handlers%2C+Server+Actions+and+Middleware.&demo-url=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2F&external-id=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&demo-image=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2Fopengraph-image.png)

The above will also clone the Starter kit to your GitHub, you can clone that locally and develop locally.

If you wish to just develop locally and not deploy to Vercel, [follow the steps below](#clone-and-run-locally).

## Clone and run locally

1. You'll first need a Supabase project which can be made [via the Supabase dashboard](https://database.new)

2. Create a Next.js app using the Supabase Starter template npx command

   ```bash
   npx create-next-app --example with-supabase with-supabase-app
   ```

   ```bash
   yarn create next-app --example with-supabase with-supabase-app
   ```

   ```bash
   pnpm create next-app --example with-supabase with-supabase-app
   ```

3. Use `cd` to change into the app's directory

   ```bash
   cd with-supabase-app
   ```

4. Rename `.env.example` to `.env.local` and update the following:

  ```env
  SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
  SUPABASE_PUBLISHABLE_KEY=[INSERT SUPABASE PROJECT API PUBLISHABLE OR ANON KEY]

  # Pièces jointes WhatsApp (facultatif) — voir plus bas
  TWILIO_ACCOUNT_SID=[INSERT TWILIO ACCOUNT SID]
  TWILIO_AUTH_TOKEN=[INSERT TWILIO AUTH TOKEN]

  # Envoi des réponses agent — voir « Répondre au client » plus bas
  N8N_WEBHOOK_URL=[INSERT N8N WEBHOOK URL]
  SUPABASE_SERVICE_ROLE_KEY=[FACULTATIF]
  ```
  > [!NOTE]
  > This example uses `SUPABASE_PUBLISHABLE_KEY`, which refers to Supabase's new **publishable** key format.
  > Both legacy **anon** keys and new **publishable** keys can be used with this variable name during the transition period. Supabase's dashboard may show `SUPABASE_ANON_KEY`; its value can be used in this example.
  > See the [full announcement](https://github.com/orgs/supabase/discussions/29260) for more information.

  Both `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` can be found in [your Supabase project's API settings](https://supabase.com/dashboard/project/_?showConnect=true)

  `TWILIO_ACCOUNT_SID` et `TWILIO_AUTH_TOKEN` ([console Twilio](https://console.twilio.com)) servent
  uniquement à afficher les pièces jointes WhatsApp des conversations. Les URLs stockées dans
  `conversations.attachments` exigent une Basic Auth : elles sont relayées par la route serveur
  `/api/media`, qui n'accepte que les URLs `https://api.twilio.com` et n'est ouverte qu'aux
  utilisateurs connectés. Ces identifiants ne doivent jamais être préfixés `NEXT_PUBLIC_` ni exposés
  via `next.config.ts`. Sans eux, les conversations s'affichent normalement et les pièces jointes
  tombent sur leur état d'erreur.

5. You can now run the Next.js local development server:

   ```bash
   npm run dev
   ```

   The starter kit should now be running on [localhost:3000](http://localhost:3000/).

6. This template comes with the default shadcn/ui style initialized. If you instead want other ui.shadcn styles, delete `components.json` and [re-install shadcn/ui](https://ui.shadcn.com/docs/installation/next)

> Check out [the docs for Local Development](https://supabase.com/docs/guides/getting-started/local-development) to also run Supabase locally.

## Répondre au client depuis le dashboard

Deux écrans permettent à l'agent de répondre, tous deux avec pièce jointe :

- **Besoin humain** (`/dashboard/besoin-humain/[id]`) — le panneau « Répondre au client »
  d'une escalade. Il conserve sa forme de payload historique (`escalation`, `history`,
  `agent_message`…) et y ajoute les champs de PJ ; `POST /api/send-response`.
- **Détail de conversation** (`/dashboard/statistiques/[id]`) — zone de réponse en bas du
  fil, affichée si la conversation n'est pas `closed` et que son canal est `whatsapp` ou
  `email` ; `POST /api/conversations/reply`, payload décrit ci-dessous.

Dans les deux cas l'envoi part vers le webhook n8n unique `N8N_WEBHOOK_URL` — le champ
`channel` du payload indique au workflow s'il doit router vers Twilio (WhatsApp) ou
Gmail (email).

### 1. Créer le bucket de stockage

Les pièces jointes vivent dans le bucket public `agent-attachments`. Appliquez la migration
`supabase/migrations/20260829090000_agent_attachments_bucket.sql`, soit avec la CLI
(`supabase db push`), soit en collant son contenu dans le **SQL Editor** du dashboard Supabase.
Sans ce bucket, l'ajout d'une pièce jointe échoue avec le message
« Bucket « agent-attachments » introuvable ».

Le bucket doit rester **public** : Twilio télécharge le média depuis l'URL transmise dans
`mediaUrl`, sans en-tête d'authentification.

### 2. Clé service role (facultative)

`SUPABASE_SERVICE_ROLE_KEY` n'est nécessaire que si vous ne voulez pas des policies Storage
posées par la migration. Sans elle, l'upload s'appuie sur la session de l'agent connecté.
Cette clé contourne RLS : elle ne doit **jamais** être préfixée `NEXT_PUBLIC_` ni exposée
via `next.config.ts`.

### 3. Chemin d'un envoi

1. `POST /api/upload` valide le fichier annoncé (type et taille selon le canal) et renvoie une
   URL signée limitée au chemin `{channel}/{conversation_id}/{timestamp}_{filename}`.
   Le navigateur téléverse ensuite **directement** vers Supabase Storage : les octets ne
   transitent pas par Next.js, ce qui évite la limite de corps des fonctions serverless
   (~4,5 Mo sur Vercel) face aux 25 Mo autorisés en email.
2. `POST /api/conversations/reply` relit le canal et le destinataire **en base** (le navigateur
   ne choisit ni à qui ni par quel canal on écrit), vérifie que l'URL de la pièce jointe
   appartient bien au bucket, puis appelle n8n. `POST /api/send-response` (escalades)
   transmet son payload tel quel mais revalide de la même façon les URLs `mediaUrl` /
   `attachmentUrl` : ce sont elles que Twilio et Gmail iront chercher.
3. Le message est affiché immédiatement dans le fil (optimistic update) avec le rôle
   `agent_human`. L'écriture réelle dans `conversations.history` est faite par n8n après
   l'envoi ; elle apparaît au rechargement de la page.

### 4. Limites par canal

| | WhatsApp | Email |
|---|---|---|
| Types acceptés | JPEG, PNG, WebP, PDF, MP3, OGG | tous |
| Taille max | 16 Mo | 25 Mo |
| Message texte | facultatif si une PJ est jointe | obligatoire |
| Objet | — | pré-rempli `Re: …` si un objet est connu, sinon vide et éditable |

L'objet est déduit du dernier message d'historique portant un champ `subject` : `conversations`
n'a pas de colonne dédiée. Tant que le workflow n8n ne renseigne pas ce champ, l'objet
s'affiche vide et reste librement éditable.

## Feedback and issues

Please file feedback and issues over on the [Supabase GitHub org](https://github.com/supabase/supabase/issues/new/choose).

## More Supabase examples

- [Next.js Subscription Payments Starter](https://github.com/vercel/nextjs-subscription-payments)
- [Cookie-based Auth and the Next.js 13 App Router (free course)](https://youtube.com/playlist?list=PL5S4mPUpp4OtMhpnp93EFSo42iQ40XjbF)
- [Supabase Auth and the Next.js App Router](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)
