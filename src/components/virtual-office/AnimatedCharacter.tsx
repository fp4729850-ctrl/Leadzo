import type { AgentRole } from "./AgentAvatar";
import { User, Code, Headset, PieChart } from "lucide-react";

interface AnimatedCharacterProps {
  role: AgentRole;
  isMoving?: boolean;
}

const roleSeeds: Record<AgentRole, string> = {
  boss: "Felix",
  support: "Lily",
  marketing: "Oliver",
  analyst: "Jack",
};

const roleIcons = {
  boss: <User size={16} className="text-white" />,
  support: <Headset size={16} className="text-white" />,
  marketing: <Code size={16} className="text-white" />,
  analyst: <PieChart size={16} className="text-white" />,
};

const roleColors: Record<AgentRole, string> = {
  boss: "bg-blue-600",
  support: "bg-emerald-500",
  marketing: "bg-amber-500",
  analyst: "bg-purple-500",
};

export const AnimatedCharacter = ({ role, isMoving }: AnimatedCharacterProps) => {
  const seed = roleSeeds[role];
  const avatarUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${seed}&backgroundColor=transparent`;

  return (
    <div className={`relative flex flex-col items-center justify-center ${isMoving ? 'animate-bounce-slight' : 'animate-rock-chair'}`}>
      {/* 3D Head */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 z-10 relative mb-[-10px] drop-shadow-xl transition-transform duration-300">
        <img 
          src={avatarUrl} 
          alt={`${role} avatar`} 
          className={`w-full h-full object-contain ${isMoving ? '' : 'animate-head-bob'}`}
        />
      </div>

      {/* Body with Typing Arms */}
      <div className="relative w-12 h-16 sm:w-16 sm:h-20 bg-slate-800 rounded-t-3xl rounded-b-xl border border-slate-700 shadow-2xl flex flex-col items-center overflow-hidden">
        {/* Role Badge */}
        <div className={`mt-2 p-1.5 rounded-full ${roleColors[role]} shadow-lg z-20`}>
          {roleIcons[role]}
        </div>

        {/* Arms (Only animate when not moving) */}
        {!isMoving && (
          <>
            <div className="absolute top-6 -left-3 w-4 h-10 bg-slate-700 rounded-full animate-type-left origin-top transform -rotate-45 shadow-md"></div>
            <div className="absolute top-6 -right-3 w-4 h-10 bg-slate-700 rounded-full animate-type-right origin-top transform rotate-45 shadow-md"></div>
          </>
        )}
      </div>
      
      {/* Shadow */}
      <div className="absolute -bottom-2 w-16 h-4 bg-black/40 rounded-full blur-md"></div>
    </div>
  );
};
