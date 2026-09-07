import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, CheckCircle2, 
  PhoneCall, Rocket, Hotel, Building2, TrendingUp, ArrowRight, ShieldCheck, Zap, Layers
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

interface Scene {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  duration: number; // in seconds
  voiceover: string;
  icon: any;
  color: string;
  visualContent: {
    headline: string;
    subtext: string;
    highlights: string[];
    mockupType: "pain" | "solution" | "voice" | "hotel" | "office" | "cta";
  };
}

const SCENES: Scene[] = [
  {
    id: 1,
    title: "1. The Lead Leak Crisis",
    subtitle: "Why 90% of business leads are lost every day",
    badge: "The Problem",
    duration: 15,
    icon: Zap,
    color: "from-rose-500/20 to-orange-500/20 text-rose-400 border-rose-500/30",
    voiceover: "Sach batao... Aap din mein kitne ad leads miss kar dete hain? Sales reps ko call karne mein ghante lag jate hain tab tak customer kisi aur se deal final kar chuka hota hai. Stop losing revenue!",
    visualContent: {
      headline: "Average Lead Response Time: 4 Hours ⚠️",
      subtext: "Customers expect a response in under 60 seconds. Late response = Lost revenue.",
      highlights: [
        "90% of local business leads go unanswered on time",
        "5+ fragmented subscriptions cost ₹50,000+/month",
        "Zero automated follow-up when ad leads land"
      ],
      mockupType: "pain"
    }
  },
  {
    id: 2,
    title: "2. Meet Leadzo AI OS",
    subtitle: "World's 1st Autonomous AI Business Operating System",
    badge: "The Solution",
    duration: 15,
    icon: Sparkles,
    color: "from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/30",
    voiceover: "Meet Leadzo AI — World’s 1st Autonomous AI Business Operating System. Jo aapke saare ad campaigns, voice calling, CRM, aur team collaboration ko ONE single intelligent platform par le aata hai!",
    visualContent: {
      headline: "6 Expensive SaaS Tools Replaced by 1 AI Engine 🧠",
      subtext: "Ad Manager + AI Voice Caller + CRM + Bulk WhatsApp/RCS + SEO Agent + Virtual Office",
      highlights: [
        "Unified Dashboard for all incoming Meta & Google leads",
        "Autonomous AI Agents working 24/7 on autopilot",
        "Saves 80% on monthly software subscription expenses"
      ],
      mockupType: "solution"
    }
  },
  {
    id: 3,
    title: "3. 5-Second AI Voice & WhatsApp Call",
    subtitle: "Instant lead response with human-like conversation",
    badge: "5-Sec Rule ⚡",
    duration: 20,
    icon: PhoneCall,
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    voiceover: "Jaise hi Insta ya Google Ad par lead aati hai, Leadzo ka AI Voice Agent 5 seconds ke andar customer ko call karta hai, Hindi & English mein natural baat karta hai, aur instant WhatsApp link bhej deta hai!",
    visualContent: {
      headline: "Lead Submitted → AI Ringing Customer in 5 Seconds 📱",
      subtext: "Natural multilingual conversation (Hindi, English, Hinglish) with instant calendar booking.",
      highlights: [
        "Instant Outbound AI Call powered by Vapi Engine",
        "Automatic WhatsApp confirmation with booking payment link",
        "300% Higher conversion rate guaranteed"
      ],
      mockupType: "voice"
    }
  },
  {
    id: 4,
    title: "4. Hotel Lead & Channel Manager",
    subtitle: "Zero OTA commission & per-room iCal sync guard",
    badge: "Hotel AI 🏨",
    duration: 20,
    icon: Hotel,
    color: "from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30",
    voiceover: "Hotel owners? Dedicated Hotel Lead Manager include kiya gaya hai! Direct city-wise ad campaigns chalayein (Goa, Udaipur, Manali), 0% commission direct bookings lein, aur iCal sync guard se double bookings rokein!",
    visualContent: {
      headline: "City-Targeted Campaigns & 0% OTA Commission 🏖️",
      subtext: "Auto-sync Booking.com, Airbnb, Agoda & direct AI Phone Receptionist.",
      highlights: [
        "Per-Room iCal Sync Guard prevents double bookings",
        "Target tourist regions (Goa, Udaipur, Manali, etc.)",
        "Save 15%-25% hefty OTA booking commissions"
      ],
      mockupType: "hotel"
    }
  },
  {
    id: 5,
    title: "5. Virtual Office & Live Avatars",
    subtitle: "Immersive 2D workspace with HeyGen live avatars",
    badge: "2D Office 🏢",
    duration: 15,
    icon: Building2,
    color: "from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30",
    voiceover: "Step into Leadzo's Interactive Virtual Office. 2D floor plans par walk karein, Live AI Avatars se interact karein, aur apni remote team ke sath real-time workspace ka maza lein!",
    visualContent: {
      headline: "Interactive Remote Workspace for Modern Teams 🎧",
      subtext: "Walk up to desks, trigger video calls, and interact with live AI avatars.",
      highlights: [
        "Real-time audio/video proximity communication",
        "Integrated HeyGen AI video avatars",
        "Live office map with room presence indicators"
      ],
      mockupType: "office"
    }
  },
  {
    id: 6,
    title: "6. Start Your Free Trial",
    subtitle: "Scale your revenue on autopilot starting today",
    badge: "Launch Ready 🚀",
    duration: 15,
    icon: Rocket,
    color: "from-rose-500/20 to-indigo-500/20 text-indigo-400 border-indigo-500/30",
    voiceover: "Replaces 6 expensive tools. Triples your lead conversion. Scales your business on autopilot. Welcome to the future of business. Start your free trial today at Leadzo.ai!",
    visualContent: {
      headline: "300% Higher Conversions. 80% Software Cost Saved. 📈",
      subtext: "Join thousands of high-growth businesses using Leadzo AI to automate sales.",
      highlights: [
        "Zero coding required — Instant 2-minute onboarding",
        "Dedicated onboarding support & live voice assistant",
        "14-Day Free Trial — Cancel anytime"
      ],
      mockupType: "cta"
    }
  }
];

