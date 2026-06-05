import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/supabase/queries'
import { ParametresClient } from './client'

export default async function ParametresPage() {
  const { user, profile, error } = await getCurrentUserProfile()

  if (!user || error) redirect('/auth/login')

  return <ParametresClient authUser={user} profile={profile} />
}
