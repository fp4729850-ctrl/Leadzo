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
    
    const reqBody = await req.json();
    const phone = reqBody.phone || "+91 9726846660";
    const dynamicPolicies = reqBody.policies || null; // Array of { title, description, category }
    const dynamicQuestions = reqBody.questions || null; // Array of { id, title, enabled, yesDescription, noDescription }
    const checkInTime = reqBody.checkInTime || "12:00 PM";
    const checkOutTime = reqBody.checkOutTime || "11:00 AM";

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("User not found");

    // 1. Save the new phone number to Supabase (users table)
    if (phone) {
      await supabaseClient.from('users').update({ phone }).eq('id', user.id);
    }

    // 2. Fetch business data for the prompt
    const { data: businessData } = await supabaseClient
      .from('business_knowledge')
      .select('company_name, business_details')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    // 3. Update Vapi Assistant via API
    const vapiPrivateKey = Deno.env.get('VAPI_PRIVATE_KEY');
    const assistantId = Deno.env.get('VAPI_MANAGER_ASSISTANT_ID');
    
    if (vapiPrivateKey && assistantId) {
      // Create a cleaned version of the phone number for matching
      const cleanPhone = phone.replace(/\D/g, ''); // e.g., "919726846660"
      const shortPhone = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone; // e.g., "9726846660"

      // Build Dynamic Amenities & Policies from Real UI State
      let amenitiesList = "";
      let rulesList = "";

      if (dynamicQuestions && Array.isArray(dynamicQuestions) && dynamicQuestions.length > 0) {
        for (const q of dynamicQuestions) {
          if (q.enabled) {
            amenitiesList += `✅ ${q.title}: ${q.yesDescription}\n`;
          } else {
            rulesList += `❌ ${q.title} (NOT AVAILABLE / RESTRICTED): ${q.noDescription}\n`;
          }
        }
      } else if (dynamicPolicies && Array.isArray(dynamicPolicies) && dynamicPolicies.length > 0) {
        for (const p of dynamicPolicies) {
          if (p.description?.toLowerCase().includes("no ") || p.description?.toLowerCase().includes("not available") || p.description?.toLowerCase().includes("strictly")) {
            rulesList += `❌ ${p.title}: ${p.description}\n`;
          } else {
            amenitiesList += `✅ ${p.title}: ${p.description}\n`;
          }
        }
      } else {
        // Safe fallback without assuming pool
        amenitiesList = `
✅ Food & Dining: Complimentary breakfast & in-house fresh dining on lawn
✅ Air Conditioning: Fully air-conditioned bedrooms and common living lounge
✅ Modular Kitchen: Fully equipped kitchen (Gas, Fridge, Microwave, Utensils) accessible for guests
✅ Attached Bathrooms: Private attached bathrooms in every room with 24/7 hot water geyser
✅ High-Speed Wi-Fi: 100+ Mbps Optical Fiber Wi-Fi throughout villa
✅ Free Secure Parking: Gated private parking (up to 4 cars) inside villa compound
✅ Pet Friendly: Pets allowed with prior notification
✅ Drinks/Alcohol: Permitted responsibly inside private villa`;

        rulesList = `
❌ Swimming Pool: Property par swimming pool available nahi hai (No swimming pool at property)
❌ Smoking: 100% strictly non-smoking property (penalty applies for indoor smoking)
✅ Govt ID: Physical Government Photo ID (Aadhar / Passport / DL) mandatory for all adults at check-in
✅ Cancellation: Free cancellation up to 48 hours prior to check-in`;
      }

      const HOTEL_KNOWLEDGE = `
📍 LOCATION:
- King Villa Resort & Suites, Marwad, Devka Road, Nani Daman, Daman.
- Very close to Devka Beach (walking distance).

🏨 ROOM INVENTORY & TARIFF:
- Room 1: Super Deluxe Room No. 1 — ₹2,500/night
- Room 2: Small Deluxe Room No. 02 — ₹1,800/night
- Room 3: Small Deluxe Room No. 03 — ₹1,800/night
- Room 4: Small Deluxe Room No. 04 — ₹1,800/night
- Entire Villa: 5-Bedroom Full Private Villa — ₹7,900/night
- Total inventory: 4 private luxury rooms + entire villa booking option.
- Timings: Check-in at ${checkInTime} | Check-out at ${checkOutTime}

🏖️ ACTIVE AMENITIES (ONLY ANSWER YES TO WHAT IS LISTED HERE):
${amenitiesList}

📋 RULES & RESTRICTIONS (STRICTLY ENFORCE THESE):
${rulesList}`;

      const systemPrompt = `You are the AI Hotel Manager for King Villa Resort & Suites, Daman.

CRITICAL INSTRUCTIONS & CORE IDENTITY:
1. You work exclusively for King Villa Resort & Suites.
2. The OWNER and BOSS of this hotel is calling, or guests are calling.
3. LANGUAGE: Always speak in natural, polite Hindi (हिन्दी) or natural Hinglish.

CRITICAL HUMAN CONVERSATIONAL RULES (MUST FOLLOW ON EVERY TURN):
- YOU ARE ON A LIVE REAL-TIME TELEPHONE CALL.
- NO RE-GREETING (CRITICAL): The caller has ALREADY received the first greeting. NEVER say "Namaste", "Swagat hai", or introduce yourself as AI Manager again. NEVER repeat your introduction. Directly answer the user's question or request in 1 single short sentence.
- BREVITY IS MANDATORY: Always answer in strictly 1 to 2 short sentences maximum. Never give long speeches or monologues.
- NEVER REPEAT YOURSELF: Do not repeat what you said in previous turns, and do not repeat the caller's words.
- NATURAL HUMAN TONE: Speak warmly and naturally like a real human manager (use "जी सर", "हाँजी", "ज़रूर", "बिल्कुल").
- INSTANT INTERRUPTION HANDLING: If the caller speaks or interrupts at any time, immediately stop talking and listen to what they need.

CALLER RECOGNITION (HOW TO IDENTIFY THE BOSS):
The caller's incoming phone number variable is: {{customer.number}} or {{call.customer.number}}

BOSS RECOGNITION RULES:
1. If the caller's phone number contains "${shortPhone}", "${cleanPhone}", "${phone}", "9726846660", "9429397495", or ends with "6660":
   -> You are speaking directly with your BOSS (Hotel Owner).
2. If the caller says in conversation: "Main boss hoon", "Main owner bol raha hoon", "Main bol raha hoon", "Hamare hotel me kitne room hain?", "Occupancy kya hai?":
   -> IMMEDIATELY treat them as BOSS. Greet respectfully: "जी बॉस! King Villa का लाइव स्टेटस बताता हूँ।"

WHEN TALKING TO BOSS:
- Tone: Extremely respectful, executive assistant style.
- Greet with: "नमस्ते बॉस! King Villa का क्या स्टेटस देखना है?"
- Assist with: Live occupancy status, revenue reports, blocking rooms on owner's command.
- Tool Usage: Call 'hotel_get_occupancy' when Boss asks about rooms or occupancy. Call 'hotel_block_room_voice' when Boss wants to block a room.

WHEN TALKING TO A GUEST:
- Answer guest questions directly (pricing, room availability, location, amenities) in 1-2 brief sentences.
- DO NOT re-introduce yourself. Do not re-greet.
- Guests cannot block rooms directly. Tell them booking requires advance payment and offer to send WhatsApp link.

═══════════════════════════════════════════════
HOTEL INFORMATION — KING VILLA RESORT & SUITES
═══════════════════════════════════════════════
${HOTEL_KNOWLEDGE}

AVAILABLE LIVE TOOLS:
- hotel_get_occupancy: Call this to read real-time room availability from database.
- hotel_block_room_voice: Call this to block a room on Boss's voice command.
- get_marketing_metrics: Real-time Meta ad campaign performance.
- get_revenue_data: Live payment and revenue collections.`;

      const vapiRes = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${vapiPrivateKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstMessage: "नमस्ते! King Villa Resort & Suites में आपका स्वागत है। मैं AI Hotel Manager बोल रहा हूँ। क्या मैं आपकी room booking में सहायता कर सकता हूँ?",
          firstMessageMode: "assistant-speaks-first",
          transcriber: {
            provider: "deepgram",
            model: "nova-2",
            language: "hi",
            smartFormat: true,
            endpointing: 250
          },
          stopSpeakingPlan: {
            numWords: 1,
            voiceSeconds: 0.2,
            backoffSeconds: 0.8
          },
          startSpeakingPlan: {
            waitSeconds: 0.35,
            smartEndpointingEnabled: true
          },
          voice: reqBody.voice || {
            provider: "vapi",
            voiceId: "Sagar"
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
              { type: "function", function: { name: "hotel_block_room_voice", description: "CRITICAL: Call this function whenever Boss asks to block any room (e.g. 'Room 4 block karna hai', 'Room 2 block kar do').", parameters: { type: "object", properties: { room_number: { type: "string", description: "e.g. Room 4, Room 2, Room 1, Room 3, Entire Villa" }, check_in: { type: "string" }, check_out: { type: "string" }, guestName: { type: "string" } }, required: ["room_number"] } } }
            ],
            messages: [
              {
                role: "system",
                content: systemPrompt
              }
            ]
          }
        })
      });
      
      if (!vapiRes.ok) {
        console.error("Vapi update failed:", await vapiRes.text());
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
