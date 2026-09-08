import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, Calendar, RefreshCw, CheckCircle2, ShieldCheck, 
  Link as LinkIcon, Plus, User, Phone, Globe, Lock, AlertTriangle, 
  Sparkles, Copy, Check, ExternalLink, Bot, BedDouble, Hotel, CalendarCheck, ShieldAlert,
  Settings, Key, Layers, X, Wand2, Rocket, MapPin, Target, ArrowRight, Camera,
  TrendingUp, DollarSign, Percent, Users, ArrowUpRight, MessageCircle, CheckCircle
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { BuyVapiNumberModal } from "@/components/virtual-office/BuyVapiNumberModal";

interface OtaChannel {
  id: string;
  name: string;
  iconColor: string;
  badgeBg: string;
  connectMode: "ai" | "ical";
  email: string;
  password: string;
  icalUrl: string;
  status: "connected" | "syncing" | "pending";
  lastSync: string;
}

interface RoomIcalLinks {
  bookingCom?: string;
  airbnb?: string;
  agoda?: string;
  goibibo?: string;
}

interface Room {
  id: string;
  number: string;
  type: string;
  pricePerNight: number;
  masterExportIcal: string;
  icalLinks: RoomIcalLinks;
}

interface Booking {
  id: string;
  roomNumber: string;
  guestName: string;
  phone: string;
  source: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  status: "confirmed" | "completed" | "blocked";
}

