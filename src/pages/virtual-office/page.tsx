import { useState, useEffect } from "react";
import { OfficeMap } from "@/components/virtual-office/OfficeMap";
import { AgentAvatar } from "@/components/virtual-office/AgentAvatar";
import { DataPacket } from "@/components/virtual-office/DataPacket";
import { LiveAvatarModal } from "@/components/virtual-office/LiveAvatarModal";
import { HeyGenAvatarModal } from "@/components/virtual-office/HeyGenAvatarModal";
import { OutboundCallModal } from "@/components/virtual-office/OutboundCallModal";
import { ApiIntegrationsModal } from "@/components/virtual-office/ApiIntegrationsModal";
import { PhoneCall, PhoneForwarded } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// Exact coordinates mapped to the characters in the generated 3D image (percentages)
const POSITIONS = {
  manager: { x: 50, y: 15 },       // Boss in cabin
  support: { x: 23, y: 55 },       // Left woman
  research: { x: 10, y: 35 },      // Empty space on the far left
  analytics: { x: 50, y: 80 },     // Bottom center guy
  operation: { x: 67, y: 48 },     // Guy in blue at coffee machine
  marketing: { x: 83, y: 55 },     // Woman in pink at coffee machine
};

const HUMAN_POSITIONS = {
  manager: { x: 88, y: 48 },      // Man on phone in glass cabin
  support: { x: 32, y: 65 },      // Woman on the left
  research: { x: 42, y: 80 },     // Empty laptop area in front
  operation: { x: 50, y: 55 },    // Man in the background
  analytics: { x: 65, y: 62 },    // Man in blue shirt
  marketing: { x: 85, y: 78 },    // Woman in the foreground right
};

type Packet = { id: string; fromRole: string; color: string; message: string };

