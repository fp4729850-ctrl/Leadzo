import { useState, useEffect } from "react";
import { Bot, MessageSquare, Briefcase, Database, User } from "lucide-react";

export type AgentRole = "support" | "marketing" | "analyst" | "boss";

interface AgentAvatarProps {
  id: string;
  name: string;
  role: AgentRole;
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

  const getRoleIcon = () => {
    switch (role) {
      case "support":
        return <MessageSquare className="w-5 h-5 text-white" />;
      case "marketing":
        return <Briefcase className="w-5 h-5 text-white" />;
      case "analyst":
        return <Database className="w-5 h-5 text-white" />;
      case "boss":
        return <User className="w-6 h-6 text-white" />;
      default:
        return <Bot className="w-5 h-5 text-white" />;
    }
  };

  const getRoleColors = () => {
    switch (role) {
      case "support":
        return "bg-gradient-to-br from-blue-400 to-blue-600 border-blue-200 shadow-blue-500/50";
      case "marketing":
        return "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-200 shadow-emerald-500/50";
      case "analyst":
        return "bg-gradient-to-br from-purple-400 to-purple-600 border-purple-200 shadow-purple-500/50";
      case "boss":
        return "bg-gradient-to-br from-amber-500 to-orange-600 border-amber-200 shadow-orange-500/50 border-2";
      default:
        return "bg-gradient-to-br from-slate-400 to-slate-600 border-slate-200 shadow-slate-500/50";
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

      {/* Avatar Body */}
      <div className="relative group flex flex-col items-center">
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 shadow-lg ${getRoleColors()} ${isMoving ? "animate-pulse" : ""} ring-4 ring-white/20`}
        >
          {getRoleIcon()}
        </div>
        
        {/* Shadow on the floor */}
        <div className="w-10 sm:w-12 h-2 bg-black/40 rounded-[100%] blur-[3px] mt-1"></div>

        {/* Name Tag */}
        <div className="mt-1.5 bg-slate-900/90 backdrop-blur-sm text-white text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-md shadow-lg border border-slate-700/50">
          {name}
        </div>
      </div>
    </div>
  );
}
