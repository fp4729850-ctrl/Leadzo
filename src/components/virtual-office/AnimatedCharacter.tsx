import type { AgentRole } from "./AgentAvatar";

interface AnimatedCharacterProps {
  role: AgentRole;
  isMoving?: boolean;
}

const roleSeeds: Record<AgentRole, string> = {
  boss: "Felix",
  support: "Lily",
  marketing: "Oliver",
  analyst: "Sophia",
};

const roleColors: Record<AgentRole, string> = {
  boss: "#1e293b",
  support: "#2563eb",
  marketing: "#059669",
  analyst: "#7c3aed",
};

export function AnimatedCharacter({ role, isMoving }: AnimatedCharacterProps) {
  const avatarUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${roleSeeds[role]}&backgroundColor=transparent`;
  const shirtColor = roleColors[role];

  return (
    <div className={`relative flex flex-col items-center ${isMoving ? 'animate-bounce' : 'animate-[rocking_3s_ease-in-out_infinite]'} origin-bottom`}>
      {/* 3D Head */}
      <img src={avatarUrl} alt={role} className="w-16 h-16 z-10 drop-shadow-xl" />
      
      {/* Torso & Arms */}
      <div className="relative -mt-2 flex flex-col items-center">
        {/* Torso */}
        <div 
          className="w-12 h-14 rounded-t-2xl rounded-b-md shadow-inner relative z-0" 
          style={{ backgroundColor: shirtColor }}
        >
          {/* Collar/Detail */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-4 h-2 bg-white/20 rounded-b-md"></div>
        </div>

        {/* Arms (Typing Animation) */}
        {!isMoving && (
          <>
            <div 
              className="absolute top-2 -left-3 w-4 h-10 rounded-full animate-[typing_0.5s_ease-in-out_infinite_alternate]" 
              style={{ backgroundColor: shirtColor, transformOrigin: 'top center' }}
            >
              <div className="absolute bottom-0 w-4 h-4 bg-orange-200 rounded-full"></div> {/* Hand */}
            </div>
            <div 
              className="absolute top-2 -right-3 w-4 h-10 rounded-full animate-[typing_0.6s_ease-in-out_infinite_alternate-reverse]" 
              style={{ backgroundColor: shirtColor, transformOrigin: 'top center' }}
            >
              <div className="absolute bottom-0 w-4 h-4 bg-orange-200 rounded-full"></div> {/* Hand */}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes rocking {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes typing {
          0% { transform: rotate(20deg) translateY(0px); }
          100% { transform: rotate(40deg) translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
