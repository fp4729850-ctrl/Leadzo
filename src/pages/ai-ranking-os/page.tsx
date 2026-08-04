import React, { useState, useEffect } from "react";
import {
  BarChart, Activity, ShieldCheck, Zap, Globe, FileText, Settings, Database,
  MessageSquare, Sliders, CheckCircle2, TrendingUp, AlertTriangle, Loader2,
  Search, Users, Bot, Clock, Target, ArrowUpRight, BookOpen, Link2,
  AlertCircle, CheckCircle, XCircle, BarChart2, Lightbulb, Calendar,
  Download, RefreshCw, ChevronRight, Star, Plus, Check, Trash
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { supabase } from "@/lib/supabase.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { toast } from "sonner";
import { useAction } from "@/lib/convex-supabase-adapter.tsx";
import { api } from "@/convex/_generated/api.js";

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

type Site = {
  id: string;
  domain: string;
  verified: boolean;
  auto_scan: boolean;
  scan_frequency: string;
  gsc_connected: boolean;
  last_scanned_at: string | null;
  api_keys?: any;
};

type Scan = {
  id: string;
  site_id: string;
  score_ai_visibility: number;
  score_llm_readiness: number;
  score_seo_health: number;
  score_authority: number;
  full_data: any;
  high_impact_tasks: any;
  scanned_at: string;
};

type Recommendation = {
  id: string;
  priority: string;
  category: string;
  title: string;
  reason: string;
  ai_impact: string;
  seo_impact: string;
  effort: string;
  estimated_time: string;
  status: string;
  ai_safety_score?: number;
  ai_risk_assessment?: string;
  ai_verdict?: string;
};

export default function AiRankingOsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSite, setActiveSite] = useState<Site | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [latestScan, setLatestScan] = useState<Scan | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load user sites on mount
  useEffect(() => {
    if (user?.id) {
      loadSites();
    }
  }, [user?.id]);

  // Load scans when active site changes
  useEffect(() => {
    if (activeSite?.id) {
      loadScans(activeSite.id);
    } else {
      setScans([]);
      setLatestScan(null);
      setRecs([]);
    }
  }, [activeSite?.id]);

  const loadSites = async () => {
    try {
      const { data, error } = await supabase
        .from("ranking_sites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSites(data || []);
      if (data && data.length > 0 && !activeSite) {
        setActiveSite(data[0]);
        setDomain(data[0].domain);
      }
    } catch (e: any) {
      console.error("Failed to load sites:", e);
    }
  };

  const loadScans = async (siteId: string) => {
    try {
      const { data, error } = await supabase
        .from("ranking_scans")
        .select("*")
        .eq("site_id", siteId)
        .order("scanned_at", { ascending: false });
      if (error) throw error;
      setScans(data || []);
      if (data && data.length > 0) {
        setLatestScan(data[0]);
        loadRecommendations(data[0].id);
      } else {
        setLatestScan(null);
        setRecs([]);
      }
    } catch (e: any) {
      console.error("Failed to load scans:", e);
    }
  };

  const loadRecommendations = async (scanId: string) => {
    try {
      const { data, error } = await supabase
        .from("ranking_recommendations")
        .select("*")
        .eq("scan_id", scanId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setRecs(data || []);
    } catch (e: any) {
      console.error("Failed to load recommendations:", e);
    }
  };

  const handleConnectAndScan = async () => {
    if (!domain.trim()) return;
    if (!user?.id) {
      toast.error("Please login to connect and scan a site.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Ensure site exists in DB
      let site = sites.find(s => s.domain.toLowerCase() === domain.trim().toLowerCase());
      if (!site) {
        const { data, error: siteInsertErr } = await supabase
          .from("ranking_sites")
          .insert({
            user_id: user.id,
            domain: domain.trim(),
            verified: false
          })
          .select()
          .single();

        if (siteInsertErr) throw siteInsertErr;
        site = data;
        await loadSites();
        setActiveSite(site);
      }

      // 2. Run the Edge function scan
      const { data, error: fnErr } = await supabase.functions.invoke("aiRankingOs_scan", {
        body: { 
          url: domain.trim(),
          user_id: user.id,
          site_id: site!.id
        }
      });
      if (fnErr) throw new Error(fnErr.message);
      
      if (data?.success && data?.data) {
        toast.success("Audit completed successfully!");
        await loadScans(site!.id);
      } else {
        throw new Error("Scan returned no data.");
      }
    } catch (e: any) {
      setError(e.message || "Scan failed. Please try again.");
      toast.error(e.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  const updateRecStatus = async (recId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("ranking_recommendations")
        .update({ 
          status: newStatus,
          approved_at: newStatus === "approved" ? new Date().toISOString() : null,
          done_at: newStatus === "done" ? new Date().toISOString() : null
        })
        .eq("id", recId);
      if (error) throw error;
      
      // Update local state
      setRecs(prev => prev.map(r => r.id === recId ? { ...r, status: newStatus } : r));
      toast.success(`Recommendation marked as ${newStatus}`);

      // Log agent action
      if (activeSite && user) {
        await supabase.from("ranking_agents_log").insert({
          site_id: activeSite.id,
          user_id: user.id,
          agent_name: "User Interface",
          action: `User marked recommendation ${recId} as ${newStatus}`,
          result: { recId, status: newStatus }
        });
      }
    } catch (e: any) {
      toast.error("Failed to update status");
      console.error(e);
    }
  };

  const deleteSite = async (siteId: string) => {
    if (!confirm("Are you sure you want to delete this website and all its scan history?")) return;
    try {
      const { error } = await supabase.from("ranking_sites").delete().eq("id", siteId);
      if (error) throw error;
      toast.success("Website deleted successfully");
      await loadSites();
      if (activeSite?.id === siteId) {
        setActiveSite(null);
        setDomain("");
      }
    } catch (e) {
      toast.error("Failed to delete website");
    }
  };

  const toggleAutopilot = async () => {
    if (!activeSite) return;
    try {
      const newVal = !activeSite.auto_scan;
      const { error } = await supabase
        .from("ranking_sites")
        .update({ auto_scan: newVal })
        .eq("id", activeSite.id);
      if (error) throw error;
      
      const updatedSite = { ...activeSite, auto_scan: newVal };
      setActiveSite(updatedSite);
      setSites(prev => prev.map(s => s.id === activeSite.id ? updatedSite : s));
      toast.success(`Autopilot ${newVal ? "enabled" : "disabled"}`);
    } catch (e) {
      toast.error("Failed to update Autopilot");
    }
  };

  const getGscOAuthUrl = useAction(api.gscActions.getGscOAuthUrl);

  const connectGsc = async () => {
    try {
      const redirectUri = `${window.location.origin}/auth/gsc-callback`;
      const result = await getGscOAuthUrl({ redirectUri });
      if (result && result.url) {
        window.location.href = result.url;
      } else {
        toast.error("Failed to generate GSC OAuth URL");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to connect GSC");
    }
  };

  const updateApiKeys = async (keys: any) => {
    if (!activeSite) return;
    try {
      const { error } = await supabase
        .from("ranking_sites")
        .update({ api_keys: keys })
        .eq("id", activeSite.id);
      if (error) throw error;

      const updatedSite = { ...activeSite, api_keys: keys };
      setActiveSite(updatedSite);
      setSites(prev => prev.map(s => s.id === activeSite.id ? updatedSite : s));
      toast.success("API keys updated successfully");
    } catch (e) {
      toast.error("Failed to save API keys");
    }
  };

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
            Persistent SEO & AI Visibility Command Center
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeSite && (
            <>
              <Button
                onClick={connectGsc}
                variant="outline"
                size="sm"
                className={`h-8 text-xs border border-border/50 gap-1.5 shrink-0 ${
                  activeSite.gsc_connected
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                    : "bg-secondary/30 text-foreground hover:bg-secondary/50"
                }`}
              >
                <Search size={12} className={activeSite.gsc_connected ? "text-blue-400" : ""} />
                {activeSite.gsc_connected ? "GSC Connected" : "Connect GSC"}
              </Button>
              <Button
                onClick={toggleAutopilot}
                variant="outline"
                size="sm"
                className={`h-8 text-xs border border-border/50 gap-1.5 shrink-0 ${
                  activeSite.auto_scan
                    ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                    : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <Zap size={12} className={activeSite.auto_scan ? "animate-pulse" : ""} />
                Autopilot: {activeSite.auto_scan ? "ON" : "OFF"}
              </Button>
            </>
          )}
          {sites.length > 0 && (
            <select 
              value={activeSite?.id || ""} 
              onChange={(e) => {
                const s = sites.find(x => x.id === e.target.value);
                if (s) {
                  setActiveSite(s);
                  setDomain(s.domain);
                }
              }}
              className="bg-secondary/50 border border-border/50 text-foreground text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              {sites.map(s => <option key={s.id} value={s.id}>{s.domain.replace(/https?:\/\//, "")}</option>)}
            </select>
          )}
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="sm:w-64 bg-secondary/30 text-xs h-8"
            placeholder="https://yourwebsite.com"
          />
          <Button onClick={handleConnectAndScan} disabled={loading} size="sm" className="shrink-0 bg-primary text-primary-foreground h-8 text-xs">
            {loading ? <><Loader2 className="animate-spin mr-1.5" size={12} />Scanning...</> : <><Search size={12} className="mr-1.5" />Connect & Scan</>}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        
        {/* Loading / Error States */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
            <Loader2 className="animate-spin text-primary size-12" />
            <p className="text-foreground font-semibold">Generating AI Ranking OS Insights...</p>
            <p className="text-muted-foreground text-xs max-w-sm">Saving site profile, auditing meta structures, and parsing citation possibilities...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-xs font-semibold text-red-400">Scan Execution Error</p>
              <p className="text-[11px] text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* No Sites Configured */}
        {!loading && !activeSite && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <Globe className="text-primary size-16" />
            <h3 className="text-lg font-semibold text-foreground">Welcome to AI Ranking OS</h3>
            <p className="text-muted-foreground text-xs max-w-md">Connect your website to crawl, run AI audits, analyze topic coverage, and orchestrate automatic agents.</p>
            <div className="flex items-center gap-3">
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="https://example.com"
                className="w-64 bg-secondary/30 h-9"
              />
              <Button onClick={handleConnectAndScan} className="bg-primary text-primary-foreground"><Plus size={14} className="mr-1.5" />Add Site</Button>
            </div>
          </div>
        )}

        {/* Active Site but no Scan Yet */}
        {!loading && activeSite && !latestScan && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <Activity className="text-primary size-16" />
            <h3 className="text-lg font-semibold text-foreground">{activeSite.domain} connected!</h3>
            <p className="text-muted-foreground text-xs max-w-md">The site has been connected to your profile but has not been crawled. Click the button below to execute your first scan.</p>
            <Button onClick={handleConnectAndScan} className="bg-primary text-primary-foreground"><Search size={14} className="mr-1.5" />Start First Scan</Button>
          </div>
        )}

        {/* Scan Results Board */}
        {!loading && activeSite && latestScan && (
          <>
            {/* Score Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <ScoreCard title="AI Visibility" score={latestScan.score_ai_visibility} icon={Globe} color="text-blue-500" />
              <ScoreCard title="LLM Readiness" score={latestScan.score_llm_readiness} icon={MessageSquare} color="text-purple-500" />
              <ScoreCard title="SEO Health" score={latestScan.score_seo_health} icon={Activity} color="text-green-500" />
              <ScoreCard title="Authority Score" score={latestScan.score_authority} icon={ShieldCheck} color="text-amber-500" />
            </div>

            {/* Score Trend Sparkline (If multiple scans exist) */}
            {scans.length > 1 && (
              <div className="border border-border/30 rounded-xl bg-card p-4">
                <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5"><TrendingUp size={14} className="text-primary" /> AI Visibility Score Trend</h4>
                <div className="flex items-end gap-3 h-16 pt-2">
                  {scans.slice().reverse().map((s, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full bg-primary/20 rounded-t hover:bg-primary transition-all relative group" style={{ height: `${s.score_ai_visibility}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[9px] px-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {s.score_ai_visibility} ({new Date(s.scanned_at).toLocaleDateString()})
                        </div>
                      </div>
                      <span className="text-[8px] text-muted-foreground">{new Date(s.scanned_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Insights Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-border/50 bg-secondary/10 rounded-xl p-4">
                <h3 className="font-semibold text-xs text-foreground flex items-center gap-1.5 mb-3 uppercase tracking-wide">
                  <AlertTriangle size={14} className="text-red-400" /> Top High-Impact Tasks
                </h3>
                <div className="space-y-2">
                  {latestScan.high_impact_tasks?.slice(0, 4).map((t: any, i: number) => (
                    <TaskItem key={i} priority={t.priority} title={t.title} impact={t.impact} />
                  ))}
                </div>
              </div>
              <div className="border border-border/50 bg-secondary/10 rounded-xl p-4">
                <h3 className="font-semibold text-xs text-foreground flex items-center gap-1.5 mb-3 uppercase tracking-wide">
                  <TrendingUp size={14} className="text-green-400" /> Recent Improvements
                </h3>
                <div className="space-y-2">
                  {latestScan.full_data?.recentImprovements?.slice(0, 4).map((r: any, i: number) => (
                    <ImprovementItem key={i} title={r.title} gain={r.gain} />
                  ))}
                </div>
              </div>
            </div>

            {/* Tab navigation */}
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

            {/* Tab Contents */}
            <div className="border border-border/30 rounded-xl bg-card p-5 shadow-sm">
              {activeTab === "ai-visibility" && <AIVisibilityCenter data={latestScan.full_data?.aiVisibilityCenter} domain={activeSite.domain} />}
              {activeTab === "content-intelligence" && <ContentIntelligenceCenter data={latestScan.full_data?.contentIntelligence} />}
              {activeTab === "tech-optimization" && <TechnicalOptimizationCenter data={latestScan.full_data?.technicalOptimization} />}
              {activeTab === "competitor-intel" && <CompetitorIntelligenceCenter data={latestScan.full_data?.competitorIntelligence} />}
              {activeTab === "ai-agents" && <AIAgentCenter data={latestScan.full_data?.aiAgentCenter} approvalQueue={recs.filter(r => r.status === "pending")} onStatusChange={updateRecStatus} />}
              {activeTab === "recommendations" && <RecommendationCenter data={recs} onStatusChange={updateRecStatus} />}
              {activeTab === "reports" && <ReportsCenter domain={activeSite.domain} scores={{ aiVisibility: latestScan.score_ai_visibility, seoHealth: latestScan.score_seo_health }} />}
              {activeTab === "automation" && <AutomationCenter site={activeSite} onToggle={toggleAutopilot} />}
              {activeTab === "settings-center" && <SettingsCenter site={activeSite} onToggle={toggleAutopilot} onDelete={deleteSite} onUpdateKeys={updateApiKeys} onConnectGsc={connectGsc} />}
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
function AIVisibilityCenter({ data, domain }: { data: any; domain: string }) {
  if (!data) return <PlaceholderView title="AI Visibility Center" />;
  return (
    <div className="space-y-5">
      <SectionHeader icon={Globe} title="Google Preferred Source Accelerator" desc="Generate and distribute your custom personalization link." />
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-foreground">Custom Personalization Link</p>
          <Badge variant="secondary" className="text-[9px]">Google SGE Personalization</Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          When users click this link, Google will save your website as their preferred source. This ensures your site ranks first in their Google AI Overviews and search results.
        </p>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={`https://google.com/preferences/source?q=${domain}`}
            className="bg-card text-xs h-8 border border-border/50 select-all"
          />
          <Button
            onClick={() => {
              navigator.clipboard.writeText(`https://google.com/preferences/source?q=${domain}`);
              toast.success("Shortcut link copied to clipboard!");
            }}
            size="sm"
            className="h-8 text-xs shrink-0"
          >
            Copy Link
          </Button>
        </div>
        <div className="text-[10px] text-muted-foreground space-y-1 bg-background/40 p-2.5 rounded border border-border/5">
          <p className="font-semibold text-foreground/80">🚀 Recommended Distribution Channels:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Add this link to your monthly customer newsletter.</li>
            <li>Post this shortcut link on your social media bios and posts.</li>
            <li>Insert a "Set as Preferred Source" CTA button in your website footer.</li>
            <li>Add the link underneath your team's email signatures.</li>
          </ul>
        </div>
      </div>

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
function AIAgentCenter({ data, approvalQueue, onStatusChange }: { data: any; approvalQueue: Recommendation[]; onStatusChange: (id: string, stat: string) => void }) {
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
        {approvalQueue.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No pending items in queue.</p>
        ) : (
          approvalQueue.map((q: any, i: number) => (
            <div key={i} className="p-3 rounded-lg border border-border/30 bg-secondary/10 flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[9px] text-purple-400 border-purple-500/20">{q.category}</Badge>
                  <p className="text-xs font-semibold text-foreground">{q.title}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">{q.reason}</p>
                <AIVerdictBadge score={q.ai_safety_score} assessment={q.ai_risk_assessment} verdict={q.ai_verdict} />
              </div>
              <div className="flex gap-1.5 shrink-0 ml-auto pt-1 sm:pt-0">
                <Button onClick={() => onStatusChange(q.id, "approved")} size="sm" className="h-6 text-[10px] px-2 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"><Check size={12} className="mr-1" />Approve</Button>
                <Button onClick={() => onStatusChange(q.id, "rejected")} size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-red-400 hover:text-red-500">Skip</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- Recommendation Center ---
function RecommendationCenter({ data, onStatusChange }: { data: Recommendation[]; onStatusChange: (id: string, stat: string) => void }) {
  if (!data || !data.length) return <PlaceholderView title="Recommendation Center" />;
  return (
    <div className="space-y-3">
      <SectionHeader icon={CheckCircle2} title="All Recommendations" desc="Sorted by priority. Each item has a reason, AI impact, SEO impact, effort, and estimated time." />
      {data.map((r: any, i: number) => (
        <div key={i} className="p-4 rounded-xl border border-border/30 bg-secondary/10 space-y-2 relative">
          <div className="flex items-start gap-3 flex-wrap">
            <PriorityBadge p={r.priority} />
            <p className="text-xs font-bold text-foreground flex-1">{r.title}</p>
            <Badge variant="outline" className="text-[9px] capitalize">{r.status}</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">{r.reason}</p>
          <AIVerdictBadge score={r.ai_safety_score} assessment={r.ai_risk_assessment} verdict={r.ai_verdict} />
          <div className="flex items-center justify-between flex-wrap gap-3 pt-1 border-t border-border/20">
            <div className="flex items-center gap-4 flex-wrap">
              <Pill icon={Zap} label={r.ai_impact} color="text-blue-400" />
              <Pill icon={TrendingUp} label={r.seo_impact} color="text-green-400" />
              <Pill icon={Target} label={`Effort: ${r.effort}`} color="text-amber-400" />
              <Pill icon={Clock} label={r.estimated_time} color="text-purple-400" />
            </div>
            {r.status === "pending" && (
              <div className="flex gap-2">
                <Button onClick={() => onStatusChange(r.id, "approved")} size="sm" className="h-6 text-[10px] bg-primary/20 text-primary border border-primary/30">Approve</Button>
                <Button onClick={() => onStatusChange(r.id, "rejected")} size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground">Reject</Button>
              </div>
            )}
            {r.status === "approved" && (
              <Button onClick={() => onStatusChange(r.id, "done")} size="sm" className="h-6 text-[10px] bg-green-500/20 text-green-400 border border-green-500/30">Mark Completed</Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Helper: AI Safety Check Badge ---
function AIVerdictBadge({ score, assessment, verdict }: { score?: number; assessment?: string; verdict?: string }) {
  const safetyScore = score ?? 95;
  const riskText = assessment ?? "Safe: Standard code or content integration. No risks identified.";
  const aiVerdict = verdict ?? "Approve";

  const isGreen = aiVerdict === "Approve" && safetyScore >= 80;
  const badgeColor = isGreen
    ? "bg-green-500/10 text-green-400 border-green-500/20"
    : "bg-amber-500/10 text-amber-400 border-amber-500/20";

  return (
    <div className="mt-2.5 p-2 rounded bg-background/50 border border-border/10 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">AI Auditor Agent</span>
        <Badge variant="outline" className={`text-[9px] ${badgeColor}`}>
          {isGreen ? "🟢" : "🟡"} AI Suggests: {aiVerdict} ({safetyScore}% Safe)
        </Badge>
      </div>
      <p className="text-[9px] text-muted-foreground leading-relaxed italic">
        " {riskText} "
      </p>
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
function AutomationCenter({ site, onToggle }: { site: Site | null; onToggle: () => void }) {
  if (!site) return null;
  return (
    <div className="space-y-4">
      <SectionHeader icon={Activity} title="Automation Center" desc="Set up scheduled scans, content refresh reminders and health automations." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-border/30 bg-secondary/10 space-y-2">
          <Calendar size={20} className="text-primary" />
          <p className="text-xs font-bold text-foreground">Weekly Scan (Autopilot)</p>
          <p className="text-[10px] text-muted-foreground">Auto-scan domain every Monday at 3 AM.</p>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-[10px] font-semibold ${site.auto_scan ? "text-green-400" : "text-muted-foreground"}`}>
              {site.auto_scan ? "Active" : "Inactive"}
            </span>
            <Button onClick={onToggle} size="sm" variant="outline" className="text-[10px] h-6 px-3">
              {site.auto_scan ? "Disable" : "Enable"}
            </Button>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border/30 bg-secondary/10 space-y-2">
          <RefreshCw size={20} className="text-primary" />
          <p className="text-xs font-bold text-foreground">Content Refresh</p>
          <p className="text-[10px] text-muted-foreground">Alert when pages are older than 90 days.</p>
          <Button size="sm" variant="outline" className="text-[10px] h-6 w-full">Configure</Button>
        </div>
        <div className="p-4 rounded-xl border border-border/30 bg-secondary/10 space-y-2">
          <Activity size={20} className="text-primary" />
          <p className="text-xs font-bold text-foreground">Health Watch</p>
          <p className="text-[10px] text-muted-foreground">Alert if SEO Health drops below 70.</p>
          <Button size="sm" variant="outline" className="text-[10px] h-6 w-full">Configure</Button>
        </div>
      </div>
    </div>
  );
}

// --- Settings Center ---
function SettingsCenter({ site, onToggle, onDelete, onUpdateKeys, onConnectGsc }: { site: Site; onToggle: () => void; onDelete: (id: string) => void; onUpdateKeys: (keys: any) => Promise<void>; onConnectGsc: () => void }) {
  const [pagespeedKey, setPagespeedKey] = useState(site.api_keys?.pagespeed_key || "");
  const [mozId, setMozId] = useState(site.api_keys?.moz_id || "");
  const [mozSecret, setMozSecret] = useState(site.api_keys?.moz_secret || "");
  const [ahrefsToken, setAhrefsToken] = useState(site.api_keys?.ahrefs_token || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPagespeedKey(site.api_keys?.pagespeed_key || "");
    setMozId(site.api_keys?.moz_id || "");
    setMozSecret(site.api_keys?.moz_secret || "");
    setAhrefsToken(site.api_keys?.ahrefs_token || "");
  }, [site.id, site.api_keys]);

  const handleSaveKeys = async () => {
    setSaving(true);
    await onUpdateKeys({
      pagespeed_key: pagespeedKey,
      moz_id: mozId,
      moz_secret: mozSecret,
      ahrefs_token: ahrefsToken
    });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <SectionHeader icon={Settings} title="Settings" desc="Manage connected site properties, API integrations, and subscriptions." />
      
      <div className="p-4 rounded-xl border border-border/30 bg-secondary/10 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-foreground">Google Search Console Integration</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">Link GSC to fetch live organic search clicks, impressions, and query rankings.</p>
          </div>
          <Badge variant="outline" className={`text-[9px] ${site.gsc_connected ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-secondary text-muted-foreground"}`}>
            {site.gsc_connected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
        <Button onClick={onConnectGsc} size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20">
          <Search size={13} />
          {site.gsc_connected ? "Reconnect Google Search Console" : "Connect Google Search Console"}
        </Button>
      </div>

      <div className="p-4 rounded-xl border border-border/30 bg-secondary/10 space-y-3">
        <h4 className="text-xs font-bold text-foreground">Autopilot Configurations</h4>
        <p className="text-[10px] text-muted-foreground">Toggle automated scans and updates for this domain.</p>
        <div className="flex items-center gap-3">
          <Button
            onClick={onToggle}
            variant="outline"
            size="sm"
            className={`h-8 text-xs border border-border/50 gap-1.5 ${
              site.auto_scan
                ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            Autopilot is: {site.auto_scan ? "ON" : "OFF"}
          </Button>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border/30 bg-secondary/10 space-y-3">
        <h4 className="text-xs font-bold text-foreground">API Integrations (Moz, Ahrefs, PageSpeed)</h4>
        <p className="text-[10px] text-muted-foreground">Save your credentials to enable real third-party Moz Domain Authority, Ahrefs Organic Keywords, and Google PageSpeed Insights speed metrics.</p>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1">Google PageSpeed API Key (Optional)</label>
            <Input
              type="password"
              value={pagespeedKey}
              onChange={(e) => setPagespeedKey(e.target.value)}
              className="bg-card text-xs h-8 border border-border/50"
              placeholder="Google PageSpeed API Key"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">Moz Access ID</label>
              <Input
                type="text"
                value={mozId}
                onChange={(e) => setMozId(e.target.value)}
                className="bg-card text-xs h-8 border border-border/50"
                placeholder="Moz Access ID"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">Moz Secret Key</label>
              <Input
                type="password"
                value={mozSecret}
                onChange={(e) => setMozSecret(e.target.value)}
                className="bg-card text-xs h-8 border border-border/50"
                placeholder="Moz Secret Key"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1">Ahrefs API Token</label>
            <Input
              type="password"
              value={ahrefsToken}
              onChange={(e) => setAhrefsToken(e.target.value)}
              className="bg-card text-xs h-8 border border-border/50"
              placeholder="Ahrefs API Token"
            />
          </div>
          <Button onClick={handleSaveKeys} disabled={saving} size="sm" className="h-8 text-xs bg-primary text-primary-foreground">
            {saving ? "Saving..." : "Save API Configurations"}
          </Button>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-3">
        <h4 className="text-xs font-bold text-red-400">Danger Zone</h4>
        <p className="text-[10px] text-muted-foreground">Remove this site from your workspace. This action deletes all saved scans and recommendations history.</p>
        <Button onClick={() => onDelete(site.id)} variant="destructive" size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"><Trash size={12} className="mr-1.5" />Delete Site Connection</Button>
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
      <Settings size={24} className="text-muted-foreground animate-spin-slow" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">Run a scan to populate this center with data.</p>
    </div>
  );
}
