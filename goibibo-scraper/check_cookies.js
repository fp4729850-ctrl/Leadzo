import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCookies() {
    const { data, error } = await supabase
        .from('hotel_channels')
        .select('channel_id, session_cookies, status, name, user_id');

    if (error) {
        console.error("Error fetching channels:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No channels found in the database.");
        return;
    }

    for (const channel of data) {
        if (channel.session_cookies) {
            console.log(`✅ Success! Cookies found for ${channel.name} (${channel.channel_id}). Cookie count: ${channel.session_cookies.length} for User: ${channel.user_id}`);
        } else {
            console.log(`❌ No cookies found for ${channel.name} (${channel.channel_id}). session_cookies is null. for User: ${channel.user_id}`);
        }
    }
}

checkCookies();
