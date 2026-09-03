import { useState, useEffect } from "react";
import { Send } from "lucide-react";

export type AgentRole = "support" | "marketing" | "analytics" | "manager" | "operation" | "research" | "boss";

interface AgentAvatarProps {
  id: string;
  name: string;
  role: AgentRole;
  // position in percentages (0-100) relative to the map
  position: { x: number; y: number }; 
  statusMessage?: string;
  isSending?: boolean;
  videoStyle?: "cartoon" | "human";
}

export function AgentAvatar({ name, role, position, statusMessage, isSending, videoStyle = "cartoon" }: AgentAvatarProps) {
  const [messageVisible, setMessageVisible] = useState(false);
  const [showLabel, setShowLabel] = useState(videoStyle === "cartoon");

  // Keep cartoon labels always visible for backwards compatibility, or let them be toggled. 
  // Let's just make both styles use click-to-toggle, but default cartoon to visible if they want.
  // Actually, user said: "uski jagah mai yeh employee hai us pe click karu to uska naam aur character ... dikhe".
  // So let's default to false for human, true for cartoon initially, but clicking toggles it.

  useEffect(() => {
    setShowLabel(videoStyle === "cartoon");
  }, [videoStyle]);

  useEffect(() => {
    if (statusMessage) {
      setMessageVisible(true);
      const timer = setTimeout(() => setMessageVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  return (
    <div
      className="absolute transition-all flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-[100%] cursor-pointer group"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        zIndex: Math.floor(position.y),
      }}
      onClick={() => setShowLabel(!showLabel)}
    >
      {/* Invisible hitbox over the person's body to make clicking easier */}
      <div className="absolute top-1/2 left-1/2 w-16 h-24 -translate-x-1/2 -translate-y-1/2 z-20" />
      {/* Speech Bubble */}
      {messageVisible && statusMessage && (
        <div className="absolute bottom-full mb-4 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-xl border border-slate-200 text-sm font-semibold text-slate-800 whitespace-nowrap z-50 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300">
          {statusMessage}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-t-[10px] border-t-white/95 border-r-[8px] border-r-transparent drop-shadow-md"></div>
        </div>
      )}

      {/* The Animated Character (Body + Memoji Head) */}
      <div className="relative flex flex-col items-center">
        {/* Active Glow Indicator above the person */}
        {isSending && (
          <div className="absolute -top-6 w-4 h-4 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(52,211,113,0.8)] z-10 pointer-events-none"></div>
        )}
        
        {/* Name Tag */}
        <div className={`mt-2 bg-slate-900/90 backdrop-blur-sm text-white px-3 py-1.5 rounded shadow-lg border border-slate-700/50 pointer-events-none whitespace-nowrap flex flex-col items-center gap-0.5 transition-all duration-300 ${showLabel ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            {isSending && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>}
            {name}
          </div>
          <div className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">
            {role.replace('-', ' ')}
          </div>
        </div>
      </div>
    </div>
  );
}
