import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log("Received GSMA Webhook:", JSON.stringify(payload, null, 2));

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // GSMA Delivery Status Webhook Payload typically looks like:
    // { "messageContact": { "userContact": "+91..." }, "messageId": "...", "status": "DELIVERED" }
    
    // GSMA Inbound Message Webhook Payload typically looks like:
    // { "messageContact": { "userContact": "+91..." }, "messageId": "...", "RCSMessage": { "textMessage": "Hello" } }

    if (payload.status && payload.messageId) {
       // It's a Delivery Status Update (DELIVERED, READ, FAILED)
       const updateData: any = { status: payload.status };
       if (payload.status === 'DELIVERED') updateData.delivered_at = new Date().toISOString();
       if (payload.status === 'READ') updateData.read_at = new Date().toISOString();
       
       await supabaseAdmin
         .from('rcs_messages')
         .update(updateData)
         .eq('provider_message_id', payload.messageId);
         
       return new Response(JSON.stringify({ success: true }), { headers: corsHeaders, status: 200 });
    }
    
    if (payload.RCSMessage && payload.messageContact?.userContact) {
        // It's an Inbound Message from a user
        const senderPhone = payload.messageContact.userContact;
        let textContent = payload.RCSMessage.textMessage || payload.RCSMessage.suggestedResponse?.postbackData || "Media received";
        
        // Remove country code for lookup if needed, but assuming strict E.164
        const { data: contact } = await supabaseAdmin.from('rcs_contacts')
            .select('id, user_id')
            .eq('phone_number', senderPhone) // Note: In production you'd normalize numbers for lookup
            .single();
            
        if (contact) {
            await supabaseAdmin.from('rcs_messages').insert({
                user_id: contact.user_id,
                contact_id: contact.id,
                agent_id: Deno.env.get('DOTGO_AGENT_ID'), // Assuming single agent env for now
                text_content: textContent,
                direction: 'inbound',
                status: 'DELIVERED',
                provider_message_id: payload.messageId || 'INBOUND_' + Date.now()
            });
        }
        
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders, status: 200 });
    }

    return new Response(JSON.stringify({ success: true, warning: "Unknown payload format ignored" }), { headers: corsHeaders, status: 200 })
  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 400 })
  }
})
