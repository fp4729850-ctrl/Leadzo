import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "leadzo_meta_secret_2026";
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const url = new URL(req.url);

  // --- 1. Webhook Verification (GET) ---
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully!");
      return new Response(challenge, { status: 200 });
    } else {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // --- 2. Webhook Event Processing (POST) ---
  if (req.method === "POST") {
    try {
      const body = await req.json();
      
      if (body.object === "whatsapp_business_account") {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;
        const phoneId = value?.metadata?.phone_number_id;

        if (messages && messages.length > 0) {
          const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
          );

          // Find the user who owns this WhatsApp business account
          const { data: user, error: userError } = await supabaseClient
            .from('users')
            .select('id, credits, whatsapp_api_token')
            .eq('whatsapp_phone_id', phoneId)
            .single();

          for (const msg of messages) {
            const senderPhone = msg.from;
            let content = "";
            if (msg.type === "text") content = msg.text.body;
            else content = `[Received a ${msg.type} message]`;

            // 1. Sync to CRM / Live Inbox
            const { data: leads } = await supabaseClient
              .from("leads")
              .select("id")
              .filter("phone", "ilike", `%${senderPhone.replace('+', '')}%`)
              .limit(1);

            let leadId = leads && leads.length > 0 ? leads[0].id : null;

            if (leadId) {
              await supabaseClient.from("messages").insert([{
                lead_id: leadId,
                content: content,
                sender: "user"
              }]);
              await supabaseClient.from("leads").update({ last_message: content }).eq("id", leadId);
            }

            // 2. Auto-Reply AI Logic (Only if user is found and has credits)
            if (user && !userError && user.credits > 0 && content) {
              // Deduct credit
              await supabaseClient
                .from('users')
                .update({ credits: user.credits - 1 })
                .eq('id', user.id);

              let aiReply = "Thank you for reaching out!";
              
              if (OPENAI_API_KEY) {
                const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                      { role: 'system', content: 'You are a helpful customer support AI for a business. Keep responses concise, friendly, and professional.' },
                      { role: 'user', content: content }
                    ],
                    max_tokens: 150
                  })
                });
                
                if (aiResponse.ok) {
                  const aiData = await aiResponse.json();
                  aiReply = aiData.choices[0].message.content;
                }
              }

              // Send reply via Meta API
              const waResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${user.whatsapp_api_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: senderPhone,
                  type: 'text',
                  text: { body: aiReply }
                })
              });

              if (waResponse.ok && leadId) {
                // Save AI reply to inbox too
                await supabaseClient.from("messages").insert([{
                  lead_id: leadId,
                  content: aiReply,
                  sender: "agent"
                }]);
              }
            }
          }
        }
      }

      return new Response("EVENT_RECEIVED", { status: 200 });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
})
