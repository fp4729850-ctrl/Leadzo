import type { ReactNode } from "react";

interface OfficeMapProps {
  children: ReactNode;
}

export function OfficeMap({ children }: OfficeMapProps) {
  return (
    <div className="relative w-full h-[600px] bg-slate-50 border-4 border-slate-200 rounded-xl overflow-hidden shadow-inner">
      {/* Floor Pattern */}
      <div 
        className="absolute inset-0 opacity-10" 
        style={{
          backgroundImage: `linear-gradient(#cbd5e1 2px, transparent 2px), linear-gradient(90deg, #cbd5e1 2px, transparent 2px)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Office Walls / Props */}
      <div className="absolute top-0 left-0 w-full h-12 bg-slate-300 border-b-4 border-slate-400"></div>
      
      {/* Some Desks */}
      <div className="absolute top-20 left-20 w-32 h-20 bg-amber-100 border-4 border-amber-600 rounded-lg flex items-center justify-center shadow-lg">
        <span className="text-amber-800 font-bold opacity-50">Support Desk</span>
      </div>
      
      <div className="absolute top-20 right-20 w-32 h-20 bg-emerald-100 border-4 border-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
        <span className="text-emerald-800 font-bold opacity-50">Marketing Desk</span>
      </div>
      
      <div className="absolute bottom-20 left-20 w-32 h-20 bg-purple-100 border-4 border-purple-600 rounded-lg flex items-center justify-center shadow-lg">
        <span className="text-purple-800 font-bold opacity-50">Analytics Desk</span>
      </div>
      
      {/* Boss Desk (Center Bottom) */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-48 h-24 bg-zinc-800 border-4 border-zinc-900 rounded-lg flex items-center justify-center shadow-2xl">
        <span className="text-white font-bold opacity-50 tracking-widest text-lg">THE BOSS</span>
      </div>

      {/* Render Agents */}
      {children}
    </div>
  );
}