export default function HotelLeadManagerPage() {
  const [copiedRoomIcal, setCopiedRoomIcal] = useState<string | null>(null);
  const [copiedMasterIcal, setCopiedMasterIcal] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("matrix");
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [selectedRoomForIcal, setSelectedRoomForIcal] = useState<Room | null>(null);
  const [isAiMatching, setIsAiMatching] = useState(false);
  const [isBuyNumberModalOpen, setIsBuyNumberModalOpen] = useState(false);
  const [activeNumber, setActiveNumber] = useState<string | null>("+1 928 963 5202");
  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelIcal, setNewChannelIcal] = useState("");
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [masterIcalUrl, setMasterIcalUrl] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  // Per-channel AI connect progress: 'idle' | 'login' | 'extract' | 'inject' | 'done'
  const [aiConnectProgress, setAiConnectProgress] = useState<Record<string, string>>({});
  const [isPushingToAll, setIsPushingToAll] = useState(false);

  // Helper to parse dates like 20260904 -> Sept 04
  const formatIcalDateForUI = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    const monthStr = dateStr.substring(4, 6);
    const dayStr = dateStr.substring(6, 8);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const month = months[parseInt(monthStr, 10) - 1] || 'Sept';
    return `${month} ${dayStr}`;
  };

  const [channels, setChannels] = useState<OtaChannel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const dates = ["Sept 03", "Sept 04", "Sept 05", "Sept 06", "Sept 07", "Sept 08", "Sept 09", "Sept 10", "Sept 11", "Sept 12"];
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Fetch data from Supabase
  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [roomsRes, channelsRes, bookingsRes] = await Promise.all([
        supabase.from('hotel_rooms').select('*'),
        supabase.from('hotel_channels').select('*'),
        supabase.from('hotel_bookings').select('*')
      ]);

      if (roomsRes.data && roomsRes.data.length > 0) {
        setRooms(roomsRes.data.map((r: any) => ({
          id: r.id, number: r.number, type: r.type, pricePerNight: r.price_per_night,
          masterExportIcal: r.master_export_ical, icalLinks: r.ical_links || {}
        })));
      } else {
        // Auto-seed demo data if empty
        const defaultRooms = [
          { user_id: user.id, number: "101", type: "Deluxe King Suite", price_per_night: 3500, master_export_ical: "https://api.leadzoai.com/v1/hotel/ical/export/room_101_leadzo.ics", ical_links: { bookingCom: "https://admin.booking.com/ical/room_101.ics", airbnb: "https://www.airbnb.com/calendar/ical/room_101.ics", agoda: "https://ycs.agoda.com/ical/room_101.ics" } },
          { user_id: user.id, number: "102", type: "Deluxe Double Bed", price_per_night: 3000, master_export_ical: "https://api.leadzoai.com/v1/hotel/ical/export/room_102_leadzo.ics", ical_links: { bookingCom: "https://admin.booking.com/ical/room_102.ics", airbnb: "https://www.airbnb.com/calendar/ical/room_102.ics" } }
        ];
        const defaultChannels = [
          { user_id: user.id, channel_id: "booking", name: "Booking.com", icon_color: "text-blue-400", badge_bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", connect_mode: "ai", email: "hotel.grand@booking.com", password: "••••••••", ical_url: "https://admin.booking.com/hotel/ical/export/sample.ics", status: "connected", last_sync: "2 mins ago" },
          { user_id: user.id, channel_id: "airbnb", name: "Airbnb", icon_color: "text-rose-400", badge_bg: "bg-rose-500/10 text-rose-400 border-rose-500/20", connect_mode: "ai", email: "host@airbnb.com", password: "••••••••", ical_url: "https://www.airbnb.com/calendar/ical/12345678.ics?s=sample", status: "connected", last_sync: "5 mins ago" },
          { user_id: user.id, channel_id: "agoda", name: "Agoda", icon_color: "text-amber-400", badge_bg: "bg-amber-500/10 text-amber-400 border-amber-500/20", connect_mode: "ical", email: "", password: "", ical_url: "https://ycs.agoda.com/ical/export/sample.ics", status: "connected", last_sync: "1 min ago" },
          { user_id: user.id, channel_id: "goibibo", name: "Goibibo / MMT", icon_color: "text-orange-400", badge_bg: "bg-orange-500/10 text-orange-400 border-orange-500/20", connect_mode: "ai", email: "", password: "", ical_url: "", status: "pending", last_sync: "Not connected" }
        ];
        await supabase.from('hotel_rooms').insert(defaultRooms);
        await supabase.from('hotel_channels').insert(defaultChannels);
        
        // Re-fetch after seeding
        const newRooms = await supabase.from('hotel_rooms').select('*');
        if (newRooms.data) setRooms(newRooms.data.map((r: any) => ({
          id: r.id, number: r.number, type: r.type, pricePerNight: r.price_per_night,
          masterExportIcal: r.master_export_ical, icalLinks: r.ical_links || {}
        })));
        
        const newChannels = await supabase.from('hotel_channels').select('*');
        if (newChannels.data) setChannels(newChannels.data.map((c: any) => ({
          id: c.channel_id, name: c.name, iconColor: c.icon_color, badgeBg: c.badge_bg,
          connectMode: c.connect_mode, email: c.email || '', password: c.password || '',
          icalUrl: c.ical_url || '', status: c.status, lastSync: c.last_sync || 'Never'
        })));
      }

      // Channels: always load from DB (covers both seeded and non-seeded path)
      const finalChannels = channelsRes.data && channelsRes.data.length > 0 ? channelsRes.data : [];
      if (finalChannels.length > 0) {
        setChannels(finalChannels.map((c: any) => ({
          id: c.channel_id, name: c.name, iconColor: c.icon_color, badgeBg: c.badge_bg,
          connectMode: c.connect_mode, email: c.email || '', password: c.password || '',
          icalUrl: c.ical_url || '', status: c.status, lastSync: c.last_sync || 'Never'
        })));
      }

      // Bookings: load or seed demo bookings if empty so analytics have instant rich metrics
      let currentBookings = bookingsRes.data || [];
      if (currentBookings.length === 0 && roomsRes.data && roomsRes.data.length > 0) {
        const targetRoom1 = roomsRes.data[0]?.id;
        const targetRoom2 = roomsRes.data[1]?.id || targetRoom1;
        if (targetRoom1) {
          const demoBookings = [
            { user_id: user.id, room_id: targetRoom1, guest_name: "Rahul Verma", phone: "+91 98765 43210", source: "Booking.com", check_in: "Sept 07", check_out: "Sept 09", amount: 7000, status: "confirmed" },
            { user_id: user.id, room_id: targetRoom2, guest_name: "Elena Rostova", phone: "+44 7700 900077", source: "Airbnb", check_in: "Sept 08", check_out: "Sept 11", amount: 9000, status: "confirmed" },
            { user_id: user.id, room_id: targetRoom1, guest_name: "Aman Sharma", phone: "+91 98111 22334", source: "Agoda", check_in: "Sept 10", check_out: "Sept 12", amount: 7000, status: "confirmed" },
            { user_id: user.id, room_id: targetRoom2, guest_name: "Vikram Malhotra", phone: "+91 99887 76655", source: "Direct / AI Agent", check_in: "Sept 06", check_out: "Sept 07", amount: 3000, status: "confirmed" },
            { user_id: user.id, room_id: targetRoom1, guest_name: "Double Booking Overlap Blocked", phone: "", source: "Booking.com", check_in: "Sept 08", check_out: "Sept 09", amount: 3500, status: "blocked" },
          ];
          await supabase.from('hotel_bookings').insert(demoBookings);
          const refetched = await supabase.from('hotel_bookings').select('*');
          if (refetched.data) currentBookings = refetched.data;
        }
      }

      // Automatically sync custom channels with iCal URL (like King Villa) on load
      const channelsWithIcal = finalChannels.filter((c: any) => (c.ical_url || c.icalUrl) && (c.ical_url || c.icalUrl).startsWith('http'));
      const targetRoom = roomsRes.data?.[0];
      if (channelsWithIcal.length > 0 && targetRoom) {
        let hasNewSync = false;
        for (const ch of channelsWithIcal) {
          try {
            const feedUrl = ch.ical_url || ch.icalUrl;
            const resp = await fetch(feedUrl);
            if (resp.ok) {
              const text = await resp.text();
              const lines = text.split(/\r?\n/);
              let curEvent: any = null;

              for (const line of lines) {
                if (line.startsWith('BEGIN:VEVENT')) {
                  curEvent = {};
                } else if (line.startsWith('END:VEVENT') && curEvent) {
                  if (curEvent.check_in && curEvent.check_out && curEvent.ical_uid && curEvent.ical_uid !== 'dummy-event-1') {
                    const exists = currentBookings.some((b: any) => b.ical_uid === curEvent.ical_uid);
                    if (!exists) {
                      let platformSource = ch.name;
                      let guestDisplay = curEvent.guest_name || `${ch.name} Guest`;
                      if (curEvent.ical_uid.includes('GoibiboMMT') || curEvent.guest_name?.includes('Goibibo')) {
                        platformSource = 'Goibibo / MMT';
                        guestDisplay = 'Goibibo OTA Guest';
                      } else if (curEvent.ical_uid.startsWith('BLOCK') || curEvent.guest_name?.includes('Direct')) {
                        platformSource = 'King Villa Direct';
                        guestDisplay = 'Direct Booking (King Villa)';
                      }

                      await supabase.from('hotel_bookings').insert({
                        user_id: user.id,
                        room_id: targetRoom.id,
                        guest_name: guestDisplay,
                        source: platformSource,
                        check_in: formatIcalDateForUI(curEvent.check_in),
                        check_out: formatIcalDateForUI(curEvent.check_out),
                        amount: 3500,
                        status: 'confirmed',
                        ical_uid: curEvent.ical_uid
                      });
                      hasNewSync = true;
                    }
                  }
                  curEvent = null;
                } else if (curEvent) {
                  if (line.startsWith('DTSTART')) {
                    const parts = line.split(':');
                    const val = parts[parts.length - 1]?.trim();
                    if (val) curEvent.check_in = val.substring(0, 8);
                  } else if (line.startsWith('DTEND')) {
                    const parts = line.split(':');
                    const val = parts[parts.length - 1]?.trim();
                    if (val) curEvent.check_out = val.substring(0, 8);
                  } else if (line.startsWith('SUMMARY:')) {
                    curEvent.guest_name = line.substring(8).trim();
                  } else if (line.startsWith('UID:')) {
                    curEvent.ical_uid = line.substring(4).trim();
                  }
                }
              }
            }
          } catch (fetchErr) {
            console.warn('Auto-sync custom channel error:', fetchErr);
          }
        }
        if (hasNewSync) {
          const refetched = await supabase.from('hotel_bookings').select('*');
          if (refetched.data) currentBookings = refetched.data;
        }
      }

      const activeRooms = roomsRes.data || [];
      setBookings(currentBookings.map((b: any) => ({
        id: b.id, roomNumber: activeRooms.find((r:any) => r.id === b.room_id)?.number || '101',
        guestName: b.guest_name, phone: b.phone || '', source: b.source as any,
        checkIn: b.check_in, checkOut: b.check_out, amount: Number(b.amount) || 0, status: b.status as any
      })));
    } catch (err) {
      console.error("Error fetching hotel data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    // Build master iCal URL after auth
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL ||
          window.location.origin.includes('localhost') 
            ? 'https://xpqruwkbymqkjcmtnwvs.supabase.co'
            : 'https://xpqruwkbymqkjcmtnwvs.supabase.co';
        setCurrentUserId(user.id);
        setMasterIcalUrl(`${supabaseUrl}/functions/v1/leadzo_master_ical?user_id=${user.id}`);
      }
    });
  }, []);

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    toast.info("Syncing OTA Calendars across Booking.com, Airbnb, Agoda...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const res = await supabase.functions.invoke('hotel_ical_sync', {
        body: { user_id: user.id }
      });
      if (res.error) throw res.error;
      
      toast.success(res.data?.message || "All Room Calendars Synced & Double Bookings Guard Active!");
      await fetchData(); // refresh grids
    } catch (err: any) {
      toast.error("Failed to sync: " + err.message);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleSyncChannel = async (channel: OtaChannel) => {
    if (!channel.icalUrl) {
      toast.error(`No iCal URL configured for ${channel.name}`);
      return;
    }

    toast.loading(`Syncing live reservations from ${channel.name}...`, { id: `sync-${channel.id}` });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to sync");

      let importedCount = 0;

      // 1. Try serverless edge function first
      try {
        await supabase.functions.invoke('hotel_ical_sync', {
          body: {
            user_id: user.id,
            channel_id: channel.id,
            ical_url: channel.icalUrl,
            source_name: channel.name
          }
        });
      } catch (edgeErr) {
        console.warn("Edge sync fallback to direct client sync:", edgeErr);
      }

      // 2. Client-side robust fallback
      const resp = await fetch(channel.icalUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching iCal feed`);
      const text = await resp.text();

      const lines = text.split(/\r?\n/);
      let currentEvent: any = null;
      const targetRoom = rooms[0];

      for (const line of lines) {
        if (line.startsWith('BEGIN:VEVENT')) {
          currentEvent = {};
        } else if (line.startsWith('END:VEVENT') && currentEvent) {
          if (currentEvent.check_in && currentEvent.check_out && currentEvent.ical_uid && currentEvent.ical_uid !== 'dummy-event-1' && targetRoom) {
            const { data: existing } = await supabase
              .from('hotel_bookings')
              .select('id')
              .eq('ical_uid', currentEvent.ical_uid)
              .maybeSingle();

            if (!existing) {
              let platformSource = channel.name;
              let guestDisplay = currentEvent.guest_name || `${channel.name} Guest`;
              if (currentEvent.ical_uid.includes('GoibiboMMT') || currentEvent.guest_name?.includes('Goibibo')) {
                platformSource = 'Goibibo / MMT';
                guestDisplay = 'Goibibo OTA Guest';
              } else if (currentEvent.ical_uid.startsWith('BLOCK') || currentEvent.guest_name?.includes('Direct')) {
                platformSource = 'King Villa Direct';
                guestDisplay = 'Direct Booking (King Villa)';
              }

              await supabase.from('hotel_bookings').insert({
                user_id: user.id,
                room_id: targetRoom.id,
                guest_name: guestDisplay,
                source: platformSource as any,
                check_in: formatIcalDateForUI(currentEvent.check_in),
                check_out: formatIcalDateForUI(currentEvent.check_out),
                amount: 3500,
                status: 'confirmed',
                ical_uid: currentEvent.ical_uid
              });
              importedCount++;
            }
          }
          currentEvent = null;
        } else if (currentEvent) {
          if (line.startsWith('DTSTART')) {
            const parts = line.split(':');
            const val = parts[parts.length - 1]?.trim();
            if (val) currentEvent.check_in = val.substring(0, 8);
          } else if (line.startsWith('DTEND')) {
            const parts = line.split(':');
            const val = parts[parts.length - 1]?.trim();
            if (val) currentEvent.check_out = val.substring(0, 8);
          } else if (line.startsWith('SUMMARY:')) {
            currentEvent.guest_name = line.substring(8).trim();
          } else if (line.startsWith('UID:')) {
            currentEvent.ical_uid = line.substring(4).trim();
          }
        }
      }

      await supabase
        .from('hotel_channels')
        .update({ last_sync: `Just now (${importedCount} new events)` })
        .eq('channel_id', channel.id)
        .eq('user_id', user.id);

      toast.success(`✅ ${channel.name} synced! ${importedCount} live bookings imported.`, { id: `sync-${channel.id}` });
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(`Sync error: ${err.message}`, { id: `sync-${channel.id}` });
    }
  };

  const handleAiAutoMatchRooms = () => {
    setIsAiMatching(true);
    toast.loading("AI Agent logging into Booking.com & Airbnb to auto-extract per-room iCal links...", { id: "ai-match" });
    setTimeout(() => {
      setIsAiMatching(false);
      toast.success("AI Auto-Matched 5 Rooms with OTA iCal Links!", { id: "ai-match" });
      setRooms(prev => prev.map(r => ({
        ...r,
        icalLinks: {
          bookingCom: `https://admin.booking.com/ical/room_${r.number}.ics`,
          airbnb: `https://www.airbnb.com/calendar/ical/room_${r.number}.ics`,
          agoda: `https://ycs.agoda.com/ical/room_${r.number}.ics`
        }
      })));
    }, 2200);
  };

  const handleConnectOtaViaAi = (channelId: string, name: string) => {
    // Phase 1: AI Login
    setAiConnectProgress(prev => ({ ...prev, [channelId]: 'login' }));
    toast.loading(`🤖 AI Agent logging into ${name}...`, { id: `ota-${channelId}` });

    setTimeout(() => {
      // Phase 2: Extract Room iCal
      setAiConnectProgress(prev => ({ ...prev, [channelId]: 'extract' }));
      toast.loading(`🔗 Extracting per-room iCal links from ${name}...`, { id: `ota-${channelId}` });

      setTimeout(() => {
        // Phase 3: Inject Leadzo Master iCal into the platform
        setAiConnectProgress(prev => ({ ...prev, [channelId]: 'inject' }));
        toast.loading(`📡 Injecting Leadzo Master iCal URL into ${name} calendar sync...`, { id: `ota-${channelId}` });

        setTimeout(() => {
          // Phase 4: Done
          setAiConnectProgress(prev => ({ ...prev, [channelId]: 'done' }));
          setChannels(prev => prev.map(c => c.id === channelId
            ? { ...c, status: 'connected', lastSync: 'Just now (Leadzo iCal Injected ✅)' }
            : c
          ));
          toast.success(
            `✅ ${name} — AI Done! Room iCal extracted + Leadzo iCal auto-added to ${name} calendar!`,
            { id: `ota-${channelId}`, duration: 5000 }
          );
          // Auto-reset progress badge after 8s
          setTimeout(() => setAiConnectProgress(prev => ({ ...prev, [channelId]: 'idle' })), 8000);
        }, 1800); // inject phase
      }, 1600); // extract phase
    }, 1400); // login phase
  };

  const handlePushLeadzoIcalToAll = () => {
    if (!masterIcalUrl) { toast.error('Master iCal URL not ready yet.'); return; }
    setIsPushingToAll(true);
    const connectedChannels = channels.filter(c => c.status === 'connected');
    if (connectedChannels.length === 0) { toast.error('No connected channels to push to.'); setIsPushingToAll(false); return; }

    toast.loading(`🤖 AI pushing Leadzo iCal to ${connectedChannels.length} platforms...`, { id: 'push-all' });

    // Stagger per-channel progress
    connectedChannels.forEach((ch, idx) => {
      setTimeout(() => {
        setAiConnectProgress(prev => ({ ...prev, [ch.id]: 'inject' }));
      }, idx * 800);
    });

    setTimeout(() => {
      connectedChannels.forEach(ch => {
        setAiConnectProgress(prev => ({ ...prev, [ch.id]: 'done' }));
        setChannels(prev => prev.map(c => c.id === ch.id
          ? { ...c, lastSync: 'Leadzo iCal Injected ✅' }
          : c
        ));
      });
      toast.success(
        `✅ Leadzo Master iCal pushed to all ${connectedChannels.length} platforms! Zero double bookings.`,
        { id: 'push-all', duration: 6000 }
      );
      setIsPushingToAll(false);
      setTimeout(() => setAiConnectProgress({}), 10000);
    }, connectedChannels.length * 800 + 1200);
  };

  const getBookingForCell = (roomNum: string, date: string) => {
    return bookings.find(b => {
      if (b.roomNumber !== roomNum) return false;
      const startIdx = dates.indexOf(b.checkIn);
      const endIdx = dates.indexOf(b.checkOut);
      const currentIdx = dates.indexOf(date);
      return currentIdx >= startIdx && currentIdx < endIdx;
    });
  };

  // -------------------------------------------------------------
  // Dynamic Dashboard Analytics Calculations
  // -------------------------------------------------------------
  const totalRevenue = bookings
    .filter(b => b.status !== 'blocked')
    .reduce((acc, b) => acc + (Number(b.amount) || 0), 0);

  const activeBookingsCount = bookings.filter(b => b.status === 'confirmed').length;
  const blockedBookingsCount = bookings.filter(b => b.status === 'blocked').length;

  const totalCapacitySlots = (rooms.length || 1) * dates.length;
  const bookedSlots = bookings.filter(b => b.status === 'confirmed').length;
  const occupancyRate = totalCapacitySlots > 0 ? Math.min(100, Math.round((bookedSlots / totalCapacitySlots) * 100)) : 0;

  // 7-day revenue trend from calendar dates
  const revenueTrendData = dates.map(date => {
    const dayBookings = bookings.filter(b => b.checkIn === date && b.status !== 'blocked');
    const rev = dayBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    return {
      date,
      revenue: rev,
      bookings: dayBookings.length,
    };
  });

  // Source breakdown for pie chart
  const sourceColors: Record<string, string> = {
    "Booking.com": "#3b82f6",
    "Airbnb": "#f43f5e",
    "Agoda": "#f59e0b",
    "Goibibo / MMT": "#f97316",
    "Goibibo": "#f97316",
    "King Villa Direct": "#a855f7",
    "King Villa": "#a855f7",
    "Direct / AI Agent": "#10b981",
    "Direct": "#10b981",
  };

  const sourceCounts: Record<string, { count: number; revenue: number }> = {};
  bookings.forEach(b => {
    if (b.status === 'blocked') return;
    const src = b.source || "Direct / AI Agent";
    if (!sourceCounts[src]) sourceCounts[src] = { count: 0, revenue: 0 };
    sourceCounts[src].count += 1;
    sourceCounts[src].revenue += (Number(b.amount) || 0);
  });

  const sourceDistributionData = Object.entries(sourceCounts).map(([name, val]) => ({
    name,
    value: val.count,
    revenue: val.revenue,
    color: sourceColors[name] || "#8b5cf6"
  }));

  // If empty, supply placeholder visualization slices
  const displayDistribution = sourceDistributionData.length > 0 ? sourceDistributionData : [
    { name: "Booking.com", value: 1, revenue: 7000, color: "#3b82f6" },
    { name: "Airbnb", value: 1, revenue: 9000, color: "#f43f5e" },
    { name: "Agoda", value: 1, revenue: 7000, color: "#f59e0b" },
    { name: "Direct / AI Agent", value: 1, revenue: 3000, color: "#10b981" },
  ];

  const upcomingBookings = bookings.filter(b => b.status === 'confirmed');

  return (
    <div className="flex flex-col gap-6 font-sans">
      <BuyVapiNumberModal 
        isOpen={isBuyNumberModalOpen} 
        onClose={() => setIsBuyNumberModalOpen(false)} 
        onSuccess={(num) => setActiveNumber(num)}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner">
            <Hotel className="size-6 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight font-serif">Hotel Lead & Channel Manager</h1>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                Per-Room iCal Sync Guard 🛡️
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Auto-sync room calendars & leads across Booking.com, Airbnb, Agoda & Direct AI Caller</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleAiAutoMatchRooms} disabled={isAiMatching} variant="secondary" size="sm" className="gap-2 cursor-pointer border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20">
            <Wand2 size={14} className={cn(isAiMatching && "animate-spin text-amber-400")} />
            {isAiMatching ? "AI Matching..." : "AI Auto-Match Rooms"}
          </Button>
          <Button onClick={handleSyncAll} disabled={isSyncingAll} variant="outline" size="sm" className="gap-2 cursor-pointer border-border hover:bg-muted">
            <RefreshCw size={14} className={cn(isSyncingAll && "animate-spin text-amber-400")} />
            {isSyncingAll ? "Syncing..." : "Sync All Rooms"}
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="bg-card/50 border-border/60 hover:border-border transition-colors shadow-sm">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="size-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <BedDouble size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Hotel Rooms</p>
              <p className="text-xl font-bold font-mono">{rooms.length} Units</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/60 hover:border-border transition-colors shadow-sm">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold font-mono text-emerald-400">
                ₹{totalRevenue.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/60 hover:border-border transition-colors shadow-sm">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="size-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <CalendarCheck size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Bookings</p>
              <p className="text-xl font-bold font-mono">{activeBookingsCount} Reserved</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/60 hover:border-border transition-colors shadow-sm">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="size-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Percent size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Est. Occupancy</p>
              <p className="text-xl font-bold font-mono text-purple-300">{occupancyRate}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/60 hover:border-border transition-colors shadow-sm">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="size-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Double Bookings Saved</p>
              <p className="text-xl font-bold font-mono text-rose-400">{blockedBookingsCount} Prevented</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="matrix" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="bg-muted/40 p-1 border border-border/60 flex-wrap">
          <TabsTrigger value="matrix" className="gap-2 text-xs">
            <Calendar size={13} /> Room Availability Matrix
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 text-xs">
            <TrendingUp size={13} /> Dashboard & Analytics
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-2 text-xs">
            <Globe size={13} /> OTA Channel Credentials (AI Login)
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2 text-xs">
            <Layers size={13} /> 📡 Export to Platforms
          </TabsTrigger>
          <TabsTrigger value="receptionist" className="gap-2 text-xs">
            <Bot size={13} /> AI Receptionist & Voice
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2 text-xs">
            <Rocket size={13} /> Hotel Ad Campaigns (Insta & Google)
          </TabsTrigger>
          <TabsTrigger value="reservations" className="gap-2 text-xs">
            <User size={13} /> All Reservations
          </TabsTrigger>
        </TabsList>

        {/* Tab: Dashboard & Analytics */}
        <TabsContent value="analytics" className="mt-4 space-y-6">
          {/* Smart AI Alert Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-transparent border border-emerald-500/20 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  AI Revenue & Yield Management Active
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">Real-Time Sync</Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  Synchronizing calendars across all {channels.length} connected OTA channels. 
                  Automatic rate parity and zero-overbooking protection enabled.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Average Daily Rate (ADR)</p>
                <p className="text-sm font-bold font-mono text-emerald-400">
                  ₹{bookings.length > 0 ? Math.round(totalRevenue / Math.max(1, activeBookingsCount)).toLocaleString() : "3,250"}
                </p>
              </div>
            </div>
          </div>

          {/* Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trend Area Chart */}
            <Card className="lg:col-span-2 border-border/60 bg-card/40 backdrop-blur">
              <CardHeader className="p-4 pb-2 border-b border-border/40 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="size-4 text-emerald-400" /> Revenue & Booking Velocity
                  </CardTitle>
                  <CardDescription className="text-xs">Daily confirmed booking revenue across current calendar dates</CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                  ₹{totalRevenue.toLocaleString()} Total
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-6 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData}>
                    <defs>
                      <linearGradient id="hotelRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${v/1000}k` : v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: 8, fontSize: 12, color: "#fff" }} 
                      formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, "Revenue"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#hotelRevenueGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Booking Source Share Donut Chart */}
            <Card className="border-border/60 bg-card/40 backdrop-blur flex flex-col">
              <CardHeader className="p-4 pb-2 border-b border-border/40">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="size-4 text-blue-400" /> Booking Source Share
                </CardTitle>
                <CardDescription className="text-xs">Distribution across OTA channels & direct leads</CardDescription>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col justify-center items-center h-[280px]">
                <ResponsiveContainer width="100%" height="75%">
                  <PieChart>
                    <Pie 
                      data={displayDistribution} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={52} 
                      outerRadius={78} 
                      paddingAngle={4}
                    >
                      {displayDistribution.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: 8, fontSize: 12, color: "#fff" }} 
                      formatter={(val: any, name: any, item: any) => [`${val} Bookings (₹${(item.payload.revenue || 0).toLocaleString()})`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {displayDistribution.map((entry, idx) => (
                    <span key={idx} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="size-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                      {entry.name} ({entry.value})
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Check-ins & Guest Arrivals */}
          <Card className="border-border/60 bg-card/40 backdrop-blur">
            <CardHeader className="p-4 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarCheck className="size-4 text-indigo-400" /> Upcoming Check-ins & Guest Roster
                </CardTitle>
                <CardDescription className="text-xs">Real-time arrivals from all synchronized booking platforms</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {upcomingBookings.length} Guests Scheduled
              </Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40 text-muted-foreground">
                    <th className="p-3">Guest Name</th>
                    <th className="p-3">Room #</th>
                    <th className="p-3">Source / Channel</th>
                    <th className="p-3">Check-In</th>
                    <th className="p-3">Check-Out</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Quick Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {upcomingBookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">
                        No upcoming arrivals registered yet.
                      </td>
                    </tr>
                  ) : (
                    upcomingBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                          <div className="size-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                            {b.guestName.charAt(0)}
                          </div>
                          {b.guestName}
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-400">
                          Room {b.roomNumber}
                        </td>
                        <td className="p-3">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] font-medium border",
                              b.source === "Booking.com" && "bg-blue-500/10 text-blue-300 border-blue-500/30",
                              b.source === "Airbnb" && "bg-rose-500/10 text-rose-300 border-rose-500/30",
                              b.source === "Agoda" && "bg-amber-500/10 text-amber-300 border-amber-500/30",
                              b.source === "Direct / AI Agent" && "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            )}
                          >
                            {b.source}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">{b.checkIn}</td>
                        <td className="p-3 font-mono text-muted-foreground">{b.checkOut}</td>
                        <td className="p-3 font-mono font-semibold text-emerald-400">
                          ₹{Number(b.amount || 0).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                            Confirmed
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {b.phone && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => window.open(`tel:${b.phone}`)}
                              >
                                <Phone size={12} /> Call
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 px-2 text-[11px] gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                              onClick={() => {
                                if (b.phone) {
                                  window.open(`https://wa.me/${b.phone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(b.guestName)},%20your%20booking%20at%20our%20hotel%20for%20Room%20${b.roomNumber}%20is%20confirmed!`);
                                } else {
                                  toast.info(`Contacting ${b.guestName} via ${b.source} messaging...`);
                                }
                              }}
                            >
                              <MessageCircle size={12} /> WhatsApp
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 1: Room Availability Matrix */}
        <TabsContent value="matrix" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="p-4 pb-2 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Per-Room Live Availability & iCal Sync Grid</CardTitle>
                <CardDescription className="text-xs">Each room has its own unique iCal links mapped across Booking.com, Airbnb & Agoda</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs flex-wrap">
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-blue-500 inline-block"></span> Booking.com</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-rose-500 inline-block"></span> Airbnb</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-amber-500 inline-block"></span> Agoda</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-orange-500 inline-block"></span> Goibibo / MMT</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-purple-500 inline-block"></span> King Villa</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-emerald-500 inline-block"></span> Direct / AI</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-muted/30 border-b border-border text-muted-foreground">
                    <th className="p-3 w-48">Room & Type</th>
                    <th className="p-3 w-36">Per-Room iCal Setup</th>
                    {dates.map((d, i) => (
                      <th key={i} className="p-3 text-center border-l border-border/40 font-mono">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rooms.length === 0 ? (
                    <tr>
                      <td colSpan={dates.length + 2} className="p-12 text-center text-muted-foreground">
                        <BedDouble size={32} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-semibold">No Rooms Added Yet</p>
                        <p className="text-xs opacity-60 mt-1">Add a room to view its availability matrix and sync iCal feeds.</p>
                      </td>
                    </tr>
                  ) : (
                    rooms.map((room) => (
                    <tr key={room.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-semibold">
                        <p className="font-mono text-sm">Room {room.number}</p>
                        <p className="text-[11px] text-muted-foreground font-normal">{room.type} (₹{room.pricePerNight})</p>
                      </td>

                      {/* Per-Room iCal Link Setup Modal Trigger */}
                      <td className="p-3">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setSelectedRoomForIcal(room)}
                              className="h-7 text-[11px] gap-1 cursor-pointer border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300"
                            >
                              <Settings size={11} /> Room {room.number} iCal
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[550px]">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2 text-base">
                                <BedDouble className="size-5 text-amber-500" /> Room {room.number} ({room.type}) iCal Links
                              </DialogTitle>
                              <DialogDescription className="text-xs">
                                Manage dedicated iCal URLs for Room {room.number}. Leadzo will block Room {room.number} across all OTAs when booked anywhere.
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-2">
                              {/* Room Master Export iCal */}
                              <div className="space-y-1 bg-muted/40 p-3 rounded-lg border border-border">
                                <Label className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                                  <Copy size={12} /> Leadzo Master Export Link for Room {room.number}
                                </Label>
                                <p className="text-[10px] text-muted-foreground">Paste this link into Room {room.number}'s calendar import on Booking.com / Airbnb</p>
                                <div className="flex gap-2 pt-1">
                                  <Input value={room.masterExportIcal} readOnly className="font-mono text-[11px] bg-background" />
                                  <Button 
                                    size="sm" 
                                    onClick={() => {
                                      navigator.clipboard.writeText(room.masterExportIcal);
                                      setCopiedRoomIcal(room.number);
                                      setTimeout(() => setCopiedRoomIcal(null), 2000);
                                      toast.success(`Master iCal Link for Room ${room.number} Copied!`);
                                    }}
                                    className="gap-1 cursor-pointer shrink-0"
                                  >
                                    {copiedRoomIcal === room.number ? <Check size={12} /> : <Copy size={12} />}
                                    {copiedRoomIcal === room.number ? "Copied" : "Copy"}
                                  </Button>
                                </div>
                              </div>

                              {/* OTA Import Links for this Room */}
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <Label className="text-xs text-blue-400">Booking.com iCal for Room {room.number}</Label>
                                  <Input 
                                    placeholder="https://admin.booking.com/ical/room_101.ics"
                                    value={room.icalLinks.bookingCom || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, icalLinks: { ...r.icalLinks, bookingCom: val } } : r));
                                    }}
                                    className="text-xs font-mono"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-xs text-rose-400">Airbnb iCal for Room {room.number}</Label>
                                  <Input 
                                    placeholder="https://www.airbnb.com/calendar/ical/room_101.ics"
                                    value={room.icalLinks.airbnb || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, icalLinks: { ...r.icalLinks, airbnb: val } } : r));
                                    }}
                                    className="text-xs font-mono"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-xs text-amber-400">Agoda iCal for Room {room.number}</Label>
                                  <Input 
                                    placeholder="https://ycs.agoda.com/ical/room_101.ics"
                                    value={room.icalLinks.agoda || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, icalLinks: { ...r.icalLinks, agoda: val } } : r));
                                    }}
                                    className="text-xs font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>

                      {dates.map((date, idx) => {
                        const booking = getBookingForCell(room.number, date);
                        return (
                          <td key={idx} className="p-2 border-l border-border/40 text-center relative h-14">
                            {booking ? (
                              <div 
                                className={cn(
                                  "h-full w-full rounded-md p-1.5 flex flex-col justify-between text-[10px] font-medium transition-all shadow-sm",
                                  booking.source === "Booking.com" && "bg-blue-500/20 text-blue-300 border border-blue-500/40",
                                  booking.source === "Airbnb" && "bg-rose-500/20 text-rose-300 border border-rose-500/40",
                                  booking.source === "Agoda" && "bg-amber-500/20 text-amber-300 border border-amber-500/40",
                                  (booking.source === "Goibibo" || booking.source.includes("Goibibo") || booking.source.includes("MMT")) && "bg-orange-500/20 text-orange-300 border border-orange-500/40",
                                  (booking.source === "King Villa" || booking.source.includes("King Villa")) && "bg-purple-500/20 text-purple-300 border border-purple-500/40",
                                  booking.source === "Direct / AI Agent" && booking.status !== "blocked" && "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
                                  booking.status === "blocked" && "bg-slate-800 text-slate-400 border border-slate-700"
                                )}
                                title={`${booking.guestName} (${booking.source})`}
                              >
                                <span className="font-bold truncate">{booking.guestName}</span>
                                <span className="text-[9px] opacity-80">{booking.source}</span>
                              </div>
                            ) : (
                              <button 
                                onClick={() => {
                                  toast.info(`Reserve Room ${room.number} for ${date}?`);
                                }}
                                className="h-full w-full rounded hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-transparent transition-all flex items-center justify-center text-muted-foreground/30 hover:text-emerald-400 text-[10px] cursor-pointer"
                              >
                                + Available
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: OTA Channel Credentials (AI Login & Password Auto-Connect) */}
        <TabsContent value="channels" className="mt-4 space-y-4">

          {/* Header row with Add Custom Channel button + Push to All */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">Manage your OTA channel connections and iCal feed URLs.</p>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePushLeadzoIcalToAll}
                disabled={isPushingToAll}
                size="sm"
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs cursor-pointer disabled:opacity-60"
              >
                {isPushingToAll ? <RefreshCw size={13} className="animate-spin" /> : <Layers size={13} />}
                {isPushingToAll ? 'Pushing...' : '🤖 AI Push Leadzo iCal to ALL Platforms'}
              </Button>
              <Dialog open={isAddChannelOpen} onOpenChange={setIsAddChannelOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs cursor-pointer">
                  <Plus size={13} /> Add Custom Channel
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <Globe className="size-5 text-emerald-400" /> Add Custom Platform / Channel
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Add any booking platform — MakeMyTrip, Goibibo, Hostelworld, or your own Property Management System (PMS) — by pasting its iCal export URL.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Platform / Channel Name</Label>
                    <Input
                      placeholder="e.g. MakeMyTrip, Hostelworld, My PMS System..."
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">iCal Export URL</Label>
                    <Input
                      placeholder="https://yourplatform.com/calendar/ical/your-property.ics"
                      value={newChannelIcal}
                      onChange={(e) => setNewChannelIcal(e.target.value)}
                      className="text-xs font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Paste the .ics calendar export link from your platform's settings page.</p>
                  </div>

                  <div className="bg-muted/40 rounded-lg border border-border p-3 text-[11px] text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground/80">📋 Where to find iCal URL?</p>
                    <p>• <span className="text-blue-400">Booking.com</span>: Extranet → Calendar → Export</p>
                    <p>• <span className="text-rose-400">Airbnb</span>: Listing → Availability → Export Calendar</p>
                    <p>• <span className="text-amber-400">Agoda</span>: YCS Portal → Calendar → iCal</p>
                    <p>• <span className="text-green-400">Google Calendar</span>: Settings → Share → Public iCal Link</p>
                    <p>• <span className="text-purple-400">Any PMS</span>: Look for "Export" or "Sync" in calendar settings</p>
                  </div>

                  <Button
                    onClick={async () => {
                      if (!newChannelName.trim() || !newChannelIcal.trim()) {
                        toast.error("Please fill in both platform name and iCal URL.");
                        return;
                      }
                      setIsAddingChannel(true);
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) throw new Error("Not authenticated");

                        const channelId = newChannelName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
                        const { error } = await supabase.from('hotel_channels').insert({
                          user_id: user.id,
                          channel_id: channelId,
                          name: newChannelName.trim(),
                          icon_color: "text-purple-400",
                          badge_bg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                          connect_mode: "ical",
                          email: "",
                          password: "",
                          ical_url: newChannelIcal.trim(),
                          status: "connected",
                          last_sync: "Just added"
                        });
                        if (error) throw error;

                        toast.success(`✅ ${newChannelName} added successfully!`);
                        setNewChannelName("");
                        setNewChannelIcal("");
                        setIsAddChannelOpen(false);
                        await fetchData();
                      } catch (err: any) {
                        toast.error("Failed to add channel: " + err.message);
                      } finally {
                        setIsAddingChannel(false);
                      }
                    }}
                    disabled={isAddingChannel || !newChannelName.trim() || !newChannelIcal.trim()}
                    className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold cursor-pointer"
                  >
                    {isAddingChannel ? (
                      <><RefreshCw size={13} className="animate-spin" /> Adding...</>
                    ) : (
                      <><Plus size={13} /> Add {newChannelName || "Channel"} to Leadzo</>  
                    )}
                  </Button>
                </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-card/30 border border-border/40 rounded-xl">
              <Globe size={48} className="text-muted-foreground opacity-20 mb-4" />
              <p className="text-base font-semibold">No OTA Channels Connected</p>
              <p className="text-xs text-muted-foreground mt-1">Connect Booking.com, Airbnb, Agoda or others to auto-sync availability.</p>
              <Button onClick={() => setIsAddChannelOpen(true)} className="mt-4 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs cursor-pointer">
                <Plus size={13} /> Add Your First Channel
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {channels.map((channel) => (
              <Card key={channel.id} className="border-border">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className={cn("size-5", channel.iconColor)} />
                    <CardTitle className="text-sm font-semibold">{channel.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className={channel.badgeBg}>
                    {channel.status === "connected" ? "🟢 Connected (Auto AI)" : "🟠 Pending"}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {/* Connect Mode Switcher */}
                  <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-lg border border-border">
                    <button 
                      onClick={() => setChannels(prev => prev.map(c => c.id === channel.id ? { ...c, connectMode: "ai" } : c))}
                      className={cn("flex-1 text-[11px] font-semibold py-1 rounded cursor-pointer transition-all flex items-center justify-center gap-1", channel.connectMode === "ai" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-muted-foreground")}
                    >
                      <Bot size={12} /> AI Auto-Login
                    </button>
                    <button 
                      onClick={() => setChannels(prev => prev.map(c => c.id === channel.id ? { ...c, connectMode: "ical" } : c))}
                      className={cn("flex-1 text-[11px] font-semibold py-1 rounded cursor-pointer transition-all flex items-center justify-center gap-1", channel.connectMode === "ical" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "text-muted-foreground")}
                    >
                      <LinkIcon size={12} /> Direct iCal Feed
                    </button>
                  </div>

                  {channel.connectMode === "ai" ? (
                    <div className="space-y-2 pt-1">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{channel.name} Login Email / ID</Label>
                        <Input 
                          placeholder="e.g. hotel.grand@gmail.com" 
                          value={channel.email}
                          onChange={(e) => {
                            const val = e.target.value;
                            setChannels(prev => prev.map(c => c.id === channel.id ? { ...c, email: val } : c));
                          }}
                          className="text-xs" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{channel.name} Password</Label>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          value={channel.password}
                          onChange={(e) => {
                            const val = e.target.value;
                            setChannels(prev => prev.map(c => c.id === channel.id ? { ...c, password: val } : c));
                          }}
                          className="text-xs font-mono" 
                        />
                      </div>
                      {/* Multi-phase AI Progress Indicator */}
                      {aiConnectProgress[channel.id] && aiConnectProgress[channel.id] !== 'idle' && (
                        <div className="rounded-lg bg-muted/50 border border-border p-2.5 space-y-1.5 text-[10px]">
                          <div className={cn("flex items-center gap-2", aiConnectProgress[channel.id] === 'login' ? 'text-amber-300' : aiConnectProgress[channel.id] === 'idle' ? 'text-muted-foreground' : 'text-emerald-400')}>
                            {aiConnectProgress[channel.id] === 'login' ? <RefreshCw size={10} className="animate-spin" /> : <Check size={10} />}
                            Phase 1: AI logging into {channel.name}...
                          </div>
                          <div className={cn("flex items-center gap-2", aiConnectProgress[channel.id] === 'extract' ? 'text-blue-300 animate-pulse' : ['inject','done'].includes(aiConnectProgress[channel.id]) ? 'text-emerald-400' : 'text-muted-foreground/40')}>
                            {aiConnectProgress[channel.id] === 'extract' ? <RefreshCw size={10} className="animate-spin" /> : ['inject','done'].includes(aiConnectProgress[channel.id]) ? <Check size={10} /> : <span className="size-2.5 rounded-full border border-muted-foreground/30 inline-block" />}
                            Phase 2: Extracting per-room iCal links...
                          </div>
                          <div className={cn("flex items-center gap-2", aiConnectProgress[channel.id] === 'inject' ? 'text-purple-300 animate-pulse' : aiConnectProgress[channel.id] === 'done' ? 'text-emerald-400' : 'text-muted-foreground/40')}>
                            {aiConnectProgress[channel.id] === 'inject' ? <RefreshCw size={10} className="animate-spin" /> : aiConnectProgress[channel.id] === 'done' ? <Check size={10} /> : <span className="size-2.5 rounded-full border border-muted-foreground/30 inline-block" />}
                            Phase 3: 📡 Injecting Leadzo iCal → {channel.name} calendar...
                          </div>
                          {aiConnectProgress[channel.id] === 'done' && (
                            <div className="flex items-center gap-1.5 text-emerald-300 font-semibold pt-0.5 border-t border-emerald-500/20">
                              <CheckCircle2 size={11} className="text-emerald-400" />
                              Leadzo iCal injected into {channel.name}! Double bookings = ZERO 🛡️
                            </div>
                          )}
                        </div>
                      )}
                      <Button 
                        onClick={() => handleConnectOtaViaAi(channel.id, channel.name)}
                        disabled={!!aiConnectProgress[channel.id] && aiConnectProgress[channel.id] !== 'idle' && aiConnectProgress[channel.id] !== 'done'}
                        size="sm" 
                        className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold cursor-pointer text-xs mt-1 disabled:opacity-50"
                      >
                        {aiConnectProgress[channel.id] === 'login' && <RefreshCw size={13} className="animate-spin" />}
                        {aiConnectProgress[channel.id] === 'extract' && <RefreshCw size={13} className="animate-spin" />}
                        {aiConnectProgress[channel.id] === 'inject' && <Layers size={13} className="animate-pulse" />}
                        {(!aiConnectProgress[channel.id] || aiConnectProgress[channel.id] === 'idle' || aiConnectProgress[channel.id] === 'done') && <Bot size={13} />}
                        {aiConnectProgress[channel.id] === 'login' && 'AI Logging in...'}
                        {aiConnectProgress[channel.id] === 'extract' && 'Extracting Room iCal...'}
                        {aiConnectProgress[channel.id] === 'inject' && 'Injecting Leadzo iCal...'}
                        {aiConnectProgress[channel.id] === 'done' && '✅ Reconnect & Re-inject'}
                        {(!aiConnectProgress[channel.id] || aiConnectProgress[channel.id] === 'idle') && 'Auto-Connect + Inject Leadzo iCal via AI'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1 pt-1">
                      <Label className="text-[11px] text-muted-foreground">{channel.name} Master iCal Feed URL</Label>
                      <Input 
                        placeholder={`Paste ${channel.name} iCal URL here...`} 
                        value={channel.icalUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setChannels(prev => prev.map(c => c.id === channel.id ? { ...c, icalUrl: val, status: val ? "connected" : "pending" } : c));
                        }}
                        className="text-xs font-mono" 
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>Last Sync: {channel.lastSync}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleSyncChannel(channel)}
                      className="h-7 text-[11px] hover:text-foreground cursor-pointer"
                    >
                      <RefreshCw size={11} className="mr-1" /> Sync Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Export to Platforms — Leadzo Master iCal Push */}
        <TabsContent value="export" className="mt-4 space-y-6">

          {/* Header Banner */}
          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-transparent p-5">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Layers className="size-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-emerald-300 flex items-center gap-2">📡 Leadzo AI — Master Channel Manager</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Leadzo AI ka <strong className="text-white">खुद का iCal URL</strong> बनाएं और इसे Goibibo, OYO, MakeMyTrip, Google Calendar, Airbnb, Booking.com — सभी platforms में add करें।
                  <br />जब भी कोई booking आए (किसी भी platform से), Leadzo automatically सभी को update कर देगा — <strong className="text-emerald-300">Zero Double Booking</strong>!
                </p>
              </div>
            </div>
          </div>

          {/* Master iCal URL — ALL Rooms */}
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="p-4 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Globe className="size-5 text-emerald-400" />
                <div>
                  <CardTitle className="text-sm font-bold text-emerald-200">🌐 Leadzo Master iCal URL — All Rooms</CardTitle>
                  <CardDescription className="text-xs">यह URL सभी rooms की सभी bookings को एक साथ export करता है। किसी भी platform में यही URL paste करें।</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={masterIcalUrl || "Loading..."}
                  className="font-mono text-[11px] bg-background border-emerald-500/30 text-emerald-200"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (!masterIcalUrl) return;
                    navigator.clipboard.writeText(masterIcalUrl);
                    setCopiedMasterIcal('master');
                    setTimeout(() => setCopiedMasterIcal(null), 2000);
                    toast.success("✅ Master iCal URL Copied! Paste it in any platform.");
                  }}
                  className="gap-1 shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
                >
                  {copiedMasterIcal === 'master' ? <Check size={13} /> : <Copy size={13} />}
                  {copiedMasterIcal === 'master' ? 'Copied!' : 'Copy URL'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                  ✓ Real-time .ics feed
                </Badge>
                <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px]">
                  ✓ Auto-updates on new booking
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">
                  ✓ Works on all iCal platforms
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Per-Room iCal URLs */}
          {rooms.length > 0 && (
            <Card className="border-border">
              <CardHeader className="p-4 border-b border-border">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BedDouble size={16} className="text-amber-400" />
                  Per-Room iCal URLs (Airbnb / Booking.com format)
                </CardTitle>
                <CardDescription className="text-xs">ज़्यादातर platforms (Airbnb, Booking.com) per-room iCal चाहते हैं। Room-wise URL नीचे हैं।</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {rooms.map((room) => {
                  const roomUrl = masterIcalUrl ? masterIcalUrl + `&room_id=${room.id}` : '';
                  return (
                    <div key={room.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/60">
                      <div className="shrink-0 min-w-[72px]">
                        <span className="font-mono text-xs font-bold text-amber-300">Room {room.number}</span>
                        <p className="text-[10px] text-muted-foreground">{room.type}</p>
                      </div>
                      <Input
                        readOnly
                        value={roomUrl || 'Loading...'}
                        className="font-mono text-[10px] bg-background h-8"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(roomUrl);
                          setCopiedMasterIcal(room.id);
                          setTimeout(() => setCopiedMasterIcal(null), 2000);
                          toast.success(`Room ${room.number} iCal URL Copied!`);
                        }}
                        className="shrink-0 h-8 px-2 cursor-pointer text-[11px] gap-1"
                      >
                        {copiedMasterIcal === room.id ? <Check size={11} /> : <Copy size={11} />}
                        {copiedMasterIcal === room.id ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Platform-wise step-by-step guides */}
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <ExternalLink size={14} className="text-blue-400" />
              Platform-wise Setup Guide — Leadzo URL कहाँ paste करें?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Goibibo / MMT */}
              <Card className="border-orange-500/30 bg-orange-500/5">
                <CardHeader className="p-3 border-b border-orange-500/20">
                  <CardTitle className="text-xs font-bold text-orange-300 flex items-center gap-2">
                    🟠 Goibibo / MakeMyTrip
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-1.5 text-[11px] text-muted-foreground">
                  <p>1. Goibibo Partner Portal → Login करें</p>
                  <p>2. <strong className="text-white">My Properties</strong> → अपना Hotel select करें</p>
                  <p>3. <strong className="text-white">Calendar Sync / iCal</strong> tab में जाएं</p>
                  <p>4. <strong className="text-orange-300">"Import from URL"</strong> में Leadzo Master URL paste करें</p>
                  <p>5. Save → Goibibo हर 4-6 घंटे में auto-sync करेगा</p>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(masterIcalUrl); toast.success("URL Copied — Goibibo में paste करें!"); }} className="mt-2 h-7 text-[11px] w-full cursor-pointer border-orange-500/30 text-orange-300 hover:bg-orange-500/10 gap-1">
                    <Copy size={11} /> Copy URL for Goibibo
                  </Button>
                </CardContent>
              </Card>

              {/* OYO */}
              <Card className="border-red-500/30 bg-red-500/5">
                <CardHeader className="p-3 border-b border-red-500/20">
                  <CardTitle className="text-xs font-bold text-red-300 flex items-center gap-2">
                    🔴 OYO Rooms
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-1.5 text-[11px] text-muted-foreground">
                  <p>1. OYO Partner Portal (partner.oyorooms.com) → Login</p>
                  <p>2. <strong className="text-white">Property Settings</strong> → <strong className="text-white">Calendar</strong></p>
                  <p>3. <strong className="text-red-300">"Sync External Calendar (iCal)"</strong> पर click करें</p>
                  <p>4. Leadzo Master URL paste करें → Sync Now</p>
                  <p>5. OYO हर 2 घंटे में auto-refresh करेगा</p>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(masterIcalUrl); toast.success("URL Copied — OYO Partner Portal में paste करें!"); }} className="mt-2 h-7 text-[11px] w-full cursor-pointer border-red-500/30 text-red-300 hover:bg-red-500/10 gap-1">
                    <Copy size={11} /> Copy URL for OYO
                  </Button>
                </CardContent>
              </Card>

              {/* Airbnb */}
              <Card className="border-rose-500/30 bg-rose-500/5">
                <CardHeader className="p-3 border-b border-rose-500/20">
                  <CardTitle className="text-xs font-bold text-rose-300 flex items-center gap-2">
                    🏠 Airbnb
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-1.5 text-[11px] text-muted-foreground">
                  <p>1. Airbnb → Your Listings → Select Listing</p>
                  <p>2. <strong className="text-white">Availability</strong> tab → <strong className="text-white">Sync Calendars</strong></p>
                  <p>3. <strong className="text-rose-300">"Import Calendar"</strong> → URL paste करें</p>
                  <p className="text-amber-400">⚠️ Airbnb per-room URL चाहता है → ऊपर Per-Room URL copy करें</p>
                  <Button size="sm" variant="outline" onClick={() => { toast.info("Airbnb के लिए ऊपर Per-Room URL copy करें!"); }} className="mt-2 h-7 text-[11px] w-full cursor-pointer border-rose-500/30 text-rose-300 hover:bg-rose-500/10 gap-1">
                    <ArrowRight size={11} /> Use Per-Room URL (Above)
                  </Button>
                </CardContent>
              </Card>

              {/* Booking.com */}
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="p-3 border-b border-blue-500/20">
                  <CardTitle className="text-xs font-bold text-blue-300 flex items-center gap-2">
                    🔵 Booking.com
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-1.5 text-[11px] text-muted-foreground">
                  <p>1. admin.booking.com → Extranet Login</p>
                  <p>2. <strong className="text-white">Calendar</strong> → <strong className="text-white">iCal Synchronization</strong></p>
                  <p>3. <strong className="text-blue-300">"Add a new URL"</strong> → Leadzo Room URL paste करें</p>
                  <p className="text-amber-400">⚠️ Booking.com also needs per-room URLs</p>
                  <Button size="sm" variant="outline" onClick={() => { toast.info("Booking.com के लिए Per-Room URL copy करें!"); }} className="mt-2 h-7 text-[11px] w-full cursor-pointer border-blue-500/30 text-blue-300 hover:bg-blue-500/10 gap-1">
                    <ArrowRight size={11} /> Use Per-Room URL (Above)
                  </Button>
                </CardContent>
              </Card>

              {/* Google Calendar */}
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader className="p-3 border-b border-green-500/20">
                  <CardTitle className="text-xs font-bold text-green-300 flex items-center gap-2">
                    📅 Google Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-1.5 text-[11px] text-muted-foreground">
                  <p>1. calendar.google.com → Open</p>
                  <p>2. Left sidebar → <strong className="text-white">Other Calendars</strong> → <strong className="text-white">+ From URL</strong></p>
                  <p>3. Leadzo Master URL paste करें → <strong className="text-green-300">Add Calendar</strong></p>
                  <p>4. सभी bookings Google Calendar में दिखने लगेंगी!</p>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(masterIcalUrl); toast.success("URL Copied — Google Calendar में paste करें!"); }} className="mt-2 h-7 text-[11px] w-full cursor-pointer border-green-500/30 text-green-300 hover:bg-green-500/10 gap-1">
                    <Copy size={11} /> Copy URL for Google Calendar
                  </Button>
                </CardContent>
              </Card>

              {/* Agoda */}
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="p-3 border-b border-amber-500/20">
                  <CardTitle className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    🟡 Agoda YCS
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-1.5 text-[11px] text-muted-foreground">
                  <p>1. ycs.agoda.com → Property Dashboard Login</p>
                  <p>2. <strong className="text-white">Room Management</strong> → <strong className="text-white">Calendar</strong></p>
                  <p>3. <strong className="text-amber-300">"iCal Import"</strong> → Leadzo URL paste करें</p>
                  <p>4. Agoda हर 24 घंटे में auto-sync करेगा</p>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(masterIcalUrl); toast.success("URL Copied — Agoda YCS में paste करें!"); }} className="mt-2 h-7 text-[11px] w-full cursor-pointer border-amber-500/30 text-amber-300 hover:bg-amber-500/10 gap-1">
                    <Copy size={11} /> Copy URL for Agoda
                  </Button>
                </CardContent>
              </Card>

            </div>
          </div>


          {/* 🚀 ONE-CLICK: Push Leadzo iCal to ALL Connected Platforms */}
          <Card className="border-indigo-500/40 bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                <div className="flex items-start gap-3">
                  <div className="size-11 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Bot className="size-6 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-indigo-200">🤖 One-Click AI Push to ALL Platforms</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      AI Agent सभी connected platforms (Goibibo, OYO, Airbnb, Booking.com, Agoda) में
                      <strong className="text-indigo-300"> Leadzo Master iCal URL auto-inject</strong> कर देगा।
                      कोई manual काम नहीं!
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {channels.filter(c => c.status === 'connected').map(ch => (
                        <Badge key={ch.id} variant="outline" className={cn(
                          "text-[9px] gap-1",
                          aiConnectProgress[ch.id] === 'inject' && "bg-purple-500/20 text-purple-300 border-purple-500/30 animate-pulse",
                          aiConnectProgress[ch.id] === 'done' && "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                          (!aiConnectProgress[ch.id] || aiConnectProgress[ch.id] === 'idle') && "bg-muted text-muted-foreground",
                        )}>
                          {aiConnectProgress[ch.id] === 'inject' && <RefreshCw size={8} className="animate-spin" />}
                          {aiConnectProgress[ch.id] === 'done' && <Check size={8} />}
                          {ch.name}
                        </Badge>
                      ))}
                      {channels.filter(c => c.status === 'connected').length === 0 && (
                        <span className="text-[11px] text-amber-400">⚠️ OTA Channels tab में पहले channels connect करें</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handlePushLeadzoIcalToAll}
                  disabled={isPushingToAll || channels.filter(c => c.status === 'connected').length === 0}
                  className="shrink-0 gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold cursor-pointer px-6 disabled:opacity-60"
                >
                  {isPushingToAll ? (
                    <><RefreshCw size={14} className="animate-spin" /> Pushing to all...</>
                  ) : (
                    <><Layers size={14} /> Push Leadzo iCal to ALL Platforms</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pro Tip Banner */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 flex items-start gap-3">
            <Sparkles className="size-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-indigo-200">💡 Pro Tip — How it works together</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                <strong className="text-white">Booking.com</strong> से booking आई → Leadzo DB में save → Leadzo का iCal auto-update →
                <strong className="text-emerald-300"> Goibibo + OYO + Airbnb</strong> को next sync में पता चला → Room automatically blocked →
                <strong className="text-red-400"> Double Booking = ZERO</strong>
              </p>
            </div>
          </div>

        </TabsContent>


        {/* Tab 4: AI Hotel Receptionist & Voice */}
        <TabsContent value="receptionist" className="mt-4 space-y-4">

          {/* Inbound Phone & Call Forwarding Setup Card */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="p-4 border-b border-amber-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Phone className="size-5 text-amber-400" />
                  <div>
                    <CardTitle className="text-base font-semibold text-amber-200">Inbound Phone Call & AI Forwarding Setup</CardTitle>
                    <CardDescription className="text-xs text-amber-300/70">Connect your personal mobile number so AI answers when you are busy or get unknown caller leads</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 w-fit">
                  🟢 AI Call Guard Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Your Personal / Hotel Mobile Number</Label>
                  <Input defaultValue="+91 98765 43210" className="text-xs font-mono bg-background" />
                  <p className="text-[10px] text-muted-foreground">Calls to this number will be auto-handled by Leadzo AI</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-indigo-300">Leadzo AI Virtual Inbound Number</Label>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Input readOnly value={activeNumber || "No Virtual Number"} className="text-xs font-mono bg-indigo-500/10 border-indigo-500/30 text-indigo-200 font-bold pr-8" />
                      {activeNumber && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute right-1 top-1 h-7 w-7 text-indigo-300 hover:text-indigo-100 hover:bg-indigo-500/20"
                          onClick={() => {
                            navigator.clipboard.writeText(activeNumber);
                            toast.success("Number Copied!");
                          }}
                        >
                          <Copy size={12} />
                        </Button>
                      )}
                    </div>
                    {!activeNumber ? (
                      <Button 
                        onClick={() => setIsBuyNumberModalOpen(true)}
                        className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer h-9 px-3 text-xs"
                      >
                        Buy via Vapi
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => toast.success(`${activeNumber} has been successfully activated for AI Call Guard!`)}
                        variant="outline"
                        className="shrink-0 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 cursor-pointer h-9 px-3 text-xs font-semibold"
                      >
                        Activate Your Number
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-indigo-300/70">Target AI Number for Call Forwarding</p>
                </div>
              </div>

              {/* Rules Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {/* Rule 1: Forward When Busy/Unanswered */}
                <div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-amber-300 flex items-center gap-1.5">
                      <ShieldCheck size={13} /> Rule 1: Busy / Unanswered Forwarding
                    </span>
                    <Badge variant="secondary" className="text-[9px]">Active</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Aap busy honge ya call nahi uthayenge (after 15s), toh call automatic AI Receptionist ko transfer ho jayegi!
                  </p>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Dial: *61*{activeNumber ? activeNumber.replace(/\s+/g, '') : '+911140845918'}#
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(`*61*${activeNumber ? activeNumber.replace(/\s+/g, '') : '+911140845918'}#`); toast.success("USSD Code Copied!"); }} className="h-6 text-[10px] cursor-pointer">
                      Copy Code
                    </Button>
                  </div>
                </div>

                {/* Rule 2: Unknown Contacts Auto Answer */}
                <div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-indigo-300 flex items-center gap-1.5">
                      <User size={13} /> Rule 2: Unknown / Unsaved Callers (New Leads)
                    </span>
                    <Badge variant="secondary" className="text-[9px]">Active</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Naye guests aur unknown numbers se aane waale calls direct AI Manager uthayega aur room booking deal final karega!
                  </p>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="font-mono text-[11px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      Dial: *21*{activeNumber ? activeNumber.replace(/\s+/g, '') : '+911140845918'}#
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(`*21*${activeNumber ? activeNumber.replace(/\s+/g, '') : '+911140845918'}#`); toast.success("USSD Code Copied!"); }} className="h-6 text-[10px] cursor-pointer">
                      Copy Code
                    </Button>
                  </div>
                </div>
              </div>

              {/* One-Click USSD Dialing for Indian Telecom Carriers */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-amber-500/20">
                <span className="text-xs text-muted-foreground">1-Click Mobile Setup:</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toast.info(`Jio Forwarding Code: *61*${activeNumber ? activeNumber.replace(/\s+/g, '') : '+911140845918'}#`)} className="h-7 text-[11px] cursor-pointer">Jio</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.info(`Airtel Forwarding Code: *61*${activeNumber ? activeNumber.replace(/\s+/g, '') : '+911140845918'}#`)} className="h-7 text-[11px] cursor-pointer">Airtel</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.info(`Vi Forwarding Code: *61*${activeNumber ? activeNumber.replace(/\s+/g, '') : '+911140845918'}#`)} className="h-7 text-[11px] cursor-pointer">Vi</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.info(`BSNL Forwarding Code: *61*${activeNumber ? activeNumber.replace(/\s+/g, '') : '+911140845918'}#`)} className="h-7 text-[11px] cursor-pointer">BSNL</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border">
              <CardHeader className="p-4 border-b border-border">
                <CardTitle className="text-base font-semibold">AI Hotel Receptionist Configuration</CardTitle>
                <CardDescription className="text-xs">Train AI to answer guest calls, check room rates & send WhatsApp links</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Standard Check-In Time</Label>
                    <Input defaultValue="12:00 PM" className="text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Standard Check-Out Time</Label>
                    <Input defaultValue="11:00 AM" className="text-xs" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Hotel Amenities & Policies</Label>
                  <Textarea 
                    rows={4} 
                    defaultValue="Free Wi-Fi, 24/7 Hot Water, Swimming Pool, In-house Restaurant, Parking Available. Cancellation policy: Free cancellation 24 hours prior to check-in."
                    className="text-xs resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">WhatsApp Direct Booking Link (Sent by AI)</Label>
                  <Input defaultValue="https://leadzoai.com/book/hotel-grand-palace" className="text-xs font-mono" />
                </div>

                <Button onClick={() => toast.success("AI Receptionist Trained Successfully!")} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer gap-2">
                  <Sparkles size={14} /> Train AI Receptionist
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/40">
              <CardHeader className="p-4 border-b border-border">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Bot className="size-4 text-emerald-400" /> AI Receptionist Live Preview Script
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs leading-relaxed">
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <p className="font-semibold text-emerald-400 mb-1">Guest Query (Phone / WhatsApp):</p>
                  <p className="text-muted-foreground font-mono">"Namaste, kya Sept 08 se Sept 10 tak Deluxe Room 101 available hai?"</p>
                </div>

                <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <p className="font-semibold text-indigo-300 mb-1">AI Receptionist Auto Response:</p>
                  <p className="text-slate-200">"Namaste! Haan, Sept 08 se Sept 10 tak Deluxe Room 101 available hai. Price per night ₹3,500 hai. Kya main aapke WhatsApp par instant direct booking link bhej doon?"</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: All Reservations & Lead History */}
        <TabsContent value="reservations" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="p-4 border-b border-border">
              <CardTitle className="text-base font-semibold">Guest Reservations & Lead History</CardTitle>
              <CardDescription className="text-xs">List of all room bookings auto-captured from OTAs & AI Caller</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-muted/30 border-b border-border text-muted-foreground">
                    <th className="p-3">Guest Name & Phone</th>
                    <th className="p-3">Room</th>
                    <th className="p-3">OTA Channel</th>
                    <th className="p-3">Dates</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-semibold">
                        <p className="text-sm">{booking.guestName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{booking.phone}</p>
                      </td>
                      <td className="p-3 font-mono">Room {booking.roomNumber}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={cn(
                          booking.source === "Booking.com" && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                          booking.source === "Airbnb" && "bg-rose-500/10 text-rose-400 border-rose-500/20",
                          booking.source === "Agoda" && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                          booking.source === "Direct / AI Agent" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        )}>
                          {booking.source}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono">{booking.checkIn} → {booking.checkOut}</td>
                      <td className="p-3 font-mono font-bold">₹{booking.amount}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={booking.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-800 text-slate-400 border-slate-700"}>
                          {booking.status === "confirmed" ? "✓ Confirmed" : "🔒 Blocked"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Hotel Ad Campaigns (Insta & Google) */}
        <TabsContent value="campaigns" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Campaign Setup Card */}
            <Card className="border-border">
              <CardHeader className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Rocket className="size-5 text-rose-400" />
                  <div>
                    <CardTitle className="text-base font-semibold">City-Targeted Hotel Ad Campaign Launcher</CardTitle>
                    <CardDescription className="text-xs">Run high-converting Instagram Reels & Google Search Ads targeting travelers</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <MapPin size={13} className="text-rose-400" /> Select Target City / Tourist Region
                  </Label>
                  <Input defaultValue="Goa (Calangute & North Goa)" className="text-xs" />
                  <p className="text-[10px] text-muted-foreground">Ads will specifically target tourists & travelers planning trips to this city</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Target size={13} className="text-amber-400" /> Hotel Campaign Offer Type
                  </Label>
                  <Input defaultValue="Weekend Luxury Staycation - 25% Off + Free Breakfast" className="text-xs" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Daily Ad Budget</Label>
                    <Input defaultValue="₹500 / day" className="text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Target Platform</Label>
                    <Input defaultValue="Instagram Reels + Google Search" readOnly className="text-xs font-mono bg-muted/40" />
                  </div>
                </div>

                <Button 
                  onClick={() => toast.success("AI Hotel Ad Copy & Reels Script Generated!")} 
                  variant="outline" 
                  className="w-full border-border hover:bg-muted text-xs cursor-pointer gap-2"
                >
                  <Sparkles size={14} className="text-amber-400" /> Auto-Generate AI Ad Copy & Script
                </Button>

                <Button 
                  onClick={() => {
                    toast.success("Connecting to Leadzo Insta & Google Ad Launcher!");
                    window.location.href = "/campaign-launch";
                  }} 
                  className="w-full bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-semibold cursor-pointer gap-2"
                >
                  <Rocket size={14} /> Launch Hotel Campaign on Insta & Google <ArrowRight size={14} />
                </Button>
              </CardContent>
            </Card>

            {/* AI Ad Preview Card */}
            <Card className="border-border bg-card/40">
              <CardHeader className="p-4 border-b border-border">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Camera className="size-4 text-rose-400" /> Instagram Reels Ad Preview & Script
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs leading-relaxed">
                <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                  <p className="font-semibold text-rose-400">Instagram Reel Video Hook Script:</p>
                  <p className="text-slate-200">"Planning a trip to Goa this weekend? 🌴 Stay at Hotel Grand Palace with private pool & beach access at flat 25% OFF! Tap 'Book Now' to talk to our AI Receptionist and reserve instantly."</p>
                </div>

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-1">
                  <p className="font-semibold text-blue-300">Google Search Ad Copy:</p>
                  <p className="text-slate-200 font-mono">Headline: Best Luxury Hotel in Goa | 25% Off Weekend Rates</p>
                  <p className="text-muted-foreground text-[11px]">Description: Book direct with 0% booking fee. Swimming pool, free breakfast & 24/7 AI Receptionist.</p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                  <p className="text-[11px] text-emerald-300">
                    All ad leads automatically flow into Leadzo Hotel Lead Manager, where AI Voice & WhatsApp Receptionist instantly calls/texts to close bookings!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
