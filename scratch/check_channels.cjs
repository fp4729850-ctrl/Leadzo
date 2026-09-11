require('dotenv').config({ path: '/Users/mac/Downloads/hercules_source/Leadzo/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('hotel_channels').select('*');
  console.log(data);
}
check();
