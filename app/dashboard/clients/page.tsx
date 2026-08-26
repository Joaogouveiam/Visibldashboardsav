import { Suspense } from 'react'
import { Users } from 'lucide-react'
import { getAllClients } from '@/lib/supabase/queries'
import { ClientsView } from '@/components/dashboard/clients/clients-view'

async function ClientsContent() {
  const { items, error } = await getAllClients()
  return <ClientsView initialClients={items} error={error} />
}

function Skeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <Users size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fiches clients et contexte SAV</p>
        </div>
      </div>
      <div className="glass rounded-2xl h-12 animate-pulse" />
      <div className="glass rounded-2xl h-[420px] animate-pulse" />
    </div>
  )
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <ClientsContent />
    </Suspense>
  )
}
