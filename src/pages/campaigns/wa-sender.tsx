import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/use-auth.ts";
import {
  Send, Upload, MessageSquare, Loader2, Sparkles, Copy, Check,
  CheckCircle2, XCircle, AlertCircle, Settings, Play, Square,
  RefreshCw, Zap, Plus, Rocket
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
  const { user, signin } = useAuth();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("disconnected");
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    if (!user) return;
    try {
      const res = await fetch(`https://srv1780011.hstgr.cloud/api/status/${user.id}`);
      const data = await res.json();
      setStatus(data.status);
      if (data.qrCode) setQrCode(data.qrCode);
    } catch (e) {
      console.error("Status check failed", e);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [user]);

  const connect = async () => {
    if (!user) {
      toast.error("Bhai, pehle login karna padega WA Sender use karne ke liye!");
      signin();
      return;
    }
    setLoading(true);
    try {
      await fetch(`https://srv1780011.hstgr.cloud/api/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      toast.info("Generating QR Code...");
    } catch (e) {
      toast.error("Failed to connect to local server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-[#25D366] animate-pulse" />
        <p className="text-sm font-semibold">Free API (Own Server)</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Connect your phone directly to our local server.
        Scan the QR code to link your WhatsApp and send messages for free.
      </p>

      <div className="flex flex-col items-center justify-center space-y-4 pt-2">
        {status === "connected" ? (
          <div className="flex flex-col items-center p-4 border border-green-500/20 bg-green-500/10 rounded-lg w-full text-green-500">
            <CheckCircle2 size={32} className="mb-2" />
            <p className="font-semibold text-sm">WhatsApp Connected!</p>
            <p className="text-xs opacity-80 mt-1 text-center">You can now send free campaigns.</p>
          </div>
        ) : status === "pending" && qrCode ? (
          <div className="flex flex-col items-center bg-white p-4 rounded-xl border">
            <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">Scan this QR in your WhatsApp App</p>
          </div>
        ) : (
          <Button onClick={connect} disabled={loading || status === "starting"} className="w-full bg-[#25D366] hover:bg-[#20bc5a] text-white">
            {loading || status === "starting" ? <Loader2 size={16} className="animate-spin mr-2" /> : <RefreshCw size={16} className="mr-2" />}
            Generate QR Code
          </Button>
        )}
      </div>

      <div className="pt-2 border-t border-primary/10 flex justify-between items-center">
        <p className="text-[10px] font-mono text-muted-foreground">Server: Connected (Proxied)</p>
        <Button variant="link" size="sm" className="h-auto p-0 text-[10px]" onClick={onTest}>Test Connection</Button>
      </div>
    </div>
  );
}

function MetaSetupPanel({ onTest }: { onTest: () => void }) {
  return (
    <div className="rounded-xl border border-[#25D366]/20 bg-[#25D366]/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Settings size={16} className="text-[#25D366] mt-0.5 shrink-0" />
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Meta Official API Setup</p>
            <Badge className="text-[9px] bg-[#25D366]/20 text-[#25D366] border-[#25D366]/30">Official Business</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Meta Cloud API se approved templates bhejein.</p>
          <div className="rounded-lg bg-background border border-border p-2.5 font-mono text-[10px] space-y-1 text-muted-foreground">
            <p><span className="text-primary">META_WHATSAPP_API_TOKEN</span> = <span className="text-green-500">Configured in .env</span></p>
            <p><span className="text-primary">META_WHATSAPP_PHONE_ID</span> = <span className="text-green-500">Configured in .env</span></p>
          </div>
          <div className="flex gap-3">
            <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline font-semibold">→ Meta for Developers</a>
            <button onClick={onTest} className="text-[11px] text-[#25D366] hover:underline font-semibold cursor-pointer">→ Test karo</button>
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
        <Button size="sm" className="h-8 text-xs cursor-pointer gap-1.5" onClick={run} disabled={loading}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send Test
        </Button>
      </div>
      {result && (
        <div className={cn("text-xs p-2 rounded-md border", result.success ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500")}>
          {result.success ? "✓ Test successful" : `✗ Error: ${result.error}`}
        </div>
      )}
    </div>
  );
}

function TemplateCreatorPanel({ onClose, onCreated, billingMode }: { onClose: () => void; onCreated: (name: string) => void; billingMode: string }) {
  const [templateName, setTemplateName] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [urlText, setUrlText] = useState("");
  const [urlLink, setUrlLink] = useState("");
  const [phoneText, setPhoneText] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const createTemplate = useAction(api.whatsappSender.createTemplate);

  const run = async () => {
    if (!templateName.trim() || !messageBody.trim()) { toast.error("Name aur message dono zaruri hain"); return; }
    setLoading(true);
    try {
      const payload = { 
        templateName: templateName.trim(), 
        messageBody: messageBody.trim(), 
        billingMode,
        urlText: urlText.trim() || undefined,
        urlLink: urlLink.trim() || undefined,
        phoneText: phoneText.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined
      };
      const res = await createTemplate(payload);
      if (res.status === "success") {
        toast.success(`Template created: ${res.templateName}`);
        onCreated(res.templateName);
      } else {
        toast.error(res.error || "Failed to create template");
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <p className="text-sm font-semibold">New Meta Template</p>
        </div>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Template Name (e.g. summer_sale)</Label>
          <Input placeholder="summer_sale" className="font-mono text-xs h-8 bg-background" value={templateName} onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Message Body</Label>
          <Textarea placeholder="Hello {{1}}, our summer sale is live! Use code SALE50..." rows={4} className="text-xs resize-none bg-background" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} />
        </div>
        
        <div className="p-3 border rounded-lg bg-background/50 border-primary/20 space-y-2">
           <Label className="text-xs font-semibold text-primary">✨ Write with AI</Label>
           <AiTemplatePanel campaignType="whatsapp" onSelect={(t) => setMessageBody(t)} />
        </div>
        

        <Button size="sm" className="w-full h-8 text-xs cursor-pointer gap-1.5 mt-2" onClick={run} disabled={loading || !templateName.trim() || !messageBody.trim()}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Submit to Meta for Review
        </Button>
      </div>
    </div>
  );
}

function AiTemplatePanel({ campaignType, onSelect }: { campaignType: string; onSelect: (t: string) => void }) {
  const generate = useAction(api.campaignAi.generateTemplate);
  const [goal, setGoal] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [language, setLanguage] = useState("hinglish");
  const [tone, setTone] = useState("friendly");
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const run = async () => {
    if (!goal.trim()) { toast.error("Goal likhna zaroori hai"); return; }
    setLoading(true); setTemplates([]);
    try {
      const res = await generate({ type: campaignType, prompt: goal, language, tone, websiteUrl, count: 1 });
      setTemplates(res);
    } catch { toast.error("Failed. Check HERCULES_API_KEY secret."); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <Input placeholder="Website URL (Optional)... e.g. https://yoursite.com" className="text-xs h-8" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
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
        {loading ? "Generating..." : "Generate AI Template"}
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
  const { user } = useAuth();
  const campaigns = useQuery(api.campaigns.list, { type: "whatsapp" });
  const createCampaign = useMutation(api.campaigns.create);
  const sendBulk = useAction(api.whatsappSender.sendBulk);

  const [apiType, setApiType] = useState<"green" | "meta">("meta");
  const [billingMode, setBillingMode] = useState<"byot" | "wallet">("byot");
  const [numbersRaw, setNumbersRaw] = useState("");
  const [message, setMessage] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [showTemplateCreator, setShowTemplateCreator] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<NumberResult[]>([]);
  const stopRef = useRef(false);

  const numbers = numbersRaw.split(/[\n,]+/).map((n) => n.trim()).filter((n) => n.length > 5);
  const isSendingOrDone = sending || (results.length > 0 && results.every((r) => r.status === "sent" || r.status === "failed"));

  const handleLaunch = async () => {
    if (numbers.length === 0) { toast.error("Bhai pehle numbers toh daal"); return; }
    if (apiType === "meta" && !templateName.trim()) { toast.error("Template name bhool gaya!"); return; }
    if (apiType === "green" && !message.trim()) { toast.error("Message khali hai!"); return; }

    setSending(true);
    setResults([]);
    stopRef.current = false;
    toast.info("Campaign shuru ho raha hai...", { icon: <Rocket size={14} /> });

    if (apiType === "green") {
      try {
        const res = await fetch('https://srv1780011.hstgr.cloud/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id, numbers, message })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResults(data.results.map((r: any) => ({
          number: r.number,
          status: r.success ? "sent" : "failed",
          error: r.error
        })));
        toast.success("Sabko message bhej diye!");
      } catch (err: any) {
        toast.error(`Error: ${err.message}`);
      } finally {
        setSending(false);
      }
      return;
    }

    // Meta Logic
    setResults(numbers.map((n) => ({ number: n, status: "pending" })));
    try { await createCampaign({ type: "whatsapp", prompt: message, totalRecipients: numbers.length }); } catch { /* ignore */ }
    for (let i = 0; i < numbers.length; i++) {
      if (stopRef.current) break;
      setResults((prev) => { const next = [...prev]; next[i] = { ...next[i], status: "sending" }; return next; });
      try {
        const payload = { numbers: [numbers[i]], templateName, apiType: "meta", delayMs: 0, billingMode };
        const res = await sendBulk(payload);
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
            <h1 className="text-xl font-bold tracking-tight font-serif">{apiType === "green" ? "Personal WA Sender" : "Official WA Sender"}</h1>
            <p className="text-sm text-muted-foreground">{apiType === "green" ? "Green API — seedha app se bhejo, koi tab nahi" : "Meta Cloud API — Business verified messaging"}</p>
          </div>
        </div>
        
        <div className="flex p-1 bg-muted/30 border border-border rounded-lg items-center text-xs font-semibold mr-auto lg:mr-0">
          <button 
            onClick={() => setApiType("green")} 
            className={cn("px-3 py-1.5 rounded-md transition-all cursor-pointer", apiType === "green" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            Green API
          </button>
          <button 
            onClick={() => setApiType("meta")} 
            className={cn("px-3 py-1.5 rounded-md transition-all cursor-pointer", apiType === "meta" ? "bg-[#25D366] text-white shadow" : "text-muted-foreground hover:text-foreground")}
          >
            Meta API
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge and check button removed as they are handled by SetupPanel for Green API */}
          <Button variant="secondary" size="sm" className="gap-1.5 text-xs cursor-pointer" onClick={() => setShowTest(!showTest)}>
            <Settings size={13} /> Setup / Test
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-4">
          {apiType === "meta" ? <MetaSetupPanel onTest={() => setShowTest(true)} /> : <SetupPanel onTest={() => setShowTest(true)} />}
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
                  <Label className="text-sm font-semibold">{apiType === "meta" ? "Template Name" : "Message"}</Label>
                  {apiType === "green" && (
                    <button onClick={() => setShowGenerator(!showGenerator)} className="text-[10px] text-primary font-semibold cursor-pointer hover:underline">
                      {showGenerator ? "Hide" : "✶ AI Generate"}
                    </button>
                  )}
                </div>
                {showGenerator && apiType === "green" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-border rounded-lg p-3 bg-muted/20">
                    <AiTemplatePanel campaignType="whatsapp" onSelect={(t) => { setMessage(t); setShowGenerator(false); }} />
                  </motion.div>
                )}
                {apiType === "meta" ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant={billingMode === "byot" ? "default" : "outline"} onClick={() => setBillingMode("byot")} className="flex-1 text-xs h-8">Use My Own Keys (Free)</Button>
                      <Button size="sm" variant={billingMode === "wallet" ? "default" : "outline"} onClick={() => setBillingMode("wallet")} className="flex-1 text-xs h-8 gap-1">Leadzo Credits</Button>
                    </div>
                    
                    <AnimatePresence>
                      {showTemplateCreator && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                          <TemplateCreatorPanel 
                            billingMode={billingMode}
                            onClose={() => setShowTemplateCreator(false)} 
                            onCreated={(name) => {
                              setTemplateName(name);
                              setShowTemplateCreator(false);
                            }} 
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!showTemplateCreator && (
                      <div className="flex items-center gap-2">
                        <Input placeholder="Template Name (e.g. hello_world)" className="font-mono text-sm flex-1" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
                        <Button size="sm" variant="outline" className="h-9 px-3 shrink-0 gap-1" onClick={() => setShowTemplateCreator(!showTemplateCreator)}>
                          <Plus size={14} /> New Template
                        </Button>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                      {billingMode === "byot" ? "Settings me ja kar apna Meta Token add karein." : "Har message pe 1 credit katega."}
                    </p>
                  </div>
                ) : (
                  <Textarea placeholder="Bhai, aaj USDT ke best rates hain!" rows={5} className="text-sm resize-none" value={message} onChange={(e) => setMessage(e.target.value)} />
                )}
              </div>
              {!showTemplateCreator && (
                <Button onClick={handleLaunch} disabled={numbers.length === 0 || (apiType === "meta" ? !templateName.trim() : !message.trim())} className="w-full cursor-pointer gap-2 bg-[#25D366] hover:bg-[#20bc5a] text-white">
                  <Play size={14} /> {`Auto Send to ${numbers.length} Number${numbers.length !== 1 ? "s" : ""}`}
                </Button>
              )}
            </>
          )}
        </div>

        {campaigns && campaigns.length > 0 && (
          <div className="space-y-3 pt-6 mt-6 border-t border-border">
            <p className="text-sm font-semibold">Recent Campaigns</p>
            <CampaignHistoryList campaigns={campaigns} />
          </div>
        )}
      </div>
    </div>
  );
}
