import type { AgentRole } from "./AgentAvatar";
import { motion } from "framer-motion";

interface AnimatedCharacterProps {
  role: AgentRole;
  isMoving?: boolean;
}

const roleSeeds: Record<AgentRole, string> = {
  boss: "Felix",
  support: "Lily",
  marketing: "Oliver",
  analyst: "Jack"
};

export const AnimatedCharacter = ({ role, isMoving = false }: AnimatedCharacterProps) => {
  const seed = roleSeeds[role];
  const avatarUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${seed}&backgroundColor=transparent`;

  return (
    <div className="relative w-16 h-24 flex flex-col items-center justify-end">
      {/* Head */}
      <motion.div 
        className="absolute top-0 z-10 w-12 h-12"
        animate={isMoving ? { y: [-2, 2, -2], rotate: [-2, 2, -2] } : { y: [-1, 1, -1] }}
        transition={{ duration: isMoving ? 0.5 : 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <img src={avatarUrl} alt={role} className="w-full h-full object-contain drop-shadow-md" />
      </motion.div>

      {/* Body */}
      <motion.div 
        className="relative w-10 h-12 bg-gradient-to-b from-blue-500 to-blue-700 rounded-t-xl rounded-b-md shadow-inner"
        animate={isMoving ? { rotate: [-5, 5, -5] } : { rotate: [-1, 1, -1] }}
        transition={{ duration: isMoving ? 0.5 : 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Left Arm (Typing) */}
        <motion.div 
          className="absolute top-2 -left-2 w-3 h-7 bg-blue-600 rounded-full origin-top"
          animate={{ rotateZ: [-20, -50, -20] }}
          transition={{ duration: 0.15, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
        />
        
        {/* Right Arm (Typing) */}
        <motion.div 
          className="absolute top-2 -right-2 w-3 h-7 bg-blue-600 rounded-full origin-top"
          animate={{ rotateZ: [-50, -20, -50] }}
          transition={{ duration: 0.18, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
        />
      </motion.div>
    </div>
  );
};
