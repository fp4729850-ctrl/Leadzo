import React, { useState } from "react";
import {
  BarChart, Activity, ShieldCheck, Zap, Globe, FileText, Settings, Database,
  MessageSquare, Sliders, CheckCircle2, TrendingUp, AlertTriangle, Loader2,
  Search, Users, Bot, Clock, Target, ArrowUpRight, BookOpen, Link2,
  AlertCircle, CheckCircle, XCircle, BarChart2, Lightbulb, Calendar,
  Download, RefreshCw, ChevronRight, Star, Info
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { supabase } from "@/lib/supabase.ts";

const TABS = [
  { id: "ai-visibility", label: "AI Visibility", icon: Globe },
  { id: "content-intelligence", label: "Content Intelligence", icon: FileText },
  { id: "tech-optimization", label: "Technical Optimization", icon: Sliders },
  { id: "competitor-intel", label: "Competitor Intelligence", icon: BarChart },
  { id: "ai-agents", label: "AI Agent Center", icon: Bot },
  { id: "recommendations", label: "Recommendations", icon: CheckCircle2 },
  { id: "reports", label: "Reports", icon: Database },
  { id: "automation", label: "Automation", icon: Activity },
  { id: "settings-center", label: "Settings", icon: Settings },
];

type ScanData = {
  scores: { aiVisibility: number; llmReadiness: number; seoHealth: number; authorityScore: number };
  highImpactTasks: { priority: string; title: string; impact: string; reason: string }[];
  recentImprovements: { title: string; gain: string }[];
  aiVisibilityCenter: any;
  contentIntelligence: any;
  technicalOptimization: any;
  competitorIntelligence: any;
  aiAgentCenter: any;
  recommendations: any[];
};

export default function AiRankingOsPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScan = async () => {
    if (!domain.trim()) return;
    setLoading(true);
    setError(null);
    setScanData(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("aiRankingOs_scan", {
        body: { url: domain.trim() }
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.success && data?.data) {
        setScanData(data.data);
      } else {
        throw new Error("Scan returned no data.");
      }
    } catch (e: any) {
      setError(e.message || "Scan failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") runScan();
  };

  const scores = scanData?.scores;

  return (
    <div className="flex flex-col h-full bg-background/50 overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Zap className="text-primary" size={22} />
            AI Ranking OS
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            End-to-end SEO & AI Visibility Platform — Vol. 1–7
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={handleKeyDown}
            className="sm:w-72 bg-secondary/30 text-sm"
            placeholder="https://yourwebsite.com"
          />
          <Button onClick={runScan} disabled={loading} className="shrink-0 bg-primary text-primary-foreground text-sm">
            {loading ? <><Loader2 className="animate-spin mr-1.5" size={14} />Scanning...</> : <><Search size={14} className="mr-1.5" />Run Scan</>}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
            <div className="relative size-20">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
              <div className="absolute inset-2 rounded-full border-4 border-primary/40 animate-ping" />
              <Zap className="absolute inset-0 m-auto text-primary" size={28} />
            </div>
            <p className="text-foreground font-semibold text-lg">AI Ranking OS Analyzing...</p>
            <p className="text-muted-foreground text-sm max-w-sm">Crawling site, running 6 AI agents, calculating your AI Visibility Score and 9 center reports.</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-semibold text-red-400">Scan Failed</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Default State — No Scan Yet */}
        {!loading && !scanData && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Globe className="text-primary" size={28} />
            </div>
            <p className="text-lg font-semibold text-foreground">Connect Your Website</p>
            <p className="text-muted-foreground text-sm max-w-md">Enter your domain above and click <strong>Run Scan</strong> to get your AI Visibility Score, SEO audit, and 9 center analysis powered by AI agents.</p>
          </div>
        )}

        {/* Scan Results */}
        {!loading && scanData && (
          <>
            {/* Score Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <ScoreCard title="AI Visibility" score={scores!.aiVisibility} icon={Globe} color="text-blue-500" />
              <ScoreCard title="LLM Readiness" score={scores!.llmReadiness} icon={MessageSquare} color="text-purple-500" />
              <ScoreCard title="SEO Health" score={scores!.seoHealth} icon={Activity} color="text-green-500" />
              <ScoreCard title="Authority Score" score={scores!.authorityScore} icon={ShieldCheck} color="text-amber-500" />
            </div>

            {/* Quick Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-border/50 bg-secondary/10 rounded-xl p-4">
                <h3 className="font-semibold text-xs text-foreground flex items-center gap-1.5 mb-3 uppercase tracking-wide">
                  <AlertTriangle size={14} className="text-red-400" /> Top High-Impact Tasks
                </h3>
                <div className="space-y-2">
                  {scanData.highImpactTasks.slice(0, 4).map((t, i) => (
                    <TaskItem key={i} priority={t.priority} title={t.title} impact={t.impact} />
                  ))}
                </div>
              </div>
              <div className="border border-border/50 bg-secondary/10 rounded-xl p-4">
                <h3 className="font-semibold text-xs text-foreground flex items-center gap-1.5 mb-3 uppercase tracking-wide">
                  <TrendingUp size={14} className="text-green-400" /> Recent Improvements
                </h3>
                <div className="space-y-2">
                  {scanData.recentImprovements.slice(0, 4).map((r, i) => (
                    <ImprovementItem key={i} title={r.title} gain={r.gain} />
                  ))}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-border">
              <div className="flex overflow-x-auto gap-5 pb-px">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 pb-2.5 text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tab.icon size={13} />{tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="border border-border/30 rounded-xl bg-card p-5 shadow-sm">
              {activeTab === "ai-visibility" && <AIVisibilityCenter data={scanData.aiVisibilityCenter} />}
              {activeTab === "content-intelligence" && <ContentIntelligenceCenter data={scanData.contentIntelligence} />}
              {activeTab === "tech-optimization" && <TechnicalOptimizationCenter data={scanData.technicalOptimization} />}
              {activeTab === "competitor-intel" && <CompetitorIntelligenceCenter data={scanData.competitorIntelligence} />}
              {activeTab === "ai-agents" && <AIAgentCenter data={scanData.aiAgentCenter} />}
              {activeTab === "recommendations" && <RecommendationCenter data={scanData.recommendations} />}
              {activeTab === "reports" && <ReportsCenter domain={domain} scores={scanData.scores} />}
              {activeTab === "automation" && <AutomationCenter />}
              {activeTab === "settings-center" && <SettingsCenter />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Score Card ---
function ScoreCard({ title, score, icon: Icon, color }: { title: string; score: number; icon: any; color: string }) {
  const trend = score >= 75 ? "↑ Good" : score >= 50 ? "→ Needs Work" : "↓ Critical";
  const trendColor = score >= 75 ? "text-green-500" : score >= 50 ? "text-amber-500" : "text-red-500";
  return (
    <div className="border border-border/50 bg-card rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        <Icon size={15} className={color} />
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-foreground">{score}</span>
        <span className={`text-[10px] font-semibold ${trendColor}`}>{trend}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-secondary/50">
        <div className={`h-1.5 rounded-full transition-all ${score >= 75 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function TaskItem({ priority, title, impact }: { priority: string; title: string; impact: string }) {
  const c = priority === "P0" ? "border-red-500/20 text-red-400 bg-red-500/10" : "border-orange-500/20 text-orange-400 bg-orange-500/10";
  return (
    <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/20 bg-background/40">
      <Badge variant="outline" className={`text-[9px] shrink-0 mt-0.5 px-1.5 ${c}`}>{priority}</Badge>
      <p className="text-xs text-foreground/90 flex-1">{title}</p>
      <Badge variant="secondary" className="text-[9px] shrink-0 whitespace-nowrap">{impact}</Badge>
    </div>
  );
}

function ImprovementItem({ title, gain }: { title: string; gain: string }) {
  return (
    <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/20 bg-background/40">
      <p className="text-xs text-foreground/90 truncate">{title}</p>
      <span className="text-[10px] font-bold text-green-400 whitespace-nowrap shrink-0">{gain}</span>
    </div>
  );
}

// --- AI Visibility Center ---
function AIVisibilityCenter({ data }: { data: any }) {
  if (!data) return <PlaceholderView title="AI Visibility Center" />;
  return (
    <div className="space-y-5">
      <SectionHeader icon={Globe} title="Entity Coverage" desc="Recognized brand, product, and topic entities on your site." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.entityCoverage?.map((e: any, i: number) => (
          <div key={i} className="p-3 rounded-lg border border-border/30 bg-secondary/10 flex items-center justify-between">
            <div><p className="text-xs font-semibold text-foreground">{e.entity}</p><p className="text-[10px] text-muted-foreground mt-0.5">{e.type}</p></div>
            <StatusBadge status={e.status} />
          </div>
        ))}
      </div>

      <SectionHeader icon={Target} title="Structured Data Status" desc="JSON-LD / Schema.org markup found or missing." />
      <div className="space-y-2">
        {data.structuredData?.map((s: any, i: number) => (
          <div key={i} className="flex items-start justify-between p-3 rounded-lg border border-border/30 bg-secondary/10 gap-3">
            <div className="flex items-center gap-2">
              {s.found ? <CheckCircle size={14} className="text-green-400 shrink-0" /> : <XCircle size={14} className="text-red-400 shrink-0" />}
              <p className="text-xs font-semibold text-foreground">{s.schema}</p>
            </div>
            <p className="text-[10px] text-muted-foreground text-right">{s.recommendation}</p>
          </div>
        ))}
      </div>

      <SectionHeader icon={Star} title="Topic Authority Map" desc="How well your site covers key topic clusters." />
      <div className="space-y-2">
        {data.topicAuthorityMap?.map((t: any, i: number) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-xs"><span className="text-foreground/80">{t.topic}</span><span className="text-muted-foreground">{t.coverage}%</span></div>
            <div className="h-1.5 rounded-full bg-secondary/50">
              <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${t.coverage}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Content Intelligence Center ---
function ContentIntelligenceCenter({ data }: { data: any }) {
  if (!data) return <PlaceholderView title="Content Intelligence Center" />;
  return (
    <div className="space-y-5">
      <SectionHeader icon={BookOpen} title="Content Gaps" desc="Topics your competitors cover that you are missing." />
      <div className="space-y-2">
        {data.gaps?.map((g: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-secondary/10 gap-3">
            <div><p className="text-xs font-semibold text-foreground">{g.topic}</p><p className="text-[10px] text-muted-foreground">{g.searchIntent}</p></div>
            <PriorityBadge p={g.priority} />
          </div>
        ))}
      </div>

      <SectionHeader icon={MessageSquare} title="AI-Suggested FAQs" desc="Q&A blocks that improve LLM citation chances." />
      <div className="space-y-2">
        {data.faqs?.map((f: any, i: number) => (
          <div key={i} className="p-3 rounded-lg border border-border/30 bg-secondary/10">
            <p className="text-xs font-semibold text-foreground mb-1">Q: {f.question}</p>
            <p className="text-[11px] text-muted-foreground">A: {f.suggestedAnswer}</p>
          </div>
        ))}
      </div>

      <SectionHeader icon={Link2} title="Internal Link Suggestions" desc="Connect these pages to strengthen topic authority." />
      <div className="space-y-2">
        {data.internalLinks?.map((l: any, i: number) => (
          <div key={i} className="flex items-center gap-2 p-3 rounded-lg border border-border/30 bg-secondary/10 text-xs">
            <span className="text-muted-foreground truncate">{l.from}</span>
            <ChevronRight size={12} className="text-primary shrink-0" />
            <span className="text-foreground truncate">{l.to}</span>
            <Badge variant="outline" className="ml-auto text-[9px] shrink-0">{l.anchor}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Technical Optimization Center ---
function TechnicalOptimizationCenter({ data }: { data: any }) {
  if (!data) return <PlaceholderView title="Technical Optimization Center" />;
  return (
    <div className="space-y-5">
      <SectionHeader icon={AlertCircle} title="Index Issues" desc="Problems blocking search engines from crawling your site." />
      <div className="space-y-2">
        {data.indexIssues?.map((iss: any, i: number) => (
          <div key={i} className="p-3 rounded-lg border border-border/30 bg-secondary/10 flex items-start gap-3">
            {iss.severity === "Critical" ? <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" /> : <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground">{iss.issue}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Fix: {iss.fix}</p>
            </div>
            <Badge variant="outline" className={`text-[9px] shrink-0 ${iss.severity === "Critical" ? "border-red-500/20 text-red-400" : "border-amber-500/20 text-amber-400"}`}>{iss.severity}</Badge>
          </div>
        ))}
      </div>

      <SectionHeader icon={Activity} title="Core Web Vitals" desc="Page performance as measured by Google's CWV metrics." />
      {data.coreWebVitals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["lcp", "cls", "inp"].map((key) => (
            <div key={key} className="p-3 rounded-lg border border-border/30 bg-secondary/10 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">{key.toUpperCase()}</p>
              <p className="text-lg font-bold text-foreground">{data.coreWebVitals[key]}</p>
            </div>
          ))}
          <div className="p-3 rounded-lg border border-border/30 bg-secondary/10 text-center">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Status</p>
            <p className={`text-xs font-bold ${data.coreWebVitals.status === "Good" ? "text-green-400" : "text-amber-400"}`}>{data.coreWebVitals.status}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Competitor Intelligence Center ---
function CompetitorIntelligenceCenter({ data }: { data: any }) {
  if (!data) return <PlaceholderView title="Competitor Intelligence" />;
  return (
    <div className="space-y-5">
      <SectionHeader icon={BarChart2} title="Competitor Comparison" desc="How your site compares to key competitors on AI and SEO scores." />
      <div className="space-y-2">
        {data.competitors?.map((c: any, i: number) => (
          <div key={i} className="p-3 rounded-lg border border-border/30 bg-secondary/10 flex items-center gap-4">
            <p className="text-xs font-semibold text-foreground flex-1">{c.name}</p>
            <div className="flex gap-4 text-xs">
              <div className="text-center"><p className="text-[10px] text-muted-foreground">AI Score</p><p className="font-bold text-primary">{c.aiScore}</p></div>
              <div className="text-center"><p className="text-[10px] text-muted-foreground">SEO Score</p><p className="font-bold text-green-400">{c.seoScore}</p></div>
            </div>
          </div>
        ))}
      </div>

      <SectionHeader icon={Lightbulb} title="Opportunity Finder" desc="White-space opportunities your competitors are missing." />
      <div className="space-y-2">
        {data.opportunityFinder?.map((o: any, i: number) => (
          <div key={i} className="p-3 rounded-lg border border-border/30 bg-secondary/10 flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold text-foreground">{o.opportunity}</p><p className="text-[10px] text-muted-foreground">{o.potentialTraffic} potential traffic</p></div>
            <Badge variant="secondary" className="text-[9px] shrink-0">{o.difficulty}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- AI Agent Center ---
function AIAgentCenter({ data }: { data: any }) {
  if (!data) return <PlaceholderView title="AI Agent Center" />;
  return (
    <div className="space-y-5">
      <SectionHeader icon={Bot} title="Active AI Agents" desc="The 6 specialized agents analyzing your website right now." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.agents?.map((a: any, i: number) => (
          <div key={i} className="p-4 rounded-xl border border-border/30 bg-secondary/10 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">{a.name}</p>
              <span className="size-2 rounded-full bg-green-400 animate-pulse" />
            </div>
            <p className="text-[10px] text-muted-foreground">{a.currentTask}</p>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1 rounded-full bg-secondary/50">
                <div className="h-1 rounded-full bg-primary" style={{ width: `${a.confidence}%` }} />
              </div>
              <span className="text-[9px] text-muted-foreground shrink-0">{a.confidence}%</span>
            </div>
          </div>
        ))}
      </div>

      <SectionHeader icon={CheckCircle2} title="Approval Queue" desc="Agent recommendations awaiting your review." />
      <div className="space-y-2">
        {data.approvalQueue?.map((q: any, i: number) => (
          <div key={i} className="p-3 rounded-lg border border-border/30 bg-secondary/10 flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[9px] text-purple-400 border-purple-500/20">{q.agent}</Badge>
                <p className="text-xs font-semibold text-foreground">{q.action}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Target: {q.target} — {q.reason}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button size="sm" className="h-6 text-[10px] px-2 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20">Approve</Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-muted-foreground">Skip</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Recommendation Center ---
function RecommendationCenter({ data }: { data: any[] }) {
  if (!data || !data.length) return <PlaceholderView title="Recommendation Center" />;
  return (
    <div className="space-y-3">
      <SectionHeader icon={CheckCircle2} title="All Recommendations" desc="Sorted by priority. Each item has a reason, AI impact, SEO impact, effort, and estimated time." />
      {data.map((r: any, i: number) => (
        <div key={i} className="p-4 rounded-xl border border-border/30 bg-secondary/10 space-y-2">
          <div className="flex items-start gap-3 flex-wrap">
            <PriorityBadge p={r.priority} />
            <p className="text-xs font-bold text-foreground flex-1">{r.title}</p>
            <Badge variant="secondary" className="text-[9px]">{r.category}</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">{r.reason}</p>
          <div className="flex items-center gap-4 pt-1 flex-wrap">
            <Pill icon={Zap} label={`AI: ${r.aiImpact}`} color="text-blue-400" />
            <Pill icon={TrendingUp} label={`SEO: ${r.seoImpact}`} color="text-green-400" />
            <Pill icon={Target} label={`Effort: ${r.effort}`} color="text-amber-400" />
            <Pill icon={Clock} label={r.estimatedTime} color="text-purple-400" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Reports Center ---
function ReportsCenter({ domain, scores }: { domain: string; scores: any }) {
  return (
    <div className="space-y-4">
      <SectionHeader icon={Database} title="Reports" desc="Weekly and monthly performance reports with export options." />
      <div className="p-4 rounded-xl border border-border/30 bg-secondary/10 space-y-3">
        <p className="text-xs font-bold text-foreground">Weekly Summary Report</p>
        <p className="text-[10px] text-muted-foreground">Domain: {domain}</p>
        <div className="flex gap-4 flex-wrap">
          <Pill icon={Globe} label={`AI Visibility: ${scores.aiVisibility}`} color="text-blue-400" />
          <Pill icon={Activity} label={`SEO Health: ${scores.seoHealth}`} color="text-green-400" />
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5"><Download size={12} />Export PDF</Button>
          <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5"><Download size={12} />Export Excel</Button>
        </div>
      </div>
    </div>
  );
}

// --- Automation Center ---
function AutomationCenter() {
  return (
    <div className="space-y-4">
      <SectionHeader icon={Activity} title="Automation Center" desc="Set up scheduled scans, content refresh reminders and health automations." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Weekly Scan", icon: Calendar, desc: "Auto-scan every Monday at 9 AM" },
          { label: "Content Refresh", icon: RefreshCw, desc: "Alert when pages are older than 90 days" },
          { label: "Health Watch", icon: Activity, desc: "Alert if SEO Health drops below 70" },
        ].map((a, i) => (
          <div key={i} className="p-4 rounded-xl border border-border/30 bg-secondary/10 space-y-2">
            <a.icon size={20} className="text-primary" />
            <p className="text-xs font-bold text-foreground">{a.label}</p>
            <p className="text-[10px] text-muted-foreground">{a.desc}</p>
            <Button size="sm" variant="outline" className="text-[10px] h-6 w-full">Configure</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Settings Center ---
function SettingsCenter() {
  return (
    <div className="space-y-4">
      <SectionHeader icon={Settings} title="Settings" desc="Manage teams, API keys, integrations, billing and roles." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: "Teams & Roles", icon: Users, desc: "Add team members, assign permissions" },
          { label: "API Keys", icon: Info, desc: "Generate and revoke API access keys" },
          { label: "Integrations", icon: Link2, desc: "Connect GSC, GA4, CMS platforms" },
          { label: "Billing", icon: ArrowUpRight, desc: "Manage subscription and usage" },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-xl border border-border/30 bg-secondary/10 flex items-start gap-3">
            <s.icon size={16} className="text-primary mt-0.5 shrink-0" />
            <div><p className="text-xs font-bold text-foreground">{s.label}</p><p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p></div>
            <Button size="sm" variant="ghost" className="ml-auto text-[10px] h-6 shrink-0">Open</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Helpers ---
function SectionHeader({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5 pb-2 border-b border-border/30">
      <Icon size={15} className="text-primary mt-0.5 shrink-0" />
      <div><p className="text-sm font-bold text-foreground">{title}</p><p className="text-[11px] text-muted-foreground">{desc}</p></div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = status === "Covered" ? "text-green-400 border-green-500/20 bg-green-500/10" : status === "Weak" ? "text-amber-400 border-amber-500/20 bg-amber-500/10" : "text-red-400 border-red-500/20 bg-red-500/10";
  return <Badge variant="outline" className={`text-[9px] ${c}`}>{status}</Badge>;
}

function PriorityBadge({ p }: { p: string }) {
  const c = p === "P0" ? "text-red-400 border-red-500/20 bg-red-500/10" : p === "P1" ? "text-orange-400 border-orange-500/20 bg-orange-500/10" : "text-yellow-400 border-yellow-500/20 bg-yellow-500/10";
  return <Badge variant="outline" className={`text-[9px] ${c}`}>{p}</Badge>;
}

function Pill({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <Icon size={11} className={color} />
      <span className={`text-[10px] font-medium ${color}`}>{label}</span>
    </div>
  );
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] text-center space-y-3">
      <Settings size={24} className="text-muted-foreground" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">Run a scan to populate this center with data.</p>
    </div>
  );
}
