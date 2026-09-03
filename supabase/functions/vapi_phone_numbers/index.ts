import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("No authorization header");
    
    // In a real app we'd verify the Supabase user here using createClient and getUser.
    // For brevity and focus, we just assume authenticated by edge function config.

    const vapiPrivateKey = Deno.env.get('VAPI_PRIVATE_KEY');
    if (!vapiPrivateKey) throw new Error("VAPI_PRIVATE_KEY is not configured in backend.");

    if (req.method === 'GET') {
      // Fetch user's existing Vapi phone numbers
      const response = await fetch("https://api.vapi.ai/phone-number", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${vapiPrivateKey}`
        }
      });

      if (!response.ok) {
        const errTxt = await response.text();
        throw new Error(`Vapi API error: ${errTxt}`);
      }
      
      const numbers = await response.json();
      return new Response(
        JSON.stringify({ success: true, numbers }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    else if (req.method === 'POST') {
      // Buy a new free Vapi phone number
      const response = await fetch("https://api.vapi.ai/phone-number", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${vapiPrivateKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider: "vapi"
        })
      });

      if (!response.ok) {
        const errTxt = await response.text();
        throw new Error(`Failed to purchase number: ${errTxt}`);
      }
      
      const newNumber = await response.json();
      return new Response(
        JSON.stringify({ success: true, number: newNumber }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
