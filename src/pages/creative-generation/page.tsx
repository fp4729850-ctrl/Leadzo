import { useState, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Sparkles, Loader2, Copy, Check, Trash2, Clock, Image, Video, Type, MousePointer2, Megaphone, PenLine, Palette, Library, Wand2, ChevronDown, ChevronUp, Zap, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const PLATFORMS = [
  { value: "facebook", label: "Facebook", color: "#1877F2" },
  { value: "instagram", label: "Instagram", color: "#E1306C" },
  { value: "google", label: "Google Ads", color: "#EA4335" },
  { value: "tiktok", label: "TikTok", color: "#69C9D0" },
  { value: "linkedin", label: "LinkedIn", color: "#0A66C2" },
  { value: "youtube", label: "YouTube", color: "#FF0000" },
];

const TONES = ["Professional & Trust-building", "Urgent & Fear-based", "Friendly & Conversational", "Bold & Aggressive", "Inspirational & Aspirational", "Humorous & Witty", "Hinglish (Hindi + English)", "Story-telling"];
const GOALS = ["Lead Generation", "App Installs", "Product Sales", "Brand Awareness", "Website Traffic", "Retargeting / Conversions"];
const LANGUAGES = ["English", "Hindi", "Hinglish", "Marathi", "Tamil", "Telugu"];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (<button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-muted transition-all cursor-pointer text-muted-foreground hover:text-foreground shrink-0">{copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}</button>);
}

function CreativeCard({ icon: Icon, title, color, children, delay }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; color: string; children: React.ReactNode; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const }} className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="size-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}><span style={{ color }}><Icon size={14} /></span></div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

