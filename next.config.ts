import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Ces variables n'ont plus le préfixe NEXT_PUBLIC_ : on les expose
  // explicitement au bundle navigateur (requis par lib/supabase/client.ts).
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  },
};

export default nextConfig;
