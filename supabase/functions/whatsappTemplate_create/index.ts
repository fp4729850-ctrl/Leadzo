import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { templateName, messageBody, billingMode, urlText, urlLink, phoneText, phoneNumber } = await req.json()
    
    // Validate inputs
    if (!templateName || !messageBody) {
      return new Response(JSON.stringify({ error: "Missing templateName or messageBody" }), { status: 400, headers: corsHeaders });
    }

    // Default to Leadzo Wallet / Central Token if no user token is provided
    let token = Deno.env.get("META_WHATSAPP_API_TOKEN") || Deno.env.get("WHATSAPP_API_TOKEN") || "";
    let wabaId = Deno.env.get("META_WHATSAPP_BUSINESS_ACCOUNT_ID") || "";
    let prefix = "lzo_";

    if (billingMode === "byot") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
      const authHeader = req.headers.get("Authorization");
      
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader || "" } }
      });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      
      const { data: userData } = await supabase.from('users').select('whatsapp_api_token, whatsapp_business_account_id').eq('id', user.id).single();
      
      if (!userData?.whatsapp_api_token || !userData?.whatsapp_business_account_id) {
        return new Response(JSON.stringify({ error: "Meta API keys not configured in Settings" }), { status: 400, headers: corsHeaders });
      }
      
      token = userData.whatsapp_api_token;
      wabaId = userData.whatsapp_business_account_id;
      prefix = "byot_";
    }

    if (!token || !wabaId) {
      return new Response(JSON.stringify({ error: "Meta API Configuration Missing" }), { status: 500, headers: corsHeaders });
    }

    // Generate unique template name
    const cleanName = templateName.replace(/[^a-z0-9_]/gi, '_').toLowerCase().substring(0, 400);
    const randomHash = Math.random().toString(36).substring(2, 6);
    const finalTemplateName = `${prefix}${cleanName}_${randomHash}`;

    const components: any[] = [
      {
        type: "BODY",
        text: messageBody
      }
    ];

    const buttons = [];
    if (urlText && urlLink) {
      buttons.push({
        type: "URL",
        text: urlText,
        url: urlLink
      });
    }
    if (phoneText && phoneNumber) {
      buttons.push({
        type: "PHONE_NUMBER",
        text: phoneText,
        phone_number: phoneNumber
      });
    }

    if (buttons.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons: buttons
      });
    }

    // Meta Graph API POST payload
    const payload = {
      name: finalTemplateName,
      language: "en_US",
      category: "MARKETING",
      components: components
    };

    const url = `https://graph.facebook.com/v20.0/${wabaId}/message_templates`;
    
    const metaResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const metaResult = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error("Meta Template Creation Error:", metaResult);
      return new Response(JSON.stringify({ error: metaResult.error?.message || "Failed to create template" }), { status: metaResponse.status, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ 
      status: "success", 
      templateName: finalTemplateName,
      result: metaResult 
    }), { headers: corsHeaders });

  } catch (err) {
    console.error("Error creating template:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal Server Error" }), { status: 500, headers: corsHeaders });
  }
})
