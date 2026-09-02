import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Invalid API Key" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Verify the API Key against business_knowledge
    const { data: business, error: bizError } = await supabaseAdmin
      .from('business_knowledge')
      .select('id, user_id, company_name')
      .eq('internal_api_key', token)
      .single();

    if (bizError || !business) {
      return new Response(JSON.stringify({ error: "Unauthorized or Invalid Leadzo API Key" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse the request body to see what action the AI wants to perform
    const body = await req.json().catch(() => ({}));
    const action = body.action || "get_summary";
    const customerPhone = body.customerPhone || "";

    let responseData: any = { company: business.company_name };

    if (action === "get_summary") {
      // Get token balance
      const { data: tokenData } = await supabaseAdmin
        .from('token_balances')
        .select('balance')
        .eq('user_id', business.user_id)
        .single();
      
      responseData.token_balance = tokenData ? tokenData.balance : 0;
      responseData.message = "Successfully fetched Leadzo summary.";
    } 
    else if (action === "get_customer_memory" && customerPhone) {
      const { data: memory } = await supabaseAdmin
        .from('customer_memory')
        .select('channel, content, created_at')
        .eq('user_id', business.user_id)
        .eq('customer_id', customerPhone)
        .order('created_at', { ascending: false })
        .limit(5);

      responseData.memory = memory || [];
      responseData.message = "Fetched customer memory.";
    }
    else {
      responseData.error = "Unknown action or missing parameters.";
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
