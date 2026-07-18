const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const toml = require('toml');
const config = toml.parse(fs.readFileSync('supabase/config.toml', 'utf8'));

// I need the service role key to check the database
