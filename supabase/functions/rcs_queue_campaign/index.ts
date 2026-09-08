import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { campaign_id, user_id } = await req.json()
    if (!campaign_id) throw new Error("Missing campaign_id")

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch Campaign and Template Data
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from('rcs_campaigns')
      .select('*, rcs_templates(*)')
      .eq('id', campaign_id)
      .single()

    if (campErr || !campaign) throw new Error("Campaign not found")

    // 2. Fetch Contacts
    const { data: contacts, error: contErr } = await supabaseAdmin
      .from('rcs_contacts')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_opted_out', false)

    if (contErr || !contacts || contacts.length === 0) {
      await supabaseAdmin.from('rcs_campaigns').update({ status: 'FAILED' }).eq('id', campaign_id)
      throw new Error("No active contacts found")
    }

    // 3. Update Campaign to PROCESSING
    await supabaseAdmin.from('rcs_campaigns').update({ status: 'PROCESSING' }).eq('id', campaign_id)

    // 4. Setup MSG91 API Credentials
    const msg91AuthKey = Deno.env.get('MSG91_RCS_AUTH_KEY');
    if (!msg91AuthKey) throw new Error("MSG91 RCS AuthKey missing in .env");

    // 5. Build GSMA Rich Card Payload
    const tmplContent = campaign.rcs_templates.content;
    const gsmaPayload = {
      messageContact: { userContact: "" }, // Will be set in loop
      messageId: "", // Will be generated in loop
      RCSMessage: {
        richcardMessage: {
          messageConfig: {
            standaloneCard: {
              cardOrientation: "VERTICAL",
              cardContent: {
                title: tmplContent.title || "No Title",
                description: tmplContent.description || "",
                media: tmplContent.mediaUrl ? {
                    height: "MEDIUM",
                    contentInfo: { fileUrl: tmplContent.mediaUrl }
                } : undefined,
                suggestions: tmplContent.suggestions ? tmplContent.suggestions.map((s: any) => ({
                    action: {
                        text: s.text,
                        postback: { data: s.postbackData || "action" },
                        urlAction: s.actionUrl ? { openUrl: { application: s.actionUrl } } : undefined
                    }
                })) : []
              }
            }
          }
        }
      }
    };

    // 6. Process each contact
    let sentCount = 0;
    for (const contact of contacts) {
       // Format phone number to strict E.164 (+91...)
       let phone = contact.phone_number.replace(/\D/g,'');
       if (!phone.startsWith('91')) phone = '91' + phone;
       phone = '+' + phone;
       
       const messageId = `MSG-${campaign_id}-${contact.id}-${Date.now()}`;
       
       // Clone payload for this contact
       const payload = JSON.parse(JSON.stringify(gsmaPayload));
       payload.messageContact.userContact = phone;
       payload.messageId = messageId;
       
       // Send to MSG91 API
       let providerMessageId = messageId;
       let status = 'QUEUED';
       
       try {
           const res = await fetch(`https://control.msg91.com/api/v5/rcs/send`, {
               method: "POST",
               headers: { 
                   "authkey": msg91AuthKey, 
                   "Content-Type": "application/json" 
               },
               body: JSON.stringify(payload)
           });
           
           if (!res.ok) {
               console.error("MSG91 API returned:", res.status, await res.text());
               status = 'FAILED';
           } else {
               const result = await res.json();
               providerMessageId = result.messageId || messageId;
               status = 'DELIVERED'; // Mark delivered if successfully queued on MSG91
           }
       } catch(e) {
           console.error("MSG91 API Error", e);
           status = 'FAILED';
       }

       // 7. Log to rcs_messages
       await supabaseAdmin.from('rcs_messages').insert({
          campaign_id,
          user_id,
          contact_id: contact.id,
          agent_id: campaign.rcs_templates.agent_id,
          provider_message_id: providerMessageId,
          status,
          direction: 'outbound'
       });
       
       if (status !== 'FAILED') sentCount++;
    }

    // 8. Update Campaign to COMPLETED
    await supabaseAdmin.from('rcs_campaigns').update({ 
       status: 'COMPLETED',
       delivered_count: sentCount 
    }).eq('id', campaign_id);

    return new Response(JSON.stringify({ success: true, sentCount }), { headers: corsHeaders, status: 200 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 400 })
  }
})
