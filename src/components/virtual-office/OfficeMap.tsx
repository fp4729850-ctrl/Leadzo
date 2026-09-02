import type { ReactNode } from "react";
import { Code, Terminal } from "lucide-react";

interface OfficeMapProps {
  children: ReactNode;
  isCalling?: boolean;
}

const ScreenOverlay = ({ x, y, rotate = 0, type = "code" }: { x: number; y: number; rotate?: number, type?: "code" | "terminal" }) => (
  <div 
    className="absolute bg-slate-900/80 border border-slate-700/50 rounded flex flex-col overflow-hidden shadow-[0_0_10px_rgba(59,130,246,0.3)] backdrop-blur-sm z-0"
    style={{ 
      left: `${x}%`, 
      top: `${y}%`, 
      width: '4%', 
      height: '4%',
      transform: `rotate(${rotate}deg)`,
    }}
  >
    <div className="h-1 bg-slate-800 w-full mb-0.5"></div>
    <div className="flex-1 p-0.5 relative overflow-hidden flex items-center justify-center">
      {type === "code" ? (
         <div className="absolute top-0 left-0 text-[3px] text-green-400 font-mono leading-[4px] opacity-70 animate-pulse">
           <div>{`const init = () => {`}</div>
           <div>{`  runAI();`}</div>
           <div>{`}`}</div>
         </div>
      ) : (
         <Terminal size={10} className="text-blue-400 opacity-60 animate-pulse" />
      )}
      {/* Scanning line effect */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-400/30 animate-scan"></div>
    </div>
  </div>
);

export function OfficeMap({ children, isCalling = false }: OfficeMapProps) {
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border-4 border-slate-300 bg-white">
      {/* Realistic Background Video */}
      <video
        key={isCalling ? "calling" : "idle"}
        src={isCalling ? "/virtual_office_bg_14s.mp4?v=1" : "/virtual_office_bg_new.mp4?v=1"}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />
      
      {/* Dimming overlay to make agents pop more if needed (optional) */}
      <div className="absolute inset-0 bg-black/5 pointer-events-none"></div>
      
      {/* Live Screens */}
      <ScreenOverlay x={30} y={45} rotate={-5} type="code" />
      <ScreenOverlay x={70} y={40} rotate={8} type="terminal" />
      <ScreenOverlay x={50} y={60} rotate={2} type="code" />

      {/* Render Agents over the map */}
      {/* We use a container that scales content perfectly for a 16:9 1920x1080 virtual coordinate space */}
      <div className="absolute inset-0 z-10" style={{ transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}
