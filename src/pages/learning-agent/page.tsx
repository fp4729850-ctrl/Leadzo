import { useState } from "react";
import { useQuery, useMutation, useAction } from "@/lib/convex-supabase-adapter.ts";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Authenticated, Unauthenticated } from "@/lib/convex-supabase-adapter.ts";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Brain, BookOpen, Lightbulb, TrendingUp, BarChart2,
  RefreshCw, Trash2, CheckCircle2, Sparkles, Target, DollarSign,
  Users, MessageSquare, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { cn } from "@/lib/utils.ts";

const TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  headline: { label: "Headline", icon: MessageSquare, color: "text-primary" },
  audience: { label: "Audience", icon: Users, color: "text-chart-2" },
  creative: { label: "Creative", icon: Sparkles, color: "text-chart-4" },
  platform_combo: { label: "Platform Combo", icon: Target, color: "text-chart-3" },
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  google: "bg-red-500/10 text-red-400 border-red-500/20",
  tiktok: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  linkedin: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  instagram: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

function MetricBadge({ metric, value }: { metric: string; value: number }) {
  const formatted =
    metric === "roas" ? `${value.toFixed(2)}x`
    : metric === "ctr" ? `${value.toFixed(2)}%`
    : metric === "cpc" || metric === "cpa" ? `\u20b9${value.toFixed(0)}`
    : value.toFixed(0);
  return <span className="text-xs font-semibold text-chart-3">{metric.toUpperCase()}: {formatted}</span>;
}

