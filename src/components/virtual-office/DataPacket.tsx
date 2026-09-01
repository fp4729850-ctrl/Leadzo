import { useEffect, useState } from "react";
import { Send } from "lucide-react";

interface DataPacketProps {
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  color?: string;
  onComplete: () => void;
}

export function DataPacket({ startPos, endPos, color = "bg-blue-400", onComplete }: DataPacketProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let start = Date.now();
    const duration = 1500; // 1.5 seconds

    const animate = () => {
      const now = Date.now();
      const timeElapsed = now - start;
      const newProgress = Math.min(timeElapsed / duration, 1);
      
      // Easing function (ease-in-out)
      const easeProgress = newProgress < 0.5 
        ? 2 * newProgress * newProgress 
        : 1 - Math.pow(-2 * newProgress + 2, 2) / 2;

      setProgress(easeProgress);

      if (newProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    requestAnimationFrame(animate);
  }, [onComplete]);

  const currentX = startPos.x + (endPos.x - startPos.x) * progress;
  const currentY = startPos.y + (endPos.y - startPos.y) * progress;

  return (
    <div 
      className="absolute z-[100] transform -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${currentX}%`, top: `${currentY}%` }}
    >
      <div className={`relative flex items-center justify-center w-8 h-8 rounded-full ${color} text-white shadow-[0_0_20px_rgba(255,255,255,0.8)] animate-pulse`}>
        <Send size={14} className="transform -rotate-45 -ml-1 mt-0.5" />
      </div>
    </div>
  );
}
