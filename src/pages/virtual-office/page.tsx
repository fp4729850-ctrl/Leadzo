import { useState, useEffect } from "react";
import { OfficeMap } from "@/components/virtual-office/OfficeMap";
import { AgentAvatar } from "@/components/virtual-office/AgentAvatar";
import { DataPacket } from "@/components/virtual-office/DataPacket";
import { PhoneCall } from "lucide-react";

// Exact coordinates mapped to the characters in the generated 3D image (percentages)
const POSITIONS = {
  boss: { x: 50, y: 15 },       // Boss in cabin
  support: { x: 23, y: 55 },    // Left guy (Support)
  marketing: { x: 80, y: 55 },  // Right woman (Marketing)
  analyst: { x: 50, y: 80 },    // Bottom center guy (Analyst)
};

type Packet = { id: string; from: {x:number, y:number}; color: string; message: string };

export default function VirtualOfficePage() {
  const [supportMsg, setSupportMsg] = useState("");
  const [marketingMsg, setMarketingMsg] = useState("");
  const [analystMsg, setAnalystMsg] = useState("");
  const [bossMsg, setBossMsg] = useState("");

  const [activeSenders, setActiveSenders] = useState<Record<string, boolean>>({});
  const [packets, setPackets] = useState<Packet[]>([]);
  
  const [isCalling, setIsCalling] = useState(false);

  const spawnPacket = (role: string, pos: {x:number, y:number}, color: string, finalMessage: string) => {
    setActiveSenders(prev => ({ ...prev, [role]: true }));
    
    // Simulate thinking/working for 1.5s before sending
    setTimeout(() => {
      const packetId = Math.random().toString();
      setPackets(prev => [...prev, { id: packetId, from: pos, color, message: finalMessage }]);
    }, 1500);
  };

  const handlePacketComplete = (packetId: string, role: string, message: string) => {
    // Remove packet
    setPackets(prev => prev.filter(p => p.id !== packetId));
    setActiveSenders(prev => ({ ...prev, [role]: false }));
    
    // Show message over Boss
    setBossMsg(`Received: ${message}`);
    
    // Clear boss message after a while
    setTimeout(() => {
      setBossMsg("");
    }, 4000);
  };

  // Mock Event Loop for Demonstration
  useEffect(() => {
    // 1. Marketing Agent sends report
    const timer1 = setTimeout(() => {
      setMarketingMsg("Sending Insta Ads Report...");
      spawnPacket("marketing", POSITIONS.marketing, "bg-emerald-500", "100 Leads Generated!");
    }, 2000);

    // 2. Support Agent sends report
    const timer2 = setTimeout(() => {
      setSupportMsg("Sending Ticket Summary...");
      spawnPacket("support", POSITIONS.support, "bg-blue-500", "5 Tickets Resolved.");
    }, 10000);

    // 3. Analyst Agent sends report
    const timer3 = setTimeout(() => {
      setAnalystMsg("Sending Data Pipeline update...");
      spawnPacket("analyst", POSITIONS.analyst, "bg-purple-500", "Pipeline speed +20%");
    }, 18000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const handleCallManager = () => {
    setIsCalling(true);
    setBossMsg("Receiving incoming call...");
    
    // The video is 14s, so we reset after 14 seconds
    setTimeout(() => {
      setIsCalling(false);
      setBossMsg("");
    }, 14000);
  };

  return (
    <div className="flex flex-col w-full h-full animate-in fade-in zoom-in duration-500">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Virtual Office <span className="text-xl font-normal text-slate-500">2.0</span>
          </h1>
          <p className="text-slate-500 mt-1">
            Watch your AI agents work in your realistic startup office.
          </p>
        </div>
        <button 
          onClick={handleCallManager}
          disabled={isCalling}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white transition-all shadow-md ${
            isCalling ? 'bg-red-500 animate-pulse' : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          <PhoneCall size={18} className={isCalling ? 'animate-bounce' : ''} />
          {isCalling ? "Calling..." : "Call Manager"}
        </button>
      </div>

      {/* The Office Map Container */}
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center">
        <OfficeMap isCalling={isCalling}>
          {/* Boss */}
          <AgentAvatar
            id="agent-boss"
            name="You (Boss)"
            role="boss"
            position={POSITIONS.boss}
            statusMessage={bossMsg || "Reviewing Analytics..."}
          />
          
          {/* Support */}
          <AgentAvatar
            id="agent-support"
            name="Support Bot"
            role="support"
            position={POSITIONS.support}
            statusMessage={supportMsg}
            isSending={activeSenders["support"]}
          />
          
          {/* Analyst */}
          <AgentAvatar
            id="agent-analyst"
            name="Data Analyst"
            role="analyst"
            position={POSITIONS.analyst}
            statusMessage={analystMsg}
            isSending={activeSenders["analyst"]}
          />
          
          {/* Marketing */}
          <AgentAvatar
            id="agent-marketing"
            name="Marketing Bot"
            role="marketing"
            position={POSITIONS.marketing}
            statusMessage={marketingMsg}
            isSending={activeSenders["marketing"]}
          />

          {/* Flying Data Packets */}
          {packets.map(p => (
            <DataPacket 
              key={p.id}
              startPos={p.from}
              endPos={POSITIONS.boss}
              color={p.color}
              onComplete={() => handlePacketComplete(p.id, Object.keys(POSITIONS).find(k => POSITIONS[k as keyof typeof POSITIONS] === p.from) || "", p.message)}
            />
          ))}
        </OfficeMap>
      </div>
    </div>
  );
}
