import { useState } from "react";
import { useAction, useMutation, useQuery } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import { Authenticated, Unauthenticated, AuthLoading } from "@/lib/convex-supabase-adapter";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Brain,
  Loader2,
  Sparkles,
  Users,
  Target,
  TrendingUp,
  Lightbulb,
  Megaphone,
  Globe,
  Trash2,
  ChevronRight,
  BarChart3,
  Clock,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

// ── Types ─────────────────────────────────────────────────────────────────────
type AnalysisResult = {
  audienceSegments: { segment: string; size: string; interest: string }[];
  bestOffer: string;
  adAngles: string[];
  trends: string[];
  winningHeadlines: string[];
  recommendedPlatforms: string[];
  summary: string;
};

const INDUSTRIES = [
  "FinTech / Crypto",
  "EdTech",
  "eCommerce",
  "Real Estate",
  "Health & Wellness",
  "SaaS / Software",
  "Fashion & Lifestyle",
  "Food & Beverage",
  "Travel & Tourism",
  "Insurance",
  "Gaming",
  "Other",
];

const GOALS = [
  "Lead Generation",
  "App Installs",
  "Website Traffic",
  "Product Sales",
  "Brand Awareness",
  "Retargeting / Conversions",
];

const PLATFORM_META: Record<string, { color: string; label: string }> = {
  facebook: { color: "#1877F2", label: "Facebook" },
  google: { color: "#EA4335", label: "Google" },
  tiktok: { color: "#69C9D0", label: "TikTok" },
  linkedin: { color: "#0A66C2", label: "LinkedIn" },
  instagram: { color: "#E1306C", label: "Instagram" },
};

// ── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({
  icon: Icon,
  title,
  color,
  children,
  delay = 0,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  color: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const }}
      className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4"
    >
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
          <span style={{ color }}><Icon size={16} /></span>
        </div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

