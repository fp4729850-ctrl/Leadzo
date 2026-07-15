import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const geminiKey = Deno.env.get("GEMINI_API_KEY")

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
      throw new Error("Missing environment variables")
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const genAI = new GoogleGenerativeAI(geminiKey)

    // Log the request to see if it was triggered
    console.log("Autopilot Cron Worker Started...");

    // 1. Fetch all active autopilot settings
    const { data: settings, error: fetchErr } = await supabase
      .from("seo_autopilot_settings")
      .select("*")
      .eq("is_active", true)

    if (fetchErr) throw fetchErr

    const results = [];

    // 2. Loop through each user's setting
    for (const setting of settings || []) {
      try {
        const publishPlan = setting.publish_plan || [];
        
        // Find the first item that is NOT published
        const nextItemIndex = publishPlan.findIndex((item: any) => !item.published);
        
        if (nextItemIndex === -1) {
          console.log(`User ${setting.user_id} has no pending items in publish_plan.`);
          continue;
        }

        const targetItem = publishPlan[nextItemIndex];
        console.log(`Processing topic: ${targetItem.title} for ${setting.url}`);

        // 3. Generate Content using Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `You are an expert SEO Content Writer for the website ${setting.url} in the niche of ${setting.niche}.
Please write a highly optimized, engaging blog post about: "${targetItem.title}".
Include headings, paragraphs, and use these keywords naturally: ${targetItem.keywords.join(', ')}.

Respond ONLY with a JSON object in this format:
{
  "title": "A catchy, SEO optimized title for the post",
  "slug": "seo-friendly-url-slug",
  "html_content": "The full blog post content formatted in valid, clean HTML. Use <h2>, <h3>, <p>, <ul>, <li>, and <strong> tags. Do NOT use Markdown.",
  "seo_description": "A 150-character meta description."
}`;

        const gRes = await model.generateContent(prompt);
        const text = gRes.response.text().trim().replace(/```json/g, "").replace(/```/g, "");
        const contentData = JSON.parse(text);

        // 4. Save to blogs table
        const { error: insertErr } = await supabase
          .from("blogs")
          .insert({
            title: contentData.title,
            slug: `${contentData.slug}-${Math.random().toString(36).substring(2, 7)}`,
            html_content: contentData.html_content,
            seo_description: contentData.seo_description,
            author: "Leadzo AI Autopilot",
            published: true,
          })

        if (insertErr) throw insertErr;

        // 5. Update the publish plan item to marked as published
        publishPlan[nextItemIndex].published = true;
        publishPlan[nextItemIndex].published_at = new Date().toISOString();

        await supabase
          .from("seo_autopilot_settings")
          .update({ 
            publish_plan: publishPlan,
            last_run_at: new Date().toISOString()
          })
          .eq("id", setting.id)

        results.push({ user_id: setting.user_id, status: "success", title: contentData.title });
        console.log(`Successfully auto-published for ${setting.user_id}: ${contentData.title}`);

      } catch (err: any) {
        console.error(`Error processing user ${setting.user_id}:`, err);
        results.push({ user_id: setting.user_id, status: "error", error: err.message });
      }
    }

    return new Response(JSON.stringify({ message: "Cron complete", results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error: any) {
    console.error("Cron Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
