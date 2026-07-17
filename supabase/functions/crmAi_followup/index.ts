import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch leads that don't have an AI draft yet and are not closed
    const { data: leads, error } = await supabaseClient
      .from("crm_leads")
      .select("*")
      .is("ai_draft", null)
      .in("status", ["new", "contacted"])
      .limit(10); // Batch process

    if (error || !leads) throw new Error("Failed to fetch leads");

    let processedCount = 0;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    for (const lead of leads) {
      try {
        const systemPrompt = `You are a friendly, professional AI Sales Assistant for Leadzo. 
Write a short, engaging WhatsApp/Email follow-up message to a lead named "${lead.name}".
Context: They found us via "${lead.source}". Their AI quality score is ${lead.ai_score}/100.
The goal is to get them to reply or book a quick call. Keep it very short, natural, and friendly. Do not use generic corporate jargon.`;

        let draft = "";
        try {
          const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            draft = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          }
        } catch(e) {}

        if (!draft) {
           const polliRes = await fetch("https://text.pollinations.ai/", {
              method: "POST", headers: { "Content-Type": "application/json" }, 
              body: JSON.stringify({ messages: [{ role: "user", content: systemPrompt }], model: "openai" })
            });
           draft = await polliRes.text();
        }

        if (draft) {
          const { error: updateError } = await supabaseClient
            .from("crm_leads")
            .update({ ai_draft: draft.trim() })
            .eq("id", lead.id);

          if (!updateError) processedCount++;
        }
      } catch (err) {
        console.error(`Error processing lead ${lead.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, processedCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})
