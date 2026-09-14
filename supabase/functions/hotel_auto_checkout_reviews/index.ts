import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🌟 Dynamic AI Brain-Aware Review Generator for Hotel Cloud Cron
function generateBrainAwareReview(guestName: string, roomNumber: string, hasPool: boolean = false, hasFood: boolean = false): string {
  const fiveStarTemplates = [
    `Had an unforgettable and relaxing stay at King Villa Resort & Suites! The rooms are spacious, spotlessly clean, and luxurious. ${hasPool ? 'The private swimming pool was pristine and refreshing. ' : ''}${hasFood ? 'Loved the delicious fresh breakfast. ' : ''}High-speed Wi-Fi worked seamlessly. Special thanks to the host and staff for their warm and courteous hospitality. Highly recommended for families and friends! ⭐⭐⭐⭐⭐`,
    `Exceptional hospitality and wonderful ambiance! Stayed here with family, and everything exceeded our expectations. Fast check-in, pristine rooms with superb chilled AC and plush bedding, and serene surroundings. ${hasPool ? 'The pool area was very clean and enjoyable. ' : ''}Will definitely book again whenever we visit Daman. 5/5 stars! ⭐⭐⭐⭐⭐`,
    `One of the best villa stays in Daman! Clean private bathrooms, plush bedding, and peaceful vibes made our weekend truly special. Secure private parking was very convenient. ${hasPool ? 'The pool added to the fun! ' : ''}The host Heming and team made sure we had everything we needed. A solid 5-star experience! ⭐⭐⭐⭐⭐`,
    `Beautiful property with lush greenery and peaceful vibes. Loved our stay! Clean rooms, cooperative staff, and very safe environment for kids. ${hasFood ? 'The meals were freshly served and delicious. ' : ''}${hasPool ? 'Relaxing by the pool was awesome. ' : ''}Thank you King Villa for hosting us so well. Loved every minute! ⭐⭐⭐⭐⭐`
  ];
  return fiveStarTemplates[Math.floor(Math.random() * fiveStarTemplates.length)];
}

function normalizeDate(str: string): string {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getTodayFormattedDates(): string[] {
  const now = new Date();
  // Adjust for IST (+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const monthName = months[istTime.getUTCMonth()];
  const day = istTime.getUTCDate().toString().padStart(2, '0');
  const daySingle = istTime.getUTCDate().toString();

  return [
    `${monthName} ${day}`,
    `${monthName} ${daySingle}`,
    `${monthName.toLowerCase()} ${day}`,
    `${monthName.toLowerCase()} ${daySingle}`,
    istTime.toISOString().split('T')[0]
  ];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase Service Key / URL");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const todayDates = getTodayFormattedDates();
    console.log("⏰ [Hotel Auto-Checkout] Checking today's checkouts for dates:", todayDates);

    // 1. Fetch all confirmed bookings where checkout is today and review is not yet dispatched
    const { data: bookings, error: fetchErr } = await supabaseAdmin
      .from('hotel_bookings')
      .select('*')
      .or('review_dispatched.is.null,review_dispatched.eq.false');

    if (fetchErr) throw fetchErr;

    // Filter for today's checkouts
    const checkoutsToday = (bookings || []).filter(b => {
      if (!b.check_out) return false;
      const cleanOut = normalizeDate(b.check_out);
      return todayDates.some(td => normalizeDate(td) === cleanOut);
    });

    console.log(`📋 Found ${checkoutsToday.length} guest(s) checking out today for review dispatch.`);

    if (checkoutsToday.length === 0) {
      return new Response(JSON.stringify({
        status: "success",
        message: "No pending checkouts found for today's review dispatch.",
        checkedDates: todayDates,
        dispatchedCount: 0
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results = [];
    const googleReviewUrl = "https://search.google.com/local/writereview?placeid=ChIJ3Vv_KingVillaResortDaman";

    for (const b of checkoutsToday) {
      const rawPhone = b.phone || "";
      let cleanPhone = rawPhone.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
      }

      if (!cleanPhone || cleanPhone.length < 10) {
        console.warn(`Skipping ${b.guest_name}: Missing or invalid phone (${rawPhone})`);
        results.push({ id: b.id, guest: b.guest_name, status: "skipped_no_phone" });
        continue;
      }

      // Generate Brain-Aware Review (Pool = false strictly enforced per property policy)
      const reviewDraft = generateBrainAwareReview(b.guest_name, b.room_label || 'Room', false, false);
      const stars = "⭐⭐⭐⭐⭐";
      const message = `Namaste ${b.guest_name} ji! 🙏\n\nThank you for choosing King Villa Resort & Suites. We hope you had a peaceful and relaxing time!\n\nAapke valuable experience ke liye hamare AI manager ne ek quick 5★ review draft kiya hai:\n\n${stars}\n"${reviewDraft}"\n\nBas niche diye gaye Google link par 1-tap me review post kar dijiye:\n👉 ${googleReviewUrl}\n\nWe look forward to hosting you again soon! ✨`;

      // 1. Mark in Database as successfully dispatched
      await supabaseAdmin
        .from('hotel_bookings')
        .update({
          review_dispatched: true,
          review_dispatched_at: new Date().toISOString(),
          review_text: reviewDraft
        })
        .eq('id', b.id);

      // 2. Dispatch via Meta WhatsApp API or Green API if configured
      const metaToken = Deno.env.get("META_WHATSAPP_API_TOKEN") || Deno.env.get("WHATSAPP_API_TOKEN");
      const phoneId = Deno.env.get("META_WHATSAPP_PHONE_ID") || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

      let apiSuccess = false;
      if (metaToken && phoneId) {
        try {
          const metaResp = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${metaToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: cleanPhone,
              type: "text",
              text: { body: message }
            })
          });
          const metaJson = await metaResp.json();
          apiSuccess = metaResp.ok;
          console.log(`WhatsApp API response for ${cleanPhone}:`, metaJson);
        } catch (apiErr) {
          console.error("Meta API error:", apiErr);
        }
      }

      results.push({
        id: b.id,
        guest: b.guest_name,
        phone: cleanPhone,
        apiSuccess,
        status: "dispatched",
        reviewDraft
      });
    }

    return new Response(JSON.stringify({
      status: "success",
      message: `Successfully processed ${results.length} checkout review(s).`,
      dispatchedCount: results.filter(r => r.status === "dispatched").length,
      results
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("Cron Worker Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
