import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'leadzo_secure_webhook_token_2026';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url);
  
  // 1. Meta Webhook Verification (GET)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully!');
      return new Response(challenge, { status: 200 });
    } else {
      return new Response('Forbidden', { status: 403 });
    }
  }

  // 2. Handle Incoming Messages (POST)
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      
      // WhatsApp API payload structure check
      if (body.object !== 'whatsapp_business_account') {
        return new Response('Not a WhatsApp event', { status: 404 });
      }

      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value && change.value.messages && change.value.messages[0]) {
            const message = change.value.messages[0];
            const senderPhone = message.from;
            const messageText = message.text?.body || '';
            const phoneId = change.value.metadata.phone_number_id;

            // Initialize Supabase admin client
            const supabase = createClient(
              Deno.env.get('SUPABASE_URL') ?? '',
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            );

            // A. Find which user owns this phone ID
            const { data: user, error: userError } = await supabase
              .from('users')
              .select('id, credits, whatsapp_api_token')
              .eq('whatsapp_phone_id', phoneId)
              .single();

            if (userError || !user) {
              console.error('User not found for this phone ID:', phoneId);
              continue; // Skip processing
            }

            // B. Check Credits (Tokenomics logic: cost = 1)
            const tokenCost = 1;
            if (user.credits < tokenCost) {
              console.log('User out of credits:', user.id);
              // Optionally notify the user via a system message, but for now just stop
              continue;
            }

            // C. Deduct Credit
            await supabase
              .from('users')
              .update({ credits: user.credits - tokenCost })
              .eq('id', user.id);

            // D. Generate AI Reply (OpenAI)
            let aiReply = "Thank you for your message! Our team will get back to you soon.";
            if (OPENAI_API_KEY) {
              const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini', // Using fast and cheap model for standard replies
                  messages: [
                    { role: 'system', content: 'You are a helpful customer support AI assistant for a business. Keep responses concise, friendly, and professional. The user just texted you.' },
                    { role: 'user', content: messageText }
                  ],
                  max_tokens: 150
                })
              });
              
              if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                aiReply = aiData.choices[0].message.content;
              } else {
                console.error("OpenAI Error:", await aiResponse.text());
              }
            }

            // E. Send Reply via WhatsApp API
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

            if (!waResponse.ok) {
              console.error("Failed to send WhatsApp message:", await waResponse.text());
            } else {
              console.log("Successfully replied to", senderPhone);
            }
          }
        }
      }

      return new Response('EVENT_RECEIVED', { status: 200 });

    } catch (error) {
      console.error('Error processing webhook:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
})
