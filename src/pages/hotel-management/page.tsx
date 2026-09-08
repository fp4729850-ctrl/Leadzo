import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, Calendar, RefreshCw, CheckCircle2, ShieldCheck, 
  Link as LinkIcon, Plus, User, Phone, Globe, Lock, AlertTriangle, 
  Sparkles, Copy, Check, ExternalLink, Bot, BedDouble, Hotel, CalendarCheck, ShieldAlert,
  Settings, Key, Layers, X, Wand2, Rocket, MapPin, Target, ArrowRight, Camera
} from "lucide-react";
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
  source: "Booking.com" | "Airbnb" | "Agoda" | "Goibibo" | "Direct / AI Agent";
  checkIn: string;
  checkOut: string;
  amount: number;
  status: "confirmed" | "completed" | "blocked";
}

export default function HotelLeadManagerPage() {
  const [copiedRoomIcal, setCopiedRoomIcal] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("matrix");
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [selectedRoomForIcal, setSelectedRoomForIcal] = useState<Room | null>(null);
  const [isAiMatching, setIsAiMatching] = useState(false);
  const [isBuyNumberModalOpen, setIsBuyNumberModalOpen] = useState(false);
  const [activeNumber, setActiveNumber] = useState<string | null>("+1 928 963 5202"); // Initialized with the recently bought number for demo purposes

  // OTA Channels with Dual Connect Mode (AI Login & Password vs Direct iCal)
  const [channels, setChannels] = useState<OtaChannel[]>([
    { id: "booking", name: "Booking.com", iconColor: "text-blue-400", badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20", connectMode: "ai", email: "hotel.grand@booking.com", password: "••••••••", icalUrl: "https://admin.booking.com/hotel/ical/export/sample.ics", status: "connected", lastSync: "2 mins ago" },
    { id: "airbnb", name: "Airbnb", iconColor: "text-rose-400", badgeBg: "bg-rose-500/10 text-rose-400 border-rose-500/20", connectMode: "ai", email: "host@airbnb.com", password: "••••••••", icalUrl: "https://www.airbnb.com/calendar/ical/12345678.ics?s=sample", status: "connected", lastSync: "5 mins ago" },
    { id: "agoda", name: "Agoda", iconColor: "text-amber-400", badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20", connectMode: "ical", email: "", password: "", icalUrl: "https://ycs.agoda.com/ical/export/sample.ics", status: "connected", lastSync: "1 min ago" },
    { id: "goibibo", name: "Goibibo / MMT", iconColor: "text-orange-400", badgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/20", connectMode: "ai", email: "", password: "", icalUrl: "", status: "pending", lastSync: "Not connected" },
  ]);

  // Rooms with Per-Room iCal Links
  const [rooms, setRooms] = useState<Room[]>([
    { 
      id: "101", number: "101", type: "Deluxe King Suite", pricePerNight: 3500, 
      masterExportIcal: "https://api.leadzoai.com/v1/hotel/ical/export/room_101_leadzo.ics",
      icalLinks: {
        bookingCom: "https://admin.booking.com/ical/room_101.ics",
        airbnb: "https://www.airbnb.com/calendar/ical/room_101.ics",
        agoda: "https://ycs.agoda.com/ical/room_101.ics"
      }
    },
    { 
      id: "102", number: "102", type: "Deluxe Double Bed", pricePerNight: 3000, 
      masterExportIcal: "https://api.leadzoai.com/v1/hotel/ical/export/room_102_leadzo.ics",
      icalLinks: {
        bookingCom: "https://admin.booking.com/ical/room_102.ics",
        airbnb: "https://www.airbnb.com/calendar/ical/room_102.ics"
      }
    },
    { 
      id: "201", number: "201", type: "Executive Suite", pricePerNight: 5500, 
      masterExportIcal: "https://api.leadzoai.com/v1/hotel/ical/export/room_201_leadzo.ics",
      icalLinks: {
        bookingCom: "https://admin.booking.com/ical/room_201.ics",
        agoda: "https://ycs.agoda.com/ical/room_201.ics"
      }
    },
    { 
      id: "202", number: "202", type: "Royal Family Room", pricePerNight: 6500, 
      masterExportIcal: "https://api.leadzoai.com/v1/hotel/ical/export/room_202_leadzo.ics",
      icalLinks: {
        airbnb: "https://www.airbnb.com/calendar/ical/room_202.ics"
      }
    },
    { 
      id: "301", number: "301", type: "Presidential Penthouse", pricePerNight: 12000, 
      masterExportIcal: "https://api.leadzoai.com/v1/hotel/ical/export/room_301_leadzo.ics",
      icalLinks: {}
    },
  ]);

  // Next 7 days
  const dates = ["Sept 06", "Sept 07", "Sept 08", "Sept 09", "Sept 10", "Sept 11", "Sept 12"];

  // Sample Bookings Grid Mapping
  const [bookings, setBookings] = useState<Booking[]>([
    { id: "b1", roomNumber: "101", guestName: "Rahul Sharma", phone: "+919876543210", source: "Booking.com", checkIn: "Sept 06", checkOut: "Sept 08", amount: 7000, status: "confirmed" },
    { id: "b2", roomNumber: "102", guestName: "Priya Patel", phone: "+919812345678", source: "Airbnb", checkIn: "Sept 07", checkOut: "Sept 09", amount: 6000, status: "confirmed" },
    { id: "b3", roomNumber: "201", guestName: "Amit Verma", phone: "+919988776655", source: "Direct / AI Agent", checkIn: "Sept 06", checkOut: "Sept 07", amount: 5500, status: "confirmed" },
    { id: "b4", roomNumber: "202", guestName: "Vikram Malhotra", phone: "+919765432109", source: "Agoda", checkIn: "Sept 09", checkOut: "Sept 12", amount: 19500, status: "confirmed" },
    { id: "b5", roomNumber: "301", guestName: "Maintenance Block", phone: "N/A", source: "Direct / AI Agent", checkIn: "Sept 08", checkOut: "Sept 09", amount: 0, status: "blocked" },
  ]);

  const handleSyncAll = () => {
    setIsSyncingAll(true);
    toast.info("Syncing OTA Calendars across Booking.com, Airbnb, Agoda...");
    setTimeout(() => {
      setIsSyncingAll(false);
      setChannels(prev => prev.map(c => c.status === "connected" ? { ...c, lastSync: "Just now" } : c));
      toast.success("All Room Calendars Synced & Double Bookings Guard Active!");
    }, 1800);
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
    toast.loading(`AI Logging into ${name}...`, { id: "ota-connect" });
    setTimeout(() => {
      setChannels(prev => prev.map(c => c.id === channelId ? { ...c, status: "connected", lastSync: "Just now" } : c));
      toast.success(`AI Connected to ${name} & Auto-Extracted Room iCal Links!`, { id: "ota-connect" });
    }, 1500);
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/60">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="size-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <BedDouble size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Hotel Rooms</p>
              <p className="text-xl font-bold font-mono">{rooms.length} Units</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/60">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <CalendarCheck size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Active Bookings</p>
              <p className="text-xl font-bold font-mono">{bookings.length} Reserved</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/60">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="size-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Globe size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">OTA Channels</p>
              <p className="text-xl font-bold font-mono">{channels.filter(c => c.status === 'connected').length} Connected</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/60">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="size-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Double Bookings Saved</p>
              <p className="text-xl font-bold font-mono text-emerald-400">12 Prevented</p>
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
          <TabsTrigger value="channels" className="gap-2 text-xs">
            <Globe size={13} /> OTA Channel Credentials (AI Login)
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

        {/* Tab 1: Room Availability Matrix */}
        <TabsContent value="matrix" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="p-4 pb-2 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Per-Room Live Availability & iCal Sync Grid</CardTitle>
                <CardDescription className="text-xs">Each room has its own unique iCal links mapped across Booking.com, Airbnb & Agoda</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-blue-500 inline-block"></span> Booking.com</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-rose-500 inline-block"></span> Airbnb</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-amber-500 inline-block"></span> Agoda</span>
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
          {channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-card/30 border border-border/40 rounded-xl">
              <Globe size={48} className="text-muted-foreground opacity-20 mb-4" />
              <p className="text-base font-semibold">No OTA Channels Connected</p>
              <p className="text-xs text-muted-foreground mt-1">Connect Booking.com, Airbnb, Agoda or others to auto-sync availability.</p>
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
                      <Button 
                        onClick={() => handleConnectOtaViaAi(channel.id, channel.name)}
                        size="sm" 
                        className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold cursor-pointer text-xs mt-1"
                      >
                        <Bot size={13} /> Auto-Connect & Extract Room iCal via AI
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
                      onClick={() => toast.success(`${channel.name} calendar synced!`)}
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

        {/* Tab 3: AI Hotel Receptionist & Voice */}
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
