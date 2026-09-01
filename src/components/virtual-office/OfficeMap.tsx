import type { ReactNode } from "react";

interface OfficeMapProps {
  children: ReactNode;
}

export function OfficeMap({ children }: OfficeMapProps) {
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border-4 border-slate-300">
      {/* Realistic Background Image */}
      <img 
        src="/virtual_office_bg.jpg" 
        alt="Virtual Office" 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" 
      />
      
      {/* Live Glowing Screens Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Support Monitor */}
        <div className="absolute left-[34%] top-[55%] w-[4%] h-[5%] bg-blue-400/20 rounded shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-pulse" style={{ transform: 'skewY(-10deg)' }}></div>
        {/* Analyst Monitor */}
        <div className="absolute left-[68%] top-[60%] w-[4%] h-[5%] bg-purple-400/20 rounded shadow-[0_0_15px_rgba(168,85,247,0.6)] animate-[pulse_1.5s_infinite]" style={{ transform: 'skewY(5deg)' }}></div>
        {/* Marketing Monitor */}
        <div className="absolute left-[88%] top-[58%] w-[4%] h-[5%] bg-emerald-400/20 rounded shadow-[0_0_15px_rgba(16,185,129,0.6)] animate-[pulse_2s_infinite]" style={{ transform: 'skewY(10deg)' }}></div>
        {/* Boss Monitor */}
        <div className="absolute left-[66%] top-[41%] w-[3%] h-[4%] bg-slate-400/20 rounded shadow-[0_0_15px_rgba(148,163,184,0.6)] animate-pulse"></div>
      </div>
      
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
