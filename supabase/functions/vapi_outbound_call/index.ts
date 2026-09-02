import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch user phone
    const { data: userData } = await supabaseClient.from('users').select('phone').eq('id', user.id).single();
    if (!userData?.phone) {
      throw new Error("No personal phone number configured for this user. Please configure it in API settings.");
    }

    // Fetch active business vapi phone id
    const { data: businessData } = await supabaseClient
      .from('business_knowledge')
      .select('vapi_phone_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!businessData?.vapi_phone_id) {
      throw new Error("No Vapi Phone ID configured for the active company. Please configure it in API settings.");
    }

    // Call Vapi
    const vapiPrivateKey = Deno.env.get('VAPI_PRIVATE_KEY');
    if (!vapiPrivateKey) throw new Error("VAPI_PRIVATE_KEY is not configured in backend.");
    
    const assistantId = Deno.env.get('VAPI_MANAGER_ASSISTANT_ID') || "dummy-assistant-id"; // Fallback for dev

    const response = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${vapiPrivateKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phoneNumberId: businessData.vapi_phone_id,
        customer: {
          number: userData.phone
        },
        assistantId: assistantId
      })
    });

    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(`Vapi API error: ${errTxt}`);
    }
    
    const responseData = await response.json();

    return new Response(
      JSON.stringify({ success: true, call: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
