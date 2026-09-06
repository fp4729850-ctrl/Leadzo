import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as htmlToImage from "html-to-image";
import Vapi from "@vapi-ai/web";
import { Mic, Loader2, Square, PhoneOff, Send, X, Bot } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || "30cfacb0-68ad-49ec-82e5-3b0637432f0b";

type CallStatus = "idle" | "loading" | "active" | "error";
type Message = { role: "user" | "assistant" | "system", text: string };

export function VapiVoiceAgent() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  
  const vapiRef = useRef<Vapi | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

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
      let errorMsg = e?.message;
      if (!errorMsg) {
        try { errorMsg = JSON.stringify(e); } catch(err) {}
      }
      toast.error("Vapi Connection Error: " + (errorMsg || "Unknown error"));
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    };

    const onMessage = (message: any) => {
      // Handle tool calls
      if (message.type === "tool-calls") {
        message.toolCallList.forEach(async (toolCall: any) => {
          const functionName = toolCall.function.name;
          const args = toolCall.function.arguments;
          
          if (functionName === "navigate_to_page") {
            navigate(args.path);
            setMessages(prev => [...prev, { role: "system", text: `Navigated to ${args.path}` }]);
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
          else if (functionName === "analyze_current_screen") {
            toast.loading("Taking a look at your screen...", { id: "screenshot-toast" });
            try {
              const dataUrl = await htmlToImage.toJpeg(document.body, { 
                quality: 0.4,
                canvasWidth: Math.floor(document.body.clientWidth * 0.5),
                canvasHeight: Math.floor(document.body.clientHeight * 0.5),
                filter: (node: any) => !node.classList?.contains('vapi-widget-container') // Ignore the voice widget itself
              });
              const base64Image = dataUrl.split(",")[1];
              
              const { data, error } = await supabase.functions.invoke("vapi_analyze_screen", {
                body: { image_base64: base64Image },
              });

              if (error) throw error;

              vapiRef.current?.send({
                type: "add-message",
                message: {
                  role: "system",
                  content: `Screen Analysis Result: ${data.description}`
                }
              });
              toast.success("Screen analyzed!", { id: "screenshot-toast" });
            } catch (err: any) {
              console.error("Screenshot error:", err);
              toast.error(`Failed to analyze: ${err.message || err}`, { id: "screenshot-toast", duration: 10000 });
            }
          }
          else if (functionName === "setup_business_profile") {
            toast.loading(`Setting up Leadzo for ${args.website_url}...`, { id: "setup-toast", duration: 15000 });
            setMessages(prev => [...prev, { role: "system", text: `⏳ Autonomous action: Setting up business from ${args.website_url}...` }]);
            try {
              // 1. Scrape website
              const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke("ai_scrape_website", {
                body: { url: args.website_url }
              });
              
              if (scrapeError) throw scrapeError;

              // 2. Save to database
              const companyName = args.company_name || new URL(args.website_url).hostname;
              const { error: dbError } = await supabase
                .from("business_knowledge")
                .upsert({
                  id: "default-business",
                  company_name: companyName,
                  website_url: args.website_url,
                  business_details: scrapeData.prompt,
                  is_active: true
                });

              if (dbError) throw dbError;

              toast.success("Leadzo Setup Complete!", { id: "setup-toast" });
              setMessages(prev => [...prev, { role: "system", text: `✅ Successfully set up Leadzo for ${args.website_url}. The AI is now trained on this data.` }]);
              
              vapiRef.current?.send({
                type: "add-message",
                message: { role: "system", content: `I have successfully set up the Leadzo account for ${args.website_url}. The business details have been scraped and saved.` }
              });
            } catch (err: any) {
               console.error("Setup error:", err);
               toast.error(`Setup failed: ${err.message}`, { id: "setup-toast" });
               setMessages(prev => [...prev, { role: "system", text: `❌ Setup failed: ${err.message}` }]);
               
               vapiRef.current?.send({
                type: "add-message",
                message: { role: "system", content: `Setup failed with error: ${err.message}` }
               });
            }
          }
        });
      }

      // Handle transcripts for chat UI
      if (message.type === "transcript" && message.transcriptType === "final") {
        setMessages(prev => [...prev, { role: message.role, text: message.transcript }]);
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

  const initVapiSession = async (initialMessage?: string) => {
    if (status === "active" || status === "loading") return;
    
    try {
      setStatus("loading");
      
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
If the user wants to do something on a different page, use navigate_to_page tool. If you want to show them where to click or type on the current page, use highlight_element tool.
If the user asks you to look at their screen or asks what is on the screen, use the analyze_current_screen tool.
If the user asks you to set up Leadzo for their website, use the setup_business_profile tool and provide the website_url.`;
        firstMessage = `Namaste! I am the Voice Assistant for ${activeBrain.company_name}. How can I assist you today?`;
      }

      if (messages.length === 0) {
        setMessages([{ role: "assistant", text: firstMessage }]);
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
                description: "Navigate the user to a specific page path.",
                parameters: {
                  type: "object",
                  properties: { path: { type: "string", description: "The path to navigate to" } },
                  required: ["path"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "highlight_element",
                description: "Highlight a UI element.",
                parameters: {
                  type: "object",
                  properties: { 
                    selector: { type: "string", description: "CSS selector of the element" }, 
                    message: { type: "string", description: "Message to show" } 
                  },
                  required: ["selector", "message"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "analyze_current_screen",
                description: "Take a screenshot of the user's screen.",
                parameters: { type: "object", properties: {} }
              }
            },
            {
              type: "function",
              function: {
                name: "setup_business_profile",
                description: "Autonomously set up the Leadzo account by scraping a website and configuring the AI Brain. Use this when the user gives you a website link to set up.",
                parameters: {
                  type: "object",
                  properties: { 
                    website_url: { type: "string", description: "The full URL of the website to scrape, e.g. https://example.com" },
                    company_name: { type: "string", description: "Optional name of the company if known" }
                  },
                  required: ["website_url"]
                }
              }
            }
          ]
        }
      };

      await vapiRef.current?.start(VAPI_ASSISTANT_ID, assistantOverrides as any);
      
      if (initialMessage) {
        vapiRef.current?.send({
          type: "add-message",
          message: { role: "user", content: initialMessage }
        });
      }
      
    } catch (e: any) {
      console.error("Error starting Vapi global call:", e);
      toast.error(e.message || "Failed to start AI Voice Agent.");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const handleToggleCall = () => {
    if (status === "active" || status === "loading") {
      vapiRef.current?.stop();
      setStatus("idle");
    } else {
      initVapiSession();
    }
  };

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    
    const text = inputText.trim();
    setInputText("");
    
    // Add locally for instant feedback
    setMessages(prev => [...prev, { role: "user", text }]);

    if (status !== "active") {
      // Start session with text if not active
      await initVapiSession(text);
    } else {
      vapiRef.current?.send({
        type: "add-message",
        message: { role: "user", content: text }
      });
    }
  };

  // UI calculations
  const scale = status === "active" ? 1 + (volumeLevel > 0.1 ? volumeLevel * 0.5 : 0) : 1;

  return (
    <div className="vapi-widget-container fixed bottom-6 right-6 z-[9999] flex flex-col items-end group font-sans">
      
      {isOpen && (
        <div className="mb-4 w-[340px] sm:w-[400px] h-[550px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <div className="p-4 bg-indigo-500/10 border-b border-white/5 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className={cn("absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 transition-colors", status === 'active' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-slate-400')} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 text-sm tracking-wide">Leadzo AI Copilot</h3>
                <p className="text-[11px] text-indigo-300">{status === 'active' ? 'Listening to voice...' : status === 'loading' ? 'Connecting...' : 'Online'}</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          
          {/* Chat Transcript */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
             {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-60 space-y-3">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border border-white/5">
                    <Bot className="w-8 h-8 text-indigo-400" />
                  </div>
                  <p className="text-sm text-slate-300">How can I help you setup Leadzo?</p>
                </div>
             )}
             {messages.map((m, i) => (
                <div key={i} className={cn("flex flex-col max-w-[85%]", m.role === 'user' ? "self-end items-end" : "self-start items-start")}>
                  {m.role === 'system' ? (
                     <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold my-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                       {m.text}
                     </div>
                  ) : (
                     <div className={cn("px-4 py-2.5 text-[13px] leading-relaxed rounded-2xl shadow-sm", 
                        m.role === 'user' 
                          ? "bg-indigo-600 text-white rounded-tr-sm" 
                          : "bg-slate-800 text-slate-200 rounded-tl-sm border border-white/5"
                     )}>
                       {m.text}
                     </div>
                  )}
                </div>
             ))}
             {status === "loading" && (
               <div className="flex items-center gap-2 text-xs text-indigo-400 animate-pulse bg-indigo-500/10 self-start px-3 py-1.5 rounded-full border border-indigo-500/20">
                 <Loader2 className="w-3 h-3 animate-spin"/> AI is thinking...
               </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-slate-900/80 backdrop-blur-md border-t border-white/5 flex gap-2 items-center shrink-0">
             <button
               onClick={handleToggleCall}
               className={cn(
                 "p-3 rounded-full transition-all shrink-0 relative overflow-hidden group/mic shadow-md",
                 status === "idle" ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5" :
                 status === "loading" ? "bg-slate-800 text-slate-500 border border-white/5" :
                 status === "active" ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30" :
                 "bg-red-900 text-white"
               )}
               title={status === 'active' ? "End Voice Call" : "Start Voice Call"}
             >
               {status === "active" && (
                 <div className="absolute inset-0 bg-red-500/20 rounded-full transition-all" style={{ transform: `scale(${scale})`, opacity: isSpeaking ? 1 : 0.4 }} />
               )}
               {status === "idle" && <Mic className="w-5 h-5 relative z-10 group-hover/mic:text-white transition-colors" />}
               {status === "loading" && <Loader2 className="w-5 h-5 animate-spin relative z-10" />}
               {status === "active" && <Square className="w-5 h-5 fill-current relative z-10" />}
             </button>
             
             <input 
               type="text" 
               className="flex-1 bg-slate-800 border border-white/10 rounded-full px-4 py-3 text-[13px] text-slate-100 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/70 placeholder:text-slate-500 shadow-inner transition-all" 
               placeholder="Type a message..." 
               value={inputText}
               onChange={e => setInputText(e.target.value)}
               onKeyDown={e => {
                 if (e.key === 'Enter') handleSendText();
               }}
             />
             
             <button 
               onClick={handleSendText} 
               disabled={!inputText.trim()}
               className="p-3 bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed rounded-full text-white hover:bg-indigo-500 transition-all shrink-0 shadow-md"
             >
                <Send className="w-4 h-4 ml-0.5" />
             </button>
          </div>
        </div>
      )}

      {/* Floating Button Toggle */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:scale-105 shadow-[0_10px_25px_-5px_rgba(79,70,229,0.5)] flex items-center justify-center transition-all duration-300 z-10 border border-white/10"
        >
          <Bot className="w-7 h-7 text-white drop-shadow-md" />
          
          <div className="absolute right-full mr-4 bg-slate-900/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl shadow-xl text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden md:flex items-center text-slate-200">
            Open AI Copilot
            <div className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900/90 border-t border-r border-white/10 rotate-45" />
          </div>
        </button>
      )}
    </div>
  );
}
