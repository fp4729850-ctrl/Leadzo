// Supabase Edge Function: gscActions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || ""
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || ""

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const body = await req.json()
    const { action } = body

    let user: any = null
    const authHeader = req.headers.get("Authorization")
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "")
      try {
        const { data } = await supabase.auth.getUser(token)
        if (data?.user) user = data.user
      } catch (e) {
        // ignore anon key error
      }
    }

    if (!user) {
      const fallbackId = body.user_id || body.state || "00000000-0000-0000-0000-000000000000"
      user = { id: fallbackId }
    }

    // ── 1. GET OAUTH URL ──────────────────────────────────────────────────
    if (action === "getGscOAuthUrl") {
      const { redirectUri } = body
      if (!redirectUri) throw new Error("Missing redirectUri")

      const scopes = [
        "https://www.googleapis.com/auth/webmasters.readonly",
        "https://www.googleapis.com/auth/userinfo.email"
      ].join(" ")

      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
      url.searchParams.set("client_id", GOOGLE_CLIENT_ID)
      url.searchParams.set("redirect_uri", redirectUri)
      url.searchParams.set("response_type", "code")
      url.searchParams.set("scope", scopes)
      url.searchParams.set("access_type", "offline")
      url.searchParams.set("prompt", "consent")
      url.searchParams.set("state", user.id)

      return new Response(JSON.stringify({ success: true, url: url.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // ── 2. EXCHANGE CODE FOR TOKENS ───────────────────────────────────────
    if (action === "exchangeGscCode") {
      const { code, redirectUri } = body
      if (!code || !redirectUri) throw new Error("Missing code or redirectUri")

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      })

      const tokenData = await tokenRes.json()
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error)

      let refresh_token = tokenData.refresh_token;

      if (!refresh_token) {
        // Fallback: Check if user already has a saved refresh_token in gsc_tokens from previous auth
        const { data: existingToken } = await supabase
          .from("gsc_tokens")
          .select("refresh_token")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingToken?.refresh_token) {
          refresh_token = existingToken.refresh_token;
        } else {
          throw new Error("Google did not return a refresh token. Revoke access from your Google Account settings and try again.");
        }
      }

      // Save/Update in gsc_tokens table (safe delete old + insert)
      await supabase.from("gsc_tokens").delete().eq("user_id", user.id)
      const { error: dbErr } = await supabase
        .from("gsc_tokens")
        .insert({
          user_id: user.id,
          refresh_token: refresh_token,
          connected: true,
          created_at: new Date().toISOString()
        })

      if (dbErr) throw dbErr

      // Automatically mark user's sites as gsc_connected = true in AI Ranking OS
      await supabase
        .from("ranking_sites")
        .update({ gsc_connected: true })
        .eq("user_id", user.id)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Load GSC access token using refresh token
    const getAccessToken = async () => {
      const { data, error } = await supabase
        .from("gsc_tokens")
        .select("refresh_token")
        .eq("user_id", user.id)
        .maybeSingle()

      if (error || !data) throw new Error("Google Search Console not connected. Please connect GSC first.")

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: data.refresh_token,
          grant_type: "refresh_token",
        }),
      })

      const tokenData = await tokenRes.json()
      if (tokenData.error) throw new Error("Failed to refresh Google access token: " + tokenData.error)
      return tokenData.access_token
    }

    // ── 3. GET SITES ──────────────────────────────────────────────────────
    if (action === "getGscSites") {
      const accessToken = await getAccessToken()
      const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
        headers: { "Authorization": `Bearer ${accessToken}` }
      })

      const data = await res.json()
      const sites = (data.siteEntry || []).map((s: any) => s.siteUrl)
      return new Response(JSON.stringify({ success: true, sites }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // ── 4. GET REAL RANKINGS ──────────────────────────────────────────────
    if (action === "getRealRankings") {
      const { siteUrl, startDate, endDate, rowLimit = 25 } = body
      if (!siteUrl || !startDate || !endDate) throw new Error("Missing params")

      const accessToken = await getAccessToken()
      const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["query"],
          rowLimit
        })
      })

      const data = await res.json()
      const rankings = (data.rows || []).map((r: any) => ({
        keyword: r.keys[0],
        position: Math.round(r.position * 10) / 10,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Math.round(r.ctr * 1000) / 10
      }))

      return new Response(JSON.stringify({ success: true, rankings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // ── 5. GET PAGE PERFORMANCE ───────────────────────────────────────────
    if (action === "getPagePerformance") {
      const { siteUrl, startDate, endDate, rowLimit = 20 } = body
      if (!siteUrl || !startDate || !endDate) throw new Error("Missing params")

      const accessToken = await getAccessToken()
      const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["page"],
          rowLimit
        })
      })

      const data = await res.json()
      const pages = (data.rows || []).map((r: any) => ({
        page: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        position: Math.round(r.position * 10) / 10,
        ctr: Math.round(r.ctr * 1000) / 10
      }))

      return new Response(JSON.stringify({ success: true, pages }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // ── 6. GET TRAFFIC COMPARISON ─────────────────────────────────────────
    if (action === "getTrafficComparison") {
      const { siteUrl, currentStart, currentEnd, previousStart, previousEnd } = body
      if (!siteUrl || !currentStart || !currentEnd || !previousStart || !previousEnd) throw new Error("Missing params")

      const accessToken = await getAccessToken()

      // Fetch current period
      const currentRes = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          startDate: currentStart,
          endDate: currentEnd
        })
      })
      const currentData = await currentRes.json()
      const currentStats = currentData.rows?.[0] || { clicks: 0, impressions: 0, position: 0 }

      // Fetch previous period
      const prevRes = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          startDate: previousStart,
          endDate: previousEnd
        })
      })
      const prevData = await prevRes.json()
      const prevStats = prevData.rows?.[0] || { clicks: 0, impressions: 0, position: 0 }

      const currentClicks = currentStats.clicks
      const currentImpressions = currentStats.impressions
      const currentPos = Math.round(currentStats.position * 10) / 10

      const prevClicks = prevStats.clicks
      const prevImpressions = prevStats.impressions
      const prevPos = Math.round(prevStats.position * 10) / 10

      const clickChange = prevClicks > 0 ? Math.round(((currentClicks - prevClicks) / prevClicks) * 100) : 0
      const impChange = prevImpressions > 0 ? Math.round(((currentImpressions - prevImpressions) / prevImpressions) * 100) : 0
      const posChange = prevPos > 0 ? Math.round(((currentPos - prevPos) / prevPos) * 100) : 0

      return new Response(JSON.stringify({
        success: true,
        current: { clicks: currentClicks, impressions: currentImpressions, avgPosition: currentPos },
        previous: { clicks: prevClicks, impressions: prevImpressions, avgPosition: prevPos },
        change: { clicks: clickChange, impressions: impChange, position: posChange }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    throw new Error("Invalid action")

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
