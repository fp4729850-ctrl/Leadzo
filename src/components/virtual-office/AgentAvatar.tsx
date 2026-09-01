import { useState, useEffect } from "react";
import { Send } from "lucide-react";

export type AgentRole = "support" | "marketing" | "analyst" | "boss";

interface AgentAvatarProps {
  id: string;
  name: string;
  role: AgentRole;
  // position in percentages (0-100) relative to the map
  position: { x: number; y: number }; 
  statusMessage?: string;
  isSending?: boolean;
}

export function AgentAvatar({ name, role, position, statusMessage, isSending }: AgentAvatarProps) {
  const [messageVisible, setMessageVisible] = useState(false);

  useEffect(() => {
    if (statusMessage) {
      setMessageVisible(true);
      const timer = setTimeout(() => setMessageVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  return (
    <div
      className="absolute transition-all flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        zIndex: Math.floor(position.y),
      }}
    >
      {/* Speech Bubble */}
      {messageVisible && statusMessage && (
        <div className="absolute bottom-[20px] left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-xl border border-slate-200 text-sm font-semibold text-slate-800 whitespace-nowrap z-50 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300">
          {statusMessage}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-t-[10px] border-t-white/95 border-r-[8px] border-r-transparent drop-shadow-md"></div>
        </div>
      )}

      {/* Invisible anchor for the character */}
      <div className="relative w-8 h-8 flex items-center justify-center">
        {/* Glow when active/sending */}
        {isSending && (
          <div className="absolute inset-0 bg-blue-400/30 rounded-full animate-ping scale-150"></div>
        )}
      </div>
      
      {/* Name Tag (placed slightly below the anchor point) */}
      <div className="absolute top-[20px] bg-slate-900/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg border border-slate-700/50 pointer-events-none whitespace-nowrap">
        {name}
      </div>
    </div>
  );
}
