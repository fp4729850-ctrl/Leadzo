import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ─── CORS Headers ───────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-acefone-signature",
};

// ─── Main Handler ────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    console.log("Acefone Webhook Received:", JSON.stringify(body, null, 2));

    // ─── Parse Acefone Payload ───────────────────────────────────────────────
    // Acefone sends tool call data with the properties defined in Agent Studio:
    // { phone_number, customer_name, call_summary, ... }
    const phone_number: string = body.phone_number || body.callerNumber || body.caller_number || "";
    const customer_name: string = body.customer_name || body.customerName || "Unknown";
    const call_summary: string = body.call_summary || body.callSummary || body.summary || "";
    const call_id: string = body.call_id || body.callId || body.session_id || "";
    const call_duration: number = body.call_duration || body.duration || 0;
    const call_status: string = body.call_status || body.status || "completed";

    if (!phone_number) {
      console.warn("No phone_number in Acefone payload — logging raw body");
      // Still return 200 so Acefone doesn't retry
      return new Response(
        JSON.stringify({ success: true, message: "Received but no phone_number present" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Supabase Admin Client ───────────────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ─── 1. Find existing lead by phone number ───────────────────────────────
    const { data: existingLead } = await supabaseAdmin
      .from("crm_leads")
      .select("id, user_id, name")
      .eq("phone", phone_number)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const now = new Date().toISOString();

    // ─── 2. Update or Create Lead in CRM ────────────────────────────────────
    let lead_id: string | null = null;
    let user_id: string | null = null;

    if (existingLead) {
      lead_id = existingLead.id;
      user_id = existingLead.user_id;

      // Update lead with call info
      await supabaseAdmin
        .from("crm_leads")
        .update({
          name: customer_name !== "Unknown" ? customer_name : existingLead.name,
          last_interaction: now,
          notes: call_summary
            ? `[Acefone AI Call - ${new Date().toLocaleDateString("en-IN")}]\n${call_summary}`
            : undefined,
        })
        .eq("id", lead_id);

      console.log(`Updated existing lead: ${lead_id} (${phone_number})`);
    } else {
      // Create new lead — we need a user_id, try to get from business_knowledge
      // (use the first active business as fallback for unmatched calls)
      const { data: anyBusiness } = await supabaseAdmin
        .from("business_knowledge")
        .select("user_id")
        .limit(1)
        .single();

      if (anyBusiness) {
        user_id = anyBusiness.user_id;

        const { data: newLead } = await supabaseAdmin
          .from("crm_leads")
          .insert({
            user_id: anyBusiness.user_id,
            name: customer_name,
            phone: phone_number,
            source: "acefone_ai_call",
            status: "new",
            notes: call_summary
              ? `[Acefone AI Call - ${new Date().toLocaleDateString("en-IN")}]\n${call_summary}`
              : "Lead created via Acefone AI Voice Agent",
            last_interaction: now,
          })
          .select("id")
          .single();

        lead_id = newLead?.id ?? null;
        console.log(`Created new lead: ${lead_id} for ${phone_number}`);
      }
    }

    // ─── 3. Log to customer_memory ───────────────────────────────────────────
    if (user_id) {
      const memoryContent = [
        `📞 Acefone AI Call`,
        `Caller: ${customer_name} (${phone_number})`,
        call_duration ? `Duration: ${call_duration}s` : null,
        call_id ? `Call ID: ${call_id}` : null,
        call_summary ? `Summary: ${call_summary}` : null,
        `Status: ${call_status}`,
      ]
        .filter(Boolean)
        .join("\n");

      await supabaseAdmin.from("customer_memory").insert({
        user_id,
        customer_id: phone_number,
        channel: "acefone_voice",
        content: memoryContent,
        created_at: now,
      });

      console.log(`Logged customer memory for ${phone_number}`);
    }

    // ─── 4. Return Success ───────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        message: "Acefone webhook processed successfully",
        lead_id,
        phone_number,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Acefone Webhook Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