// ── Analysis Result View ──────────────────────────────────────────────────────
function AnalysisView({ result }: { result: AnalysisResult }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="md:col-span-2 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <Brain size={15} className="text-primary" />
          <p className="text-xs font-bold text-primary">AI Market Summary</p>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
      </motion.div>

      <SectionCard icon={Users} title="Target Audience Segments" color="#8B5CF6" delay={0.05}>
        <div className="flex flex-col gap-3">
          {result.audienceSegments.map((seg, i) => (
            <div key={i} className="rounded-xl border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-foreground">{seg.segment}</p>
                <Badge variant="secondary" className="text-[10px]">{seg.size}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">{seg.interest}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={Target} title="Best Ad Angles" color="#F59E0B" delay={0.1}>
        <div className="flex flex-col gap-2">
          {result.adAngles.map((angle, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="size-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-xs text-foreground leading-relaxed">{angle}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={Sparkles} title="Best Offer to Run" color="#10B981" delay={0.15}>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm font-bold text-emerald-400">{result.bestOffer}</p>
        </div>
      </SectionCard>

      <SectionCard icon={Megaphone} title="Winning Headlines" color="#3B82F6" delay={0.2}>
        <div className="flex flex-col gap-2">
          {result.winningHeadlines.map((h, i) => (
            <div key={i} className="flex items-center gap-2 group">
              <ChevronRight size={12} className="text-blue-400 shrink-0" />
              <p className="text-xs text-foreground">{h}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={TrendingUp} title="Market Trends" color="#EC4899" delay={0.25}>
        <div className="flex flex-col gap-2">
          {result.trends.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="size-1.5 rounded-full bg-pink-400 mt-1.5 shrink-0" />
              <p className="text-xs text-foreground leading-relaxed">{t}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={Globe} title="Recommended Platforms" color="#06B6D4" delay={0.3}>
        <div className="flex flex-wrap gap-2">
          {result.recommendedPlatforms.map((p) => (
            <div
              key={p}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold"
              style={{
                borderColor: `${PLATFORM_META[p]?.color ?? "#6B7280"}40`,
                color: PLATFORM_META[p]?.color ?? "#6B7280",
                background: `${PLATFORM_META[p]?.color ?? "#6B7280"}10`,
              }}
            >
              <span className="size-2 rounded-full" style={{ background: PLATFORM_META[p]?.color ?? "#6B7280" }} />
              {PLATFORM_META[p]?.label ?? p}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ── History Item ──────────────────────────────────────────────────────────────
function HistoryItem({
  analysis,
  onSelect,
  onDelete,
}: {
  analysis: {
    _id: Id<"marketAnalyses">;
    productName: string;
    industry: string;
    createdAt: string;
    summary: string;
  };
  onSelect: () => void;
  onDelete: () => void;
}) {
  const date = new Date(analysis.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all">
      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <BookOpen size={13} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{analysis.productName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{analysis.industry}</Badge>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock size={9} />{date}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onSelect}>
          View
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  );
}

// ── Inner Page ────────────────────────────────────────────────────────────────
function MarketIntelligenceInner() {
  const [productName, setProductName] = useState("");
  const [industry, setIndustry] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [budget, setBudget] = useState("");
  const [goal, setGoal] = useState("");
  const [competitorAds, setCompetitorAds] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<"analyze" | "history">("analyze");

  const runAnalysis = useAction(api.marketAi.runMarketAnalysis);
  const saveAnalysis = useMutation(api.marketIntelligence.saveAnalysis);
  const deleteAnalysis = useMutation(api.marketIntelligence.deleteAnalysis);
  const history = useQuery(api.marketIntelligence.listAnalyses);

  const handleRun = async () => {
    if (!productName.trim() || !industry || !goal) {
      toast.error("Product name, industry aur goal required hai");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await runAnalysis({
        productName,
        industry,
        competitorAds: competitorAds || "No competitor data provided",
        targetMarket: targetMarket || "India",
        budget: budget || "\u20b950,000/month",
        goal,
      });
      setResult(res);
      await saveAnalysis({
        productName,
        industry,
        competitorAds: competitorAds || "No competitor data provided",
        targetMarket: targetMarket || "India",
        audienceSegments: res.audienceSegments,
        bestOffer: res.bestOffer,
        adAngles: res.adAngles,
        trends: res.trends,
        winningHeadlines: res.winningHeadlines,
        recommendedPlatforms: res.recommendedPlatforms,
        summary: res.summary,
      });
      toast.success("Market analysis complete!");
    } catch {
      toast.error("Analysis failed. HERCULES_API_KEY Secrets tab mein set karein.");
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryItem = (item: {
    audienceSegments: { segment: string; size: string; interest: string }[];
    bestOffer: string;
    adAngles: string[];
    trends: string[];
    winningHeadlines: string[];
    recommendedPlatforms: string[];
    summary: string;
  }) => {
    setResult(item);
    setActiveTab("analyze");
  };

  return (
    <div className="flex flex-col gap-6 min-h-0">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="size-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <BarChart3 size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight font-serif">
            Market Intelligence Agent
          </h1>
          <p className="text-sm text-muted-foreground">AI-powered competitor analysis & audience research</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-xs text-muted-foreground hidden sm:block">Agent Ready</span>
        </div>
      </motion.div>

      <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit">
        {(["analyze", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer capitalize",
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "history" ? `History (${history?.length ?? 0})` : "New Analysis"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "analyze" ? (
          <motion.div
            key="analyze"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb size={14} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-foreground">Product Info</h3>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Product / Brand Name *</label>
                    <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. GRX Trading App" className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Industry *</label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger className="rounded-xl bg-background/60"><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>{INDUSTRIES.map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Target Market</label>
                    <input value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)} placeholder="e.g. India, Tier-1 cities, 22-40 age" className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4"
              >
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-blue-400" />
                  <h3 className="text-sm font-bold text-foreground">Campaign Goals</h3>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Campaign Goal *</label>
                    <Select value={goal} onValueChange={setGoal}>
                      <SelectTrigger className="rounded-xl bg-background/60"><SelectValue placeholder="What do you want to achieve?" /></SelectTrigger>
                      <SelectContent>{GOALS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Monthly Ad Budget</label>
                    <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. \u20b91,00,000" className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="md:col-span-2 rounded-2xl border border-border bg-card p-5 flex flex-col gap-4"
              >
                <div className="flex items-center gap-2">
                  <Megaphone size={14} className="text-pink-400" />
                  <h3 className="text-sm font-bold text-foreground">Competitor Ads & Market Data</h3>
                  <Badge variant="secondary" className="text-[10px] ml-auto">Optional</Badge>
                </div>
                <textarea
                  value={competitorAds}
                  onChange={(e) => setCompetitorAds(e.target.value)}
                  placeholder={`Paste competitor ad copy, headlines, or any market info here...\n\nExample:\n- Competitor A runs "0% Trading Fee" angle on Facebook\n- Competitor B targeting Crypto traders with fear-based ads\n- Google Trends shows spike in "P2P trading India" searches`}
                  rows={5}
                  className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Button
                onClick={handleRun}
                disabled={loading || !productName.trim() || !industry || !goal}
                size="lg"
                className="w-full rounded-2xl py-6 text-base font-bold gap-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
              >
                {loading ? (<><Loader2 size={18} className="animate-spin" />AI Agent Analyzing Market...</>) : (<><Sparkles size={18} />Run Market Intelligence Analysis</>)}
              </Button>
              {loading && <p className="text-center text-xs text-muted-foreground mt-2 animate-pulse">Analyzing competitor data, audience segments, trends...</p>}
            </motion.div>

            <AnimatePresence>
              {result && <AnalysisView result={result} />}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
            {!history ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="size-12 rounded-2xl bg-muted flex items-center justify-center"><BookOpen size={20} className="text-muted-foreground" /></div>
                <p className="text-sm font-semibold text-foreground">No analyses yet</p>
                <p className="text-xs text-muted-foreground">Run your first market analysis to see history</p>
                <Button size="sm" variant="ghost" onClick={() => setActiveTab("analyze")}>Start Analysis</Button>
              </div>
            ) : (
              history.map((item) => (
                <HistoryItem key={item._id} analysis={item} onSelect={() => loadHistoryItem(item)} onDelete={async () => { await deleteAnalysis({ id: item._id }); toast.success("Analysis deleted"); }} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Separator />
      <p className="text-[10px] text-muted-foreground text-center pb-4">Market Intelligence Agent \u00b7 Powered by PraisonAI</p>
    </div>
  );
}

export default function MarketIntelligencePage() {
  return (
    <>
      <AuthLoading>
        <div className="flex flex-col gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      </AuthLoading>
      
      <><MarketIntelligenceInner /></>
    </>
  );
}
