import { useState, useRef } from "react";
import { useQuery, useMutation, useAction } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import { Phone, Upload, Loader2, Sparkles, Copy, Check, CheckCircle2, XCircle, AlertCircle, Settings, Play, Square, RefreshCw, Zap, PhoneCall, PhoneOff, Volume2 } from "lucide-react";
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

type CallStatus = "pending" | "calling" | "connected" | "failed";
interface CallResult { number: string; status: CallStatus; callSid?: string; error?: string; }

function SetupPanel({ onTest, url, setUrl, scanWebsite, scanning, language, setLanguage }: { onTest: () => void; url: string; setUrl: (u: string) => void; scanWebsite: () => void; scanning: boolean; language: string; setLanguage: (l: string) => void }) {
  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Settings size={16} className="text-blue-400 mt-0.5 shrink-0" />
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">AI Brain Setup (Vapi.ai)</p>
              <Badge className="text-[9px] bg-blue-500/20 text-blue-400 border-blue-500/30">Ultra-Low Latency</Badge>
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
            {r.status === "failed" && <span className="flex items-center gap-1 text-red-400" title={r.error}><PhoneOff size={10} /> Failed</span>}
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
  const [voice, setVoice] = useState("nova");
  const [showGenerator, setShowGenerator] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [calling, setCalling] = useState(false);
  const [results, setResults] = useState<CallResult[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopRef = useRef(false);

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
    if (voice === "nova" || voice === "shimmer") {
      const name = (scanLanguage === "Hindi" || scanLanguage === "Hinglish") ? "Pooja" : "Sarah";
      persona = `You are a FEMALE sales agent named ${name}. Adopt a confident, professional female persona.`;
    } else {
      const name = (scanLanguage === "Hindi" || scanLanguage === "Hinglish") ? "Rahul" : "Alex";
      persona = `You are a MALE sales agent named ${name}. Adopt a confident, authoritative male persona.`;
    }

    try {
      const res = await scanWebsiteAction({ url: url.trim(), goal: `Create a system prompt for a highly aggressive and professional sales AI voice agent that books appointments. ${persona} The AI MUST speak strictly in ${scanLanguage}. Translate all reasoning, rules, and scripts into ${scanLanguage}.` });
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
      const res = await previewVoice({ text: script, voice });
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
        const res = await makeBulkCalls({ numbers: [numbers[i]], message: script, voice, delayMs: 0 });
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
          <SetupPanel onTest={() => setShowTest(true)} url={url} setUrl={setUrl} scanWebsite={handleScanWebsite} scanning={scanning} language={scanLanguage} setLanguage={setScanLanguage} />
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
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <Label className="text-sm font-semibold">AI Voice</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([{ id: "nova", label: "Nova", desc: "Young Female" }, { id: "shimmer", label: "Shimmer", desc: "Warm Female" }, { id: "alloy", label: "Alloy", desc: "Neutral" }, { id: "echo", label: "Echo", desc: "Male" }] as const).map((v) => (
                    <button key={v.id} onClick={() => setVoice(v.id)} className={cn("text-left p-2.5 rounded-lg border transition-all cursor-pointer", voice === v.id ? "border-primary/50 bg-primary/10" : "border-border bg-muted/20")}>
                      <p className={cn("text-xs font-semibold", voice === v.id ? "text-primary" : "text-foreground")}>{v.label}</p>
                      <p className="text-[10px] text-muted-foreground">{v.desc}</p>
                    </button>
                  ))}
                </div>
                <Button variant="secondary" size="sm" className="w-full gap-2 text-xs cursor-pointer" onClick={handlePreview} disabled={previewing || !script.trim()}>
                  {previewing ? <><Loader2 size={11} className="animate-spin" /> Playing preview…</> : <><Volume2 size={11} /> Preview Voice</>}
                </Button>
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
          <p className="text-sm font-semibold">Call Campaign History</p>
          {!campaigns ? (
            <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
          ) : campaigns.length === 0 ? (
            <Empty><EmptyHeader><EmptyMedia variant="icon"><Phone /></EmptyMedia><EmptyTitle>No call campaigns yet</EmptyTitle><EmptyDescription>Apna pehla bulk calling campaign launch karo</EmptyDescription></EmptyHeader></Empty>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <div key={c._id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone size={13} className="text-blue-400 shrink-0" />
                      <p className="text-xs font-semibold truncate">{c.prompt.slice(0, 60)}{c.prompt.length > 60 ? "…" : ""}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{c.totalRecipients} numbers</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{new Date(c._creationTime).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
