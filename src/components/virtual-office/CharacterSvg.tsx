export function CharacterSvg({ isMoving, role }: { isMoving?: boolean, role: string }) {
  // Simple flat vector human SVG
  const colors = {
    boss: { shirt: "#1e293b", pants: "#0f172a", skin: "#fcd34d" },
    support: { shirt: "#3b82f6", pants: "#1e3a8a", skin: "#fca5a5" },
    marketing: { shirt: "#10b981", pants: "#064e3b", skin: "#fdba74" },
    analyst: { shirt: "#8b5cf6", pants: "#4c1d95", skin: "#f87171" },
  };

  const c = colors[role as keyof typeof colors] || colors.support;

  if (isMoving) {
    // Walking Character SVG
    return (
      <svg width="48" height="96" viewBox="0 0 48 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g id="Walking-Human">
          {/* Head */}
          <circle cx="24" cy="16" r="10" fill={c.skin} />
          {/* Body/Shirt */}
          <path d="M16 28 C 16 28, 32 28, 32 28 C 36 28, 38 32, 38 38 L 34 55 L 14 55 L 10 38 C 10 32, 12 28, 16 28 Z" fill={c.shirt} />
          {/* Legs (Walking pose) */}
          <path d="M 20 55 L 12 85 L 18 85 L 24 55 Z" fill={c.pants} />
          <path d="M 28 55 L 36 75 L 30 75 L 24 55 Z" fill={c.pants} />
          {/* Arms (Swinging) */}
          <path d="M 12 30 L 4 50 L 8 50 L 16 30 Z" fill={c.shirt} />
          <path d="M 36 30 L 44 40 L 40 40 L 32 30 Z" fill={c.shirt} />
        </g>
      </svg>
    );
  }

  // Sitting Character SVG
  return (
    <svg width="48" height="96" viewBox="0 0 48 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g id="Sitting-Human">
        {/* Head */}
        <circle cx="24" cy="24" r="10" fill={c.skin} />
        {/* Body/Shirt */}
        <path d="M16 36 C 16 36, 32 36, 32 36 C 36 36, 38 40, 38 46 L 36 65 L 12 65 L 10 46 C 10 40, 12 36, 16 36 Z" fill={c.shirt} />
        {/* Legs (Sitting pose - bent knees) */}
        <path d="M 16 65 L 16 75 L 32 75 L 32 65 Z" fill={c.pants} />
        <path d="M 16 75 L 16 95 L 22 95 L 22 75 Z" fill={c.pants} />
        {/* Arms (Typing/Resting) */}
        <path d="M 12 38 C 4 48, 4 55, 10 55 L 14 50 C 10 50, 10 45, 16 38 Z" fill={c.shirt} />
      </g>
    </svg>
  );
}
