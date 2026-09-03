import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PhoneOff, User, MicOff, Grid3x3, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

interface OutboundCallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OutboundCallModal({ isOpen, onClose }: OutboundCallModalProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* 
        This DialogContent is styled exactly like a mobile phone screen 
        Tall, rounded corners, dark background
      */}
      <DialogContent 
        className="sm:max-w-[340px] h-[680px] p-0 bg-slate-950 border-4 border-slate-800 rounded-[3rem] text-white shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
      >
        {/* Mobile Status Bar Simulation */}
        <div className="absolute top-0 w-full h-7 flex justify-center items-center z-50">
          <div className="w-32 h-5 bg-black rounded-b-3xl"></div> {/* Notch */}
        </div>

        {/* Top Section - Caller Info */}
        <div className="relative z-10 flex flex-col items-center pt-16 pb-4 bg-gradient-to-b from-slate-900/90 to-transparent">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-lg border border-slate-700">
            <User className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-light tracking-wide">AI Manager</h2>
          <p className="text-slate-300 mt-1 font-mono text-lg">{formatTime(seconds)}</p>
        </div>

        {/* Middle Section - Zoomed Video */}
        <div className="flex-1 relative w-full h-full bg-black -mt-32">
          <video
            src="/virtual_office_bg_14s.mp4?v=1"
            autoPlay
            loop
            muted
            playsInline
            // Use object-cover to fill the tall container, and object-[20%_center] to crop exactly on the manager
            // Since the container is narrow, this will chop off the right side (where the employee is)
            className="w-full h-full object-cover object-[18%_center] opacity-80"
          />
          {/* Subtle gradient overlay to blend with UI */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
        </div>

        {/* Bottom Section - Call Controls */}
        <div className="relative z-10 bg-slate-950 pb-12 pt-6 px-8 flex flex-col items-center gap-8">
          {/* Mute, Keypad, Speaker */}
          <div className="flex justify-between w-full px-4">
            <div className="flex flex-col items-center gap-2">
              <button className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
                <MicOff className="w-6 h-6 text-white" />
              </button>
              <span className="text-xs text-slate-400">mute</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
                <Grid3x3 className="w-6 h-6 text-white" />
              </button>
              <span className="text-xs text-slate-400">keypad</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button className="w-14 h-14 rounded-full bg-white flex items-center justify-center hover:bg-slate-200 transition-colors">
                <Volume2 className="w-6 h-6 text-black" />
              </button>
              <span className="text-xs text-slate-400">speaker</span>
            </div>
          </div>

          {/* End Call Button */}
          <button
            onClick={onClose}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)]"
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
