// Supabase Edge Function: seoAi_autoPublishWebhook
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { webhookUrl, contentData, url } = await req.json()

    // Also save to Leadzo native blog DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Create a slug from the title
    const slug = contentData.metaTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
      
    // Append a random string to ensure unique slug if it already exists
    const uniqueSlug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;

    const { error: dbError } = await supabase
      .from("blogs")
      .insert({
        title: contentData.metaTitle,
        slug: uniqueSlug,
        seo_description: contentData.metaDescription,
        html_content: contentData.content,
      });

    if (dbError) {
      console.error("Failed to save to internal blog DB:", dbError);
    }

    if (!webhookUrl || !webhookUrl.startsWith("http")) {
       return new Response(JSON.stringify({ success: true, message: "Saved to Leadzo Blog!" }), { 
         headers: { ...corsHeaders, "Content-Type": "application/json" } 
       })
    }

    // Send data to user's Zapier / Make webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "Leadzo AI Auto-Publish",
        targetWebsite: url,
        title: contentData.metaTitle,
        seoDescription: contentData.metaDescription,
        htmlContent: contentData.content,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
       throw new Error(`Webhook responded with status ${response.status}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Published to Blog and Webhook!" }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})
