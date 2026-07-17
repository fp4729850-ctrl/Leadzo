import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Ensure you set META_WEBHOOK_VERIFY_TOKEN in Supabase dashboard
const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "leadzo_meta_secret_2026";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const url = new URL(req.url);

  // --- 1. Webhook Verification (GET) ---
  // Meta sends a GET request to verify the webhook endpoint.
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
      console.log("Received Meta Webhook:", JSON.stringify(body, null, 2));

      // Check if this is a WhatsApp API event
      if (body.object === "whatsapp_business_account") {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;

        if (messages && messages.length > 0) {
          const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
          );

          for (const msg of messages) {
            const senderPhone = msg.from; // Phone number string
            let content = "";
            if (msg.type === "text") content = msg.text.body;
            else content = `[Received a ${msg.type} message]`;

            // 1. Find lead by phone number
            // Note: Phone numbers can be formatted differently, doing a basic ilike or exactly matching for MVP.
            const { data: leads } = await supabaseClient
              .from("leads")
              .select("id")
              .filter("phone", "ilike", `%${senderPhone.replace('+', '')}%`)
              .limit(1);

            let leadId = leads && leads.length > 0 ? leads[0].id : null;

            if (leadId) {
              // 2. Insert into existing 'messages' table
              await supabaseClient.from("messages").insert([{
                lead_id: leadId,
                content: content,
                sender: "user"
              }]);
              
              // 3. Update last_message on lead
              await supabaseClient.from("leads").update({ last_message: content }).eq("id", leadId);
              
              console.log(`Saved message from ${senderPhone} to lead ${leadId}`);
            } else {
              console.log(`Message from ${senderPhone} received, but no matching lead found in CRM.`);
            }
          }
        }
      } else if (body.object === "instagram") {
        const entry = body.entry?.[0];
        const messaging = entry?.messaging?.[0];
        
        if (messaging && messaging.message) {
          const senderId = messaging.sender.id;
          const content = messaging.message.text || `[Received media message]`;

          const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
          );

          // Find lead by instagram sender ID (we assume the ID is stored in the contact jsonb or a dedicated field)
          // For MVP we just try to find a lead with platform='instagram' and some matching data
          const { data: leads } = await supabaseClient
            .from("leads")
            .select("id")
            .filter("platform", "eq", "instagram")
            .limit(1); // Simplistic match for now

          let leadId = leads && leads.length > 0 ? leads[0].id : null;

          if (leadId) {
            await supabaseClient.from("messages").insert([{
              lead_id: leadId,
              content: content,
              sender: "user"
            }]);
            await supabaseClient.from("leads").update({ last_message: content }).eq("id", leadId);
            console.log(`Saved Instagram message from ${senderId} to lead ${leadId}`);
          }
        }
      }

      // Return 200 OK to Meta so they don't retry
      return new Response("EVENT_RECEIVED", { status: 200 });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
})
