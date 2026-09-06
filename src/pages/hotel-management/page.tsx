import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, Calendar, RefreshCw, CheckCircle2, ShieldCheck, 
  Link as LinkIcon, Plus, User, Phone, Globe, Lock, AlertTriangle, 
  Sparkles, Copy, Check, ExternalLink, Bot, BedDouble, Hotel, CalendarCheck, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

interface OtaChannel {
  id: string;
  name: string;
  iconColor: string;
  badgeBg: string;
  icalUrl: string;
  status: "connected" | "syncing" | "pending";
  lastSync: string;
}

interface Room {
  id: string;
  number: string;
  type: string;
  pricePerNight: number;
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedTab, setSelectedTab] = useState("matrix");
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Sample OTA channels
  const [channels, setChannels] = useState<OtaChannel[]>([
    { id: "booking", name: "Booking.com", iconColor: "text-blue-400", badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20", icalUrl: "https://admin.booking.com/hotel/ical/export/sample.ics", status: "connected", lastSync: "2 mins ago" },
    { id: "airbnb", name: "Airbnb", iconColor: "text-rose-400", badgeBg: "bg-rose-500/10 text-rose-400 border-rose-500/20", icalUrl: "https://www.airbnb.com/calendar/ical/12345678.ics?s=sample", status: "connected", lastSync: "5 mins ago" },
    { id: "agoda", name: "Agoda", iconColor: "text-amber-400", badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20", icalUrl: "https://ycs.agoda.com/ical/export/sample.ics", status: "connected", lastSync: "1 min ago" },
    { id: "goibibo", name: "Goibibo / MMT", iconColor: "text-orange-400", badgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/20", icalUrl: "", status: "pending", lastSync: "Not connected" },
  ]);

  // Rooms
  const rooms: Room[] = [
    { id: "101", number: "101", type: "Deluxe King Suite", pricePerNight: 3500 },
    { id: "102", number: "102", type: "Deluxe Double Bed", pricePerNight: 3000 },
    { id: "201", number: "201", type: "Executive Suite", pricePerNight: 5500 },
    { id: "202", number: "202", type: "Royal Family Room", pricePerNight: 6500 },
    { id: "301", number: "301", type: "Presidential Penthouse", pricePerNight: 12000 },
  ];

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

  const masterExportIcal = "https://api.leadzoai.com/v1/hotel/ical/export/master_hotel_sync_9918.ics";

  const handleSyncAll = () => {
    setIsSyncingAll(true);
    toast.info("Syncing OTA Calendars across Booking.com, Airbnb, Agoda...");
    setTimeout(() => {
      setIsSyncingAll(false);
      setChannels(prev => prev.map(c => c.status === "connected" ? { ...c, lastSync: "Just now" } : c));
      toast.success("All OTA Channels Synced & Master Calendar Updated!");
    }, 1800);
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
                Double Booking Guard 🛡️
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Auto-sync calendars & leads across Booking.com, Airbnb, Agoda & Direct AI Caller</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSyncAll} disabled={isSyncingAll} variant="outline" size="sm" className="gap-2 cursor-pointer border-border hover:bg-muted">
            <RefreshCw size={14} className={cn(isSyncingAll && "animate-spin text-amber-400")} />
            {isSyncingAll ? "Syncing..." : "Sync OTA Channels"}
          </Button>
          <Button size="sm" className="gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold cursor-pointer">
            <Plus size={14} /> Direct Booking
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
              <p className="text-xl font-bold font-mono">5 Units</p>
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
              <p className="text-xl font-bold font-mono">4 Reserved</p>
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
              <p className="text-xl font-bold font-mono">3 Connected</p>
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
        <TabsList className="bg-muted/40 p-1 border border-border/60">
          <TabsTrigger value="matrix" className="gap-2 text-xs">
            <Calendar size={13} /> Availability Matrix
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-2 text-xs">
            <Globe size={13} /> OTA Channel Sync (iCal)
          </TabsTrigger>
          <TabsTrigger value="receptionist" className="gap-2 text-xs">
            <Bot size={13} /> AI Receptionist & Voice
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
                <CardTitle className="text-base font-semibold">Live Room Availability & Channel Matrix</CardTitle>
                <CardDescription className="text-xs">Real-time room occupancy grid across all connected OTAs</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-blue-500 inline-block"></span> Booking.com</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-rose-500 inline-block"></span> Airbnb</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-amber-500 inline-block"></span> Agoda</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-emerald-500 inline-block"></span> Direct / AI</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-muted/30 border-b border-border text-muted-foreground">
                    <th className="p-3 w-44">Room No & Type</th>
                    <th className="p-3 w-24">Rate/Night</th>
                    {dates.map((d, i) => (
                      <th key={i} className="p-3 text-center border-l border-border/40 font-mono">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rooms.map((room) => (
                    <tr key={room.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-semibold">
                        <p className="font-mono text-sm">{room.number}</p>
                        <p className="text-[11px] text-muted-foreground font-normal">{room.type}</p>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">₹{room.pricePerNight}</td>
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
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: OTA Channel Sync (iCal Engine) */}
        <TabsContent value="channels" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="p-4 border-b border-border">
              <CardTitle className="text-base font-semibold">Master Export iCal Link (For OTAs)</CardTitle>
              <CardDescription className="text-xs">Copy this master link and paste it into Booking.com, Airbnb & Agoda calendar import settings so they auto-block dates when booked in Leadzo.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input value={masterExportIcal} readOnly className="font-mono text-xs bg-muted/30" />
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText(masterExportIcal);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                    toast.success("Master iCal Link Copied!");
                  }} 
                  variant="secondary" className="gap-2 cursor-pointer shrink-0"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copiedLink ? "Copied" : "Copy Link"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channels.map((channel) => (
              <Card key={channel.id} className="border-border">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className={cn("size-5", channel.iconColor)} />
                    <CardTitle className="text-sm font-semibold">{channel.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className={channel.badgeBg}>
                    {channel.status === "connected" ? "🟢 Connected" : "🟠 Pending"}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{channel.name} iCal Calendar Feed URL</Label>
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
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
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
        </TabsContent>

        {/* Tab 3: AI Hotel Receptionist & Voice */}
        <TabsContent value="receptionist" className="mt-4 space-y-4">
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
                  <p className="text-muted-foreground font-mono">"Namaste, kya Sept 08 se Sept 10 tak Deluxe Room available hai?"</p>
                </div>

                <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <p className="font-semibold text-indigo-300 mb-1">AI Receptionist Auto Response:</p>
                  <p className="text-slate-200">"Namaste! Haan, Sept 08 se Sept 10 tak Deluxe Room 102 available hai. Price per night ₹3,000 hai. Kya main aapke WhatsApp par instant booking link bhej doon?"</p>
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
      </Tabs>
    </div>
  );
}
