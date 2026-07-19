import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const vapiApiKey = Deno.env.get("VAPI_API_KEY")
    if (!vapiApiKey) {
      throw new Error("Missing VAPI_API_KEY")
    }

    const body = await req.json().catch(() => ({}))
    const limit = body.limit ?? 10
    const page = body.page ?? 0

    // Build query params for Vapi - only 'limit' is supported
    const params = new URLSearchParams({
      limit: String(limit),
    })

    const vapiRes = await fetch(`https://api.vapi.ai/call?${params}`, {
      headers: {
        "Authorization": `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json"
      }
    })

    if (!vapiRes.ok) {
      const errText = await vapiRes.text()
      throw new Error(`Vapi API error: ${errText}`)
    }

    const data = await vapiRes.json()

    // data is an array of call objects
    const calls = Array.isArray(data) ? data : (data.results ?? data.calls ?? [])

    // Sort by newest first
    const sorted = calls.sort((a: any, b: any) =>
      new Date(b.startedAt || b.createdAt || 0).getTime() -
      new Date(a.startedAt || a.createdAt || 0).getTime()
    )

    // Paginate client-side (Vapi free tier may not support offset)
    const paginated = sorted.slice(page * limit, page * limit + limit)

    // Map to our interface
    const mapped = paginated.map((c: any) => ({
      id: c.id,
      status: c.status,
      customer: c.customer,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      endedReason: c.endedReason,
      cost: c.cost,
      durationSeconds: c.endedAt && c.startedAt
        ? (new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000
        : undefined,
      messages: c.artifact?.messages ?? c.messages ?? [],
      summary: c.analysis?.summary ?? c.summary ?? null,
      transcript: c.artifact?.transcript ?? c.transcript ?? null,
    }))

    return new Response(JSON.stringify({ calls: mapped, total: sorted.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error: any) {
    console.error("vapiLogs_getCalls error:", error)
    return new Response(JSON.stringify({ error: error.message, calls: [] }), {
      status: 200, // Return 200 so UI doesn't crash
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
