import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://stbqeiapgdaklktrlrjm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function debug() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 1. Check active settings
  const { data: settings, error: sErr } = await supabase.from('seo_autopilot_settings').select('*').eq('is_active', true);
  if (sErr) return console.error("Error fetching settings", sErr);
  console.log("Active settings count:", settings?.length);
  
  for (const s of settings || []) {
    console.log(`\nChecking URL: ${s.url}`);
    
    // 2. Check publish plan
    const plan = s.publish_plan || [];
    const pending = plan.filter(p => !p.published);
    console.log(`Total plan items: ${plan.length}, Pending: ${pending.length}`);
    
    // 3. Check token balance
    const { data: bal } = await supabase.from('token_balances').select('balance').eq('user_id', s.user_id).single();
    console.log(`Token balance: ${bal?.balance}`);
    
    // 4. Check last blog time
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
