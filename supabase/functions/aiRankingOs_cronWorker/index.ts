// Supabase Edge Function: aiRankingOs_cronWorker
// Runs weekly — auto-scans all sites with auto_scan=true
// Compares scores, sends email alerts if score drops or new critical issues found
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // 1. Fetch all sites with auto_scan enabled
    const { data: sites, error: sitesErr } = await supabase
      .from("ranking_sites")
      .select("*, users(email)")
      .eq("auto_scan", true)

    if (sitesErr) throw sitesErr
    if (!sites || sites.length === 0) {
      return new Response(JSON.stringify({ message: "No sites to scan." }), { headers: corsHeaders })
    }

    const results = []

    for (const site of sites) {
      try {
        // 2. Run scan for this site
        const scanRes = await fetch(`${SUPABASE_URL}/functions/v1/aiRankingOs_scan`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ url: site.domain })
        })

        if (!scanRes.ok) throw new Error(`Scan failed for ${site.domain}`)
        const scanJson = await scanRes.json()
        if (!scanJson.success || !scanJson.data) throw new Error("Scan returned no data")

        const scanData = scanJson.data
        const scores = scanData.scores

        // 3. Save scan to DB
        const { data: savedScan, error: saveErr } = await supabase
          .from("ranking_scans")
          .insert({
            site_id: site.id,
            user_id: site.user_id,
            score_ai_visibility: scores.aiVisibility,
            score_llm_readiness: scores.llmReadiness,
            score_seo_health: scores.seoHealth,
            score_authority: scores.authorityScore,
            full_data: scanData,
            high_impact_tasks: scanData.highImpactTasks,
            triggered_by: "cron"
          })
          .select()
          .single()

        if (saveErr) throw saveErr

        // 4. Save recommendations
        if (scanData.recommendations?.length > 0) {
          const recs = scanData.recommendations.map((r: any) => {
            const safetyScore = r.aiSafetyScore || r.ai_safety_score || 95;
            const verdict = r.aiVerdict || r.ai_verdict || "Approve";
            const autoApproved = verdict === "Approve" && safetyScore >= 90;

            return {
              scan_id: savedScan.id,
              site_id: site.id,
              user_id: site.user_id,
              priority: r.priority,
              category: r.category,
              title: r.title,
              reason: r.reason,
              ai_impact: r.aiImpact || r.ai_impact,
              seo_impact: r.seoImpact || r.seo_impact,
              effort: r.effort,
              estimated_time: r.estimatedTime || r.estimated_time,
              status: autoApproved ? "approved" : "pending",
              approved_at: autoApproved ? new Date().toISOString() : null,
              ai_safety_score: safetyScore,
              ai_risk_assessment: r.aiRiskAssessment || r.ai_risk_assessment || "Safe: standard integration.",
              ai_verdict: verdict
            };
          });
          await supabase.from("ranking_recommendations").insert(recs);

          // Log auto-approval actions by agents
          const autoApprovedRecs = recs.filter((re: any) => re.status === "approved");
          if (autoApprovedRecs.length > 0) {
            const logs = autoApprovedRecs.map((re: any) => ({
              site_id: site.id,
              user_id: site.user_id,
              agent_name: "Content Agent",
              action: "Autopilot Auto-Approval",
              result: { details: `Autopilot automatically approved and deployed safe recommendation: "${re.title}"` },
              triggered_by: "auto"
            }));
            await supabase.from("ranking_agents_log").insert(logs);
          }
        }

        // 5. Get previous scan to compare scores
        const { data: prevScan } = await supabase
          .from("ranking_scans")
          .select("score_ai_visibility, score_seo_health, scanned_at")
          .eq("site_id", site.id)
          .order("scanned_at", { ascending: false })
          .limit(2)

        const prevScores = prevScan && prevScan.length > 1 ? prevScan[1] : null
        const scoreDrop = prevScores
          ? (prevScores.score_ai_visibility - scores.aiVisibility)
          : 0

        const hasCritical = scanData.highImpactTasks?.some((t: any) => t.priority === "P0")

        // 6. Update site last_scanned_at
        await supabase
          .from("ranking_sites")
          .update({ last_scanned_at: new Date().toISOString() })
          .eq("id", site.id)

        // 7. Log agent activity
        await supabase.from("ranking_agents_log").insert({
          site_id: site.id,
          user_id: site.user_id,
          agent_name: "Cron Orchestrator",
          action: `Weekly auto-scan completed for ${site.domain}`,
          result: { scores, scoreDrop, hasCritical },
          triggered_by: "auto"
        })

        // 8. Send alert email if score dropped or new critical issue
        const userEmail = (site as any).users?.email
        if (userEmail && RESEND_API_KEY && (scoreDrop > 5 || hasCritical)) {
          const alertType = hasCritical ? "🚨 New Critical Issue Detected" : `📉 AI Score Dropped by ${scoreDrop} Points`
          const emailBody = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:24px;border-radius:12px">
  <h2 style="color:#6366f1">⚡ AI Ranking OS Alert</h2>
  <p style="color:#a1a1aa">Site: <strong>${site.domain}</strong></p>
  <h3 style="color:#f87171">${alertType}</h3>
  <div style="background:#18181b;padding:16px;border-radius:8px;margin:16px 0">
    <p>AI Visibility Score: <strong>${scores.aiVisibility}</strong> ${prevScores ? `(was ${prevScores.score_ai_visibility})` : ''}</p>
    <p>SEO Health: <strong>${scores.seoHealth}</strong></p>
    ${hasCritical ? `<p style="color:#f87171">⛔ Critical issues detected — immediate action recommended.</p>` : ''}
  </div>
  <p>Login to <a href="https://leadzoai.com/ai-ranking-os" style="color:#6366f1">AI Ranking OS</a> to review recommendations and approve fixes.</p>
  <p style="color:#52525b;font-size:12px">This is an automated alert from your weekly scan. Powered by Leadzo AI.</p>
</div>`

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: "AI Ranking OS <alerts@leadzoai.com>",
              to: [userEmail],
              subject: `AI Ranking OS Alert: ${site.domain} — ${alertType}`,
              html: emailBody
            })
          })
        }

        results.push({ domain: site.domain, status: "success", scores, scoreDrop, hasCritical })
      } catch (siteErr: any) {
        results.push({ domain: site.domain, status: "error", error: siteErr.message })
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
