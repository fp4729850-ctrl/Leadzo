import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Vapi from "@vapi-ai/web";
import { Mic, PhoneOff, Loader2 } from "lucide-react";
import { useQuery } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";
import { supabase } from "@/lib/supabase";
import { SimliClient, generateSimliSessionToken, generateIceServers } from 'simli-client';

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || "30cfacb0-68ad-49ec-82e5-3b0637432f0b"; 
const ASSISTANT_ID = import.meta.env.VITE_VAPI_MANAGER_ASSISTANT_ID || "c72d5615-bd69-4776-bd5d-d3ded56e1687";
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
  const vapiAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const isAudioAttachedRef = useRef<boolean>(false);

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

        // If Vapi audio is already available (race condition), attach it now
        const player = vapiAudioPlayerRef.current || vapi.getAudioPlayer();
        if (player && !isAudioAttachedRef.current) {
          console.log("Attaching Vapi audio to Simli (after Simli init)");
          // Ensure Vapi is permanently silent using its own API so it doesn't play out of sync audio
          vapi.setVolume(0); 
          const stream = player.srcObject as MediaStream;
          if (stream && stream.getAudioTracks().length > 0) {
            simliClientRef.current.listenToMediastreamTrack(stream.getAudioTracks()[0]);
          } else {
            simliClientRef.current.listenToAudioElement(player);
          }
          isAudioAttachedRef.current = true;
        }
        
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
      console.log("Vapi call ended");
      if (simliClientRef.current) simliClientRef.current.close();
      onClose();
    };
    const onVolumeLevel = (volume: number) => setVolumeLevel(volume);
    const onError = (e: any) => {
      console.error("Vapi Error:", e);
      setCallStatus((prev) => (prev === "loading" ? "error" : prev));
    };

    const onVapiAudio = (player: HTMLAudioElement) => {
      console.log("Vapi audio event received");
      // Ensure Vapi is permanently silent using its own API
      vapi.setVolume(0); 
      vapiAudioPlayerRef.current = player;
      if (simliClientRef.current && !isAudioAttachedRef.current) {
        console.log("Attaching Vapi audio to Simli (on event)");
        const stream = player.srcObject as MediaStream;
        if (stream && stream.getAudioTracks().length > 0) {
          simliClientRef.current.listenToMediastreamTrack(stream.getAudioTracks()[0]);
        } else {
          simliClientRef.current.listenToAudioElement(player);
        }
        isAudioAttachedRef.current = true;
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
      isAudioAttachedRef.current = false;
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

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto">
      <div className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        
        {/* Simli Video Output */}
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover z-10" 
          autoPlay 
          playsInline
          muted
        />
        {/* Play Simli's synchronized returned audio */}
        <audio ref={audioRef} autoPlay />

        {/* Overlay UI */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1">
           <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-2 text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live: {roleName}
           </div>
           {callStatus === "loading" && (
              <div className="bg-slate-900/80 backdrop-blur px-3 py-1 text-xs text-blue-400 rounded flex items-center gap-2">
                 <Loader2 className="w-3 h-3 animate-spin" /> Connecting to Brain...
              </div>
           )}
           {callStatus === "error" && (
              <div className="bg-red-900/80 backdrop-blur px-3 py-1 text-xs text-red-200 rounded flex items-center gap-2">
                 Connection Failed. Check API Keys.
              </div>
           )}
        </div>
        

      </div>
    </div>,
    document.body
  );
}
