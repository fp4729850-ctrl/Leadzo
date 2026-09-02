import { useState, useEffect } from "react";
import Vapi from "@vapi-ai/web";
import { Mic, PhoneOff, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Provide dummy keys for now. The user will need to update these in .env later.
const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || "dummy-public-key"; 
const ASSISTANT_ID = import.meta.env.VITE_VAPI_MANAGER_ASSISTANT_ID || "dummy-assistant-id";

// Initialize Vapi instance
const vapi = new Vapi(VAPI_PUBLIC_KEY);

interface ManagerCallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManagerCallModal({ isOpen, onClose }: ManagerCallModalProps) {
  const [callStatus, setCallStatus] = useState<"idle" | "loading" | "active" | "error">("idle");
  const [volumeLevel, setVolumeLevel] = useState(0);

  useEffect(() => {
    // Vapi Event Listeners
    const onCallStart = () => setCallStatus("active");
    const onCallEnd = () => {
      setCallStatus("idle");
      onClose(); // auto close when call ends
    };
    const onVolumeLevel = (volume: number) => setVolumeLevel(volume);
    const onError = (e: any) => {
      console.error("Vapi error", e);
      setCallStatus("error");
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("volume-level", onVolumeLevel);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("volume-level", onVolumeLevel);
      vapi.off("error", onError);
    };
  }, [onClose]);

  // Start call when modal opens
  useEffect(() => {
    if (isOpen && callStatus === "idle") {
      setCallStatus("loading");
      // Use an inline assistant configuration
      vapi.start(ASSISTANT_ID, {
        firstMessage: "Hello Boss! I have the latest updates from the marketing team and data analysis. What would you like to discuss?",
        model: {
          provider: "openai",
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content: "You are the manager of Leadzo AI. You are taking a call from your boss (the user). You must discuss company data analysis, marketing metrics, and whatever the marketing team has reported. Always respond professionally and wait for the boss to ask before giving detailed reports."
            }
          ]
        }
      }).catch((e) => {
        console.error("Failed to start vapi", e);
        setCallStatus("error");
      });
    } else if (!isOpen && callStatus === "active") {
      // User closed modal, stop call
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
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Manager Call
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Speaking via Vapi AI. Make sure your microphone is allowed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative flex items-center justify-center mb-6 w-32 h-32">
            {/* Visualizer Circle */}
            <div 
              className="absolute inset-0 bg-blue-500/20 rounded-full transition-all duration-75"
              style={{ transform: `scale(${1 + volumeLevel * 1.5})` }}
            />
            <div className="z-10 w-24 h-24 bg-slate-800 rounded-full border-4 border-blue-500/50 flex items-center justify-center shadow-lg">
              {callStatus === "loading" ? (
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              ) : callStatus === "active" ? (
                <Mic className="w-8 h-8 text-emerald-400 animate-pulse" />
              ) : (
                <Mic className="w-8 h-8 text-slate-500" />
              )}
            </div>
          </div>

          <p className="text-sm font-medium text-slate-300">
            {callStatus === "loading" && "Connecting to Vapi..."}
            {callStatus === "active" && "Connected. Speak now!"}
            {callStatus === "error" && "Error connecting to Vapi. Check Keys."}
          </p>
        </div>

        <div className="flex justify-center mt-2">
          <button
            onClick={handleEndCall}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-500 hover:bg-red-600 rounded-full font-semibold transition-all"
          >
            <PhoneOff size={18} />
            End Call
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
