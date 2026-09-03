import { useState, useEffect, useRef } from "react";
import Vapi from "@vapi-ai/web";
import { Mic, PhoneOff, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";
import { supabase } from "@/lib/supabase";
import { SimliClient, generateSimliSessionToken, generateIceServers } from 'simli-client';

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || "dummy-public-key"; 
const ASSISTANT_ID = import.meta.env.VITE_VAPI_MANAGER_ASSISTANT_ID || "dummy-assistant-id";
// Hardcode the Simli key provided by user for this demo
const SIMLI_API_KEY = "lw5do5bbhd3jn1yg972q";

const vapi = new Vapi(VAPI_PUBLIC_KEY);

interface LiveAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleName?: string;
}

export function LiveAvatarModal({ isOpen, onClose, roleName = "AI Manager" }: LiveAvatarModalProps) {
  const [callStatus, setCallStatus] = useState<"idle" | "loading" | "active" | "error">("idle");
  const [volumeLevel, setVolumeLevel] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const simliClientRef = useRef<SimliClient | null>(null);

  const user = useQuery(api.users.getCurrentUser, {});
  const metrics = useQuery(api.adCampaigns.getDashboardMetrics);
  
  const [customIntegrations, setCustomIntegrations] = useState<any[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const fetchIntegrations = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: activeBrain } = await supabase.from('business_knowledge').select('id').eq('is_active', true).eq('user_id', session.user.id).single();
      if (activeBrain) {
        setActiveBusinessId(activeBrain.id);
        const { data: integrations } = await supabase.from('custom_integrations').select('*').eq('business_id', activeBrain.id);
        setCustomIntegrations(integrations || []);
      }
    };
    if (isOpen) fetchIntegrations();
  }, [isOpen]);

  // Setup Simli
  useEffect(() => {
    const initSimli = async () => {
      if (!videoRef.current || !audioRef.current || !isOpen) return;
      
      try {
        const iceServers = await generateIceServers(SIMLI_API_KEY);
        const token = await generateSimliSessionToken({
          apiKey: SIMLI_API_KEY,
          config: {
            faceId: '5514e24d-6086-46a3-ace4-6a7264e5cb7c',
            handleSilence: true,
            maxSessionLength: 3600,
            maxIdleTime: 3600
          }
        });
        
        simliClientRef.current = new SimliClient(
          token.session_token,
          videoRef.current,
          audioRef.current,
          iceServers
        );
        
        await simliClientRef.current.start();
        console.log("Simli started");
      } catch (e) {
        console.error("Simli initialization failed", e);
      }
    };
    initSimli();

    return () => {
      if (simliClientRef.current) {
        simliClientRef.current.stop();
        simliClientRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const onCallStart = () => setCallStatus("active");
    const onCallEnd = () => {
      setCallStatus("idle");
      onClose();
    };
    const onVolumeLevel = (volume: number) => setVolumeLevel(volume);
    const onError = (e: any) => setCallStatus("error");

    const onVapiAudio = (player: HTMLAudioElement) => {
      if (simliClientRef.current) {
        console.log("Attaching Vapi audio to Simli");
        simliClientRef.current.listenToAudioElement(player);
      }
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("volume-level", onVolumeLevel);
    vapi.on("error", onError);
    vapi.on("audio", onVapiAudio);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("volume-level", onVolumeLevel);
      vapi.off("error", onError);
      vapi.off("audio", onVapiAudio);
    };
  }, [onClose]);

  useEffect(() => {
    if (isOpen && callStatus === "idle") {
      setCallStatus("loading");
      const customApiNames = customIntegrations.map((ci: any) => ci.api_name).join(", ") || "None";
      const systemPrompt = `You are a real-time photorealistic AI agent. Your role is ${roleName} at Leadzo AI.
Always respond professionally and keep your answers conversational.

USER CUSTOM APIS: [${customApiNames}]
Your active business_id is: ${activeBusinessId}.
REAL-TIME COMPANY DATA: ${JSON.stringify(metrics || {}, null, 2)}`;

      vapi.start(ASSISTANT_ID, {
        firstMessage: `Hello, I am your ${roleName}. How can I assist you today?`,
        model: {
          provider: "openai",
          model: "gpt-4-turbo",
          messages: [{ role: "system", content: systemPrompt }]
        }
      }).catch((e) => {
        console.error("Failed to start vapi", e);
        setCallStatus("error");
      });
    } else if (!isOpen && callStatus === "active") {
      vapi.stop();
      setCallStatus("idle");
    }
  }, [isOpen]);

  const handleEndCall = () => {
    vapi.stop();
    setCallStatus("idle");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleEndCall()}>
      <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-800 text-white shadow-2xl p-0 overflow-hidden">
        
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          {/* Simli Video Output */}
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover z-10" 
            autoPlay 
            playsInline
            muted
          />
          <audio ref={audioRef} autoPlay />

          {/* Overlay UI */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-1">
             <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live: {roleName}
             </div>
             {callStatus === "loading" && (
                <div className="bg-slate-900/80 backdrop-blur px-3 py-1 text-xs text-blue-400 rounded flex items-center gap-2">
                   <Loader2 className="w-3 h-3 animate-spin" /> Connecting to Brain...
                </div>
             )}
          </div>
          
          <div className="absolute bottom-4 z-20 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
            <div className="relative">
              <div 
                className="absolute inset-0 bg-emerald-500/30 rounded-full transition-all duration-75"
                style={{ transform: `scale(${1 + volumeLevel * 2})` }}
              />
              <div className="relative z-10 w-12 h-12 bg-slate-800 rounded-full border border-emerald-500/50 flex items-center justify-center">
                <Mic className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            <button
              onClick={handleEndCall}
              className="w-12 h-12 flex items-center justify-center bg-red-500 hover:bg-red-600 rounded-full font-semibold transition-all shadow-lg"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
        
      </DialogContent>
    </Dialog>
  );
}
