import { useState, useEffect } from "react";
import { Bot, MessageSquare, Briefcase, Database } from "lucide-react";

export type AgentRole = "support" | "marketing" | "analyst" | "boss";

interface AgentAvatarProps {
  id: string;
  name: string;
  role: AgentRole;
  position: { x: number; y: number };
  statusMessage?: string;
  isMoving?: boolean;
}

export function AgentAvatar({ name, role, position, statusMessage, isMoving }: AgentAvatarProps) {
  const [messageVisible, setMessageVisible] = useState(false);

  useEffect(() => {
    if (statusMessage) {
      setMessageVisible(true);
      const timer = setTimeout(() => setMessageVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const getRoleIcon = () => {
    switch (role) {
      case "support":
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case "marketing":
        return <Briefcase className="w-5 h-5 text-green-500" />;
      case "analyst":
        return <Database className="w-5 h-5 text-purple-500" />;
      case "boss":
        return <Bot className="w-6 h-6 text-yellow-500" />;
      default:
        return <Bot className="w-5 h-5" />;
    }
  };

  const getRoleColors = () => {
    switch (role) {
      case "support":
        return "bg-blue-100 border-blue-300";
      case "marketing":
        return "bg-green-100 border-green-300";
      case "analyst":
        return "bg-purple-100 border-purple-300";
      case "boss":
        return "bg-yellow-100 border-yellow-400 border-4";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  return (
    <div
      className="absolute transition-all duration-1000 ease-in-out"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        zIndex: position.y,
      }}
    >
      {/* Speech Bubble */}
      {messageVisible && statusMessage && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1.5 rounded-xl shadow-lg border border-gray-200 text-sm font-medium whitespace-nowrap animate-bounce z-50">
          {statusMessage}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] border-t-white border-r-[6px] border-r-transparent drop-shadow-md"></div>
        </div>
      )}

      {/* Avatar Body */}
      <div className="relative group flex flex-col items-center">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-md ${getRoleColors()} ${isMoving ? "animate-bounce" : ""}`}
        >
          {getRoleIcon()}
        </div>
        
        {/* Shadow */}
        <div className="w-8 h-2 bg-black/20 rounded-full blur-[2px] mt-1"></div>

        {/* Name Tag */}
        <div className="mt-1 bg-gray-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
          {name}
        </div>
      </div>
    </div>
  );
}
