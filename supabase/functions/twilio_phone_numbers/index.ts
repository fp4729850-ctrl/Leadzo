import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("No authorization header");

    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
    const vapiApiKey = Deno.env.get("VAPI_PRIVATE_KEY") || Deno.env.get("VAPI_API_KEY");

    if (!twilioSid || !twilioAuth) {
      throw new Error("TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is not configured in backend.");
    }
    if (!vapiApiKey) {
      throw new Error("VAPI API key is not configured in backend.");
    }

    const twilioAuthHeader = "Basic " + btoa(`${twilioSid}:${twilioAuth}`);

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const country = url.searchParams.get('country') || 'US';
      const type = ['IN', 'GB', 'AU'].includes(country) ? 'Mobile' : 'Local';

      // 1. Search for available numbers from Twilio
      const searchRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/AvailablePhoneNumbers/${country}/${type}.json?Limit=5`, {
        method: "GET",
        headers: { "Authorization": twilioAuthHeader }
      });
      
      if (!searchRes.ok) {
        if (searchRes.status === 404) {
          // Twilio returns 404 if the country/type combination doesn't exist in their inventory
          return new Response(
            JSON.stringify({ success: true, numbers: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error("Failed to fetch Twilio numbers: " + await searchRes.text());
      }
      
      const searchData = await searchRes.json();
      return new Response(
        JSON.stringify({ success: true, numbers: searchData.available_phone_numbers }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    else if (req.method === 'POST') {
      const { phoneNumber } = await req.json();
      if (!phoneNumber) throw new Error("phoneNumber is required to purchase");

      // 2. Buy the number from Twilio
      const buyRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers.json`, {
        method: "POST",
        headers: {
          "Authorization": twilioAuthHeader,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ PhoneNumber: phoneNumber }).toString()
      });

      if (!buyRes.ok) {
        const errText = await buyRes.text();
        if (errText.includes("Upgrade your account")) {
          throw new Error("Twilio Trial Accounts cannot buy numbers. Please upgrade your Twilio account first.");
        }
        throw new Error("Failed to purchase Twilio number: " + errText);
      }

      const twilioNumberData = await buyRes.json();

      // 3. Import number into Vapi
      const vapiRes = await fetch("https://api.vapi.ai/phone-number", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${vapiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider: "twilio",
          number: phoneNumber,
          twilioAccountSid: twilioSid,
          twilioAuthToken: twilioAuth,
          name: `Imported Twilio ${phoneNumber}`
        })
      });

      if (!vapiRes.ok) {
        throw new Error("Failed to import number to Vapi: " + await vapiRes.text());
      }

      const vapiData = await vapiRes.json();

      return new Response(
        JSON.stringify({ success: true, vapiPhone: vapiData, twilioNumber: twilioNumberData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  } catch (error: any) {
    console.error("Twilio phone operation error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
