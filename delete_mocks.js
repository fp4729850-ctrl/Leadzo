import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://stbqeiapgdaklktrlrjm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Using the env vars if present, otherwise need to get them from .env

async function deleteMocks() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from('blogs')
    .delete()
    .like('html_content', '%<p>Content optimization for%');
    
  if (error) console.error("Error:", error);
  else console.log("Deleted mock blogs:", data);
}
deleteMocks();
