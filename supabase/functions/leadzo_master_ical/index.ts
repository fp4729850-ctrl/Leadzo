import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeIcal(str: string): string {
  return (str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function toIcalDate(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{8}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr.replace(/-/g, '');
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04',
    May: '05', Jun: '06', Jul: '07', Aug: '08',
    Sept: '09', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  const parts = dateStr.trim().split(' ');
  if (parts.length === 2) {
    const m = months[parts[0]] || '01';
    const d = parts[1].padStart(2, '0');
    const year = new Date().getFullYear();
    return `${year}${m}${d}`;
  }
  return '';
}

function makeUID(bookingId: string, roomId: string): string {
  return `leadzo-room-${roomId}-booking-${bookingId}@leadzoai.com`;
}

function buildICS(rooms: any[], bookings: any[], hotelName: string): string {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Leadzo AI//Hotel Channel Manager//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcal(hotelName)} — Leadzo AI`,
    'X-WR-TIMEZONE:Asia/Kolkata',
    'X-WR-CALDESC:Master availability calendar powered by Leadzo AI Channel Manager',
  ];

  for (const booking of bookings) {
    const room = rooms.find((r: any) => r.id === booking.room_id);
    const roomNum = room?.number || '?';
    const roomType = room?.type || '';
    const uid = makeUID(booking.id, booking.room_id);
    const dtStart = toIcalDate(booking.check_in);
    const dtEnd = toIcalDate(booking.check_out);
    if (!dtStart || !dtEnd) continue;

    const summary = booking.status === 'blocked'
      ? `BLOCKED — Room ${roomNum}`
      : `${escapeIcal(booking.guest_name || 'Guest')} — Room ${roomNum}`;

    const description = [
      `Source: ${booking.source || 'Direct'}`,
      `Room: ${roomNum} ${roomType}`,
      `Status: ${booking.status || 'confirmed'}`,
      booking.phone ? `Phone: ${booking.phone}` : '',
      booking.amount ? `Amount: Rs.${booking.amount}` : '',
    ].filter(Boolean).join('\\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `CATEGORIES:${booking.source || 'Direct'}`,
      `STATUS:CONFIRMED`,
      `TRANSP:OPAQUE`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    let user_id = url.searchParams.get('user_id');
    let room_id = url.searchParams.get('room_id');

    if (!user_id && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      user_id = body.user_id || null;
      room_id = body.room_id || null;
    }

    if (!user_id) {
      return new Response('Missing user_id parameter', {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    let roomsQuery = supabase.from('hotel_rooms').select('*').eq('user_id', user_id);
    if (room_id) roomsQuery = roomsQuery.eq('id', room_id);
    const { data: rooms, error: roomsErr } = await roomsQuery;
    if (roomsErr) throw roomsErr;

    let bookingsQuery = supabase.from('hotel_bookings').select('*').eq('user_id', user_id);
    if (room_id) bookingsQuery = bookingsQuery.eq('room_id', room_id);
    const { data: bookings, error: bookingsErr } = await bookingsQuery;
    if (bookingsErr) throw bookingsErr;

    const icsContent = buildICS(rooms || [], bookings || [], 'My Hotel');

    return new Response(icsContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="leadzo_master_calendar.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });

  } catch (error: any) {
    console.error('leadzo_master_ical error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
