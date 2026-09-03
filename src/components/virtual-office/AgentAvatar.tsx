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
  onStartLiveCall?: (roleName: string) => void;
}

export function AgentAvatar({ name, role, position, statusMessage, isSending, videoStyle = "cartoon", onStartLiveCall }: AgentAvatarProps) {
  const [messageVisible, setMessageVisible] = useState(false);
  // Always show labels so the user knows where the agents are, especially since video is dummy
  const showLabel = true;

  useEffect(() => {
    if (statusMessage) {
      setMessageVisible(true);
      const timer = setTimeout(() => setMessageVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  return (
    <div
      className="absolute transition-all flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-[100%] group"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        zIndex: Math.floor(position.y),
      }}
    >
      {/* Invisible hitbox over the person's body to make clicking easier */}
      <div className="absolute top-1/2 left-1/2 w-16 h-24 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto" />
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
        <div className="mt-2 bg-slate-900/90 backdrop-blur-sm text-white px-3 py-2 rounded shadow-lg border border-slate-700/50 flex flex-col items-center gap-1 transition-all duration-300 pointer-events-auto opacity-100 scale-100">
          <div className="flex items-center gap-2 text-xs font-bold whitespace-nowrap">
            {isSending && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>}
            {name}
          </div>
          <div className="text-[10px] text-slate-300 font-medium uppercase tracking-wider whitespace-nowrap">
            {role.replace('-', ' ')}
          </div>
          {onStartLiveCall && (
            <button 
              onClick={(e) => { e.stopPropagation(); onStartLiveCall(name); }}
              className="mt-1 px-3 py-1 bg-indigo-500 hover:bg-indigo-600 rounded text-[10px] font-bold text-white transition-colors"
            >
              Start Live Call
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
