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
          firstMessage: businessData.company_name?.toLowerCase().includes("villa") || businessData.company_name?.toLowerCase().includes("hotel") 
            ? `Namaste Boss! Main ${businessData.company_name || 'Leadzo'} AI manager bol rahi hoon. Aapka Voice Link number aur occupancy system successfully configure ho gaya hai. Kya aapko King Villa ki room availability ya check-ins ke baare me koi jankari chahiye?`
            : `Hello Boss! I have the latest updates from the marketing team and data analysis for ${businessData.company_name || 'your company'}. What would you like to discuss?`,
          voice: {
            provider: "11labs",
            voiceId: "ThT5KcBeYPX3keUQqHPh" // Priya (Indian Female) for natural Hindi
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
                content: `You are the AI Manager for ${businessData.company_name || 'King Villa'}. You are taking a phone call from your boss (the owner). 
You must discuss company data, marketing metrics, hotel room availability, and guest policies. 
Always respond professionally and politely in a natural mix of Hindi and English.
Wait for the boss to ask before giving detailed reports.

YOUR COMPANY BRAIN / HOTEL POLICIES:
${businessData.business_details || 'You are managing King Villa.'}

CRITICAL RULES:
1. If the boss asks for live hotel room data or occupancy (like "kitne rooms khali hain" or "aaj ke check-ins"), you MUST use the hotel_get_occupancy tool to fetch it on their behalf before answering.
2. If the boss asks to block a room (like "Room 2 block kar do"), you MUST use the hotel_block_room_voice tool.`
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
