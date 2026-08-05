import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.11.0"

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
    const morphKey = Deno.env.get("MORPH_API_KEY") || "sk-WdUnPKo3NA9vW5K6yPsYSX5e5mN4H2o5Sf6fGP21a4xdARRt"

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing environment variables")
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

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
        // Enforce randomized interval check (8, 10, or 12 hours) between blogs
        const { data: lastBlog } = await supabase
          .from("blogs")
          .select("created_at")
          .eq("website_url", setting.url)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastBlog) {
          const lastBlogTime = new Date(lastBlog.created_at).getTime();
          // Generate a stable pseudo-randomized interval of 8, 10, or 12 hours based on last blog's timestamp seed
          const intervals = [8, 10, 12];
          const targetIntervalHours = intervals[lastBlogTime % intervals.length];
          const hoursSinceLast = (Date.now() - lastBlogTime) / (1000 * 60 * 60);

          if (hoursSinceLast < targetIntervalHours) {
            console.log(`Skipping website ${setting.url}. Only ${hoursSinceLast.toFixed(2)} hours elapsed since last blog. Target is ${targetIntervalHours} hours.`);
            continue;
          }
        }

        const publishPlan = setting.publish_plan || [];
        
        // Find the first unpublished item of any type to process (one per cron tick)
        const nextItemIndex = publishPlan.findIndex((item: any) => !item.published);
        
        if (nextItemIndex === -1) {
          console.log(`User ${setting.user_id} has no pending items in publish_plan.`);
          continue;
        }

        const targetItem = publishPlan[nextItemIndex];
        console.log(`Processing topic: ${targetItem.task || targetItem.title} for ${setting.url}`);

        // 2.5 Fetch previous blogs for Internal Linking
        const { data: prevBlogs } = await supabase
          .from("blogs")
          .select("title, slug")
          .eq("website_url", setting.url)
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(10);
        
        const internalLinksCtx = prevBlogs && prevBlogs.length > 0 ? 
          `\n\nHere are some previously published articles on this website:\n${JSON.stringify(prevBlogs)}\nIf any of these are highly relevant to the current topic, you MUST try to naturally hyperlink at least 1-3 of them in your HTML content using the format: <a href="/blog/slug-here">Relevant Text</a>.` : "";

        // 3. Generate Content using AI Fallback Chain
        let prompt = "";
        
        if (targetItem.type === "local_page") {
          prompt = `You are an expert Local SEO Content Writer for the website ${setting.url} in the niche of ${setting.niche}.
Please write a highly optimized, engaging local landing page about: "${targetItem.task}".
Target City: ${targetItem.city || "Unknown"}
Service: ${targetItem.service || setting.niche}
Include localized headings, paragraphs, and use these keywords naturally: ${targetItem.keywords.join(', ')}.${internalLinksCtx}

Respond ONLY with a JSON object in this format:
{
  "title": "A catchy, Local SEO optimized title for the post including the city",
  "slug": "seo-friendly-url-slug-with-city",
  "html_content": "The full local page content formatted in valid, clean HTML. Use <h2>, <h3>, <p>, <ul>, <li>, and <strong> tags. Do NOT use Markdown.",
  "seo_description": "A 150-character local meta description."
}`;
        } else if (targetItem.type === "striking_distance") {
          prompt = `You are an expert SEO Optimizer for the website ${setting.url}.
Your task is to write an optimized blog post for the following keywords that are currently ranking on Page 2 (Striking Distance):
${targetItem.keywords.join(', ')}

Ensure the content has a unique marketing hook. Focus on a specific aspect of the niche (e.g., ad spend ROI, WhatsApp automation, or AI lead capture). Avoid repeating intros or structural outlines from previous posts. Write a distinct, high-value piece that acts as an industry case study or guide.

Respond ONLY with a JSON object in this format:
{
  "title": "A high-CTR, highly optimized SEO title covering these keywords",
  "slug": "seo-friendly-url-slug-based-on-title",
  "html_content": "A full 500+ word blog post in valid HTML covering these keywords with <h2>, <h3>, <p>, <ul>, <li>, <strong> tags. Do NOT use Markdown.",
  "seo_description": "A 150-character high-CTR meta description."
}`;
        } else {
          // Default blog post
          prompt = `You are an expert SEO Content Writer for the website ${setting.url} in the niche of ${setting.niche}.
Please write a highly optimized, engaging blog post about: "${targetItem.task}".
Include headings, paragraphs, and use these keywords naturally: ${targetItem.keywords.join(', ')}.${internalLinksCtx}

IMPORTANT FOR CONTENT DIVERSITY:
- Make this post highly distinct from previous articles. 
- Focus deeply on one specific sub-angle (e.g., Leadzo's WhatsApp CRM lead nurturing, or autonomous Meta ad bidding, or synthetic SEO crawling visibility).
- Avoid generic intro/outro text. Write with concrete SaaS/marketing authority and include unique industry examples.

Respond ONLY with a JSON object in this format:
{
  "title": "A catchy, SEO optimized title for the post",
  "slug": "seo-friendly-url-slug",
  "html_content": "The full blog post content formatted in valid, clean HTML. Use <h2>, <h3>, <p>, <ul>, <li>, and <strong> tags. Do NOT use Markdown.",
  "seo_description": "A 150-character meta description."
}`;
        }

        let generatedText = null;
        let lastError = null;

        try {
          console.log("Calling Morph AI models for SEO...");
          const morphModels = ["morph-minimax3-428b", "morph-minimax27-230b", "morph-dsv4flash", "morph-qwen36-27b"];
          
          for (const model of morphModels) {
            try {
              console.log(`Trying Morph model: ${model}`);
              const morphRes = await fetch("https://api.morphllm.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${morphKey}` },
                body: JSON.stringify({
                  model: model,
                  messages: [
                    { role: "system", content: "You are an expert SEO Content Writer. Respond ONLY with valid JSON containing keys: title, slug, html_content, seo_description. DO NOT wrap in markdown." },
                    { role: "user", content: prompt }
                  ]
                })
              });

              if (morphRes.status === 429) { lastError = "429 Quota Exceeded"; continue; }
              if (!morphRes.ok) { lastError = `${morphRes.status} Error from Morph`; continue; }

              const morphData = await morphRes.json();
              if (morphData.error) { lastError = morphData.error.message; continue; }

              generatedText = morphData.choices?.[0]?.message?.content;
              if (generatedText) break;
            } catch (e) {
              lastError = e.message;
            }
          }
          if (!generatedText) throw new Error("All Morph models failed.");
        } catch (morphErr) {
          console.warn("Morph API failed for SEO, falling back to Gemini...", morphErr);
          
          const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("HERCULES_API_KEY");
          if (geminiKey) {
            const geminiPayload = {
              contents: [{ parts: [{ text: "You are an expert SEO Content Writer. Respond ONLY with valid JSON. DO NOT wrap in markdown.\n\n" + prompt }] }],
              generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
            };
            const models = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite-001", "gemini-flash-latest"];
            
            for (const model of models) {
              try {
                console.log(`Trying Gemini model: ${model}`);
                const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
                  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(geminiPayload)
                });
                
                if (geminiRes.status === 429) { lastError = "429 Quota Exceeded"; continue; }
                if (!geminiRes.ok) { lastError = `${geminiRes.status} Error`; continue; }
                
                const geminiData = await geminiRes.json();
                if (geminiData.error) { lastError = geminiData.error.message; continue; }
                
                if (geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
                  generatedText = geminiData.candidates[0].content.parts[0].text;
                  break;
                }
              } catch(e) { lastError = e.message; }
            }
          }
          
          if (!generatedText) {
            console.warn("Gemini failed for SEO, falling back to Pollinations AI...");
            try {
              const polliRes = await fetch("https://text.pollinations.ai/", {
                method: "POST", headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({
                  messages: [
                    { role: "system", content: "You are an expert SEO Content Writer. Respond ONLY with valid JSON containing keys: title, slug, html_content, seo_description. DO NOT wrap in markdown." },
                    { role: "user", content: prompt }
                  ],
                  jsonMode: true,
                  model: "openai"
                })
              });
              generatedText = await polliRes.text();
            } catch (polliErr) {
              console.error("Pollinations fallback failed:", polliErr);
            }
          }
        }

        if (!generatedText) throw new Error(`All AI models failed for SEO. Last error: ${lastError}`);

        const text = generatedText.trim().replace(/```json/g, "").replace(/```/g, "");
        const contentData = JSON.parse(text);

        // Generate slug from title (always derived from actual title, not AI-generated slug)
        const cleanSlug = contentData.title
          .toLowerCase()
          .replace(/[|]/g, '') // remove pipe characters
          .replace(/[^a-z0-9\s-]/g, '') // remove special chars
          .trim()
          .replace(/\s+/g, '-') // spaces to hyphens
          .replace(/-+/g, '-') // collapse multiple hyphens
          .substring(0, 60); // max 60 chars
        const finalSlug = `${cleanSlug}-${Math.random().toString(36).substring(2, 7)}`;

        // 4. Save to blogs table
        const { error: insertErr } = await supabase
          .from("blogs")
          .insert({
            title: contentData.title,
            slug: finalSlug,
            html_content: contentData.html_content,
            seo_description: contentData.seo_description,
            author: "Leadzo AI Autopilot",
            published: true,
            user_id: setting.user_id,
            website_url: setting.url
          })

        if (insertErr) throw insertErr;

        // 4.5 Auto-Push to GitHub if configured
        if (setting.github_repo && setting.github_token) {
          try {
            console.log(`Pushing to GitHub repo: ${setting.github_repo}`);
            const generatedSlug = contentData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            const filePath = targetItem.type === "local_page" ? `content/locations/${generatedSlug}.md` : `content/blog/${generatedSlug}.md`;
            const fileContent = `---
title: "${contentData.metaTitle || contentData.title}"
description: "${contentData.seo_description || contentData.metaDescription || ''}"
date: "${new Date().toISOString()}"
---

${contentData.html_content}
`;
            
            // Deno's btoa takes string, but we need to encode properly for unicode
            const encodedContent = btoa(unescape(encodeURIComponent(fileContent)));
            
            const ghRes = await fetch(`https://api.github.com/repos/${setting.github_repo}/contents/${filePath}`, {
              method: "PUT",
              headers: {
                "Authorization": `token ${setting.github_token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                message: `Leadzo AI Autopilot: Add SEO blog post - ${contentData.title}`,
                content: encodedContent
              })
            });
            
            if (!ghRes.ok) {
              const ghErr = await ghRes.json();
              console.error("GitHub Push Failed:", ghErr);
            } else {
              console.log("Successfully pushed to GitHub!");
            }
          } catch (ghErr) {
            console.error("GitHub Push Exception:", ghErr);
          }
        }

        // 5. Update the publish plan item to marked as published
        publishPlan[nextItemIndex].published = true;
        publishPlan[nextItemIndex].published_at = new Date().toISOString();

        results.push({ user_id: setting.user_id, status: "success", title: contentData.title });
        console.log(`Successfully auto-published for ${setting.user_id}: ${contentData.title}`);

        await supabase
          .from("seo_autopilot_settings")
          .update({ 
            publish_plan: publishPlan,
            last_run_at: new Date().toISOString()
          })
          .eq("id", setting.id)

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
