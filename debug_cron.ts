import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = 'https://stbqeiapgdaklktrlrjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0YnFlaWFwZ2Rha2xrdHJscmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MTYxODgsImV4cCI6MjA5OTI5MjE4OH0.dobxKtLAQ9iG82IpwBqjE_QVw0hqU1Jq28VblFet78g';

async function debug() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: settings, error: sErr } = await supabase.from('seo_autopilot_settings').select('*').eq('is_active', true);
  if (sErr) return console.error("Error fetching settings", sErr);
  console.log("Active settings count:", settings?.length);
  
  for (const s of settings || []) {
    console.log(`\nChecking URL: ${s.url}`);
    
    const plan = s.publish_plan || [];
    const pending = plan.filter(p => !p.published);
    console.log(`Total plan items: ${plan.length}, Pending: ${pending.length}`);
    
    const { data: bal } = await supabase.from('token_balances').select('balance').eq('user_id', s.user_id).single();
    console.log(`Token balance: ${bal?.balance}`);
    
    const { data: last } = await supabase.from('blogs').select('created_at').eq('website_url', s.url).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (last) {
      const hours = (Date.now() - new Date(last.created_at).getTime()) / 3600000;
      console.log(`Hours since last blog: ${hours.toFixed(2)}`);
    } else {
      console.log(`No previous blogs found.`);
    }
  }
}
debug();