export default function VirtualOfficePage() {
  const [supportMsg, setSupportMsg] = useState("");
  const [marketingMsg, setMarketingMsg] = useState("");
  const [analyticsMsg, setAnalyticsMsg] = useState("");
  const [managerMsg, setManagerMsg] = useState("");
  const [operationMsg, setOperationMsg] = useState("");
  const [researchMsg, setResearchMsg] = useState("");

  const [activeSenders, setActiveSenders] = useState<Record<string, boolean>>({});
  const [packets, setPackets] = useState<Packet[]>([]);
  
  const [isCalling, setIsCalling] = useState(false);
  const [isRingingPhone, setIsRingingPhone] = useState(false);
  const [isOutboundConnected, setIsOutboundConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHeyGenModalOpen, setIsHeyGenModalOpen] = useState(false);
  const [activeLiveRole, setActiveLiveRole] = useState("AI Manager");
  const [activeFaceId, setActiveFaceId] = useState("5514e24d-6086-46a3-ace4-6a7264e5cb7c");
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [videoStyle, setVideoStyle] = useState<"cartoon" | "human">("cartoon");

  const spawnPacket = (role: string, color: string, finalMessage: string) => {
    setActiveSenders(prev => ({ ...prev, [role]: true }));
    
    // Simulate thinking/working for 1.5s before sending
    setTimeout(() => {
      const packetId = Math.random().toString();
      setPackets(prev => [...prev, { id: packetId, fromRole: role, color, message: finalMessage }]);
    }, 1500);
  };

  const handlePacketComplete = (packetId: string, role: string, message: string) => {
    // Remove packet
    setPackets(prev => prev.filter(p => p.id !== packetId));
    setActiveSenders(prev => ({ ...prev, [role]: false }));
    
    // Show message over Manager
    setManagerMsg(`Received: ${message}`);
    
    // Clear manager message after a while
    setTimeout(() => {
      setManagerMsg("");
    }, 4000);
  };

  // Real Data Fetching & Event Loop
  useEffect(() => {
    let isMounted = true;
    const timers: NodeJS.Timeout[] = [];

    const loadRealDataAndAnimate = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        // Fetch User Tokens
        const { data: userData } = await supabase.from('users').select('token_balance').eq('id', user.id).single();
        const tokens = userData?.token_balance || 0;

        // Fetch Active Business
        const { data: businessData } = await supabase
          .from('business_knowledge')
          .select('company_name, business_details, internal_api_key')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (!isMounted) return;

        const companyName = businessData?.company_name || "Unknown Company";
        const contextLength = businessData?.business_details ? businessData.business_details.length : 0;
        const isApiActive = !!businessData?.internal_api_key;

        // 1. Marketing & Sales Agent
        timers.push(setTimeout(() => {
          if (!isMounted) return;
          setMarketingMsg("Fetching active campaigns...");
          spawnPacket("marketing", "bg-emerald-500", `Managing leads for: ${companyName}`);
        }, 2000));

        // 2. Support Agent
        timers.push(setTimeout(() => {
          if (!isMounted) return;
          setSupportMsg("Scanning Support Inbox...");
          spawnPacket("support", "bg-blue-500", "0 Pending Tickets. Inbox Zero!");
        }, 10000));

        // 3. Analytics Agent
        timers.push(setTimeout(() => {
          if (!isMounted) return;
          setAnalyticsMsg("Verifying Token Usage...");
          spawnPacket("analytics", "bg-purple-500", `Tokens Remaining: ${tokens.toLocaleString()}`);
        }, 18000));

        // 4. Research Agent
        timers.push(setTimeout(() => {
          if (!isMounted) return;
          setResearchMsg("Analyzing AI Knowledge Base...");
          spawnPacket("research", "bg-yellow-500", `Brain Size: ${contextLength} characters learned`);
        }, 25000));

        // 5. Operation Agent
        timers.push(setTimeout(() => {
          if (!isMounted) return;
          setOperationMsg("Checking Internal Systems...");
          spawnPacket("operation", "bg-orange-500", `Leadzo API: ${isApiActive ? "CONNECTED" : "OFFLINE"}`);
        }, 32000));

      } catch (e) {
        console.error("Failed to load real data for virtual office", e);
      }
    };

    loadRealDataAndAnimate();

    return () => {
      isMounted = false;
      timers.forEach(t => clearTimeout(t));
    };
  }, []);

  const handleCallManager = () => {
    setIsCalling(true);
    setManagerMsg("Receiving incoming call...");
    
    // Wait for 3 seconds for the manager in the video to pick up the phone
    // Then open the live Vapi AI call modal
    setTimeout(() => {
      setActiveLiveRole("Manager");
      setIsModalOpen(true);
    }, 3000);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsCalling(false);
    setManagerMsg("");
  };

  const handleRingPhone = async () => {
    setIsRingingPhone(true);
    setManagerMsg("Ringing my physical phone...");
    
    // Simulate some logic in UI then call Edge function
    try {
      const { data, error } = await supabase.functions.invoke('vapi_outbound_call');
      if (error) {
        let errorMessage = error.message;
        try {
          if (error.context && typeof error.context.json === 'function') {
             const body = await error.context.json();
             if (body && body.error) errorMessage = body.error;
          }
        } catch(e) {}
        throw new Error(errorMessage);
      }
      toast.success("Manager is calling your phone now!");
      
      // Simulate physical phone ringing delay (7s) before opening the UI modal
      setTimeout(() => {
        setIsOutboundConnected(true);
      }, 7000);
      
    } catch (e: any) {
      toast.error(e.message || "Failed to initiate outbound call", { duration: 8000 });
      setManagerMsg("Call failed.");
      setIsRingingPhone(false);
    }
  };

  const currentPositions = videoStyle === "human" ? HUMAN_POSITIONS : POSITIONS;

  return (
    <div className="flex flex-col w-full h-full animate-in fade-in zoom-in duration-500">
      <LiveAvatarModal isOpen={isModalOpen} onClose={handleCloseModal} roleName={activeLiveRole} faceId={activeFaceId} />
      <HeyGenAvatarModal isOpen={isHeyGenModalOpen} onClose={() => setIsHeyGenModalOpen(false)} />
      <OutboundCallModal 
        isOpen={isOutboundConnected} 
        onClose={() => { 
          setIsOutboundConnected(false); 
          setIsRingingPhone(false); 
          setManagerMsg(""); 
        }} 
      />
      <ApiIntegrationsModal isOpen={isApiModalOpen} onClose={() => setIsApiModalOpen(false)} />

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Virtual Office <span className="text-xl font-normal text-slate-500">2.0</span>
          </h1>
          <p className="text-slate-500 mt-1">
            Watch your AI agents work in your realistic startup office.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setVideoStyle("cartoon")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                videoStyle === "cartoon" 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Cartoon Agent
            </button>
            <button
              onClick={() => {
                setActiveLiveRole("AI Manager (International)");
                setActiveFaceId("5514e24d-6086-46a3-ace4-6a7264e5cb7c");
                setIsModalOpen(true);
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all text-slate-500 hover:text-slate-700 hover:bg-slate-100`}
            >
              Real Human (Intl)
            </button>
            <button
              onClick={() => {
                setActiveLiveRole("AI Manager (Indian)");
                setActiveFaceId("7e74d6e7-d559-4394-bd56-4923a3ab75ad");
                setIsModalOpen(true);
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all text-slate-500 hover:text-slate-700 hover:bg-slate-100`}
            >
              Real Human (Indian)
            </button>
            <button
              onClick={() => setIsHeyGenModalOpen(true)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all text-slate-500 hover:text-slate-700 hover:bg-slate-100`}
            >
              HeyGen Avatar
            </button>
          </div>

          <button 
            onClick={() => setIsApiModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
          >
            Manage APIs
          </button>
          
          <button 
            onClick={handleRingPhone}
            disabled={isRingingPhone}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white transition-all shadow-md ${
              isRingingPhone ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <PhoneForwarded size={18} className={isRingingPhone ? 'animate-pulse' : ''} />
            {isRingingPhone ? "Connecting..." : "Ring my Phone"}
          </button>

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
      </div>

      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center">
        <OfficeMap isCalling={isCalling || isRingingPhone || isOutboundConnected} videoStyle={videoStyle}>
          {/* Manager (Boss) */}
          <AgentAvatar
            id="agent-manager"
            name="You (Manager Agent)"
            role="manager"
            position={currentPositions.manager}
            statusMessage={managerMsg || "Reviewing Analytics..."}
            videoStyle={videoStyle}
            onStartLiveCall={(roleName) => { setActiveLiveRole(roleName); setIsModalOpen(true); }}
          />
          
          {/* Support */}
          <AgentAvatar
            id="agent-support"
            name="Support Agent"
            role="support"
            position={currentPositions.support}
            statusMessage={supportMsg}
            isSending={activeSenders["support"]}
            videoStyle={videoStyle}
            onStartLiveCall={(roleName) => { setActiveLiveRole(roleName); setIsModalOpen(true); }}
          />

          {/* Research */}
          <AgentAvatar
            id="agent-research"
            name="Research Agent"
            role="research"
            position={currentPositions.research}
            statusMessage={researchMsg}
            isSending={activeSenders["research"]}
            videoStyle={videoStyle}
            onStartLiveCall={(roleName) => { setActiveLiveRole(roleName); setIsModalOpen(true); }}
          />
          
          {/* Analytics */}
          <AgentAvatar
            id="agent-analytics"
            name="Analytics Agent"
            role="analytics"
            position={currentPositions.analytics}
            statusMessage={analyticsMsg}
            isSending={activeSenders["analytics"]}
            videoStyle={videoStyle}
            onStartLiveCall={(roleName) => { setActiveLiveRole(roleName); setIsModalOpen(true); }}
          />

          {/* Operation */}
          <AgentAvatar
            id="agent-operation"
            name="Operation Agent"
            role="operation"
            position={currentPositions.operation}
            statusMessage={operationMsg}
            isSending={activeSenders["operation"]}
            videoStyle={videoStyle}
            onStartLiveCall={(roleName) => { setActiveLiveRole(roleName); setIsModalOpen(true); }}
          />
          
          {/* Marketing & Sales */}
          <AgentAvatar
            id="agent-marketing"
            name="Marketing & Sales Agent"
            role="marketing"
            position={currentPositions.marketing}
            statusMessage={marketingMsg}
            isSending={activeSenders["marketing"]}
            videoStyle={videoStyle}
            onStartLiveCall={(roleName) => { setActiveLiveRole(roleName); setIsModalOpen(true); }}
          />

          {/* Flying Data Packets */}
          {packets.map(p => (
            <DataPacket 
              key={p.id}
              startPos={currentPositions[p.fromRole as keyof typeof currentPositions]}
              endPos={currentPositions.manager}
              color={p.color}
              onComplete={() => handlePacketComplete(p.id, p.fromRole, p.message)}
            />
          ))}
        </OfficeMap>
      </div>
    </div>
  );
}
