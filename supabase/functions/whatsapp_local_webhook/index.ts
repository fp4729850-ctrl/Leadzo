import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, fromNumber, content, contactName } = await req.json();

    if (!userId || !fromNumber || !content) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Create a Supabase client with the Service Role Key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Find or create lead
    let { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', userId)
      .eq('contact', fromNumber)
      .single();

    if (!lead) {
      // Use contactName (WhatsApp display name) if available, else use formatted number
      const displayName = contactName || `+${fromNumber}`;
      const { data: newLead, error: insertLeadError } = await supabase
        .from('leads')
        .insert({
          user_id: userId,
          name: displayName,
          contact: fromNumber,
          platform: 'whatsapp',
          status: 'New'
        })
        .select('id')
        .single();
        
      if (insertLeadError) throw insertLeadError;
      lead = newLead;
    }

    if (lead) {
      // 2. Insert message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          user_id: userId,
          lead_id: lead.id,
          content: content,
          sender: 'lead'
        });
        
      if (msgError) throw msgError;
    }

    return new Response(
      JSON.stringify({ success: true, leadId: lead?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
