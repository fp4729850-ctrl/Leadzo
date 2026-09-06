import type { AgentRole } from "./AgentAvatar";
import { useEffect, useState } from "react";

interface AnimatedCharacterProps {
  role: AgentRole;
  isMoving?: boolean;
}

const roleSeeds: Partial<Record<AgentRole, string>> = {
  boss: "Felix",
  support: "Lily",
  marketing: "Oliver",
  analytics: "Leo",
};

export function AnimatedCharacter({ role, isMoving }: AnimatedCharacterProps) {
  const seed = roleSeeds[role] || "Felix";
  const headUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${seed}&backgroundColor=transparent`;

  return (
    <div className={`relative flex flex-col items-center justify-end h-full w-full ${isMoving ? 'animate-bounce' : 'animate-[rocking_3s_ease-in-out_infinite]'}`}>
      
      {/* Head */}
      <div className="z-10 w-12 h-12 -mb-2 relative">
        <img 
          src={headUrl} 
          alt={`${role} head`} 
          className="w-full h-full object-contain drop-shadow-md"
        />
      </div>

      {/* Body */}
      <div className="relative w-14 h-16 bg-gradient-to-b from-indigo-500 to-indigo-700 rounded-t-xl rounded-b-md shadow-lg overflow-hidden">
        {/* Collar / Neck detail */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-3 bg-indigo-300 rounded-b-full opacity-50"></div>
        
        {/* Arms (Typing animation) */}
        {!isMoving && (
          <>
            <div className="absolute top-4 -left-1 w-3 h-10 bg-indigo-600 rounded-full origin-top transform rotate-12 animate-[typing-left_0.5s_ease-in-out_infinite_alternate] shadow-sm border border-indigo-800/30 z-20"></div>
            <div className="absolute top-4 -right-1 w-3 h-10 bg-indigo-600 rounded-full origin-top transform -rotate-12 animate-[typing-right_0.4s_ease-in-out_infinite_alternate] shadow-sm border border-indigo-800/30 z-20"></div>
          </>
        )}
      </div>

      <style>{`
        @keyframes rocking {
          0%, 100% { transform: rotate(-2deg) translateY(0); }
          50% { transform: rotate(2deg) translateY(-2px); }
        }
        @keyframes typing-left {
          0% { transform: rotate(10deg) translateY(0); }
          100% { transform: rotate(25deg) translateY(-3px); }
        }
        @keyframes typing-right {
          0% { transform: rotate(-10deg) translateY(0); }
          100% { transform: rotate(-25deg) translateY(-2px); }
        }
      `}</style>
    </div>
  );
}