function CreativeResult({ result, productName, platform }: { result: { headlines: string[]; adCopies: string[]; imagePrompts: string[]; videoScript: string; ctaOptions: string[] }; productName: string; platform: string }) {
  const [videoExpanded, setVideoExpanded] = useState(false);
  const platformMeta = PLATFORMS.find((p) => p.value === platform);
  return (
    <div className="flex flex-col gap-4 mt-2">
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full" style={{ background: platformMeta?.color ?? "#6B7280" }} />
        <span className="text-xs text-muted-foreground font-medium">Creatives for <span className="font-bold text-foreground">{productName}</span> \u00b7 {platformMeta?.label ?? platform}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CreativeCard icon={Type} title="10 Headlines" color="#8B5CF6" delay={0}>
          <div className="flex flex-col gap-2">{result.headlines.map((h, i) => <div key={i} className="flex items-center gap-2 group rounded-xl hover:bg-muted/40 px-2 py-1.5 transition-all"><span className="text-[10px] font-black text-muted-foreground w-4 shrink-0">{i + 1}</span><p className="text-xs text-foreground flex-1">{h}</p><CopyBtn text={h} /></div>)}</div>
        </CreativeCard>
        <CreativeCard icon={MousePointer2} title="CTA Options" color="#10B981" delay={0.05}>
          <div className="flex flex-col gap-2">{result.ctaOptions.map((cta, i) => <div key={i} className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"><span className="text-xs font-bold text-emerald-400 flex-1">{cta}</span><CopyBtn text={cta} /></div>)}</div>
        </CreativeCard>
        <CreativeCard icon={PenLine} title="5 Ad Copy Variants" color="#F59E0B" delay={0.1}>
          <div className="flex flex-col gap-3">{result.adCopies.map((copy, i) => <div key={i} className="rounded-xl border border-border bg-background/40 p-3"><div className="flex items-start justify-between gap-2 mb-1"><Badge variant="secondary" className="text-[9px] shrink-0">Variant {i + 1}</Badge><CopyBtn text={copy} /></div><p className="text-xs text-foreground leading-relaxed">{copy}</p></div>)}</div>
        </CreativeCard>
        <CreativeCard icon={Image} title="AI Image Prompts" color="#3B82F6" delay={0.15}>
          <p className="text-[10px] text-muted-foreground -mt-2">Copy these prompts into Midjourney, DALL-E, or Stable Diffusion</p>
          <div className="flex flex-col gap-3">{result.imagePrompts.map((prompt, i) => <div key={i} className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3"><div className="flex items-start justify-between gap-2 mb-1.5"><span className="text-[10px] font-bold text-blue-400">Prompt {i + 1}</span><CopyBtn text={prompt} /></div><p className="text-xs text-muted-foreground leading-relaxed">{prompt}</p></div>)}</div>
        </CreativeCard>
        <div className="md:col-span-2">
          <CreativeCard icon={Video} title="30-Second Video Script" color="#EC4899" delay={0.2}>
            <button onClick={() => setVideoExpanded((v) => !v)} className="flex items-center justify-between w-full text-left cursor-pointer">
              <span className="text-xs text-muted-foreground">{videoExpanded ? "Click to collapse" : "Click to expand full script"}</span>
              {videoExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
            </button>
            <AnimatePresence>{videoExpanded && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-4 relative"><div className="absolute top-2 right-2"><CopyBtn text={result.videoScript} /></div><pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">{result.videoScript}</pre></div></motion.div>)}</AnimatePresence>
          </CreativeCard>
        </div>
      </div>
    </div>
  );
}

function LibraryItem({ creative, onDelete }: { creative: { _id: Id<"creatives">; productName: string; platform: string; tone: string; goal: string; createdAt: string; headlines: string[] }; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const platformMeta = PLATFORMS.find((p) => p.value === creative.platform);
  const date = new Date(creative.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-all cursor-pointer text-left">
        <div className="size-2.5 rounded-full shrink-0" style={{ background: platformMeta?.color ?? "#6B7280" }} />
        <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground truncate">{creative.productName}</p><div className="flex items-center gap-2 mt-0.5"><Badge variant="secondary" className="text-[9px] px-1.5">{platformMeta?.label ?? creative.platform}</Badge><Badge variant="secondary" className="text-[9px] px-1.5">{creative.goal}</Badge><span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock size={9} />{date}</span></div></div>
        <div className="flex items-center gap-1"><button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all cursor-pointer"><Trash2 size={13} /></button>{expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}</div>
      </button>
      <AnimatePresence>{expanded && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border"><div className="px-4 py-3 flex flex-col gap-1.5">{creative.headlines.slice(0, 5).map((h, i) => <div key={i} className="flex items-center gap-2"><span className="text-[10px] text-muted-foreground w-4">{i + 1}.</span><p className="text-xs text-foreground flex-1">{h}</p><CopyBtn text={h} /></div>)}{creative.headlines.length > 5 && <p className="text-[10px] text-muted-foreground mt-1">+{creative.headlines.length - 5} more headlines saved</p>}</div></motion.div>)}</AnimatePresence>
    </div>
  );
}

function CreativeGenerationInner() {
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [platform, setPlatform] = useState("");
  const [tone, setTone] = useState("");
  const [goal, setGoal] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [offer, setOffer] = useState("");
  const [language, setLanguage] = useState("Hinglish");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ headlines: string[]; adCopies: string[]; imagePrompts: string[]; videoScript: string; ctaOptions: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState<"generate" | "library">("generate");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState<string | null>(null);

  useEffect(() => {}, []);

  const generateCreatives = useAction(api.creativeAi.generateCreatives);
  const scanWebsite = useAction(api.campaignAi.scanWebsiteForCampaign);
  const saveCreative = useMutation(api.creatives.saveCreative);
  const deleteCreative = useMutation(api.creatives.deleteCreative);
  const library = useQuery(api.creatives.listCreatives);

  const handleScanWebsite = async () => {
    if (!websiteUrl) return;
    setScanning(true); setScanDone(null);
    try {
      let url = websiteUrl.trim();
      if (!url.startsWith("http")) url = "https://" + url;
      const result = await scanWebsite({ url });
      if (!result.success) { toast.error(result.error ?? "Website scan failed"); return; }
      if (result.businessName) setProductName(result.businessName);
      if (result.description) setProductDescription(result.description);
      if (result.interests) setTargetAudience(result.interests);
      if (result.adCopy) setOffer(result.adCopy.slice(0, 80));
      setScanDone(result.businessName ?? "your business");
      toast.success(`Website scanned! Details auto-filled for ${result.businessName ?? "your business"}`);
    } catch { toast.error("Could not scan website. Check the URL."); }
    finally { setScanning(false); }
  };

  const handleGenerate = async () => {
    if (!productName.trim() || !platform || !tone || !goal) { toast.error("Product name, platform, tone aur goal required hai"); return; }
    setLoading(true); setResult(null);
    try {
      const res = await generateCreatives({ productName, productDescription: productDescription || productName, platform, tone, goal, targetAudience: targetAudience || "Indian audience", offer: offer || "Best in class", language });
      setResult(res);
      await saveCreative({ productName, platform, tone, goal, headlines: res.headlines, adCopies: res.adCopies, imagePrompts: res.imagePrompts, videoScript: res.videoScript, ctaOptions: res.ctaOptions });
      toast.success("Creatives generated & saved to library!");
    } catch { toast.error("Generation failed. HERCULES_API_KEY Secrets tab mein set karein."); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-6 min-h-0">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="size-11 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center"><Wand2 size={18} className="text-white" /></div>
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight font-serif">Creative Generation Agent</h1>
          <p className="text-sm text-muted-foreground">AI-powered headlines, copy, image prompts & video scripts</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-pink-400 animate-pulse" /><span className="text-xs text-muted-foreground hidden sm:block">Agent Ready</span></div>
      </motion.div>

      <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit">
        {(["generate", "library"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer", activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {tab === "library" ? `Creative Library (${library?.length ?? 0})` : "Generate Creatives"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "generate" ? (
          <motion.div key="generate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-primary/20 flex items-center justify-center"><Zap size={13} className="text-primary" /></div>
                <div><p className="text-xs font-bold text-foreground">AI Website Scanner</p><p className="text-[10px] text-muted-foreground">Apni website ka URL daalo \u2014 AI khud padh kar Product, Description, Audience sab fill kar dega</p></div>
              </div>
              <div className="flex gap-2">
                <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleScanWebsite()} placeholder="https://yourwebsite.com" className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <Button onClick={handleScanWebsite} disabled={scanning || !websiteUrl} size="sm" className="rounded-xl gap-1.5 px-4 shrink-0">{scanning ? <><Loader2 size={13} className="animate-spin" />Scanning...</> : <><Zap size={13} />Scan & Fill</>}</Button>
              </div>
              {scanning && <div className="flex items-center gap-2 text-xs text-primary"><Loader2 size={11} className="animate-spin" />AI website padh raha hai aur details fill kar raha hai...</div>}
              {scanDone && !scanning && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-400 shrink-0" /><p className="text-xs font-semibold text-emerald-400">{scanDone} \u2014 Product details auto-filled! Ab platform & tone select karo.</p></div>}
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2"><Megaphone size={14} className="text-pink-400" /><h3 className="text-sm font-bold text-foreground">Product Details</h3></div>
                <div className="flex flex-col gap-3">
                  <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Product / Brand *</label><input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. GRX Trading App" className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                  <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Product Description</label><textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="Short description of what you sell..." rows={2} className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" /></div>
                  <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Target Audience</label><input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g. Crypto traders 22-40, India" className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                  <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Main Offer</label><input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="e.g. 0% Trading Fee for 30 days" className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2"><Palette size={14} className="text-violet-400" /><h3 className="text-sm font-bold text-foreground">Creative Settings</h3></div>
                <div className="flex flex-col gap-3">
                  <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Platform *</label><Select value={platform} onValueChange={setPlatform}><SelectTrigger className="rounded-xl bg-background/60"><SelectValue placeholder="Select platform" /></SelectTrigger><SelectContent>{PLATFORMS.map((p) => <SelectItem key={p.value} value={p.value}><div className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: p.color }} />{p.label}</div></SelectItem>)}</SelectContent></Select></div>
                  <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Tone *</label><Select value={tone} onValueChange={setTone}><SelectTrigger className="rounded-xl bg-background/60"><SelectValue placeholder="Select tone" /></SelectTrigger><SelectContent>{TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                  <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Campaign Goal *</label><Select value={goal} onValueChange={setGoal}><SelectTrigger className="rounded-xl bg-background/60"><SelectValue placeholder="Select goal" /></SelectTrigger><SelectContent>{GOALS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
                  <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Language</label><Select value={language} onValueChange={setLanguage}><SelectTrigger className="rounded-xl bg-background/60"><SelectValue /></SelectTrigger><SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
                </div>
              </motion.div>
            </div>

            <Button onClick={handleGenerate} disabled={loading || !productName.trim() || !platform || !tone || !goal} size="lg" className="w-full rounded-2xl py-6 text-base font-bold gap-3 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400">
              {loading ? <><Loader2 size={18} className="animate-spin" />AI Agent Writing Creatives...</> : <><Sparkles size={18} />Generate 10 Headlines + 5 Copies + 3 Image Prompts + Video Script</>}
            </Button>
            {loading && <p className="text-center text-xs text-muted-foreground -mt-3 animate-pulse">Generating headlines, copies, image prompts, video script...</p>}

            <AnimatePresence>{result && <CreativeResult result={result} productName={productName} platform={platform} />}</AnimatePresence>
          </motion.div>
        ) : (
          <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
            {!library ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)
            ) : library.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="size-12 rounded-2xl bg-muted flex items-center justify-center"><Library size={20} className="text-muted-foreground" /></div>
                <p className="text-sm font-semibold text-foreground">Creative library is empty</p>
                <p className="text-xs text-muted-foreground">Generate your first creative set to save it here</p>
                <Button size="sm" variant="ghost" onClick={() => setActiveTab("generate")}>Generate Creatives</Button>
              </div>
            ) : (
              library.map((item) => <LibraryItem key={item._id} creative={item} onDelete={async () => { await deleteCreative({ id: item._id }); toast.success("Deleted from library"); }} />)
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Separator />
      <p className="text-[10px] text-muted-foreground text-center pb-4">Creative Generation Agent \u00b7 Powered by PraisonAI</p>
    </div>
  );
}

export default function CreativeGenerationPage() {
  return (
    <>
      <AuthLoading><div className="flex flex-col gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div></AuthLoading>
      
      <><CreativeGenerationInner /></>
    </>
  );
}
