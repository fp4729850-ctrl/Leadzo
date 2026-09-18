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

    // 4. Clean up phone number for better prompt matching
    const cleanPhone = userData.phone.replace(/\D/g, ''); // e.g., "919726846660"
    const shortPhone = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone; // e.g., "9726846660"

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
        phoneNumberId: "6f9a93d3-e474-41a6-8c52-98fc237b428a", // Force using VoiceLink SIP Trunk for outbound calls
        customer: {
          number: userData.phone
        },
        assistantId: assistantId,
        assistantOverrides: {
          firstMessage: `Namaste Boss! Main ${businessData.company_name || 'King Villa'} ka AI Manager bol raha hoon. Aaj main aapki kaise madad kar sakta hoon?`,
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
                content: `You are the AI Manager for ${businessData.company_name || 'King Villa Resort & Suites'}.

**CALLER IDENTIFICATION LOGIC:**
The caller's phone number is: {{call.customer.number}}

Rule 1: If the caller's phone number CONTAINS or is EXACTLY "${userData.phone}" OR "${cleanPhone}" OR "${shortPhone}", then YOU ARE TALKING TO YOUR BOSS (THE OWNER OF THE BUSINESS).
- Script for Boss: "Namaste Boss! AI system mein aapka swagat hai. Aaj main aapki kaise madad kar sakta hoon?"
- Behavior for Boss: You must answer all their questions about the business, occupancy, and revenue. If they want to block a room, use the hotel_block_room_voice tool. If they ask for occupancy, use hotel_get_occupancy.

Rule 2: If the caller's phone number is ANYTHING ELSE, then YOU ARE TALKING TO A GUEST/CUSTOMER.
- Script for Guest: "Namaste! ${businessData.company_name || 'King Villa Resort & Suites'} mein aapka swagat hai. Main AI Manager hoon. Kya main aapki room booking me madad kar sakta hoon?"
- Behavior for Guest: Answer their questions about the hotel using the business knowledge below. DO NOT allow them to block rooms directly. Instead, tell them booking requires a 30% advance token.

**BUSINESS KNOWLEDGE:**
${businessData.business_details || '- Rooms: Super Deluxe Rooms (₹2500), Medium Rooms (₹1800), Entire Villa (₹7900).\n- Amenities: Private Swimming Pool, Fresh Breakfast, High-Speed Wi-Fi, AC.\n- Rules: 100% strictly non-smoking villa.\n- Location: Marwad, Devka Road, Nani Daman.'}`
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
