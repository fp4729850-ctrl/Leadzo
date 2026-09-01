import { useState, useEffect } from "react";
import { AnimatedCharacter } from "./AnimatedCharacter";

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

export function AgentAvatar({ name, role, position, statusMessage, isMoving }: AgentAvatarProps) {
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
      className="absolute transition-all duration-[2000ms] ease-in-out flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        zIndex: Math.floor(position.y),
      }}
    >
      {/* Speech Bubble */}
      {messageVisible && statusMessage && (
        <div className="absolute bottom-[100px] left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-xl border border-slate-200 text-sm font-semibold text-slate-800 whitespace-nowrap z-50 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300">
          {statusMessage}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-t-[10px] border-t-white/95 border-r-[8px] border-r-transparent drop-shadow-md"></div>
        </div>
      )}

      {/* 3D Animated Character */}
      <AnimatedCharacter role={role} isMoving={isMoving} />
      
      {/* Name Tag */}
      <div className="mt-2 bg-slate-900/90 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg border border-slate-700/50 pointer-events-none">
        {name}
      </div>
    </div>
  );
}
