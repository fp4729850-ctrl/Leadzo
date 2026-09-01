import { useRef } from "react";
import type { ReactNode } from "react";

interface OfficeMapProps {
  children: ReactNode;
}

export function OfficeMap({ children }: OfficeMapProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.currentTime >= 0.68) {
      videoRef.current.currentTime = 0.3;
    }
  };

  const handleEnded = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0.3;
      videoRef.current.play().catch(console.error);
    }
  };

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border-4 border-slate-300 bg-white">
      {/* Realistic Background Video */}
      <video
        ref={videoRef}
        src="/virtual_office_bg.mp4?v=3"
        autoPlay
        muted
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />
      
      {/* Dimming overlay to make agents pop more if needed (optional) */}
      <div className="absolute inset-0 bg-black/5 pointer-events-none"></div>

      {/* Render Agents over the map */}
      {/* We use a container that scales content perfectly for a 16:9 1920x1080 virtual coordinate space */}
      <div className="absolute inset-0" style={{ transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}
