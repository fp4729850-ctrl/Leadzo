import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
serve(async () => {
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data, error } = await admin.storage.createBucket('campaign-media', { public: true, allowedMimeTypes: ['image/*','video/*'], fileSizeLimit: 52428800 })
  return new Response(JSON.stringify({ data, error }), { headers: { 'Content-Type': 'application/json' } })
})
