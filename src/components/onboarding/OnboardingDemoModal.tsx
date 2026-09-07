import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, CheckCircle2, 
  PhoneCall, Rocket, Hotel, Building2, TrendingUp, ArrowRight, ShieldCheck, Zap, Layers, Video, MonitorPlay, ExternalLink, Maximize2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

interface Scene {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  duration: number; // in seconds
  icon: any;
  color: string;
  videoUrl: string;
  highlights: string[];
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
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    highlights: [
      "90% of local business leads go unanswered on time",
      "5+ fragmented subscriptions cost ₹50,000+/month",
      "Zero automated follow-up when ad leads land"
    ]
  },
  {
    id: 2,
    title: "2. Meet Leadzo AI OS",
    subtitle: "World's 1st Autonomous AI Business Operating System",
    badge: "The Solution",
    duration: 15,
    icon: Sparkles,
    color: "from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/30",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    highlights: [
      "Unified Dashboard for all incoming Meta & Google leads",
      "Autonomous AI Agents working 24/7 on autopilot",
      "Saves 80% on monthly software subscription expenses"
    ]
  },
  {
    id: 3,
    title: "3. 5-Second AI Voice & WhatsApp Call",
    subtitle: "Instant lead response with human-like conversation",
    badge: "5-Sec Rule ⚡",
    duration: 20,
    icon: PhoneCall,
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    highlights: [
      "Instant Outbound AI Call powered by Vapi Engine",
      "Automatic WhatsApp confirmation with booking payment link",
      "300% Higher conversion rate guaranteed"
    ]
  },
  {
    id: 4,
    title: "4. Hotel Lead & Channel Manager",
    subtitle: "Zero OTA commission & per-room iCal sync guard",
    badge: "Hotel AI 🏨",
    duration: 20,
    icon: Hotel,
    color: "from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    highlights: [
      "Per-Room iCal Sync Guard prevents double bookings",
      "Target tourist regions (Goa, Udaipur, Manali, etc.)",
      "Save 15%-25% hefty OTA booking commissions"
    ]
  },
  {
    id: 5,
    title: "5. Virtual Office & Live Avatars",
    subtitle: "Immersive 2D workspace with HeyGen live avatars",
    badge: "2D Office 🏢",
    duration: 15,
    icon: Building2,
    color: "from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoydates.mp4",
    highlights: [
      "Real-time audio/video proximity communication",
      "Integrated HeyGen AI video avatars",
      "Live office map with room presence indicators"
    ]
  },
  {
    id: 6,
    title: "6. Start Your Free Trial",
    subtitle: "Scale your revenue on autopilot starting today",
    badge: "Launch Ready 🚀",
    duration: 15,
    icon: Rocket,
    color: "from-rose-500/20 to-indigo-500/20 text-indigo-400 border-indigo-500/30",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    highlights: [
      "Zero coding required — Instant 2-minute onboarding",
      "Dedicated onboarding support & live voice assistant",
      "14-Day Free Trial — Cancel anytime"
    ]
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeScene = SCENES[currentSceneIdx];

  // Control video element playback directly
  useEffect(() => {
    if (!isOpen) return;

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
      videoRef.current.muted = isMuted;
    }
  }, [isOpen, currentSceneIdx, isPlaying, isMuted]);

  const handleSelectScene = (idx: number) => {
    setCurrentSceneIdx(idx);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (videoRef.current) {
      videoRef.current.muted = nextMute;
    }
  };

  const handleRestart = () => {
    setCurrentSceneIdx(0);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-slate-950 border-slate-800 text-slate-100 shadow-2xl rounded-2xl">
        {/* Header Bar */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-rose-500 p-0.5 shadow-lg">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Video className="size-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold font-serif text-white">
                  Leadzo AI — Official Product Demo Video
                </DialogTitle>
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] gap-1">
                  <span className="size-1.5 rounded-full bg-indigo-400 animate-ping" /> HD Video Player 🎬
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-400">
                Watch full product walkthrough & feature highlights in 1080p HD.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="size-8 text-slate-400 hover:text-white"
              title={isMuted ? "Unmute Video Sound" : "Mute Video Sound"}
            >
              {isMuted ? <VolumeX size={16} className="text-rose-400" /> : <Volume2 size={16} className="text-emerald-400" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRestart}
              className="gap-1.5 text-xs border-slate-700 hover:bg-slate-800 text-slate-300 hidden sm:inline-flex"
            >
              <RotateCcw size={13} /> Replay Video
            </Button>
          </div>
        </div>

        {/* Scene Chapter Navigation Tabs */}
        <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
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

        {/* Main HD MP4 Video Player Container */}
        <div className="p-4 md:p-6 bg-slate-950 flex flex-col items-center justify-center space-y-4">
          <div className="w-full aspect-video max-h-[380px] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl relative flex items-center justify-center group">
            {/* HTML5 Native Video Tag with Audio & Video Stream */}
            <video 
              ref={videoRef}
              key={activeScene.videoUrl}
              src={activeScene.videoUrl}
              controls 
              autoPlay
              playsInline
              muted={isMuted}
              onEnded={() => {
                if (currentSceneIdx < SCENES.length - 1) {
                  setCurrentSceneIdx(currentSceneIdx + 1);
                } else {
                  setIsPlaying(false);
                }
              }}
              className="w-full h-full object-cover"
            />

            <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5 pointer-events-none">
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
              {activeScene.title} (1080p HD Video)
            </div>
          </div>

          {/* Active Scene Highlights & Info */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activeScene.highlights.map((point, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
                <div className="size-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={12} />
                </div>
                <span className="truncate">{point}</span>
              </div>
            ))}
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
              {isPlaying ? "Pause Video" : "Play Video"}
            </Button>
            <Button
              onClick={() => {
                if (currentSceneIdx < SCENES.length - 1) {
                  setCurrentSceneIdx(currentSceneIdx + 1);
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
