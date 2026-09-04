import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import StreamingAvatar, { AvatarQuality, StreamingEvents } from "@heygen/streaming-avatar";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface HeyGenAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HEYGEN_API_KEY = "e5ca3582-61ca-4244-9a18-aa177a832a5b";

export function HeyGenAvatarModal({ isOpen, onClose }: HeyGenAvatarModalProps) {
  const [callStatus, setCallStatus] = useState<"idle" | "loading" | "active" | "error">("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarRef = useRef<StreamingAvatar | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const startAvatar = async () => {
      if (!isOpen || !videoRef.current) return;
      
      setCallStatus("loading");
      
      try {
        const response = await fetch("https://api.heygen.com/v1/streaming.create_token", {
          method: "POST",
          headers: { "x-api-key": HEYGEN_API_KEY }
        });
        
        if (!response.ok) {
          throw new Error("Failed to get HeyGen token");
        }
        
        const { data } = await response.json();
        
        const avatar = new StreamingAvatar({ token: data.token });
        avatarRef.current = avatar;
        
        avatar.on(StreamingEvents.STREAM_READY, (event) => {
          if (videoRef.current && event.detail) {
            videoRef.current.srcObject = event.detail;
            videoRef.current.play().catch(console.error);
          }
        });
        
        avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
           setCallStatus("idle");
           onClose();
        });
        
        await avatar.createStartAvatar({
          quality: AvatarQuality.Low,
          avatarName: "josh_lite3_20230714",
          voice: {
             voiceId: "en-US-JennyNeural"
          }
        });
        
        if (!isMounted) return;
        setCallStatus("active");
        
        await avatar.speak({ text: "Hello! I am your HeyGen Interactive Avatar. How can I assist you today?" });
        
      } catch (e: any) {
         console.error("HeyGen init error", e);
         toast.error(e.message || "Failed to start HeyGen avatar");
         setCallStatus("error");
      }
    };
    
    if (isOpen && callStatus === "idle") {
       startAvatar();
    }
    
    return () => {
       isMounted = false;
       if (avatarRef.current) {
          avatarRef.current.stopAvatar().catch(console.error);
          avatarRef.current = null;
       }
    };
  }, [isOpen]);

  const handleEndCall = () => {
    if (avatarRef.current) {
      avatarRef.current.stopAvatar();
      avatarRef.current = null;
    }
    setCallStatus("idle");
    onClose();
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

        <button
          onClick={handleEndCall}
          className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center bg-slate-900/50 hover:bg-slate-900/80 text-white rounded-full backdrop-blur transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1">
           <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-2 text-white">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Live: HeyGen Avatar
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
