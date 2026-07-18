import { createClient } from '@supabase/supabase-js';

// Supabase anon key is a PUBLIC key (safe to include in frontend code)
// It only allows operations permitted by Row Level Security policies
const SUPABASE_URL = 'https://stbqeiapgdaklktrlrjm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0YnFlaWFwZ2Rha2xrdHJscmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MTYxODgsImV4cCI6MjA5OTI5MjE4OH0.dobxKtLAQ9iG82IpwBqjE_QVw0hqU1Jq28VblFet78g';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

