import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  const token = Deno.env.get("FACEBOOK_ADS_ACCESS_TOKEN");
  return new Response(JSON.stringify({ configured: !!token }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  })
})
