import { useState, useEffect } from "react";
import { OfficeMap } from "@/components/virtual-office/OfficeMap";
import { AgentAvatar } from "@/components/virtual-office/AgentAvatar";
import type { AgentRole } from "@/components/virtual-office/AgentAvatar";

// Initial desk positions
const POSITIONS = {
  support: { x: 100, y: 100 },
  marketing: { x: 700, y: 100 }, // roughly right side (map is full width, we'll use fixed values for MVP)
  analyst: { x: 100, y: 400 },
  boss: { x: 400, y: 480 },
};

export default function VirtualOfficePage() {
  const [supportPos, setSupportPos] = useState(POSITIONS.support);
  const [marketingPos, setMarketingPos] = useState(POSITIONS.marketing);
  const [analystPos, setAnalystPos] = useState(POSITIONS.analyst);
  
  const [supportMsg, setSupportMsg] = useState("");
  const [marketingMsg, setMarketingMsg] = useState("");
  const [analystMsg, setAnalystMsg] = useState("");

  const [isSupportMoving, setIsSupportMoving] = useState(false);
  const [isMarketingMoving, setIsMarketingMoving] = useState(false);
  const [isAnalystMoving, setIsAnalystMoving] = useState(false);

  // Mock Event Loop for Demonstration
  useEffect(() => {
    // 1. Marketing Agent walks to boss and reports
    const timer1 = setTimeout(() => {
      setIsMarketingMoving(true);
      setMarketingPos({ x: POSITIONS.boss.x + 80, y: POSITIONS.boss.y - 50 });
      
      setTimeout(() => {
        setIsMarketingMoving(false);
        setMarketingMsg("Boss, sent 100 WhatsApp templates!");
        
        // Go back
        setTimeout(() => {
          setIsMarketingMoving(true);
          setMarketingPos(POSITIONS.marketing);
          setTimeout(() => setIsMarketingMoving(false), 1000);
        }, 4000);
      }, 1000);
    }, 2000);

    // 2. Support Agent walks to boss
    const timer2 = setTimeout(() => {
      setIsSupportMoving(true);
      setSupportPos({ x: POSITIONS.boss.x - 80, y: POSITIONS.boss.y - 50 });
      
      setTimeout(() => {
        setIsSupportMoving(false);
        setSupportMsg("Resolved 5 customer queries!");
        
        // Go back
        setTimeout(() => {
          setIsSupportMoving(true);
          setSupportPos(POSITIONS.support);
          setTimeout(() => setIsSupportMoving(false), 1000);
        }, 4000);
      }, 1000);
    }, 10000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full h-full p-6 animate-in fade-in zoom-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Virtual Office <span className="text-xl font-normal text-slate-500">Beta</span>
        </h1>
        <p className="text-slate-500 mt-2">
          Watch your AI agents work in real-time. (Currently showing simulated data for MVP)
        </p>
      </div>

      <div className="flex-1 w-full max-w-5xl mx-auto mt-4 relative">
        <OfficeMap>
          <AgentAvatar
            id="agent-support"
            name="Support Bot"
            role="support"
            position={supportPos}
            statusMessage={supportMsg}
            isMoving={isSupportMoving}
          />
          <AgentAvatar
            id="agent-marketing"
            name="Marketing Bot"
            role="marketing"
            position={marketingPos}
            statusMessage={marketingMsg}
            isMoving={isMarketingMoving}
          />
          <AgentAvatar
            id="agent-analyst"
            name="Data Analyst"
            role="analyst"
            position={analystPos}
            statusMessage={analystMsg}
            isMoving={isAnalystMoving}
          />
          <AgentAvatar
            id="agent-boss"
            name="You (The Boss)"
            role="boss"
            position={POSITIONS.boss}
            statusMessage="Watching the team..."
          />
        </OfficeMap>
      </div>
    </div>
  );
}
