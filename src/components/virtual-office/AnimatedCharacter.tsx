import React from 'react';
import type { AgentRole } from './AgentAvatar';
import './AnimatedCharacter.css';

interface AnimatedCharacterProps {
  role: AgentRole;
  isMoving?: boolean;
}

const roleSeeds: Record<AgentRole, string> = {
  boss: 'Felix',
  support: 'Lily',
  marketing: 'Oliver',
  analyst: 'Jack',
};

export const AnimatedCharacter: React.FC<AnimatedCharacterProps> = ({ role, isMoving }) => {
  const seed = roleSeeds[role] || 'Felix';
  const avatarUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${seed}&backgroundColor=transparent`;

  return (
    <div className={`animated-character-container ${isMoving ? 'moving' : ''}`}>
      <div className="character-body">
        <div className="arm arm-left"></div>
        <div className="arm arm-right"></div>
      </div>
      <img src={avatarUrl} alt={`${role} avatar`} className="character-head" />
    </div>
  );
};
