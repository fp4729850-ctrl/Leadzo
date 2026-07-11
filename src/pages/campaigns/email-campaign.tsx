import { useState } from "react";
import { useQuery, useMutation, useAction } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";
import { motion } from "motion/react";
import { Mail, Upload, Send, Loader2, Sparkles, Copy, Check } from "lucide-react";
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

function AiTemplatePanel({ onSelect }: { onSelect: (t: string) => void }) {
  const generate = useAction(api.campaignAi.generateTemplate);
  const [goal, setGoal] = useState("");
  const [language, setLanguage] = useState("hinglish");
  const [tone, setTone] = useState("professional");
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const run = async () => {
    if (!goal.trim()) { toast.error("Goal likhna zaroori hai"); return; }
    setLoading(true); setTemplates([]);
    try {
      const res = await generate({ type: "email", prompt: goal, language, tone, count: 3 });
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
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="friendly">Friendly</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={run} disabled={loading} size="sm" className="w-full gap-2 cursor-pointer">
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {loading ? "Generating..." : "Generate 3 Templates"}
      </Button>
      {templates.map((t, i) => (
        <div key={i} onClick={() => onSelect(t)} className={cn("relative rounded-lg border border-border bg-muted/40 p-3 cursor-pointer hover:border-primary/40 transition-colors group")}>
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

export default function EmailCampaignPage() {
  const campaigns = useQuery(api.campaigns.list, { type: "email" });
  const createCampaign = useMutation(api.campaigns.create);
  const [emailsRaw, setEmailsRaw] = useState("");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [launching, setLaunching] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  const emails = emailsRaw.split(/[\n,]+/).map((e) => e.trim()).filter((e) => e.includes("@"));

  const handleLaunch = async () => {
    if (emails.length === 0) { toast.error("Koi email nahi hai"); return; }
    if (!subject.trim() || !message.trim()) { toast.error("Subject aur message zaroori hai"); return; }
    setLaunching(true);
    try {
      await createCampaign({ type: "email", prompt: `${subject}\n\n${message}`, totalRecipients: emails.length });
      toast.success(`Email campaign launched for ${emails.length} recipients!`);
      setEmailsRaw(""); setSubject(""); setMessage("");
    } catch { toast.error("Launch failed"); }
    finally { setLaunching(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center">
          <Mail size={18} className="text-[#F59E0B]" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight font-serif">AI Email Campaign</h1>
          <p className="text-sm text-muted-foreground">Bulk personalized emails with AI copywriting</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Recipients</Label>
              <Badge variant="secondary" className="text-[10px]">{emails.length} emails</Badge>
            </div>
            <Textarea placeholder="rahul@gmail.com\npriya@outlook.com" rows={4} className="font-mono text-xs resize-none" value={emailsRaw} onChange={(e) => setEmailsRaw(e.target.value)} />
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              <Upload size={13} /> Upload .txt / .csv
              <Input type="file" accept=".txt,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { setEmailsRaw(ev.target?.result as string); toast.success(`${f.name} loaded!`); }; r.readAsText(f); }} />
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Subject Line</Label>
            <Input placeholder="Aaj ke best USDT rates" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Email Body</Label>
              <button onClick={() => setShowGenerator(!showGenerator)} className="text-[10px] text-primary font-semibold cursor-pointer hover:underline">{showGenerator ? "Hide" : "✶ AI Generate"}</button>
            </div>
            {showGenerator && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-border rounded-lg p-3 bg-muted/20">
                <AiTemplatePanel onSelect={(t) => { const lines = t.split("\n"); const sub = lines[0] ?? ""; const body = lines.slice(2).join("\n").trim(); if (body) { setSubject(sub); setMessage(body); } else { setMessage(t); } setShowGenerator(false); }} />
              </motion.div>
            )}
            <Textarea placeholder="Dear [Name],\n\nAaj humara best USDT rate hai..." rows={6} className="text-sm resize-none" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button onClick={handleLaunch} disabled={launching || emails.length === 0 || !subject.trim() || !message.trim()} className="w-full cursor-pointer gap-2">
            <Send size={14} />
            {launching ? "Launching..." : `Send Email Campaign (${emails.length} recipients)`}
          </Button>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold">Campaign History</p>
          {!campaigns ? (
            <div className="space-y-3">{[1,2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
          ) : campaigns.length === 0 ? (
            <Empty><EmptyHeader><EmptyMedia variant="icon"><Mail /></EmptyMedia><EmptyTitle>No email campaigns yet</EmptyTitle><EmptyDescription>Launch your first email campaign</EmptyDescription></EmptyHeader></Empty>
          ) : <CampaignHistoryList campaigns={campaigns} />}
        </div>
      </div>
    </div>
  );
}
