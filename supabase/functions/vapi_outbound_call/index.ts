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
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error(`Auth Error: ${authError?.message || 'User not found'}. URL exists: ${!!Deno.env.get('SUPABASE_URL')}`);
    }

    // Fetch user phone
    const { data: userData } = await supabaseClient.from('users').select('phone').eq('id', user.id).single();
    if (!userData?.phone) {
      throw new Error("No personal phone number configured for this user. Please configure it in API settings.");
    }

    // Fetch active business data (phone ID and AI brain context)
    const { data: businessData } = await supabaseClient
      .from('business_knowledge')
      .select('vapi_phone_id, company_name, business_details')
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
        assistantId: assistantId,
        assistantOverrides: {
          firstMessageMode: "assistant-speaks-first-with-model-generated-message",
          voice: {
            provider: "11labs",
            voiceId: "ThT5KcBeYPX3keUQqHPh", // Priya (Indian Female)
            model: "eleven_multilingual_v2" // CRITICAL: Required for Hindi/Hinglish, otherwise it sounds robotic
          },
          model: {
            provider: "openai",
            model: "gpt-4o",
            tools: [
              { type: "function", function: { name: "get_marketing_metrics", description: "Fetch real-time Facebook/Meta Ads campaign metrics.", parameters: { type: "object", properties: {} } } },
              { type: "function", function: { name: "get_revenue_data", description: "Fetch real-time Razorpay revenue and sales data.", parameters: { type: "object", properties: {} } } },
              { type: "function", function: { name: "get_support_tickets", description: "Fetch the number of open and resolved customer support tickets.", parameters: { type: "object", properties: {} } } },
              { type: "function", function: { name: "get_api_balances", description: "Fetch the remaining API credits.", parameters: { type: "object", properties: {} } } },
              { type: "function", function: { name: "hotel_get_occupancy", description: "Fetch live hotel room availability and occupancy report for King Villa.", parameters: { type: "object", properties: {} } } },
              { type: "function", function: { name: "hotel_block_room_voice", description: "Block a specific hotel room for given dates.", parameters: { type: "object", properties: { roomNumber: { type: "string" }, checkIn: { type: "string" }, checkOut: { type: "string" }, guestName: { type: "string" } } } } }
            ],
            messages: [
              {
                role: "system",
                content: `You are the AI Hotel Manager for "${businessData.company_name || 'King Villa Resort & Suites'}".
Always respond professionally and politely in a natural mix of Hindi and English.

CRITICAL INSTRUCTION: YOU ARE CURRENTLY TALKING TO YOUR BOSS (THE OWNER OF ${businessData.company_name || 'KING VILLA'}).
- ALWAYS Greet them with "Namaste Boss!"
- If they ask for live hotel room data or occupancy (like "kitne rooms khali hain"), use the hotel_get_occupancy tool to fetch it on their behalf before answering.
- If they ask to block a room, use the hotel_block_room_voice tool.
- Answer any questions they have about the business. Do NOT treat them like a guest/customer.

YOUR COMPANY BRAIN / HOTEL POLICIES:
${businessData.business_details || 'You are managing King Villa.'}`
              }
            ]
          }
        }
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
