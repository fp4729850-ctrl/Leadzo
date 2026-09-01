import { useState, useEffect } from "react";
import { OfficeMap } from "@/components/virtual-office/OfficeMap";
import { AgentAvatar } from "@/components/virtual-office/AgentAvatar";
import type { AgentRole } from "@/components/virtual-office/AgentAvatar";

// Initial desk positions (in percentages for the 16:9 container)
const POSITIONS = {
  boss: { x: 50, y: 38 },       // Boss cabin in the back
  support: { x: 22, y: 68 },    // Left desk
  analyst: { x: 50, y: 72 },    // Center front desk
  marketing: { x: 78, y: 68 },  // Right desk
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
      // Move to outside the boss cabin
      setMarketingPos({ x: POSITIONS.boss.x + 8, y: POSITIONS.boss.y + 15 });
      
      setTimeout(() => {
        setIsMarketingMoving(false);
        setMarketingMsg("Boss, sent 100 WhatsApp templates!");
        
        // Go back
        setTimeout(() => {
          setIsMarketingMoving(true);
          setMarketingPos(POSITIONS.marketing);
          setTimeout(() => setIsMarketingMoving(false), 1500);
        }, 4000);
      }, 1500);
    }, 2000);

    // 2. Support Agent walks to boss
    const timer2 = setTimeout(() => {
      setIsSupportMoving(true);
      // Move to outside the boss cabin
      setSupportPos({ x: POSITIONS.boss.x - 8, y: POSITIONS.boss.y + 15 });
      
      setTimeout(() => {
        setIsSupportMoving(false);
        setSupportMsg("Resolved 5 customer queries!");
        
        // Go back
        setTimeout(() => {
          setIsSupportMoving(true);
          setSupportPos(POSITIONS.support);
          setTimeout(() => setIsSupportMoving(false), 1500);
        }, 4000);
      }, 1500);
    }, 12000);

    // 3. Analyst Agent walks to boss
    const timer3 = setTimeout(() => {
      setIsAnalystMoving(true);
      setAnalystPos({ x: POSITIONS.boss.x, y: POSITIONS.boss.y + 18 });
      
      setTimeout(() => {
        setIsAnalystMoving(false);
        setAnalystMsg("Lead pipeline is up 20% today!");
        
        // Go back
        setTimeout(() => {
          setIsAnalystMoving(true);
          setAnalystPos(POSITIONS.analyst);
          setTimeout(() => setIsAnalystMoving(false), 1500);
        }, 4000);
      }, 1500);
    }, 22000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="flex flex-col w-full h-full animate-in fade-in zoom-in duration-500">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Virtual Office <span className="text-xl font-normal text-slate-500">2.0</span>
        </h1>
        <p className="text-slate-500 mt-1">
          Watch your AI agents work in your realistic startup office.
        </p>
      </div>

      {/* The Office Map Container */}
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center">
        <OfficeMap>
          <AgentAvatar
            id="agent-boss"
            name="You (The Boss)"
            role="boss"
            imageUrl="https://i.pravatar.cc/150?img=11"
            position={POSITIONS.boss}
            statusMessage="Reviewing Analytics..."
          />
          <AgentAvatar
            id="agent-support"
            name="Support Bot"
            role="support"
            imageUrl="https://i.pravatar.cc/150?img=32"
            position={supportPos}
            statusMessage={supportMsg}
            isMoving={isSupportMoving}
          />
          <AgentAvatar
            id="agent-analyst"
            name="Data Analyst"
            role="analyst"
            imageUrl="https://i.pravatar.cc/150?img=68"
            position={analystPos}
            statusMessage={analystMsg}
            isMoving={isAnalystMoving}
          />
          <AgentAvatar
            id="agent-marketing"
            name="Marketing Bot"
            role="marketing"
            imageUrl="https://i.pravatar.cc/150?img=47"
            position={marketingPos}
            statusMessage={marketingMsg}
            isMoving={isMarketingMoving}
          />
        </OfficeMap>
      </div>
    </div>
  );
}
