import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { campaign_id } = await req.json()
    if (!campaign_id) throw new Error("Missing campaign_id");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch Campaign
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from('rcs_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campErr || !campaign) throw campErr;

    // 2. Fetch Audience (Active Contacts only)
    const { data: contacts, error: contactErr } = await supabaseAdmin
      .from('rcs_contacts')
      .select('id')
      .eq('user_id', campaign.user_id)
      .eq('is_opted_out', false);

    if (contactErr || !contacts) throw contactErr;

    // 3. Queue Messages (Insert into rcs_messages)
    const messagesToInsert = contacts.map((c: any) => ({
      campaign_id: campaign.id,
      contact_id: c.id,
      user_id: campaign.user_id,
      status: 'QUEUED',
    }));

    // Batch insert for performance
    const batchSize = 1000;
    let queuedCount = 0;
    
    for (let i = 0; i < messagesToInsert.length; i += batchSize) {
       const batch = messagesToInsert.slice(i, i + batchSize);
       const { error: insertErr } = await supabaseAdmin.from('rcs_messages').insert(batch);
       if (!insertErr) queuedCount += batch.length;
    }

    // 4. Update Campaign Status
    await supabaseAdmin
      .from('rcs_campaigns')
      .update({ 
        status: 'RUNNING',
        total_contacts: queuedCount,
        sent_count: queuedCount, // Mocking sent immediately
        delivered_count: Math.floor(queuedCount * 0.9), // Mock 90% delivery
        read_count: Math.floor(queuedCount * 0.7) // Mock 70% read rate
      })
      .eq('id', campaign.id);

    // After a delay, mark as COMPLETED
    setTimeout(async () => {
       await supabaseAdmin.from('rcs_campaigns').update({ status: 'COMPLETED' }).eq('id', campaign.id);
    }, 15000); // 15 seconds simulation

    return new Response(
      JSON.stringify({ success: true, queued: queuedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
