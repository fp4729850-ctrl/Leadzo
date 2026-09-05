// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LiveAvatarSession, SessionEvent, SessionState } from "@heygen/liveavatar-web-sdk";
import { Loader2, X, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";

interface HeyGenAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HEYGEN_API_KEY = "e5ca3582-61ca-4244-9a18-aa177a832a5b";

export function HeyGenAvatarModal({ isOpen, onClose }: HeyGenAvatarModalProps) {
  const [callStatus, setCallStatus] = useState<"idle" | "loading" | "active" | "error">("idle");
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarRef = useRef<LiveAvatarSession | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const startAvatar = async () => {
      if (!isOpen || !videoRef.current) return;
      
      setCallStatus("loading");
      
      try {
        // Request microphone permission explicitly
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          toast.error("Microphone access is required to talk to the avatar");
          console.warn("Mic error", err);
        }

        const { data: activeBrain } = await supabase
          .from("business_knowledge")
          .select("company_name, business_details")
          .eq("is_active", true)
          .single();

        let systemPrompt = "You are a helpful assistant.";
        if (activeBrain) {
          systemPrompt = `You are an AI assistant for ${activeBrain.company_name}. Here is your knowledge base:\n${activeBrain.business_details}`;
        }
        
        systemPrompt += `\n\nIMPORTANT: You must clearly speak and reply in HINDI language to the user. Do not use English unless necessary.`;

        // Create Context ID for the Avatar to have memory
        const contextRes = await fetch("https://api.liveavatar.com/v1/contexts", {
          method: "POST",
          headers: { 
            "X-API-KEY": HEYGEN_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: activeBrain?.company_name || "Leadzo AI Assistant",
            prompt: systemPrompt,
            opening_text: "Namaste! Main aapka AI Assistant hoon. Main aapki kya madad kar sakta hoon?"
          })
        });

        if (!contextRes.ok) {
           throw new Error("Failed to create context");
        }
        
        const contextData = await contextRes.json();
        const contextId = contextData.data.id;

        const response = await fetch("https://api.liveavatar.com/v1/sessions/token", {
          method: "POST",
          headers: { 
            "X-API-KEY": HEYGEN_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            mode: "FULL",
            is_sandbox: true,
            avatar_id: "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a",
            avatar_persona: {
              voice_id: "a3abc0cd-26d0-4661-aaf5-af10e3cec175",
              context_id: contextId,
              language: "hi" // Force Hindi/Multilingual language support for STT and TTS
            }
          })
        });
        
        if (!response.ok) {
          throw new Error("Failed to get LiveAvatar token");
        }
        
        const { data } = await response.json();
        
        const session = new LiveAvatarSession(data.session_token, { voiceChat: true });
        avatarRef.current = session;
        
        session.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
           if (state === SessionState.CONNECTED) {
               if (isMounted) setCallStatus("active");
               try {
                 session.startListening();
               } catch (e) {
                 console.error("Failed to start listening command", e);
               }
           }
        });

        session.on(SessionEvent.SESSION_STREAM_READY, () => {
           if (videoRef.current) {
               session.attach(videoRef.current);
           }
        });
        
        session.on(SessionEvent.SESSION_DISCONNECTED, () => {
           if (isMounted) setCallStatus("idle");
           onClose();
        });
        
        await session.start();
        
        // Ensure voiceChat is started
        try {
          await session.voiceChat?.start();
        } catch (e) {
          console.error("Failed to start voice chat automatically", e);
        }
        
        if (!isMounted) return;
        
      } catch (e: any) {
         console.error("LiveAvatar init error", e);
         toast.error(e.message || "Failed to start avatar");
         if (isMounted) setCallStatus("error");
      }
    };
    
    if (isOpen && callStatus === "idle") {
       startAvatar();
    }
    
    return () => {
       isMounted = false;
       if (avatarRef.current) {
          avatarRef.current.stop().catch(console.error);
          avatarRef.current = null;
       }
    };
  }, [isOpen]);

  const handleEndCall = () => {
    if (avatarRef.current) {
      avatarRef.current.stop();
      avatarRef.current = null;
    }
    setCallStatus("idle");
    onClose();
  };

  const toggleMute = async () => {
    if (!avatarRef.current?.voiceChat) return;
    try {
      if (isMuted) {
        await avatarRef.current.voiceChat.unmute();
        setIsMuted(false);
      } else {
        await avatarRef.current.voiceChat.mute();
        setIsMuted(true);
      }
    } catch (e) {
      console.error("Toggle mute error", e);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto">
      <div className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        
        <video 
          ref={videoRef} 
          className="w-full h-full object-contain z-10" 
          autoPlay 
          playsInline
        />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
          <button
            onClick={toggleMute}
            className={`w-12 h-12 flex items-center justify-center rounded-full backdrop-blur transition-all ${
              isMuted ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-900/60 hover:bg-slate-900/80 text-white'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <button
            onClick={handleEndCall}
            className="w-12 h-12 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-full backdrop-blur transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1">
           <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-2 text-white">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Live Avatar
           </div>
           {callStatus === "loading" && (
              <div className="bg-slate-900/80 backdrop-blur px-3 py-1 text-xs text-blue-400 rounded flex items-center gap-2">
                 <Loader2 className="w-3 h-3 animate-spin" /> Starting Stream...
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
