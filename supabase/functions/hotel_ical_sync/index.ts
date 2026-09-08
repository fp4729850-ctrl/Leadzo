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

    const { user_id } = await req.json().catch(() => ({ user_id: null }));
    
    // Fetch all rooms for the user
    const { data: rooms, error: roomsError } = await supabase
      .from('hotel_rooms')
      .select('*')
      .eq('user_id', user_id);

    if (roomsError) throw roomsError;

    let totalNewBookings = 0;

    for (const room of rooms || []) {
      const links = room.ical_links || {};
      const newEvents: any[] = [];

      for (const [provider, url] of Object.entries(links)) {
        if (typeof url === 'string' && url.startsWith('http')) {
          try {
            const resp = await fetch(url);
            if (resp.ok) {
              const text = await resp.text();
              const sourceName = provider.toLowerCase().includes('airbnb') ? 'Airbnb' : provider.toLowerCase().includes('agoda') ? 'Agoda' : 'Booking.com';
              const parsed = parseICal(text, sourceName);
              newEvents.push(...parsed);
            }
          } catch (e) {
            console.error(`Error fetching iCal for ${provider}:`, e);
          }
        }
      }

      // Upsert events
      for (const event of newEvents) {
        if (!event.ical_uid) continue;
        
        // Check if exists
        const { data: existing } = await supabase
          .from('hotel_bookings')
          .select('id')
          .eq('ical_uid', event.ical_uid)
          .single();

        if (!existing) {
          await supabase.from('hotel_bookings').insert({
            user_id: user_id,
            room_id: room.id,
            guest_name: event.guest_name || 'Imported Guest',
            source: event.source,
            check_in: formatDateForUI(event.check_in),
            check_out: formatDateForUI(event.check_out),
            status: 'confirmed',
            ical_uid: event.ical_uid
          });
          totalNewBookings++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Synced ${totalNewBookings} new bookings.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
