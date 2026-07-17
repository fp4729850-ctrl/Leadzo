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

    // 1. Fetch active Reddit accounts
    const { data: accounts, error } = await supabaseClient
      .from("reddit_accounts")
      .select("*")
      .eq("is_active", true);

    if (error || !accounts) throw new Error("Failed to fetch reddit accounts");

    let processedCount = 0;

    for (const account of accounts) {
      if (account.auth_type !== "developer") continue;

      try {
        console.log(`Processing Reddit Agent for user: ${account.user_id}`);
        
        // --- NEW: Fetch Latest Blog from SEO Agent ---
        const { data: blogs } = await supabaseClient
          .from("blogs")
          .select("title, seo_description, slug, website_url")
          .eq("user_id", account.user_id)
          .order("created_at", { ascending: false })
          .limit(1);
          
        const latestBlog = blogs && blogs.length > 0 ? blogs[0] : null;
        let blogContextText = "";
        let blogLink = account.website_url || "our platform";
        
        if (latestBlog) {
          const siteUrl = latestBlog.website_url.startsWith('http') ? latestBlog.website_url : `https://${latestBlog.website_url}`;
          blogLink = `${siteUrl}/${latestBlog.slug}`;
          blogContextText = `You recently wrote a detailed blog post titled "${latestBlog.title}". Description: "${latestBlog.seo_description}". You must subtly mention and link this exact blog post: ${blogLink} in your response.`;
        }
        
        // 2. Authenticate with Reddit API
        const authString = btoa(`${account.client_id}:${account.client_secret}`);
        const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authString}`,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: `grant_type=password&username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password)}`
        });

        if (!tokenRes.ok) continue;

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        const geminiKey = Deno.env.get("GEMINI_API_KEY");
        
        const targetSubreddits = account.target_subreddits || ["marketing", "SaaS"];
        const keywords = (account.target_keywords || []).join(" OR ") || "software";
        
        // --- MODE 1: Create a NEW POST (Submission) if we have a new blog ---
        if (latestBlog) {
          const submitPrompt = `You are a Reddit expert. Write an engaging, value-packed Reddit text post about "${latestBlog.title}". 
          Use this description for context: "${latestBlog.seo_description}".
          The post must provide real value (tips, insights, or a story) and end by saying they can read the full deep-dive here: ${blogLink}.
          Return ONLY a JSON object in this exact format: {"title": "Catchy Reddit Title", "text": "The full body of the post"}`;

          let postJson = null;
          try {
            const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts: [{ text: submitPrompt }] }] })
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
              const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
              postJson = JSON.parse(jsonStr);
            }
          } catch(e) {}

          if (postJson && postJson.title && postJson.text) {
             const randomSub = targetSubreddits[Math.floor(Math.random() * targetSubreddits.length)];
             const submitRes = await fetch("https://oauth.reddit.com/api/submit", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                  "User-Agent": `LeadzoAIBot/1.0 by ${account.username}`
                },
                body: `api_type=json&sr=${randomSub}&title=${encodeURIComponent(postJson.title)}&text=${encodeURIComponent(postJson.text)}&kind=self`
              });
              if (submitRes.ok) {
                console.log(`Successfully created NEW POST on r/${randomSub}`);
                processedCount++;
              }
          }
        }

        // --- MODE 2: Search and COMMENT on existing posts ---
        const subQuery = targetSubreddits.join("+");
        const searchRes = await fetch(`https://oauth.reddit.com/r/${subQuery}/search?q=${encodeURIComponent(keywords)}&sort=new&limit=2`, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "User-Agent": `LeadzoAIBot/1.0 by ${account.username}`
          }
        });

        if (!searchRes.ok) continue;

        const searchData = await searchRes.json();
        const posts = searchData.data?.children || [];

        for (const post of posts) {
          const postData = post.data;
          
          const systemPrompt = `You are an expert community member on Reddit. 
Read this Reddit post titled "${postData.title}" with content: "${postData.selftext.substring(0, 500)}".
Write a highly valuable, human-like, non-spammy helpful comment (approx 100 words) answering their question.
${blogContextText}
If no blog is provided, just subtly mention this website link at the end: ${blogLink}.`;

          let generatedReply = "";
          try {
            const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              generatedReply = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
            }
          } catch(e) {}
          
          if (!generatedReply) {
             const polliRes = await fetch("https://text.pollinations.ai/", {
                method: "POST", headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({ messages: [{ role: "user", content: systemPrompt }], model: "openai" })
              });
             generatedReply = await polliRes.text();
          }

          if (generatedReply) {
            const commentRes = await fetch("https://oauth.reddit.com/api/comment", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": `LeadzoAIBot/1.0 by ${account.username}`
              },
              body: `api_type=json&text=${encodeURIComponent(generatedReply)}&thing_id=${postData.name}`
            });

            if (commentRes.ok) {
              console.log(`Successfully replied to post: ${postData.title}`);
              processedCount++;
            }
          }
        }
      } catch (err) {
        console.error(`Error processing account ${account.user_id}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, processedCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})
