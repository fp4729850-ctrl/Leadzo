import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_base64 } = await req.json();

    if (!image_base64) {
      throw new Error("image_base64 is required");
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Call OpenAI Vision
    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a visual assistant helping a voice AI understand what the user is currently looking at on their screen. Describe the UI, focusing on the main visible elements, active sections, and general context. Keep the description extremely concise, under 50 words.",
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image_base64}`,
                  detail: "low",
                },
              },
            ],
          },
        ],
        max_tokens: 100,
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      throw new Error(`OpenAI API failed: ${openAiResponse.status} ${errorText}`);
    }

    const data = await openAiResponse.json();
    const description = data.choices[0]?.message?.content || "No description generated.";

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error analyzing screen:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
