import { useState, useRef } from "react";
import { useQuery, useMutation, useAction } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import {
  Send, Upload, MessageSquare, Loader2, Sparkles, Copy, Check,
  CheckCircle2, XCircle, AlertCircle, Settings, Play, Square,
  RefreshCw, Zap,
} from "lucide-react";
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
import CampaignHistoryList from "./_components/campaign-history.tsx";

type SendStatus = "pending" | "sending" | "sent" | "failed";
interface NumberResult { number: string; status: SendStatus; error?: string; }

function SetupPanel({ onTest }: { onTest: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Settings size={16} className="text-amber-400 mt-0.5 shrink-0" />
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Green API Setup</p>
            <Badge className="text-[9px] bg-green-500/20 text-green-400 border-green-500/30">FREE — 1000 msg/month</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Green API se seedha app ke andar se messages bhejo.</p>
          <div className="rounded-lg bg-background border border-border p-2.5 font-mono text-[10px] space-y-1 text-muted-foreground">
            <p><span className="text-primary">GREENAPI_INSTANCE_ID</span> = 1234567890</p>
            <p><span className="text-primary">GREENAPI_TOKEN</span> = your_api_token_here</p>
          </div>
          <div className="flex gap-3">
            <a href="https://green-api.com" target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline font-semibold">→ green-api.com</a>
            <button onClick={onTest} className="text-[11px] text-amber-400 hover:underline font-semibold cursor-pointer">→ Test karo</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestPanel({ onClose }: { onClose: () => void }) {
  const testConnection = useAction(api.whatsappSender.testConnection);
  const [testNum, setTestNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const run = async () => {
    if (!testNum.trim()) { toast.error("Test number daalo"); return; }
    setLoading(true); setResult(null);
    try {
      const r = await testConnection({ testNumber: testNum.trim() });
      setResult(r);
      if (r.success) toast.success("Test message bheja gaya!");
      else toast.error(r.error ?? "Failed");
    } catch (e) { setResult({ success: false, error: e instanceof Error ? e.message : "Error" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Test Connection</p>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
      </div>
      <div className="flex gap-2">
        <Input placeholder="+919876543210" className="font-mono text-xs h-8 flex-1" value={testNum} onChange={(e) => setTestNum(e.target.value)} />
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={run} disabled={loading}>
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />} Send Test
        </Button>
      </div>
      {result && (
        <div className={cn("flex items-center gap-2 text-xs p-2 rounded-lg", result.success ? "bg-[#25D366]/10 text-[#25D366]" : "bg-red-500/10 text-red-400")}>
          {result.success ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {result.success ? "Message bheja gaya!" : result.error}
        </div>
      )}
    </div>
  );
}

function AiTemplatePanel({ campaignType, onSelect }: { campaignType: string; onSelect: (t: string) => void }) {
  const generate = useAction(api.campaignAi.generateTemplate);
  const [goal, setGoal] = useState("");
  const [language, setLanguage] = useState("hinglish");
  const [tone, setTone] = useState("friendly");
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const run = async () => {
    if (!goal.trim()) { toast.error("Goal likhna zaroori hai"); return; }
    setLoading(true); setTemplates([]);
    try {
      const res = await generate({ type: campaignType, prompt: goal, language, tone, count: 3 });
      setTemplates(res);
    } catch { toast.error("Failed. Check HERCULES_API_KEY secret."); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <Textarea placeholder="Campaign goal..." rows={2} className="text-xs resize-none" value={goal} onChange={(e) => setGoal(e.target.value)} />
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
        {loading ? "Generating..." : "Generate 3 Templates"}
      </Button>
      {templates.map((t, i) => (
        <div key={i} onClick={() => onSelect(t)} className="relative rounded-lg border border-border bg-muted/40 p-3 cursor-pointer hover:border-primary/40 transition-colors group">
          <p className="text-xs leading-relaxed whitespace-pre-wrap pr-7">{t}</p>
          <button onClick={(e) => { e.stopPropagation(); void navigator.clipboard.writeText(t); setCopied(i); setTimeout(() => setCopied(null), 1500); toast.success("Copied!"); }} className="absolute top-2 right-2 p-1 rounded hover:bg-muted cursor-pointer text-muted-foreground">
            {copied === i ? <Check size={11} /> : <Copy size={11} />}
          </button>
          <p className="text-[9px] text-primary mt-1 opacity-0 group-hover:opacity-100 font-semibold">Click to use →</p>
        </div>
      ))}
    </div>
  );
}

function SendingProgressPanel({ results, sending, onStop, onClose }: { results: NumberResult[]; sending: boolean; onStop: () => void; onClose: () => void }) {
  const sentCount = results.filter((r) => r.status === "sent").length;
  const failedCount = results.filter((r) => r.status === "failed").length;
  const total = results.length;
  const done = results.filter((r) => r.status === "sent" || r.status === "failed").length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const isDone = !sending && done >= total;

  return (
    <div className="rounded-xl border border-[#25D366]/30 bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-[#25D366]/5 flex items-center gap-3">
        <div className="size-8 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
          {sending ? <Loader2 size={15} className="text-[#25D366] animate-spin" /> : <Send size={15} className="text-[#25D366]" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{sending ? "Bhej raha hai…" : "Campaign Complete"}</p>
          <p className="text-[11px] text-muted-foreground">{sentCount} bheje · {failedCount} failed · {total - done} baaki</p>
        </div>
        {isDone ? (
          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={onClose}><RefreshCw size={11} className="mr-1" /> Nayi Campaign</Button>
        ) : (
          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300 gap-1" onClick={onStop}><Square size={10} /> Stop</Button>
        )}
      </div>
      <div className="h-1.5 bg-muted/40">
        <motion.div className="h-full bg-[#25D366]" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-border/40">
        {results.map((r, i) => (
          <div key={i} className={cn("flex items-center gap-3 px-4 py-2 text-xs", r.status === "sending" && "bg-[#25D366]/5", r.status === "sent" && "opacity-60")}>
            <span className="font-mono flex-1 truncate">{r.number}</span>
            {r.status === "pending" && <span className="text-muted-foreground/40">—</span>}
            {r.status === "sending" && <span className="flex items-center gap-1.5 text-[#25D366] font-semibold"><Loader2 size={10} className="animate-spin" /> Bhej raha…</span>}
            {r.status === "sent" && <span className="flex items-center gap-1 text-[#25D366]"><CheckCircle2 size={10} /> Bheja ✓</span>}
            {r.status === "failed" && <span className="flex items-center gap-1 text-red-400" title={r.error}><XCircle size={10} /> Failed</span>}
          </div>
        ))}
      </div>
      {isDone && (
        <div className="p-3 border-t border-border bg-muted/20 text-xs text-muted-foreground text-center">
          {failedCount > 0 && <p className="text-amber-400 font-semibold mb-1"><AlertCircle size={10} className="inline mr-1" />{failedCount} numbers failed</p>}
          <p className="text-[#25D366] font-semibold">✓ {sentCount} messages bheje gaye!</p>
        </div>
      )}
    </div>
  );
}

export default function WASenderPage() {
  const campaigns = useQuery(api.campaigns.list, { type: "whatsapp" });
  const createCampaign = useMutation(api.campaigns.create);
  const sendBulk = useAction(api.whatsappSender.sendBulk);
  const getStatus = useAction(api.whatsappSender.getInstanceStatus);

  const [numbersRaw, setNumbersRaw] = useState("");
  const [message, setMessage] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<NumberResult[]>([]);
  const [instanceStatus, setInstanceStatus] = useState<"unknown" | "connected" | "disconnected">("unknown");
  const [checkingStatus, setCheckingStatus] = useState(false);
  const stopRef = useRef(false);

  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      const r = await getStatus({});
      setInstanceStatus(r.connected ? "connected" : "disconnected");
      if (r.connected) toast.success("WhatsApp connected hai!");
      else toast.error(`Disconnected: ${r.stateInstance ?? "not authorized"}`);
    } catch { toast.error("Status check failed"); }
    finally { setCheckingStatus(false); }
  };

  const numbers = numbersRaw.split(/[\n,]+/).map((n) => n.trim()).filter((n) => n.length > 5);
  const isSendingOrDone = sending || (results.length > 0 && results.every((r) => r.status === "sent" || r.status === "failed"));

  const handleLaunch = async () => {
    if (numbers.length === 0) { toast.error("Koi number nahi hai"); return; }
    if (!message.trim()) { toast.error("Message likhna zaroori hai"); return; }
    stopRef.current = false;
    setSending(true);
    setResults(numbers.map((n) => ({ number: n, status: "pending" })));
    try { await createCampaign({ type: "whatsapp", prompt: message, totalRecipients: numbers.length }); } catch { /* ignore */ }
    for (let i = 0; i < numbers.length; i++) {
      if (stopRef.current) break;
      setResults((prev) => { const next = [...prev]; next[i] = { ...next[i], status: "sending" }; return next; });
      try {
        const res = await sendBulk({ numbers: [numbers[i]], message, delayMs: 0 });
        const r = res.results[0];
        setResults((prev) => { const next = [...prev]; next[i] = { number: numbers[i], status: r?.success ? "sent" : "failed", error: r?.error }; return next; });
      } catch (e) {
        setResults((prev) => { const next = [...prev]; next[i] = { number: numbers[i], status: "failed", error: e instanceof Error ? e.message : "Error" }; return next; });
      }
      if (i < numbers.length - 1 && !stopRef.current) await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center">
            <MessageSquare size={18} className="text-[#25D366]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-serif">Personal WA Sender</h1>
            <p className="text-sm text-muted-foreground">Green API — seedha app se bhejo, koi tab nahi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {instanceStatus !== "unknown" && (
            <Badge className={cn("text-[10px] gap-1", instanceStatus === "connected" ? "bg-[#25D366]/20 text-[#25D366] border-[#25D366]/30" : "bg-red-500/20 text-red-400 border-red-500/30")}>
              {instanceStatus === "connected" ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
              {instanceStatus === "connected" ? "Connected" : "Disconnected"}
            </Badge>
          )}
          <Button variant="secondary" size="sm" className="gap-1.5 text-xs cursor-pointer" onClick={checkStatus} disabled={checkingStatus}>
            {checkingStatus ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Status
          </Button>
          <Button variant="secondary" size="sm" className="gap-1.5 text-xs cursor-pointer" onClick={() => setShowTest(!showTest)}>
            <Settings size={13} /> Setup / Test
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <SetupPanel onTest={() => setShowTest(true)} />
          <AnimatePresence>
            {showTest && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <TestPanel onClose={() => setShowTest(false)} />
              </motion.div>
            )}
          </AnimatePresence>
          {isSendingOrDone ? (
            <SendingProgressPanel results={results} sending={sending} onStop={() => { stopRef.current = true; setSending(false); toast.info("Campaign rok diya"); }} onClose={() => { setResults([]); setNumbersRaw(""); setMessage(""); setSending(false); stopRef.current = false; }} />
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
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Message</Label>
                  <button onClick={() => setShowGenerator(!showGenerator)} className="text-[10px] text-primary font-semibold cursor-pointer hover:underline">{showGenerator ? "Hide" : "✶ AI Generate"}</button>
                </div>
                {showGenerator && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-border rounded-lg p-3 bg-muted/20">
                    <AiTemplatePanel campaignType="whatsapp" onSelect={(t) => { setMessage(t); setShowGenerator(false); }} />
                  </motion.div>
                )}
                <Textarea placeholder="Bhai, aaj USDT ke best rates hain!" rows={5} className="text-sm resize-none" value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <Button onClick={handleLaunch} disabled={numbers.length === 0 || !message.trim()} className="w-full cursor-pointer gap-2 bg-[#25D366] hover:bg-[#20bc5a] text-white">
                <Play size={14} /> {`Auto Send to ${numbers.length} Number${numbers.length !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold">Campaign History</p>
          {!campaigns ? (
            <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
          ) : campaigns.length === 0 ? (
            <Empty><EmptyHeader><EmptyMedia variant="icon"><Send /></EmptyMedia><EmptyTitle>No campaigns yet</EmptyTitle><EmptyDescription>Launch your first WA campaign</EmptyDescription></EmptyHeader></Empty>
          ) : (
            <CampaignHistoryList campaigns={campaigns} />
          )}
        </div>
      </div>
    </div>
  );
}