function LearningAgentInner() {
  const learnings = useQuery(api.learningAgent.listLearnings, {}) ?? [];
  const summaries = useQuery(api.learningAgent.listDailySummaries) ?? [];
  const suggestions = useQuery(api.learningAgent.listSuggestions) ?? [];
  const adCampaigns = useQuery(api.adCampaigns.list) ?? [];
  const launchedCampaigns = useQuery(api.launchedCampaigns.listLaunchedCampaigns) ?? [];

  const deleteLearning = useMutation(api.learningAgent.deleteLearning);
  const markUsed = useMutation(api.learningAgent.markSuggestionUsed);
  const generateSummary = useAction(api.learningAi.generateDailySummary);

  const [analyzing, setAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<{ aiSummary: string; keyInsights: string[]; winningHeadlines: { headline: string; platform: string; roas: number }[]; winningAudiences: { audience: string; platform: string; ctr: number }[] } | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const handleAnalyze = async () => {
    if (adCampaigns.length === 0) { toast.info("No ad campaign data found. Add some campaigns first."); return; }
    setAnalyzing(true); setLastResult(null);
    try {
      const result = await generateSummary({
        adCampaigns: adCampaigns.map((c) => ({ name: c.name, platform: c.platform, spend: c.spend, revenue: c.revenue, impressions: c.impressions, clicks: c.clicks, conversions: c.conversions, date: c.date })),
        launchedCampaigns: launchedCampaigns.map((c) => ({ name: c.name, platform: c.platform, adHeadline: c.adHeadline, audience: c.audience, budget: c.budget })),
      });
      setLastResult(result);
      toast.success("Learning Agent ran \u2014 knowledge base updated!");
    } catch { toast.error("AI analysis failed \u2014 check HERCULES_API_KEY secret"); }
    finally { setAnalyzing(false); }
  };

  const filteredLearnings = filterType === "all" ? learnings : learnings.filter((l) => l.type === filterType);
  const latestSummary = summaries[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight font-serif flex items-center gap-2"><Brain className="text-primary" size={22} />Learning Agent</h1>
          <p className="text-sm text-muted-foreground mt-1">Pattern recognition \u00b7 Knowledge base \u00b7 Auto-suggestions for next campaigns</p>
        </div>
        <Button onClick={handleAnalyze} disabled={analyzing} size="sm">
          <RefreshCw size={14} className={cn(analyzing && "animate-spin")} />{analyzing ? "Analyzing\u2026" : "Run Daily Analysis"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Learnings Stored", value: learnings.length, icon: BookOpen, color: "text-primary" },
          { label: "Daily Summaries", value: summaries.length, icon: BarChart2, color: "text-chart-3" },
          { label: "Suggestions", value: suggestions.filter((s) => !s.isUsed).length, icon: Lightbulb, color: "text-chart-4" },
          { label: "Avg ROAS (latest)", value: latestSummary ? `${latestSummary.avgRoas.toFixed(2)}x` : "\u2014", icon: TrendingUp, color: "text-chart-2" },
        ].map((s) => (
          <Card key={s.label} className="bg-card/60 border-border/60">
            <CardContent className="py-4 flex items-center gap-3">
              <s.icon size={18} className={s.color} />
              <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {analyzing && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Card className="bg-primary/5 border-primary/20"><CardContent className="py-10 text-center space-y-3"><Brain size={40} className="mx-auto text-primary animate-pulse" /><p className="text-sm text-muted-foreground">Learning Agent is analyzing campaigns, recognizing patterns, and building your knowledge base\u2026</p></CardContent></Card></motion.div>}
        {lastResult && !analyzing && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-primary flex items-center gap-2"><Sparkles size={14} /> Today's AI Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground/80">{lastResult.aiSummary}</p>
                <div className="space-y-1">{lastResult.keyInsights.map((ins, i) => <div key={i} className="flex items-start gap-2 text-xs text-foreground/70"><ChevronRight size={12} className="text-primary mt-0.5 shrink-0" />{ins}</div>)}</div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs defaultValue="knowledge">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="summaries">Daily Summaries</TabsTrigger>
          <TabsTrigger value="suggestions">Auto-Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge" className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {["all", "headline", "audience", "creative", "platform_combo"].map((t) => (
              <button key={t} onClick={() => setFilterType(t)} className={cn("px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer", filterType === t ? "bg-primary/10 border-primary/40 text-primary" : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border")}>
                {t === "all" ? "All" : TYPE_LABELS[t]?.label ?? t}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground self-center">{filteredLearnings.length} entry(ies)</span>
          </div>

          {filteredLearnings.length === 0 ? (
            <Card className="bg-card/40 border-dashed border-border/50"><CardContent className="py-12 text-center"><BookOpen size={32} className="mx-auto text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">No learnings yet \u2014 run the Daily Analysis to populate the knowledge base</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredLearnings.map((l) => {
                  const meta = TYPE_LABELS[l.type];
                  const Icon = meta?.icon ?? BookOpen;
                  return (
                    <motion.div key={l._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                      <Card className="bg-card/60 border-border/60 hover:border-border transition-all">
                        <CardContent className="py-3 flex items-start gap-3">
                          <div className={cn("mt-0.5 shrink-0", meta?.color ?? "text-muted-foreground")}><Icon size={15} /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 border", PLATFORM_COLORS[l.platform] ?? "")}>{l.platform}</Badge>
                              <Badge variant="secondary" className="text-[10px] px-1.5">{meta?.label ?? l.type}</Badge>
                              <MetricBadge metric={l.metric} value={l.metricValue} />
                            </div>
                            <p className="text-sm text-foreground/85 mt-1">{l.value}</p>
                            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Campaign: {l.campaignName} \u00b7 {new Date(l.learnedAt).toLocaleDateString()}</p>
                          </div>
                          <button onClick={async () => { await deleteLearning({ id: l._id as Id<"campaignLearnings"> }); toast.success("Learning removed"); }} className="text-muted-foreground hover:text-red-400 transition-colors shrink-0 mt-0.5 cursor-pointer"><Trash2 size={13} /></button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="summaries" className="mt-4 space-y-3">
          {summaries.length === 0 ? (
            <Card className="bg-card/40 border-dashed border-border/50"><CardContent className="py-12 text-center"><BarChart2 size={32} className="mx-auto text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">No daily summaries yet</p></CardContent></Card>
          ) : (
            <AnimatePresence>
              {summaries.map((s) => (
                <motion.div key={s._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="bg-card/60 border-border/60">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-sm">{s.date}</CardTitle>
                        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>\u20b9{s.totalSpend.toFixed(0)} spend</span>
                          <span className="text-chart-3 font-semibold">\u20b9{s.totalRevenue.toFixed(0)} revenue</span>
                          <span>ROAS {s.avgRoas.toFixed(2)}x</span>
                          <span>CTR {s.avgCtr.toFixed(2)}%</span>
                          <Badge variant="outline" className={cn("text-[10px] border", PLATFORM_COLORS[s.topPlatform] ?? "")}>Top: {s.topPlatform}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-foreground/80">{s.aiSummary}</p>
                      {s.keyInsights.length > 0 && <div className="space-y-1">{s.keyInsights.map((ins, i) => <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground"><ChevronRight size={11} className="text-primary mt-0.5 shrink-0" />{ins}</div>)}</div>}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="mt-4 space-y-3">
          {suggestions.length === 0 ? (
            <Card className="bg-card/40 border-dashed border-border/50">
              <CardContent className="py-12 text-center">
                <Lightbulb size={32} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No suggestions yet \u2014 run Daily Analysis to get AI-powered next campaign ideas</p>
                <Button size="sm" className="mt-4" onClick={handleAnalyze} disabled={analyzing}><Brain size={14} /> Run Analysis</Button>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {suggestions.map((s) => (
                <motion.div key={s._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn(s.isUsed && "opacity-50")}>
                  <Card className="bg-card/60 border-border/60">
                    <CardContent className="py-4 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 border", PLATFORM_COLORS[s.platform] ?? "")}>{s.platform}</Badge>
                        <span className="text-xs text-chart-3 font-semibold">Expected ROAS {s.expectedRoas.toFixed(2)}x</span>
                        <span className="text-xs text-muted-foreground">Budget \u20b9{s.suggestedBudget.toLocaleString()}</span>
                        {s.isUsed && <Badge variant="secondary" className="text-[10px] px-1.5 text-chart-3 ml-auto"><CheckCircle2 size={10} className="mr-0.5" /> Used</Badge>}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-start gap-2"><MessageSquare size={12} className="text-primary mt-0.5 shrink-0" /><p className="text-sm font-medium">{s.suggestedHeadline}</p></div>
                        <div className="flex items-start gap-2"><Users size={12} className="text-chart-2 mt-0.5 shrink-0" /><p className="text-xs text-muted-foreground">{s.suggestedAudience}</p></div>
                        <div className="flex items-start gap-2"><DollarSign size={12} className="text-chart-3 mt-0.5 shrink-0" /><p className="text-xs text-foreground/70">{s.reasoning}</p></div>
                      </div>
                      {!s.isUsed && (
                        <Button size="sm" variant="secondary" className="text-xs mt-1" onClick={async () => { await markUsed({ id: s._id as Id<"campaignSuggestions"> }); toast.success("Marked as used \u2014 check Campaign Launch to apply it"); }}>
                          <CheckCircle2 size={12} /> Mark as Used
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function LearningAgentPage() {
  return (
    <>
      <><LearningAgentInner /></>
      
    </>
  );
}
