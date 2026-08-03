import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import { Phone, Upload, Loader2, Sparkles, Copy, Check, CheckCircle2, XCircle, AlertCircle, Settings, Play, Square, RefreshCw, Zap, PhoneCall, PhoneOff, Volume2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { supabase } from "@/lib/supabase.ts";

type CallStatus = "pending" | "calling" | "connected" | "failed";
interface CallResult { number: string; status: CallStatus; callSid?: string; error?: string; }

function SetupPanel({ onTest, url, setUrl, scanWebsite, scanning, language, setLanguage, myNumber }: { onTest: () => void; url: string; setUrl: (u: string) => void; scanWebsite: () => void; scanning: boolean; language: string; setLanguage: (l: string) => void; myNumber: string | null }) {
  const [buying, setBuying] = useState(false);

  const handleBuyNumber = async () => {
    setBuying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in first");
      
      const res = await fetch("https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/provisionPhoneNumber", {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      toast.success(data.message);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      toast.error(e.message || "Failed to buy number");
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Settings size={16} className="text-blue-400 mt-0.5 shrink-0" />
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">AI Brain Setup (Vapi.ai)</p>
              <Badge className="text-[9px] bg-blue-500/20 text-blue-400 border-blue-500/30">Ultra-Low Latency</Badge>
              {myNumber ? (
                <Badge variant="outline" className="text-[9px] ml-2">My Caller ID: {myNumber}</Badge>
              ) : (
                <div className="flex items-center gap-2 ml-2">
                  <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2 border-primary/30 hover:bg-primary/10" onClick={handleBuyNumber} disabled={buying}>
                    {buying ? <Loader2 size={10} className="animate-spin" /> : <PhoneCall size={10} />}
                    Get US Number (Instant)
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50" onClick={() => toast.info("Local numbers (India/UAE) require KYC verification by TRAI/Telecom authorities. Please email your Business Registration and Address Proof to support@leadzo.com to apply.", { duration: 8000 })}>
                    Request Local Number
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-3 items-center">
              <a href="https://vapi.ai" target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline font-semibold">→ vapi.ai</a>
              <button onClick={onTest} className="text-[11px] text-blue-400 hover:underline font-semibold cursor-pointer">→ Test call karo</button>
            </div>
          </div>
          
          <div className="rounded-lg bg-background border border-border p-3 space-y-3">
            <div className="space-y-1.5">
               <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Business Website URL</Label>
               <div className="flex gap-2">
                 <Input placeholder="https://example.com" className="h-8 text-xs bg-muted/30 font-mono flex-1" value={url} onChange={e => setUrl(e.target.value)} />
                 <Select value={language} onValueChange={setLanguage}>
                   <SelectTrigger className="h-8 text-xs w-[110px] bg-muted/30"><SelectValue /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="English">English</SelectItem>
                     <SelectItem value="Hindi">Hindi</SelectItem>
                     <SelectItem value="Hinglish">Hinglish</SelectItem>
                   </SelectContent>
                 </Select>
                 <Button size="sm" className="h-8 text-xs gap-1.5 whitespace-nowrap" onClick={scanWebsite} disabled={scanning}>
                   {scanning ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                   Scan & Learn
                 </Button>
               </div>
               <p className="text-[9px] text-muted-foreground mt-1">AI iss website ko padh kar apna system prompt (dimaag) khud bana lega.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceClonePanel() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceId, setVoiceId] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) { toast.error("Please select an audio file first"); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in first");
      
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("name", name || "My Custom Voice");

      const res = await fetch("https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/voicebox_cloneVoice", {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.access_token}` },
        body: formData
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      setVoiceId(data.voice_id);
      toast.success(data.message);
    } catch (e: any) {
      toast.error(e.message || "Failed to clone voice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-primary" />
        <p className="text-sm font-semibold text-foreground">Voicebox: Clone Your Voice</p>
        <Badge className="text-[9px] bg-primary/20 text-primary border-primary/30 ml-auto">Self-Hosted</Badge>
      </div>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input type="text" placeholder="Voice Name (e.g. Rahul's Voice)" className="h-8 text-xs bg-background/50" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="flex gap-2 items-center">
          <Input type="file" accept="audio/*" className="h-8 text-xs bg-background/50 flex-1 pt-1.5" onChange={e => setFile(e.target.files?.[0] || null)} />
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleUpload} disabled={loading || !file}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Clone Voice
          </Button>
        </div>
        {voiceId && (
          <p className="text-xs text-green-500 font-medium">Cloned successfully! Voice ID: {voiceId}</p>
        )}
      </div>
    </div>
  );
}

function TestPanel({ onClose }: { onClose: () => void }) {
  const testCall = useAction(api.bulkCalling.testCall);
  const [testNum, setTestNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; callSid?: string; error?: string } | null>(null);

  const run = async () => {
    if (!testNum.trim()) { toast.error("Test number daalo"); return; }
    setLoading(true); setResult(null);
    try {
      const r = await testCall({ testNumber: testNum.trim() });
      setResult(r);
      if (r.success) toast.success("Test call shuru ho gayi!");
      else toast.error(r.error ?? "Failed");
    } catch (e) { setResult({ success: false, error: e instanceof Error ? e.message : "Error" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Test Call</p>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
      </div>
      <div className="flex gap-2">
        <Input placeholder="+919876543210" className="font-mono text-xs h-8 flex-1" value={testNum} onChange={(e) => setTestNum(e.target.value)} />
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={run} disabled={loading}>
          {loading ? <Loader2 size={11} className="animate-spin" /> : <PhoneCall size={11} />} Call
        </Button>
      </div>
      {result && (
        <div className={cn("flex items-start gap-2 text-xs p-2 rounded-lg", result.success ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400")}>
          {result.success ? <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> : <XCircle size={12} className="mt-0.5 shrink-0" />}
          <span>{result.success ? `Call shuru! SID: ${result.callSid}` : result.error}</span>
        </div>
      )}
    </div>
  );
}

function AiScriptPanel({ onSelect }: { onSelect: (t: string) => void }) {
  const generate = useAction(api.campaignAi.generateTemplate);
  const [goal, setGoal] = useState("");
  const [language, setLanguage] = useState("hinglish");
  const [tone, setTone] = useState("friendly");
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const run = async () => {
    if (!goal.trim()) { toast.error("Goal likhna zaroori hai"); return; }
    setLoading(true); setScripts([]);
    try {
      const res = await generate({ type: "voice_call", prompt: goal, language, tone, count: 2 });
      setScripts(res);
    } catch { toast.error("Failed. Check HERCULES_API_KEY secret."); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <Textarea placeholder="Call ka goal likhao..." rows={2} className="text-xs resize-none" value={goal} onChange={(e) => setGoal(e.target.value)} />
      <div className="flex gap-2">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hinglish">Hinglish</SelectItem>
            <SelectItem value="hindi">Hindi</SelectItem>
            <SelectItem value="english">English</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tone} onValueChange={setTone}>
          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="friendly">Friendly</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={run} disabled={loading} size="sm" className="w-full gap-2 cursor-pointer">
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {loading ? "Generating..." : "Generate Call Script"}
      </Button>
      {scripts.map((s, i) => (
        <div key={i} onClick={() => onSelect(s)} className="relative rounded-lg border border-border bg-muted/40 p-3 cursor-pointer hover:border-primary/40 transition-colors group">
          <p className="text-xs leading-relaxed whitespace-pre-wrap pr-7">{s}</p>
          <button onClick={(e) => { e.stopPropagation(); void navigator.clipboard.writeText(s); setCopied(i); setTimeout(() => setCopied(null), 1500); toast.success("Copied!"); }} className="absolute top-2 right-2 p-1 rounded hover:bg-muted cursor-pointer text-muted-foreground">
            {copied === i ? <Check size={11} /> : <Copy size={11} />}
          </button>
        </div>
      ))}
    </div>
  );
}

function CallingProgressPanel({ results, calling, onStop, onClose }: { results: CallResult[]; calling: boolean; onStop: () => void; onClose: () => void }) {
  const connected = results.filter((r) => r.status === "connected").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const total = results.length;
  const done = results.filter((r) => r.status === "connected" || r.status === "failed").length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const isDone = !calling && done >= total;

  return (
    <div className="rounded-xl border border-blue-500/30 bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-blue-500/5 flex items-center gap-3">
        <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          {calling ? <Loader2 size={15} className="text-blue-400 animate-spin" /> : <Phone size={15} className="text-blue-400" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{calling ? "Calls ho rahi hain…" : "Campaign Complete"}</p>
          <p className="text-[11px] text-muted-foreground">{connected} connected · {failed} failed · {total - done} baaki</p>
        </div>
        {isDone ? (
          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={onClose}><RefreshCw size={11} className="mr-1" /> Nayi Campaign</Button>
        ) : (
          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 gap-1" onClick={onStop}><Square size={10} /> Stop</Button>
        )}
      </div>
      <div className="h-1.5 bg-muted/40">
        <motion.div className="h-full bg-blue-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-border/40">
        {results.map((r, i) => (
          <div key={i} className={cn("flex items-center gap-3 px-4 py-2 text-xs", r.status === "calling" && "bg-blue-500/5", r.status === "connected" && "opacity-60")}>
            <span className="font-mono flex-1 truncate">{r.number}</span>
            {r.status === "pending" && <span className="text-muted-foreground/40">—</span>}
            {r.status === "calling" && <span className="flex items-center gap-1.5 text-blue-400 font-semibold"><Loader2 size={10} className="animate-spin" /> Calling…</span>}
            {r.status === "connected" && <span className="flex items-center gap-1 text-blue-400"><CheckCircle2 size={10} /> Called ✓</span>}
            {r.status === "failed" && (
              <span className="flex items-center gap-1 text-red-400" title={r.error}>
                <PhoneOff size={10} /> Failed
                {r.error && <span className="ml-1 text-xs">{r.error}</span>}
              </span>
            )}
          </div>
        ))}
      </div>
      {isDone && (
        <div className="p-3 border-t border-border bg-muted/20 text-xs text-center space-y-1">
          {failed > 0 && <p className="text-amber-400 font-semibold"><AlertCircle size={10} className="inline mr-1" />{failed} calls failed</p>}
          <p className="text-blue-400 font-semibold">✓ {connected} calls successfully ki gayi!</p>
        </div>
      )}
    </div>
  );
}

export default function BulkCallingPage() {
  const campaigns = useQuery(api.campaigns.list, { type: "call" });
  const createCampaign = useMutation(api.campaigns.create);
  const makeBulkCalls = useAction(api.bulkCalling.makeBulkCalls);
  const previewVoice = useAction(api.bulkCalling.previewVoice);

  const [numbersRaw, setNumbersRaw] = useState("");
  const [script, setScript] = useState("");
  const [whatsappLink, setWhatsappLink] = useState("");
  const [waMediaUrl, setWaMediaUrl] = useState("");
  const [waMediaType, setWaMediaType] = useState("");
  const [mediaUploading, setMediaUploading] = useState(false);
  const [engine, setEngine] = useState<"vapi" | "voicebox" | "voicebox_clone">("voicebox");
  const [callingVoiceId, setCallingVoiceId] = useState<string>("cartesia_indian");
  const [ttsEngine, setTtsEngine] = useState<"elevenlabs" | "deepgram">("elevenlabs");
  const [showGenerator, setShowGenerator] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [calling, setCalling] = useState(false);
  const [results, setResults] = useState<CallResult[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopRef = useRef(false);
  const [myNumber, setMyNumber] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("user_phone_numbers").select("phone_number").eq("user_id", user.id).eq("status", "active").single().then(({ data }) => {
          if (data?.phone_number) setMyNumber(data.phone_number);
        });

        // Listen for new WhatsApp messages from Vapi AI tool
        const channel = supabase
          .channel('whatsapp_queue_listener')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_queue', filter: `user_id=eq.${user.id}` }, async (payload) => {
            const row = payload.new;
            if (row.status === 'pending') {
              try {
                // Step 1: Send text message / link
                const res = await fetch('http://localhost:3001/api/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: user.id,
                    numbers: [row.phone_number],
                    message: row.message
                  })
                });

                // Step 2: If campaign media exists, send image/video right after
                if (row.media_url) {
                  await fetch('http://localhost:3001/api/send-media', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: user.id,
                      numbers: [row.phone_number],
                      mediaUrl: row.media_url,
                      caption: ''
                    })
                  });
                }

                if (res.ok) {
                  await supabase.from('whatsapp_queue').update({ status: 'sent' }).eq('id', row.id);
                  toast.success(`WhatsApp ${row.media_url ? 'link + media' : 'link'} sent to ${row.phone_number}!`);
                } else {
                  await supabase.from('whatsapp_queue').update({ status: 'failed' }).eq('id', row.id);
                  toast.error(`Failed to send WhatsApp to ${row.phone_number}`);
                }
              } catch (e) {
                console.error("Local Green API error:", e);
                await supabase.from('whatsapp_queue').update({ status: 'failed' }).eq('id', row.id);
                toast.error(`Ensure Green API server is running on port 3001`);
              }
            }
          })
          .subscribe();
          
        return () => {
          supabase.removeChannel(channel);
        };
      }
    });
  }, []);

  const numbers = numbersRaw.split(/[\n,]+/).map((n) => n.trim()).filter((n) => n.length > 5);
  const isBusy = calling || (results.length > 0 && results.every((r) => r.status === "connected" || r.status === "failed"));
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const scanWebsiteAction = useAction(api.campaignAi.scanWebsiteForCampaign);

  const [scanLanguage, setScanLanguage] = useState("Hinglish");

  const handleScanWebsite = async () => {
    if (!url.trim() || !url.includes(".")) { toast.error("Sahi website URL daalo"); return; }
    setScanning(true);
    
    let persona = "";
    if (["shimmer", "nova", "alloy", "rachel", "sarah", "aria"].includes(callingVoiceId)) {
      const name = (scanLanguage === "Hindi" || scanLanguage === "Hinglish") ? "Pooja" : "Sarah";
      persona = `You are a FEMALE sales agent named ${name}. Adopt a confident, professional female persona. Ensure Hindi grammar uses 'रही हूँ', 'करती हूँ', etc.`;
    } else {
      const name = (scanLanguage === "Hindi" || scanLanguage === "Hinglish") ? "Rahul" : "Alex";
      persona = `You are a MALE sales agent named ${name}. Adopt a confident, authoritative male persona. Ensure Hindi grammar uses 'रहा हूँ', 'करता हूँ', etc.`;
    }

    try {
      const goalStr = `Create a highly effective, detailed, and conversational system prompt for an AI voice agent. ${persona} The AI MUST speak to the customer strictly in ${scanLanguage} (use a natural, conversational tone). Provide a LONG, COMPREHENSIVE system prompt that includes the business context, exact rules for answering questions, how to handle objections, and how to book appointments. Output the ENTIRE system prompt text strictly in ${scanLanguage}, written exactly as you would instruct the AI.`;
      const res = await scanWebsiteAction({ url: url.trim(), goal: goalStr });
      if (res && res.ideas && res.ideas.length > 0) {
        setScript(res.ideas[0].script || "You are an AI sales agent for this business. You must talk politely, answer queries from the website, and book appointments.");
        toast.success("Website scanned! System Prompt is ready.");
      } else {
        toast.error("Scanning failed to return a prompt.");
      }
    } catch (e) {
      toast.error("Failed to scan website. Check backend logs.");
    } finally {
      setScanning(false);
    }
  };

  const handlePreview = async () => {
    if (!script.trim()) { toast.error("Pehle System Prompt likho"); return; }
    setPreviewing(true);
    try {
      const res = await previewVoice({ text: script, voice: callingVoiceId });
      if (!res.success || !res.url) { toast.error(res.error ?? "Preview failed"); return; }
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      const audio = new Audio(res.url);
      audioRef.current = audio;
      await audio.play();
      audio.onended = () => setPreviewing(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Preview failed"); setPreviewing(false); }
  };

  const handleLaunch = async () => {
    if (numbers.length === 0) { toast.error("Koi number nahi hai"); return; }
    if (!script.trim()) { toast.error("Call script likhna zaroori hai"); return; }
    stopRef.current = false;
    setCalling(true);
    setResults(numbers.map((n) => ({ number: n, status: "pending" })));
    try { await createCampaign({ type: "call", prompt: script, totalRecipients: numbers.length }); } catch { /* ignore */ }
    for (let i = 0; i < numbers.length; i++) {
      if (stopRef.current) break;
      setResults((prev) => { const next = [...prev]; next[i] = { ...next[i], status: "calling" }; return next; });
      try {
        const res = await makeBulkCalls({
          numbers: [numbers[i]],
          message: script,
          voiceId: callingVoiceId,
          engine,
          whatsappLink,
          waMediaUrl,
          delayMs: 0
        });
        const r = res.results[0];
        setResults((prev) => { const next = [...prev]; next[i] = { number: numbers[i], status: r?.success ? "connected" : "failed", callSid: r?.callSid, error: r?.error }; return next; });
      } catch (e) { setResults((prev) => { const next = [...prev]; next[i] = { number: numbers[i], status: "failed", error: e instanceof Error ? e.message : "Error" }; return next; }); }
      if (i < numbers.length - 1 && !stopRef.current) await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    setCalling(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Phone size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-serif">Bulk Calling</h1>
            <p className="text-sm text-muted-foreground">AI voice se seedha calls karo</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="gap-1.5 text-xs cursor-pointer" onClick={() => setShowTest(!showTest)}>
          <Settings size={13} /> Setup / Test
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <SetupPanel onTest={() => setShowTest(true)} url={url} setUrl={setUrl} scanWebsite={handleScanWebsite} scanning={scanning} language={scanLanguage} setLanguage={setScanLanguage} myNumber={myNumber} />
          <VoiceClonePanel />
          <AnimatePresence>
            {showTest && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <TestPanel onClose={() => setShowTest(false)} />
              </motion.div>
            )}
          </AnimatePresence>
          {isBusy ? (
            <CallingProgressPanel results={results} calling={calling} onStop={() => { stopRef.current = true; setCalling(false); toast.info("Calling campaign rok diya gaya"); }} onClose={() => { setResults([]); setNumbersRaw(""); setScript(""); setCalling(false); stopRef.current = false; }} />
          ) : (
            <>
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Phone Numbers</Label>
                  <Badge variant="secondary" className="text-[10px]">{numbers.length} numbers</Badge>
                </div>
                <Textarea placeholder="+919876543210\n+918765432109" rows={5} className="font-mono text-xs resize-none" value={numbersRaw} onChange={(e) => setNumbersRaw(e.target.value)} />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  <Upload size={13} /> Upload .txt / .csv
                  <Input type="file" accept=".txt,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { setNumbersRaw(ev.target?.result as string); toast.success(`${f.name} loaded!`); }; r.readAsText(f); }} />
                </label>
                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">AI Calling Engine</Label>

                    {/* Engine toggle buttons - same as CRM page */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-lg border border-border/50">
                        <button
                          onClick={() => setEngine("vapi")}
                          title="Vapi Cloud: Groq LLM + Vapi/ElevenLabs voice"
                          className={cn("px-2.5 py-1.5 text-xs rounded-md transition-all flex items-center gap-1.5", engine === "vapi" ? "bg-background shadow-sm font-medium border border-border/50" : "text-muted-foreground hover:text-foreground")}
                        >
                          <Zap size={11} className={engine === "vapi" ? "text-yellow-500" : ""} />
                          Vapi
                        </button>
                        <button
                          onClick={() => setEngine("voicebox")}
                          title="Voicebox Standard: GPT-4o + OpenAI Voice"
                          className={cn("px-2.5 py-1.5 text-xs rounded-md transition-all flex items-center gap-1.5", engine === "voicebox" ? "bg-indigo-50 text-indigo-600 shadow-sm font-medium border border-indigo-200" : "text-muted-foreground hover:text-foreground")}
                        >
                          <Mic size={11} className={engine === "voicebox" ? "text-indigo-600" : ""} />
                          VB Standard
                        </button>
                        <button
                          onClick={() => setEngine("voicebox_clone")}
                          title="Voicebox Clone: GPT-4o + Cloned Voice"
                          className={cn("px-2.5 py-1.5 text-xs rounded-md transition-all flex items-center gap-1.5", engine === "voicebox_clone" ? "bg-purple-50 text-purple-600 shadow-sm font-medium border border-purple-200" : "text-muted-foreground hover:text-foreground")}
                        >
                          <Volume2 size={11} className={engine === "voicebox_clone" ? "text-purple-600" : ""} />
                          VB Clone 🎤
                        </button>
                      </div>
                      {/* Vapi voice dropdown - only when Vapi selected */}
                      {engine === "vapi" && (
                        <select
                          value={callingVoiceId}
                          onChange={(e) => setCallingVoiceId(e.target.value)}
                          className="text-xs bg-secondary/30 border border-border/50 rounded-lg px-2 py-1.5 outline-none focus:border-yellow-400 text-muted-foreground"
                          title="Select Vapi Voice"
                        >
                          <optgroup label="🆓 Vapi Built-in (Free)">
                            <option value="sagar">Sagar — Indian Male 🇮🇳 (Free)</option>
                          </optgroup>
                          <optgroup label="⚡ Cartesia (Fastest · Low Cost)">
                            <option value="cartesia_female">Cartesia — Female English</option>
                            <option value="cartesia_male">Cartesia — Male English</option>
                            <option value="cartesia_indian">Cartesia — Indian English 🇮🇳</option>
                          </optgroup>
                          <optgroup label="💰 Neets (Cheapest)">
                            <option value="neets_female">Neets — US Female</option>
                            <option value="neets_male">Neets — US Male</option>
                          </optgroup>
                          <optgroup label="🎙️ OpenAI TTS (Natural)">
                            <option value="nova">Nova — Female (Best)</option>
                            <option value="shimmer">Shimmer — Female (Soft)</option>
                            <option value="alloy">Alloy — Neutral</option>
                          </optgroup>
                          <optgroup label="🔥 ElevenLabs (Premium)">
                            <option value="aria">Aria — Indian Female 🇮🇳</option>
                            <option value="priya">Priya — Indian Female 🇮🇳</option>
                            <option value="rachel">Rachel — Warm Female</option>
                          </optgroup>
                        </select>
                      )}

                      {/* OpenAI voice dropdown - only when VB Standard selected */}
                      {engine === "voicebox" && (
                        <select
                          value={callingVoiceId}
                          onChange={(e) => setCallingVoiceId(e.target.value)}
                          className="text-xs bg-secondary/30 border border-border/50 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400 text-muted-foreground"
                          title="Select OpenAI Voice"
                        >
                          <option value="shimmer">Shimmer (Female)</option>
                          <option value="nova">Nova (Female)</option>
                          <option value="alloy">Alloy (Neutral)</option>
                          <option value="echo">Echo (Male)</option>
                          <option value="onyx">Onyx (Male)</option>
                        </select>
                      )}
                    </div>

                    {/* Engine description */}
                    {engine === "vapi" && (
                    <p className="text-[10px] text-muted-foreground">⚡ Vapi Cloud — Groq LLM + Custom Voice. Cartesia (fastest), Neets (cheapest), ElevenLabs (premium). Hindi/Hinglish perfect.</p>
                    )}
                    {engine === "voicebox" && (
                      <p className="text-[10px] text-indigo-400">🎙️ VB Standard — GPT-4o brain + OpenAI TTS. Natural human-like quality.</p>
                    )}
                    {engine === "voicebox_clone" && (
                      <p className="text-[10px] text-purple-400">🎤 VB Clone — GPT-4o brain + Cloned voice engine (local Docker).</p>
                    )}
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="w-full gap-2 text-xs cursor-pointer" onClick={handlePreview} disabled={previewing || !script.trim()}>
                  {previewing ? <><Loader2 size={11} className="animate-spin" /> Playing preview…</> : <><Volume2 size={11} /> Preview Voice</>}
                </Button>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">WhatsApp Message (Sent by AI)</Label>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-2">AI will send this link + media to the customer via WhatsApp when they agree.</p>
                <Input 
                  placeholder="e.g. https://leadzo.in/book" 
                  value={whatsappLink} 
                  onChange={(e) => setWhatsappLink(e.target.value)} 
                  className="font-mono text-xs"
                />
                <div className="space-y-2">
                  <Label className="text-[10px] text-muted-foreground">📎 Campaign Image / Video (optional)</Label>
                  {waMediaUrl ? (
                    <div className="relative rounded-lg overflow-hidden border border-border bg-muted/20">
                      {waMediaType === "video" ? (
                        <video src={waMediaUrl} className="w-full max-h-32 object-cover rounded-lg" controls />
                      ) : (
                        <img src={waMediaUrl} alt="Campaign media" className="w-full max-h-32 object-cover rounded-lg" />
                      )}
                      <button onClick={() => { setWaMediaUrl(""); setWaMediaType(""); }} className="absolute top-1 right-1 size-5 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] cursor-pointer">✕</button>
                      <p className="text-[9px] text-emerald-400 p-1.5">✅ Media ready to send with link</p>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground border border-dashed border-border rounded-lg p-3 hover:border-primary/40 transition-all">
                      <Upload size={14} />
                      <span>{mediaUploading ? "Uploading..." : "Upload Image or Video"}</span>
                      <Input type="file" accept="image/*,video/*" className="hidden" onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setMediaUploading(true);
                        try {
                          const ext = f.name.split('.').pop();
                          const fileName = `wa-campaign/${Date.now()}.${ext}`;
                          const { error } = await supabase.storage.from("campaign-media").upload(fileName, f, { upsert: true });
                          if (error) {
                            // Bucket might not exist, try creating it
                            toast.error("Upload failed: " + error.message);
                            setMediaUploading(false);
                            return;
                          }
                          const { data: urlData } = supabase.storage.from("campaign-media").getPublicUrl(fileName);
                          setWaMediaUrl(urlData.publicUrl);
                          setWaMediaType(f.type.startsWith("video") ? "video" : "image");
                          toast.success("Media uploaded!");
                        } catch (err) {
                          toast.error("Upload error");
                          console.error(err);
                        } finally {
                          setMediaUploading(false);
                        }
                      }} />
                    </label>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">AI System Prompt (Brain)</Label>
                  <button onClick={() => setShowGenerator(!showGenerator)} className="text-[10px] text-primary font-semibold cursor-pointer hover:underline">{showGenerator ? "Hide" : "✶ AI Generate"}</button>
                </div>
                {showGenerator && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-border rounded-lg p-3 bg-muted/20">
                    <AiScriptPanel onSelect={(t) => { setScript(t); setShowGenerator(false); }} />
                  </motion.div>
                )}
                <Textarea placeholder="You are an AI sales agent for Leadzo. Your goal is to..." rows={8} className="text-sm resize-none font-mono" value={script} onChange={(e) => setScript(e.target.value)} />
              </div>
              <Button onClick={handleLaunch} disabled={numbers.length === 0 || !script.trim()} className="w-full cursor-pointer gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <Play size={14} /> {`Bulk Call ${numbers.length} Number${numbers.length !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}
        </div>
        <div className="space-y-3">
          <VapiCallLogsPanel />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Vapi Call Logs Panel
// ────────────────────────────────────────────────────────────────────────────

interface VapiMessage { role: string; message: string; time?: number; }
interface VapiCall {
  id: string;
  status: string;
  customer?: { number?: string };
  startedAt?: string;
  endedAt?: string;
  endedReason?: string;
  cost?: number;
  durationSeconds?: number;
  messages?: VapiMessage[];
  summary?: string;
  transcript?: string;
}

function VapiCallLogsPanel() {
  const [calls, setCalls] = useState<VapiCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<VapiCall | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  // WhatsApp stats
  const [waSent, setWaSent] = useState(0);
  const [waFailed, setWaFailed] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchWaStats = async () => {
    setStatsLoading(true);
    try {
      const { data } = await supabase.from("whatsapp_queue").select("status");
      if (data) {
        setWaSent(data.filter(r => r.status === "sent").length);
        setWaFailed(data.filter(r => r.status === "failed").length);
      }
    } catch(e) { console.error(e); }
    finally { setStatsLoading(false); }
  };

  const fetchLogs = async () => {
    setLoading(true);
    fetchWaStats();
    try {
      const res = await supabase.functions.invoke("vapiLogs_getCalls", {
        body: { limit: PAGE_SIZE, page }
      });
      if (res.data?.calls) {
        setCalls(res.data.calls);
      }
    } catch (e) {
      console.error("Failed to fetch Vapi logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [page]);

  const statusColor = (s: string) => {
    if (s === "ended") return "text-emerald-400 bg-emerald-500/10";
    if (s === "failed") return "text-red-400 bg-red-500/10";
    if (s === "in-progress") return "text-blue-400 bg-blue-500/10 animate-pulse";
    return "text-muted-foreground bg-muted";
  };

  const formatDur = (sec?: number) => {
    if (!sec) return "-";
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">📞 Vapi Call Logs</p>
        <button onClick={fetchLogs} className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer">
          <RefreshCw size={10} /> Refresh
        </button>
      </div>

      {/* WhatsApp & Call Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-blue-400">{loading ? "…" : calls.length}</p>
          <p className="text-[9px] text-muted-foreground">Total Calls</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{statsLoading ? "…" : waSent}</p>
          <p className="text-[9px] text-muted-foreground">✅ WhatsApp Link Sent</p>
          <p className="text-[8px] text-emerald-400/70">Customers Agreed</p>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-center">
          <p className="text-lg font-bold text-red-400">{statsLoading ? "…" : waFailed}</p>
          <p className="text-[9px] text-muted-foreground">❌ Failed</p>
          <p className="text-[8px] text-red-400/70">Link Not Sent</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : calls.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Phone /></EmptyMedia>
            <EmptyTitle>No calls yet</EmptyTitle>
            <EmptyDescription>Launch a bulk calling campaign to see logs here</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <div key={call.id} className="rounded-xl border border-border bg-card p-3 space-y-2 hover:border-primary/40 transition-all cursor-pointer" onClick={() => setSelectedCall(selectedCall?.id === call.id ? null : call)}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PhoneCall size={12} className="text-blue-400 shrink-0" />
                  <span className="text-xs font-mono font-semibold truncate">{call.customer?.number || "Unknown"}</span>
                </div>
                <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", statusColor(call.status))}>
                  {call.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>⏱ {formatDur(call.durationSeconds)}</span>
                {call.cost !== undefined && <span>💰 ${call.cost.toFixed(3)}</span>}
                {call.startedAt && <span>{new Date(call.startedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>}
                {call.endedReason && <span className="text-amber-400/80">{call.endedReason}</span>}
              </div>

              {/* Expanded transcript */}
              {selectedCall?.id === call.id && (
                <div className="mt-2 space-y-2 border-t border-border/50 pt-2">
                  {call.summary && (
                    <div className="bg-muted/40 rounded-lg p-2.5">
                      <p className="text-[10px] font-semibold text-primary mb-1">📝 AI Summary</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{call.summary}</p>
                    </div>
                  )}
                  {call.messages && call.messages.length > 0 ? (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      <p className="text-[10px] font-semibold text-muted-foreground">💬 Conversation</p>
                      {call.messages.filter(m => m.role !== "tool_call" && m.role !== "tool_result" && m.message?.trim()).map((msg, idx) => (
                        <div key={idx} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[85%] rounded-lg px-2.5 py-1.5 text-[10px] leading-relaxed",
                            msg.role === "user" ? "bg-blue-500/20 text-blue-100" : "bg-muted/60 text-foreground")}>
                            <span className="font-semibold text-[9px] opacity-60 block mb-0.5">
                              {msg.role === "user" ? "👤 Customer" : "🤖 AI"}
                            </span>
                            {msg.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : call.transcript ? (
                    <div className="bg-muted/20 rounded-lg p-2.5 max-h-48 overflow-y-auto">
                      <p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{call.transcript}</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic">No transcript available</p>
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-[10px] text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">← Previous</button>
            <span className="text-[10px] text-muted-foreground">Page {page + 1}</span>
            <button disabled={calls.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)} className="text-[10px] text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

