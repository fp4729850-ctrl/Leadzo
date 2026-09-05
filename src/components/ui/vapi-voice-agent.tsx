import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Vapi from "@vapi-ai/web";
import { Mic, Loader2, Square, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || "30cfacb0-68ad-49ec-82e5-3b0637432f0b";

type CallStatus = "idle" | "loading" | "active" | "error";

export function VapiVoiceAgent() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const vapiRef = useRef<Vapi | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  useEffect(() => {
    vapiRef.current = new Vapi(VAPI_PUBLIC_KEY);

    const vapi = vapiRef.current;
    
    const onCallStart = () => setStatus("active");
    const onCallEnd = () => {
      setStatus("idle");
      setIsSpeaking(false);
      setVolumeLevel(0);
    };
    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);
    const onVolumeLevel = (volume: number) => setVolumeLevel(volume);
    const onError = (e: any) => {
      console.error("Vapi Error:", e);
      toast.error("Vapi Connection Error: " + (e?.message || "Unknown error"));
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    };

    const onMessage = (message: any) => {
      if (message.type === "tool-calls") {
        message.toolCallList.forEach(async (toolCall: any) => {
          const functionName = toolCall.function.name;
          const args = toolCall.function.arguments;
          
          if (functionName === "navigate_to_page") {
            navigate(args.path);
            toast.success(`Navigating to ${args.path}`);
          }
          else if (functionName === "highlight_element") {
            const target = document.querySelector(args.selector);
            if (target) {
              target.classList.add("ring-4", "ring-primary", "ring-offset-2", "animate-pulse", "shadow-[0_0_25px_rgba(255,100,100,0.8)]");
              toast(args.message, { icon: "💡", duration: 8000 });
              setTimeout(() => {
                target.classList.remove("ring-4", "ring-primary", "ring-offset-2", "animate-pulse", "shadow-[0_0_25px_rgba(255,100,100,0.8)]");
              }, 8000);
            } else {
              toast.info(args.message);
            }
          }
        });
      }
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("volume-level", onVolumeLevel);
    vapi.on("error", onError);
    vapi.on("message", onMessage);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("volume-level", onVolumeLevel);
      vapi.off("error", onError);
      vapi.off("message", onMessage);
      vapi.stop();
    };
  }, [navigate]);

  const handleToggleCall = async () => {
    if (status === "active" || status === "loading") {
      vapiRef.current?.stop();
      setStatus("idle");
      return;
    }

    try {
      setStatus("loading");
      
      // Fetch AI Brain
      const { data: activeBrain } = await supabase
        .from("business_knowledge")
        .select("company_name, business_details, system_prompt")
        .eq("is_active", true)
        .single();

      let systemPrompt = "You are a helpful assistant.";
      let firstMessage = "Hello! How can I help you today?";
      
      if (activeBrain) {
        systemPrompt = `You are a helpful Voice AI Agent for ${activeBrain.company_name}. You must keep your answers extremely concise and conversational. Do not use long paragraphs. Your knowledge base:\n${activeBrain.business_details}`;
        if (activeBrain.system_prompt) {
          systemPrompt += `\nAdditional Instructions:\n${activeBrain.system_prompt}`;
        }
        systemPrompt += `\n\nIMPORTANT: You are a highly capable multilingual visual copilot. You MUST strictly reply in the exact same language that the user speaks to you (e.g., if the user speaks Hindi, reply in Hindi).
You can control the user's screen using tools. You are currently on the page: ${currentPath}. 
If the user wants to do something on a different page, use navigate_to_page tool. If you want to show them where to click or type on the current page, use highlight_element tool with a standard css selector (like button, input, or specific classes/ids if you know them) and an explanation message.`;
        firstMessage = `Namaste! I am the Voice Assistant for ${activeBrain.company_name}. How can I assist you today?`;
      }

      const VAPI_ASSISTANT_ID = import.meta.env.VITE_VAPI_MANAGER_ASSISTANT_ID || "c72d5615-bd69-4776-bd5d-d3ded56e1687";

      const assistantOverrides = {
        name: "Leadzo Global Agent",
        firstMessage: firstMessage,
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt
            }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "navigate_to_page",
                description: "Navigate the user to a specific page path in the application.",
                parameters: {
                  type: "object",
                  properties: {
                    path: {
                      type: "string",
                      description: "The path to navigate to, e.g., /whatsapp, /seo, /crm, /dashboard"
                    }
                  },
                  required: ["path"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "highlight_element",
                description: "Highlight a specific UI element on the screen to guide the user.",
                parameters: {
                  type: "object",
                  properties: {
                    selector: {
                      type: "string",
                      description: "CSS selector for the element to highlight, e.g., 'input', 'button', '.bg-primary', '#submit'"
                    },
                    message: {
                      type: "string",
                      description: "Short message to display to the user explaining what to do with the highlighted element"
                    }
                  },
                  required: ["selector", "message"]
                }
              }
            }
          ]
        }
      };

      await vapiRef.current?.start(VAPI_ASSISTANT_ID, assistantOverrides as any);
      
    } catch (e: any) {
      console.error("Error starting Vapi global call:", e);
      toast.error(e.message || "Failed to start AI Voice Agent.");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  // UI calculations
  const scale = status === "active" ? 1 + (volumeLevel > 0.1 ? volumeLevel * 0.5 : 0) : 1;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center justify-center group">
      {status === "active" && (
        <div 
          className={cn(
            "absolute w-16 h-16 rounded-full bg-primary/30 transition-transform duration-75",
            isSpeaking ? "bg-blue-500/40" : "bg-primary/30"
          )}
          style={{ transform: `scale(${scale})` }}
        />
      )}
      
      <button
        onClick={handleToggleCall}
        disabled={status === "error"}
        className={cn(
          "relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 z-10 border border-primary/20",
          status === "idle" && "bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105",
          status === "loading" && "bg-muted text-muted-foreground",
          status === "active" && "bg-red-500 hover:bg-red-600 text-white hover:scale-95 border-red-500",
          status === "error" && "bg-red-900 text-white"
        )}
      >
        {status === "idle" && <Mic className="w-6 h-6" />}
        {status === "loading" && <Loader2 className="w-6 h-6 animate-spin" />}
        {status === "active" && <Square className="w-5 h-5 fill-current" />}
        {status === "error" && <PhoneOff className="w-6 h-6" />}
      </button>

      {/* Tooltip */}
      {status === "idle" && (
        <div className="absolute right-full mr-4 bg-background border border-border px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden md:flex items-center">
          Talk to AI Brain
          <div className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-2 h-2 bg-background border-t border-r border-border rotate-45" />
        </div>
      )}
    </div>
  );
}
