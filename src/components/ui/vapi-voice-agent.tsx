import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as htmlToImage from "html-to-image";
import { Mic, Loader2, Square, Send, X, Bot } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// OmniRouter endpoint (Local)
const OMNIROUTE_URL = import.meta.env.VITE_OMNIROUTE_URL || "http://localhost:20128/v1";

type CallStatus = "idle" | "loading" | "active" | "error";
type Message = { role: "user" | "assistant" | "system" | "tool", content: string, name?: string, tool_call_id?: string };

export function VapiVoiceAgent() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSystemReady, setIsSystemReady] = useState(false);
  
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Init Speech Recognition API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => setStatus("active");
        
        recognitionRef.current.onend = () => {
          // If we were just active and stopped, go back to idle unless we are loading the AI response
          setStatus(prev => prev === "active" ? "idle" : prev);
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech Recognition Error:", event.error);
          if (event.error !== 'no-speech') {
            toast.error("Microphone error: " + event.error);
          }
          setStatus("idle");
        };

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          handleSendText(transcript);
        };
      } else {
        console.warn("SpeechRecognition not supported in this browser.");
      }
    }
  }, []);

  const initSystemPrompt = async () => {
    try {
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
        systemPrompt += `\n\nIMPORTANT: You are a highly capable multilingual visual copilot. You MUST strictly reply in the exact same language that the user speaks to you.
You can control the user's screen using tools. You are currently on the page: ${currentPath}. 
If the user wants to do something on a different page, use navigate_to_page tool. If you want to show them where to click or type on the current page, use highlight_element tool.
If the user asks you to look at their screen or asks what is on the screen, use the analyze_current_screen tool.
If the user asks you to set up Leadzo for their website, use the setup_business_profile tool and provide the website_url.`;
        firstMessage = `Namaste! I am the Voice Assistant for ${activeBrain.company_name}. How can I assist you today?`;
      }

      const initialMsgs: Message[] = [
        { role: "system", content: systemPrompt },
        { role: "assistant", content: firstMessage }
      ];
      
      setMessages(initialMsgs);
      setIsSystemReady(true);
      return initialMsgs;
    } catch (e) {
      console.error("Error initializing system prompt", e);
      return [];
    }
  };

  const getToolsDef = () => [
    {
      type: "function",
      function: {
        name: "navigate_to_page",
        description: "Navigate the user to a specific page path.",
        parameters: { type: "object", properties: { path: { type: "string", description: "The path to navigate to" } }, required: ["path"] }
      }
    },
    {
      type: "function",
      function: {
        name: "highlight_element",
        description: "Highlight a UI element.",
        parameters: { type: "object", properties: { selector: { type: "string", description: "CSS selector of the element" }, message: { type: "string", description: "Message to show" } }, required: ["selector", "message"] }
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
  ];

  const handleToolCalls = async (toolCalls: any[], currentMsgs: Message[]): Promise<Message[]> => {
    const newMsgs = [...currentMsgs];
    
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments || "{}");
      let toolResult = "";

      if (functionName === "navigate_to_page") {
        navigate(args.path);
        toolResult = `Navigated to ${args.path}`;
      }
      else if (functionName === "highlight_element") {
        const target = document.querySelector(args.selector);
        if (target) {
          target.classList.add("ring-4", "ring-primary", "ring-offset-2", "animate-pulse", "shadow-[0_0_25px_rgba(255,100,100,0.8)]");
          toast(args.message, { icon: "💡", duration: 8000 });
          setTimeout(() => {
            target.classList.remove("ring-4", "ring-primary", "ring-offset-2", "animate-pulse", "shadow-[0_0_25px_rgba(255,100,100,0.8)]");
          }, 8000);
          toolResult = `Element highlighted successfully with message: ${args.message}`;
        } else {
          toolResult = `Element ${args.selector} not found on the page.`;
        }
      }
      else if (functionName === "analyze_current_screen") {
        toast.loading("Taking a look at your screen...", { id: "screenshot-toast" });
        try {
          const dataUrl = await htmlToImage.toJpeg(document.body, { 
            quality: 0.4,
            canvasWidth: Math.floor(document.body.clientWidth * 0.5),
            canvasHeight: Math.floor(document.body.clientHeight * 0.5),
            filter: (node: any) => !node.classList?.contains('vapi-widget-container')
          });
          const base64Image = dataUrl.split(",")[1];
          
          const { data, error } = await supabase.functions.invoke("vapi_analyze_screen", {
            body: { image_base64: base64Image },
          });

          if (error) throw error;
          toast.success("Screen analyzed!", { id: "screenshot-toast" });
          toolResult = `Screen Analysis Result: ${data.description}`;
        } catch (err: any) {
          toast.error(`Failed to analyze: ${err.message || err}`, { id: "screenshot-toast" });
          toolResult = `Failed to capture screen: ${err.message}`;
        }
      }
      else if (functionName === "setup_business_profile") {
        toast.loading(`Setting up Leadzo for ${args.website_url}...`, { id: "setup-toast", duration: 15000 });
        try {
          const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke("ai_scrape_website", {
            body: { url: args.website_url }
          });
          if (scrapeError) throw scrapeError;

          const companyName = args.company_name || new URL(args.website_url).hostname;
          const { error: dbError } = await supabase.from("business_knowledge").upsert({
            id: "default-business",
            company_name: companyName,
            website_url: args.website_url,
            business_details: scrapeData.prompt,
            is_active: true
          });

          if (dbError) throw dbError;
          toast.success("Leadzo Setup Complete!", { id: "setup-toast" });
          toolResult = `Successfully set up Leadzo for ${args.website_url}. The AI is now trained on this data.`;
        } catch (err: any) {
           toast.error(`Setup failed: ${err.message}`, { id: "setup-toast" });
           toolResult = `Setup failed with error: ${err.message}`;
        }
      }

      newMsgs.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: functionName,
        content: toolResult
      });
    }

    setMessages(newMsgs);
    return newMsgs;
  };

  const fetchOmniRouter = async (currentMsgs: Message[]) => {
    setStatus("loading");
    try {
      const response = await fetch(`${OMNIROUTE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Dummy token for OmniRouter if required, though it might bypass if local
          "Authorization": `Bearer omni_dummy_key`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // Change as per OmniRouter setup
          messages: currentMsgs,
          tools: getToolsDef(),
          tool_choice: "auto"
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const choice = data.choices[0].message;

      // Add assistant response to messages
      const updatedMsgs = [...currentMsgs, choice];
      setMessages(updatedMsgs);

      if (choice.tool_calls && choice.tool_calls.length > 0) {
        // Handle tools
        const msgsAfterTools = await handleToolCalls(choice.tool_calls, updatedMsgs);
        // Call LLM again with tool results
        await fetchOmniRouter(msgsAfterTools);
      } else if (choice.content) {
        // Speak the content
        speakText(choice.content);
        setStatus("idle");
      } else {
        setStatus("idle");
      }

    } catch (e: any) {
      console.error("OmniRouter Error:", e);
      toast.error("OmniRouter Connection Error: " + (e?.message || "Unknown error"));
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const speakText = async (text: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    setStatus("active");
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/omnirouter_tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ text, voice: 'alloy' })
      });

      if (!response.ok) {
        throw new Error(`TTS API failed with status ${response.status}`);
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setStatus("idle");
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.play();
    } catch (err: any) {
      console.error("TTS Error:", err);
      toast.error("Failed to generate voice: " + (err.message || "Unknown error"));
      setStatus("idle");
    }
  };

  const handleToggleMic = async () => {
    if (status === "active" || status === "loading") {
      // Stop listening/speaking
      if (recognitionRef.current) recognitionRef.current.stop();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setStatus("idle");
    } else {
      let currentMsgs = messagesRef.current;
      if (currentMsgs.length === 0) {
        currentMsgs = await initSystemPrompt();
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch(e) {
          console.error(e);
        }
      } else {
        toast.error("Voice recognition not supported.");
      }
    }
  };

  const handleSendText = async (textInput?: string) => {
    const text = typeof textInput === "string" ? textInput : inputText.trim();
    if (!text) return;
    
    if (typeof textInput !== "string") {
      setInputText("");
    }
    
    let currentMsgs = messagesRef.current;
    if (currentMsgs.length === 0) {
      currentMsgs = await initSystemPrompt();
    }
    
    const newMsgs = [...currentMsgs, { role: "user", content: text } as Message];
    setMessages(newMsgs);
    
    await fetchOmniRouter(newMsgs);
  };

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
                <h3 className="font-semibold text-slate-100 text-sm tracking-wide">Leadzo Omni Copilot</h3>
                <p className="text-[11px] text-indigo-300">{status === 'active' ? 'Mic Active / Speaking...' : status === 'loading' ? 'Thinking...' : 'Online (Local AI)'}</p>
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
                  <p className="text-sm text-slate-300 text-center px-4">Hello! I am your completely free Local AI assistant powered by OmniRouter.</p>
                </div>
             )}
             {messages.filter(m => m.role !== 'system' && m.role !== 'tool').map((m, i) => (
                <div key={i} className={cn("flex flex-col max-w-[85%]", m.role === 'user' ? "self-end items-end" : "self-start items-start")}>
                  <div className={cn("px-4 py-2.5 text-[13px] leading-relaxed rounded-2xl shadow-sm", 
                    m.role === 'user' 
                      ? "bg-indigo-600 text-white rounded-tr-sm" 
                      : "bg-slate-800 text-slate-200 rounded-tl-sm border border-white/5"
                  )}>
                    {m.content}
                  </div>
                </div>
             ))}
             {messages.filter(m => m.role === 'tool').map((m, i) => (
                <div key={`tool-${i}`} className="flex flex-col max-w-[85%] self-start items-start">
                   <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold my-1 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                     🔧 {m.name}: {m.content.substring(0, 50)}{m.content.length > 50 ? '...' : ''}
                   </div>
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
               onClick={handleToggleMic}
               className={cn(
                 "p-3 rounded-full transition-all shrink-0 relative overflow-hidden group/mic shadow-md",
                 status === "idle" ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5" :
                 status === "loading" ? "bg-slate-800 text-slate-500 border border-white/5" :
                 status === "active" ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30" :
                 "bg-red-900 text-white"
               )}
               title={status === 'active' ? "Stop Voice" : "Start Voice"}
             >
               {status === "active" && (
                 <div className="absolute inset-0 bg-red-500/20 rounded-full transition-all animate-pulse" />
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
               onClick={() => handleSendText()} 
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
          onClick={() => {
            setIsOpen(true);
            if (!isSystemReady) initSystemPrompt();
          }}
          className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:scale-105 shadow-[0_10px_25px_-5px_rgba(79,70,229,0.5)] flex items-center justify-center transition-all duration-300 z-10 border border-white/10"
        >
          <Bot className="w-7 h-7 text-white drop-shadow-md" />
          
          <div className="absolute right-full mr-4 bg-slate-900/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl shadow-xl text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden md:flex items-center text-slate-200">
            Open Omni Copilot
            <div className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900/90 border-t border-r border-white/10 rotate-45" />
          </div>
        </button>
      )}
    </div>
  );
}
