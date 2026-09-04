import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // I saw this in secrets list earlier
if (!supabaseKey) {
  console.log("No service key");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users } = await supabase.from('users').select('id, phone');
  const { data: brains } = await supabase.from('business_knowledge').select('id, user_id, is_active, vapi_phone_id');
  console.log("Users:", users);
  console.log("Active Brains:", brains);
}
check();
