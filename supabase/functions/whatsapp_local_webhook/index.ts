import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Provided OpenAI API Key for the AI Sales Agent
const OPENAI_API_KEY = Deno.env.get('HERCULES_API_KEY') || Deno.env.get('OPENAI_API_KEY') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, accountId, fromNumber, content, contactName, aiPrompt, isAiActive } = await req.json();

    if (!userId || !fromNumber || !content) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Create a Supabase client with the Service Role Key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Find or create lead
    let { data: lead } = await supabase
      .from('leads')
      .select('id, account_id')
      .eq('user_id', userId)
      .eq('contact', fromNumber)
      .single();

    if (!lead) {
      // Use contactName (WhatsApp display name) if available, else use formatted number
      const displayName = contactName || `+${fromNumber}`;
      const { data: newLead, error: insertLeadError } = await supabase
        .from('leads')
        .insert({
          user_id: userId,
          account_id: accountId || null,
          name: displayName,
          contact: fromNumber,
          platform: 'whatsapp',
          status: 'New'
        })
        .select('id, account_id')
        .single();
        
      if (insertLeadError) throw insertLeadError;
      lead = newLead;
    }

    if (lead) {
      // 2. Insert incoming user message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          user_id: userId,
          lead_id: lead.id,
          content: content,
          sender: 'lead'
        });
        
      if (msgError) throw msgError;

      // 3. AI Sales Agent Logic
      if (isAiActive && OPENAI_API_KEY && accountId) {
        try {
          // Fetch previous messages for context
          const { data: previousMessages } = await supabase
            .from('messages')
            .select('content, sender')
            .eq('lead_id', lead.id)
            .order('created_at', { ascending: false })
            .limit(10);
          
          const chatHistory = previousMessages?.reverse() || [];
          
          // Fetch Single Brain Knowledge
          let brainContext = "";
          const { data: brainData, error: brainError } = await supabase
            .from('business_knowledge')
            .select('company_name, business_details')
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle();
            
          if (brainData) {
             brainContext = `Company Name: ${brainData.company_name}\nBusiness Details & Policies:\n${brainData.business_details}\n\n`;
          }

          const systemInstruction = (aiPrompt ? `Account Specific Instructions:\n${aiPrompt}\n\n` : "") + 
                                    (brainContext ? `Central AI Brain Knowledge (Use this to answer customer queries):\n${brainContext}` : "You are a helpful AI assistant.");
          
          // Format for OpenAI
          const messages = [
            { role: 'system', content: systemInstruction }
          ];
          
          for (const msg of chatHistory) {
            // Include history (the last one is the current message which was just inserted above)
            messages.push({
              role: msg.sender === 'ai' || msg.sender === 'agent' ? 'assistant' : 'user',
              content: msg.content
            });
          }

          // Call OpenAI API
          const openAiResponse = await fetch(`${Deno.env.get("OMNIROUTE_URL") || "https://api.openai.com/v1"}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4o', 
              messages: messages,
              temperature: 0.7,
            })
          });
          
          const openAiData = await openAiResponse.json();
          const aiReplyContent = openAiData.choices?.[0]?.message?.content;

          if (aiReplyContent) {
            // Send reply back to WhatsApp via Hostinger wa-server
            // Bypassing Nginx locally for speed if needed, but since we're calling from Supabase, use external IP/Domain
            const replyRes = await fetch('http://srv1780011.hstgr.cloud:3001/api/reply', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ userId, accountId, toNumber: fromNumber, message: aiReplyContent })
            });
            
            if (replyRes.ok) {
               // Save AI's reply to Supabase messages table
               await supabase.from('messages').insert({
                 user_id: userId,
                 lead_id: lead.id,
                 content: aiReplyContent,
                 sender: 'ai'
               });
            } else {
               console.error("Failed to send AI reply to wa-server", await replyRes.text());
            }
          } else {
            console.error("OpenAI failed to return a valid reply", openAiData);
          }
        } catch (aiError) {
          console.error("Error running AI Agent:", aiError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, leadId: lead?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
