import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const hasEnvVars =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your-project-url' &&
  !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== 'your-publishable-or-anon-key'
