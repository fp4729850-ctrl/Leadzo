import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple VEVENT parser
function parseICal(icsData: string, source: string) {
  const lines = icsData.split(/\r?\n/);
  const events: any[] = [];
  let currentEvent: any = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = { source, status: 'confirmed' };
    } else if (line.startsWith('END:VEVENT') && currentEvent) {
      if (currentEvent.check_in && currentEvent.check_out) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('DTSTART')) {
        const val = line.split(':')[1];
        if (val) currentEvent.check_in = val.substring(0, 8); // YYYYMMDD
      } else if (line.startsWith('DTEND')) {
        const val = line.split(':')[1];
        if (val) currentEvent.check_out = val.substring(0, 8);
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.guest_name = line.substring(8).trim() || 'Guest';
      } else if (line.startsWith('UID:')) {
        currentEvent.ical_uid = line.substring(4).trim();
      }
    }
  }
  return events;
}

// Convert YYYYMMDD to Sept 06 format (for our UI demo)
function formatDateForUI(dateStr: string) {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const monthStr = dateStr.substring(4, 6);
  const dayStr = dateStr.substring(6, 8);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const month = months[parseInt(monthStr, 10) - 1];
  return `${month} ${dayStr}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, channel_id, ical_url, source_name } = await req.json().catch(() => ({}));
    if (!user_id) throw new Error("user_id is required");

    // Fetch all rooms for the user
    const { data: rooms, error: roomsError } = await supabase
      .from('hotel_rooms')
      .select('*')
      .eq('user_id', user_id);

    if (roomsError) throw roomsError;
    const defaultRoom = rooms?.[0];
    if (!defaultRoom) throw new Error("No rooms found for user to associate bookings with.");

    let totalNewBookings = 0;

    // Helper to process an iCal URL
    const processFeed = async (url: string, src: string, targetRoomId: string) => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) return 0;
        const text = await resp.text();
        const parsed = parseICal(text, src);
        let count = 0;

        for (const event of parsed) {
          if (!event.ical_uid) continue;

          // Check if booking already imported
          const { data: existing } = await supabase
            .from('hotel_bookings')
            .select('id')
            .eq('ical_uid', event.ical_uid)
            .maybeSingle();

          if (!existing) {
            await supabase.from('hotel_bookings').insert({
              user_id: user_id,
              room_id: targetRoomId,
              guest_name: event.guest_name || `${src} Guest`,
              source: src,
              check_in: formatDateForUI(event.check_in),
              check_out: formatDateForUI(event.check_out),
              amount: 3500, // estimated ADR
              status: 'confirmed',
              ical_uid: event.ical_uid
            });
            count++;
          }
        }
        return count;
      } catch (err) {
        console.error(`Failed to process feed ${url}:`, err);
        return 0;
      }
    };

    // 1. Single-channel sync mode
    if (ical_url) {
      const srcName = source_name || "Custom Channel";
      const added = await processFeed(ical_url, srcName, defaultRoom.id);
      totalNewBookings += added;

      if (channel_id) {
        await supabase
          .from('hotel_channels')
          .update({ last_sync: `Just now (${added} new events)` })
          .eq('channel_id', channel_id)
          .eq('user_id', user_id);
      }
    } else {
      // 2. Full-sync mode: Room iCal feeds
      for (const room of rooms || []) {
        const links = room.ical_links || {};
        for (const [provider, url] of Object.entries(links)) {
          if (typeof url === 'string' && url.startsWith('http')) {
            const sourceName = provider.toLowerCase().includes('airbnb') ? 'Airbnb' : provider.toLowerCase().includes('agoda') ? 'Agoda' : 'Booking.com';
            const added = await processFeed(url, sourceName, room.id);
            totalNewBookings += added;
          }
        }
      }

      // 3. Full-sync mode: Custom OTA Channels
      const { data: customChannels } = await supabase
        .from('hotel_channels')
        .select('*')
        .eq('user_id', user_id);

      for (const ch of customChannels || []) {
        if (ch.ical_url && ch.ical_url.startsWith('http')) {
          const added = await processFeed(ch.ical_url, ch.name, defaultRoom.id);
          totalNewBookings += added;
          await supabase
            .from('hotel_channels')
            .update({ last_sync: `Just now (${added} imported)` })
            .eq('id', ch.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced successfully! ${totalNewBookings} new bookings imported from live iCal feeds.` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
