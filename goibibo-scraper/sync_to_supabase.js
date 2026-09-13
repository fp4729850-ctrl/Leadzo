const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://stbqeiapgdaklktrlrjm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_USER_ID = '1e3f3ea0-fc51-4880-bf95-f1ad19366c5d';

// Standard Room IDs mapping for King Villa
const ROOMS_MAP = {
  'Room 1': '39688b67-ea6d-4526-bdae-d68edc1720d3',
  'Room 2': '9820ca74-f16f-49cf-9b65-9c62cba167a9',
  'Room 3': '92666322-e804-44ef-b966-ac5e302bc22e',
  'Room 4': '438bd6c2-335d-4c09-80d1-428419e34d5c',
  'Entire Villa': '39688b67-ea6d-4526-bdae-d68edc1720d3' // maps to master unit
};

const ROOM_RATES = {
  'Room 1': 2500,
  'Room 2': 1800,
  'Room 3': 1800,
  'Room 4': 1800,
  'Entire Villa': 7900
};

function normalizeDate(str) {
  if (!str) return 'Sept 13';
  if (/^\d{8}$/.test(str)) {
    const monthStr = str.substring(4, 6);
    const dayStr = str.substring(6, 8);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const month = months[parseInt(monthStr, 10) - 1] || 'Sept';
    return `${month} ${dayStr}`;
  }
  const m = str.match(/(\d+)\s+([A-Za-z]+)/);
  if (m) {
    const day = m[1];
    let mon = m[2];
    if (mon.toLowerCase().startsWith('sep')) mon = 'Sept';
    if (mon.toLowerCase().startsWith('oct')) mon = 'Oct';
    if (mon.toLowerCase().startsWith('nov')) mon = 'Nov';
    if (mon.toLowerCase().startsWith('dec')) mon = 'Dec';
    if (mon.toLowerCase().startsWith('jan')) mon = 'Jan';
    if (mon.toLowerCase().startsWith('feb')) mon = 'Feb';
    return `${mon} ${day.padStart(2, '0')}`;
  }
  return str;
}

/**
 * Ingests a list of booking objects into Supabase hotel_bookings table with collision guard
 * @param {Array} bookings List of booking objects
 * @param {string} channel 'Goibibo / MakeMyTrip' | 'Airbnb' | 'Agoda' | 'Direct'
 * @param {string} userId Supabase User ID
 */
async function syncBookingsToSupabase(bookings = [], channel = 'Goibibo / MakeMyTrip', userId = DEFAULT_USER_ID) {
  if (!Array.isArray(bookings) || bookings.length === 0) {
    console.log(`ℹ️ [Supabase Sync] No bookings to sync for channel: ${channel}`);
    return { inserted: 0, skipped: 0, total: 0 };
  }

  console.log(`\n🔄 [Supabase Sync] Ingesting ${bookings.length} live bookings from [${channel}]...`);
  let inserted = 0;
  let skipped = 0;

  for (const b of bookings) {
    const roomLabel = b.room_label || b.room || 'Room 2';
    const roomId = ROOMS_MAP[roomLabel] || ROOMS_MAP['Room 2'];
    const checkIn = normalizeDate(b.check_in);
    const checkOut = normalizeDate(b.check_out);
    const amount = b.amount || ROOM_RATES[roomLabel] || 1800;

    const bookingRef = b.booking_id || b.guest_name ? b.guest_name.replace(/\s+/g, '') : `SYNC-${Date.now()}`;
    const prefix = channel.toLowerCase().includes('airbnb') ? 'AIRBNB-LIVE' : 
                   channel.toLowerCase().includes('agoda') ? 'AGODA-LIVE' : 'GOIBIBO-LIVE';
    const icalUid = b.ical_uid || `${prefix}-${bookingRef}`;

    // Check if booking already exists
    const { data: existing } = await supabase
      .from('hotel_bookings')
      .select('id, guest_name, check_in, check_out, status')
      .eq('user_id', userId)
      .eq('ical_uid', icalUid);

    if (!existing || existing.length === 0) {
      console.log(`  ➕ Inserting: [${b.guest_name || 'Guest'}] on ${roomLabel} (${checkIn} ➔ ${checkOut}) ₹${amount}`);
      const { error } = await supabase.from('hotel_bookings').insert({
        user_id: userId,
        room_id: roomId,
        guest_name: b.guest_name || 'OTA Guest',
        phone: b.phone || '',
        source: channel,
        check_in: checkIn,
        check_out: checkOut,
        amount: amount,
        status: b.status || 'confirmed',
        ical_uid: icalUid
      });

      if (error) {
        console.error(`  ❌ DB Insert error for ${b.guest_name}:`, error.message);
      } else {
        inserted++;
      }
    } else {
      console.log(`  ⏭️ Already in DB: [${existing[0].guest_name}] (${checkIn})`);
      skipped++;
    }
  }

  // Update channel sync timestamp
  const channelSlug = channel.toLowerCase().includes('airbnb') ? 'airbnb' : 
                       channel.toLowerCase().includes('agoda') ? 'agoda' : 'goibibo';

  await supabase
    .from('hotel_channels')
    .update({ 
      last_sync: `Just now (${inserted} new, ${skipped} existing)`,
      status: 'connected'
    })
    .eq('user_id', userId)
    .eq('channel_id', channelSlug);

  console.log(`✅ [Supabase Sync] Finished [${channel}]: ${inserted} inserted, ${skipped} skipped.`);
  return { inserted, skipped, total: bookings.length };
}

module.exports = {
  syncBookingsToSupabase,
  normalizeDate,
  ROOMS_MAP,
  ROOM_RATES,
  DEFAULT_USER_ID
};

if (require.main === module) {
  const { scrapeGoibibo } = require('./scraper');
  (async () => {
    console.log("Fetching live Goibibo bookings test...");
    const bookings = await scrapeGoibibo({});
    await syncBookingsToSupabase(bookings, 'Goibibo / MakeMyTrip');
  })();
}