export function OnboardingDemoModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  const activeScene = SCENES[currentSceneIdx];

  // Auto-play progress timer
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentSceneIdx < SCENES.length - 1) {
            setCurrentSceneIdx(currentSceneIdx + 1);
            return 0;
          } else {
            setIsPlaying(false);
            return 100;
          }
        }
        return prev + (100 / (activeScene.duration * 10));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, isPlaying, currentSceneIdx, activeScene.duration]);

  const handleSelectScene = (idx: number) => {
    setCurrentSceneIdx(idx);
    setProgress(0);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentSceneIdx(0);
    setProgress(0);
    setIsPlaying(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-slate-950 border-slate-800 text-slate-100 shadow-2xl rounded-2xl">
        {/* Header Bar */}
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-rose-500 p-0.5 shadow-lg">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="size-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold font-serif text-white">
                  Leadzo AI — Official Product Onboarding Tour
                </DialogTitle>
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px]">
                  2-Min HD Walkthrough 🎬
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-400">
                Discover how Leadzo AI automates lead response in 5 seconds & replaces 6 expensive SaaS tools.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="size-8 text-slate-400 hover:text-white"
              title={isMuted ? "Unmute Voiceover" : "Mute Voiceover"}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestart}
              className="gap-1.5 text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              <RotateCcw size={13} /> Restart
            </Button>
          </div>
        </div>

        {/* Scene Navigation Tabs */}
        <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {SCENES.map((scene, idx) => {
            const Icon = scene.icon;
            const isCurrent = currentSceneIdx === idx;
            return (
              <button
                key={scene.id}
                onClick={() => handleSelectScene(idx)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border",
                  isCurrent 
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <Icon size={13} className={isCurrent ? "text-white" : "text-slate-400"} />
                <span>{scene.title.split(". ")[1]}</span>
              </button>
            );
          })}
        </div>

        {/* Main Cinema Screen Player */}
        <div className="p-6 relative min-h-[380px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-between overflow-hidden">
          {/* Progress Bar Top */}
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-6">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-400 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Animated Scene Canvas */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScene.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
            >
              {/* Left Column: Visual Mockup */}
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-xs font-semibold px-2.5 py-0.5 border", activeScene.color)}>
                    {activeScene.badge}
                  </Badge>
                  <span className="text-[11px] font-mono text-slate-400">Scene {activeScene.id} / {SCENES.length}</span>
                </div>

                <h3 className="text-xl font-bold text-white font-serif tracking-tight leading-snug">
                  {activeScene.visualContent.headline}
                </h3>
                
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeScene.visualContent.subtext}
                </p>

                <div className="space-y-2 pt-2">
                  {activeScene.visualContent.highlights.map((point, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
                      <div className="size-4 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 size={12} />
                      </div>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Simulated Live Player Card */}
              <div className="md:col-span-5">
                <Card className="border-slate-800 bg-slate-900/90 shadow-2xl relative overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[11px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">
                        Live Simulation
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">4K Ultra HD</span>
                  </div>

                  <CardContent className="p-5 space-y-4">
                    {activeScene.visualContent.mockupType === "pain" && (
                      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>Missed Customer Call</span>
                          <span className="text-[10px] font-mono text-rose-400">4 Hours Ago</span>
                        </div>
                        <p className="text-xs text-slate-300">"Looking for hotel room in Goa for 3 nights. Please call urgently!"</p>
                        <p className="text-[10px] text-rose-400 font-mono">Status: Lost to Competitor ❌</p>
                      </div>
                    )}

                    {activeScene.visualContent.mockupType === "solution" && (
                      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>Leadzo Autonomous Engine</span>
                          <span className="text-[10px] font-mono text-emerald-400">Active ⚡</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                          <div className="p-2 bg-slate-950 rounded border border-slate-800">Meta Ads API: ✅</div>
                          <div className="p-2 bg-slate-950 rounded border border-slate-800">Google Ads API: ✅</div>
                          <div className="p-2 bg-slate-950 rounded border border-slate-800">Vapi AI Voice: ✅</div>
                          <div className="p-2 bg-slate-950 rounded border border-slate-800">WhatsApp API: ✅</div>
                        </div>
                      </div>
                    )}

                    {activeScene.visualContent.mockupType === "voice" && (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
                          <span className="flex items-center gap-1.5">
                            <PhoneCall size={13} className="animate-bounce text-emerald-400" /> Outbound AI Voice Call
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400">00:14s</span>
                        </div>
                        <p className="text-xs text-slate-200 italic font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800">
                          "Namaste Rahul ji! Aapne Goa hotel staycation ke liye inquire kiya tha. Kya main instant availability aur 25% discount link WhatsApp kar doon?"
                        </p>
                      </div>
                    )}

                    {activeScene.visualContent.mockupType === "hotel" && (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
                          <span>Per-Room iCal Sync Guard</span>
                          <span className="text-[10px] font-mono text-emerald-400">100% Protected</span>
                        </div>
                        <div className="text-[11px] text-slate-300 space-y-1 font-mono">
                          <p>✓ Booking.com Reserved → Room 101 Blocked</p>
                          <p>✓ Airbnb Calendar → Auto-Synced</p>
                          <p>✓ Agoda Calendar → Auto-Synced</p>
                        </div>
                      </div>
                    )}

                    {activeScene.visualContent.mockupType === "office" && (
                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-blue-300">
                          <span>2D Virtual Office Floor Plan</span>
                          <span className="text-[10px] font-mono text-cyan-400">4 Team Members Online</span>
                        </div>
                        <p className="text-xs text-slate-300">Live proximity audio chat & HeyGen Avatar assistant active.</p>
                      </div>
                    )}

                    {activeScene.visualContent.mockupType === "cta" && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 text-white text-center space-y-2 shadow-lg">
                        <p className="text-sm font-bold">Ready to automate your sales?</p>
                        <Button 
                          onClick={() => {
                            toast.success("Welcome to Leadzo 14-Day Free Trial!");
                            onClose();
                          }} 
                          className="w-full bg-white text-slate-950 hover:bg-slate-100 font-bold text-xs cursor-pointer gap-2"
                        >
                          <Rocket size={14} /> Start 14-Day Free Trial <ArrowRight size={14} />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Voiceover Caption Box */}
          <div className="mt-6 p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
            <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Volume2 size={16} className={cn(isPlaying && !isMuted && "animate-pulse text-indigo-400")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                AI Voiceover Script {!isMuted ? "(Audio Active)" : "(Muted)"}
              </p>
              <p className="text-xs text-slate-300 font-medium truncate">
                "{activeScene.voiceover}"
              </p>
            </div>
          </div>
        </div>

        {/* Footer Control Bar */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={togglePlay}
              variant="secondary"
              size="sm"
              className="gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-none cursor-pointer"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {isPlaying ? "Pause Tour" : "Play Tour"}
            </Button>
            <Button
              onClick={() => {
                if (currentSceneIdx < SCENES.length - 1) {
                  setCurrentSceneIdx(currentSceneIdx + 1);
                  setProgress(0);
                } else {
                  handleRestart();
                }
              }}
              variant="outline"
              size="sm"
              className="gap-1 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Next Scene <ArrowRight size={13} />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                toast.success("Opening Leadzo 14-Day Free Trial!");
                onClose();
              }}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-xs cursor-pointer gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Rocket size={14} /> Get Started Free
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
