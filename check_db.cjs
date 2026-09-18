const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('business_knowledge').select('user_id, company_name, vapi_phone_id').limit(1);
  console.log("Data:", data);
  if (error) console.error("Error:", error);
}
run();
