import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Google OAuth App credentials (set in Supabase secrets)
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || ""
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || ""
const REDIRECT_URI = "https://www.leadzoai.com/auth/google-ads-callback"

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const body = await req.json()
    const { action } = body

    // ── ACTION 1: Generate OAuth URL ──────────────────────────────────────
    if (action === "get_auth_url") {
      const scopes = [
        "https://www.googleapis.com/auth/adwords",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" ")

      const state = body.userId || "unknown"

      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
      url.searchParams.set("client_id", GOOGLE_CLIENT_ID)
      url.searchParams.set("redirect_uri", REDIRECT_URI)
      url.searchParams.set("response_type", "code")
      url.searchParams.set("scope", scopes)
      url.searchParams.set("access_type", "offline")
      url.searchParams.set("prompt", "consent")
      url.searchParams.set("state", state)

      return new Response(JSON.stringify({ url: url.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // ── ACTION 2: Exchange code for tokens ────────────────────────────────
    if (action === "exchange_code") {
      const { code, userId, customerId } = body

      if (!code || !userId) {
        return new Response(JSON.stringify({ error: "Missing code or userId" }), {
          status: 400, headers: corsHeaders
        })
      }

      // Exchange code for access + refresh tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      })

      const tokenData = await tokenRes.json()

      if (tokenData.error) {
        console.error("Google token error:", tokenData)
        return new Response(JSON.stringify({ error: tokenData.error_description || tokenData.error }), {
          status: 400, headers: corsHeaders
        })
      }

      const { access_token, refresh_token } = tokenData

      // Save tokens to Supabase users table
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      )

      const { error: dbErr } = await supabase.from("users").upsert({
        id: userId,
        google_ads_access_token: access_token,
        google_ads_refresh_token: refresh_token,
        google_ads_customer_id: customerId || null,
        google_ads_connected: true,
        google_ads_connected_at: new Date().toISOString(),
      })

      if (dbErr) {
        console.error("DB error:", dbErr)
        // Try updating instead
        await supabase.from("users")
          .update({
            google_ads_access_token: access_token,
            google_ads_refresh_token: refresh_token,
            google_ads_customer_id: customerId || null,
            google_ads_connected: true,
          })
          .eq("id", userId)
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // ── ACTION 3: Check connection status ─────────────────────────────────
    if (action === "check_status") {
      const { userId } = body
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      )

      const { data } = await supabase
        .from("users")
        .select("google_ads_connected, google_ads_customer_id, google_ads_connected_at")
        .eq("id", userId)
        .single()

      return new Response(JSON.stringify({
        connected: data?.google_ads_connected === true,
        customerId: data?.google_ads_customer_id,
        connectedAt: data?.google_ads_connected_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders })

  } catch (err: any) {
    console.error("googleAds_oauth error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders
    })
  }
})
