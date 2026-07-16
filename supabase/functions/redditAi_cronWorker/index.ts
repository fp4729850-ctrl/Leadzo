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
      if (account.auth_type !== "developer") continue; // Skip OAuth for now

      try {
        console.log(`Processing Reddit Agent for user: ${account.user_id}`);
        
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

        if (!tokenRes.ok) {
          console.error(`Failed to auth Reddit for ${account.username}`, await tokenRes.text());
          continue;
        }

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        
        // 3. Search target subreddits
        const subreddits = (account.target_subreddits || []).join("+") || "marketing+SaaS";
        const keywords = (account.target_keywords || []).join(" OR ") || "software";
        
        const searchRes = await fetch(`https://oauth.reddit.com/r/${subreddits}/search?q=${encodeURIComponent(keywords)}&sort=new&limit=3`, {
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
          
          // 4. Generate AI Reply using Fallback System
          const geminiKey = Deno.env.get("GEMINI_API_KEY");
          const systemPrompt = `You are an expert community member on Reddit. 
Read this Reddit post titled "${postData.title}" with content: "${postData.selftext.substring(0, 500)}".
Write a highly valuable, human-like, non-spammy helpful comment (approx 100 words).
Subtly include this website link at the end: ${account.website_url || 'our platform'}.`;

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
          
          // Fallback to Pollinations AI if Gemini fails
          if (!generatedReply) {
             const polliRes = await fetch("https://text.pollinations.ai/", {
                method: "POST", headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({
                  messages: [{ role: "user", content: systemPrompt }],
                  model: "openai"
                })
              });
             generatedReply = await polliRes.text();
          }

          if (generatedReply) {
            // 5. Post comment to Reddit
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
