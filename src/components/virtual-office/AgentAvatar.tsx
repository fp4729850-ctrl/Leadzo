import { useState, useEffect } from "react";

export type AgentRole = "support" | "marketing" | "analyst" | "boss";

interface AgentAvatarProps {
  id: string;
  name: string;
  role: AgentRole;
  imageUrl?: string;
  // position in percentages (0-100) relative to the map
  position: { x: number; y: number }; 
  statusMessage?: string;
  isMoving?: boolean;
}

export function AgentAvatar({ name, role, position, statusMessage, isMoving, imageUrl }: AgentAvatarProps) {
  const [messageVisible, setMessageVisible] = useState(false);

  useEffect(() => {
    if (statusMessage) {
      setMessageVisible(true);
      const timer = setTimeout(() => setMessageVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const getRoleColors = () => {
    switch (role) {
      case "support":
        return "border-blue-400 shadow-blue-500/50 ring-blue-400/30";
      case "marketing":
        return "border-emerald-400 shadow-emerald-500/50 ring-emerald-400/30";
      case "analyst":
        return "border-purple-400 shadow-purple-500/50 ring-purple-400/30";
      case "boss":
        return "border-amber-500 shadow-orange-500/50 ring-amber-500/30 border-4";
      default:
        return "border-slate-400 shadow-slate-500/50 ring-slate-400/30";
    }
  };

  return (
    <div
      className="absolute transition-all duration-[1500ms] ease-in-out flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        zIndex: Math.floor(position.y),
      }}
    >
      {/* Speech Bubble */}
      {messageVisible && statusMessage && (
        <div className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-xl border border-slate-200 text-sm font-semibold text-slate-800 whitespace-nowrap animate-bounce z-50">
          {statusMessage}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-t-[10px] border-t-white/95 border-r-[8px] border-r-transparent drop-shadow-md"></div>
        </div>
      )}

      {/* Avatar Body - Realistic Human Image */}
      <div className="relative group flex flex-col items-center">
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-2 shadow-lg ${getRoleColors()} ${isMoving ? "animate-pulse" : ""} ring-4 overflow-hidden bg-white`}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-slate-200"></div>
          )}
        </div>
        
        {/* Shadow on the floor */}
        <div className="w-12 sm:w-14 h-2 bg-black/40 rounded-[100%] blur-[3px] mt-1"></div>

        {/* Name Tag */}
        <div className="mt-1.5 bg-slate-900/90 backdrop-blur-sm text-white text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-md shadow-lg border border-slate-700/50">
          {name}
        </div>
      </div>
    </div>
  );
}
