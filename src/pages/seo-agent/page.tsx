import { useState, useEffect } from "react";
import { useAction, useMutation, useQuery } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";
import { Authenticated } from "@/lib/convex-supabase-adapter";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import {
  Search, Globe, BarChart2, FileText, Rocket, Activity,
  ChevronRight, CheckCircle2, Loader2, AlertTriangle,
  TrendingUp, TrendingDown, Minus, RefreshCw,
  BookOpen, Target, Zap, Eye, Link, Unlink, Send,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";

type StepId = "crawl" | "keywords" | "content" | "publish" | "monitor";

type AuditData = {
  title: string; description: string; issues: string[]; score: number;
  pageCount: number; loadSpeed: string;
  crawledPages: { url: string; title: string; issues: string[]; statusCode: number }[];
  isRealCrawl: boolean;
};

type KeywordCluster = {
  name: string;
  keywords: { term: string; volume: string; difficulty: string; intent: string; cpc?: string; isReal?: boolean }[];
};

type ContentData = {
  title: string; metaTitle: string; metaDescription: string;
  content: string; wordCount: number; readTime: string;
};

type MonitorData = {
  rankings: { keyword: string; position: number; change: number; url: string; clicks?: number; impressions?: number; ctr?: number }[];
  organicTraffic: string; backlinks: number; domainAuthority: number;
  recommendations: string[]; isRealData: boolean;
};

const STEPS: { id: StepId; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "crawl", label: "Crawl & Audit", icon: Globe, desc: "Scan site structure & find issues" },
  { id: "keywords", label: "Keyword Research", icon: Search, desc: "AI keyword cluster discovery" },
  { id: "content", label: "Content Generation", icon: FileText, desc: "AI-written SEO blog posts" },
  { id: "publish", label: "Publish Plan", icon: Rocket, desc: "Content calendar & strategy" },
  { id: "monitor", label: "Monitor & Track", icon: Activity, desc: "Rankings & traffic analysis" },
];

export default function SeoAgentPage() {
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState("");
  const [activeStep, setActiveStep] = useState<StepId | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());
  const [loading, setLoading] = useState(false);
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [keywordClusters, setKeywordClusters] = useState<KeywordCluster[]>([]);
  const [keywordsAreReal, setKeywordsAreReal] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [contentTone, setContentTone] = useState("professional");
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [monitorData, setMonitorData] = useState<MonitorData | null>(null);
  const [publishPlan, setPublishPlan] = useState<{ week: string; task: string; type: string; keywords: string[]; priority: string; published?: boolean; published_at?: string; }[]>([]);
  const [publishLoading, setPublishLoading] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoStep, setAutoStep] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [publishingToWebhook, setPublishingToWebhook] = useState(false);
  const [autopilotActive, setAutopilotActive] = useState(false);
  const [autopilotId, setAutopilotId] = useState<string | null>(null);
  const [autopilotLoading, setAutopilotLoading] = useState(false);
  const [showMonitoringDashboard, setShowMonitoringDashboard] = useState(false);
  const [localGscConnected, setLocalGscConnected] = useState(false);

  const crawlAndAudit = useAction(api.seoAi.crawlAndAudit);
  const researchKeywords = useAction(api.seoAi.researchKeywords);
  const generateContent = useAction(api.seoAi.generateContent);
  const generatePublishPlan = useAction(api.seoAi.generatePublishPlan);
  const generateMonitorReport = useAction(api.seoAi.generateMonitorReport);
  const autoPublishWebhook = useAction(api.seoAi.autoPublishWebhook);
  const disconnectGsc = useMutation(api.gsc.disconnectGsc);
  const gscStatus = useQuery(api.gsc.getGscStatus, {});
  const getGscOAuthUrl = useAction(api.gscActions.getGscOAuthUrl);

  const connectGsc = async () => {
    // Redirect to Supabase Google Auth requesting GSC scope
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/webmasters.readonly',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        redirectTo: `${window.location.origin}/seo-agent`
      },
    });
    
    if (error) {
      toast.error(error.message);
    }
  };

  const markComplete = (step: StepId) => setCompletedSteps((prev) => new Set([...prev, step]));

  useEffect(() => {
    const loadAutopilotSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data, error } = await supabase
          .from("seo_autopilot_settings")
          .select("*")
          .eq("user_id", user.id)
          .single();
          
        if (data && !error) {
          setAutopilotActive(data.is_active);
          setAutopilotId(data.id);
          if (data.publish_plan && data.publish_plan.length > 0) {
            setPublishPlan(data.publish_plan);
          }
        }
      } catch (err) {
        console.error("Failed to load autopilot settings", err);
      }
    };
    loadAutopilotSettings();

    const captureGscToken = async (session: any) => {
      if (session?.provider_token) {
        if (!session.provider_refresh_token) {
          toast.error("Google didn't provide a Refresh Token. Only Access Token received.");
          console.warn("No provider_refresh_token in session. Google might not have issued one.");
          // Don't return, let's try to save the access token as a fallback so they can at least generate a report once
        }
        try {
          const refreshToken = session.provider_refresh_token || session.provider_token;
          const { data: existing } = await supabase.from('gsc_tokens').select('id').eq('user_id', session.user.id).single();
          let error;
          if (existing) {
            const res = await supabase.from('gsc_tokens').update({ refresh_token: refreshToken, connected: true }).eq('id', existing.id);
            error = res.error;
          } else {
            const res = await supabase.from('gsc_tokens').insert({ user_id: session.user.id, refresh_token: refreshToken, connected: true });
            error = res.error;
          }
          if (!error) {
            console.log("Successfully saved GSC refresh token to database");
            setLocalGscConnected(true);
            toast.success("Google Search Console Connected Successfully!");
          } else {
            console.error("Failed to save GSC token:", error);
            toast.error(`Failed to save GSC token: ${error.message || error.details || JSON.stringify(error)}`);
          }
        } catch (e) {
          console.error("Auth state change error:", e);
        }
      }
    };

    // Manual fallback to catch tokens directly from the URL hash before they are cleared
    const hash = window.location.hash;
    if (hash && hash.includes('provider_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const pToken = params.get('provider_token');
      const prToken = params.get('provider_refresh_token');
      
      if (pToken) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            captureGscToken({
              provider_token: pToken,
              provider_refresh_token: prToken,
              user: user
            });
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        });
      }
    }

    // Check immediately on mount (in case URL just parsed the hash)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) captureGscToken(session);
    });

    // Listen for OAuth sign-in to capture the Google refresh token
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event, session);
      if (session?.provider_token) {
        captureGscToken(session);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const toggleAutopilot = async (checked: boolean) => {
    if (checked && (!url || !niche)) {
      toast.error("Please enter Website URL and Business Niche first!");
      return;
    }
    
    setAutopilotLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      if (autopilotId) {
        // Update existing
        const { error } = await supabase
          .from("seo_autopilot_settings")
          .update({ 
            is_active: checked,
            url: url || "",
            niche: niche || "",
            publish_plan: publishPlan
          })
          .eq("id", autopilotId);
        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from("seo_autopilot_settings")
          .insert({
            user_id: user.id,
            url: url || "",
            niche: niche || "",
            is_active: checked,
            publish_plan: publishPlan
          })
          .select()
          .single();
        if (error) throw error;
        if (data) setAutopilotId(data.id);
      }
      
      setAutopilotActive(checked);
      toast.success(checked ? "Autopilot Activated! 🚀" : "Autopilot Paused ⏸️");
    } catch (err: any) {
      toast.error("Failed to toggle Autopilot: " + err.message);
    } finally {
      setAutopilotLoading(false);
    }
  };

  const runAutopilotNow = async () => {
    toast.info("Triggering Autopilot Background Worker...");
    try {
      const res = await fetch("https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/seoAi_cronWorker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        toast.success("Autopilot executed successfully! Check your blog.");
      } else {
        throw new Error("Worker failed");
      }
    } catch (err: any) {
      toast.error("Failed to trigger worker");
    }
  };

  const runCrawl = async () => {
    if (!url) { toast.error("Enter website URL first"); return; }
    setLoading(true); setActiveStep("crawl");
    try {
      const result = await crawlAndAudit({ url, maxPages: 10 });
      setAuditData(result); markComplete("crawl");
      toast.success(result.isRealCrawl ? `Real crawl complete \u2014 ${result.pageCount} pages scanned!` : "Site audit complete!");
    } catch { toast.error("Audit failed. Check URL."); }
    finally { setLoading(false); }
  };

  const runKeywords = async () => {
    if (!url) { toast.error("Pehle Website URL enter karo"); return; }
    if (!niche) { toast.error("Business Niche bhi enter karo (e.g. AI SaaS, Digital Marketing)"); return; }
    setLoading(true); setActiveStep("keywords");
    try {
      const result = await researchKeywords({ url, niche });
      setKeywordClusters(result.clusters); setKeywordsAreReal(result.isReal);
      if (result.clusters[0]?.keywords[0]) setSelectedKeyword(result.clusters[0].keywords[0].term);
      markComplete("keywords");
      toast.success(result.isReal ? "Real keyword data from DataForSEO!" : "Keywords discovered!");
    } catch { toast.error("Keyword research failed."); }
    finally { setLoading(false); }
  };

  const runContent = async () => {
    if (!selectedKeyword) { toast.error("Select a keyword first"); return; }
    setLoading(true); setActiveStep("content");
    try {
      const result = await generateContent({ keyword: selectedKeyword, url, tone: contentTone });
      setContentData(result); markComplete("content"); toast.success("Content generated!");
    } catch { toast.error("Content generation failed."); }
    finally { setLoading(false); }
  };

  const handlePublishToLeadzo = async () => {
    if (!contentData) { toast.error("No content to publish"); return; }
    setPublishingToWebhook(true); // Reusing state for loading
    try {
      // Empty webhookUrl tells the backend to only save to internal blog
      const res = await autoPublishWebhook({ webhookUrl: "", contentData, url });
      toast.success(res?.message || "Published to Leadzo Blog!");
    } catch (err: any) {
      toast.error(err.message || "Failed to publish");
    } finally {
      setPublishingToWebhook(false);
    }
  };

  const handleAutoPublish = async () => {
    if (!webhookUrl) { toast.error("Please enter a Webhook URL first (e.g., Make.com)"); return; }
    if (!contentData) { toast.error("No content to publish"); return; }
    setPublishingToWebhook(true);
    try {
      const res = await autoPublishWebhook({ webhookUrl, contentData, url });
      toast.success(res?.message || "Successfully sent to Webhook!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send to Webhook");
    } finally {
      setPublishingToWebhook(false);
    }
  };

  const runPublishPlan = async () => {
    if (!url) { toast.error("Enter website URL first"); return; }
    if (!niche) { toast.error("Business Niche enter karo"); return; }
    setPublishLoading(true);
    try {
      const allKeywords = keywordClusters.flatMap((c) => c.keywords.map((k) => k.term));
      const result = await generatePublishPlan({ url, niche, keywords: allKeywords.length > 0 ? allKeywords : [niche] });
      setPublishPlan(result.weeks); markComplete("publish"); toast.success("AI Publish Plan ready!");
    } catch (err: any) { 
      toast.error(err?.message || "Plan generation failed."); 
    }
    finally { setPublishLoading(false); }
  };

  const runMonitor = async (dashboardUrl?: string) => {
    const targetUrl = dashboardUrl || url;
    if (!targetUrl) { toast.error("Enter website URL first"); return; }
    setLoading(true); setActiveStep("monitor");
    try {
      // Backend now fetches the googleToken from gsc_tokens table directly!
      const allKeywords = keywordClusters.flatMap((c) => c.keywords.map((k) => k.term));
      const result = await generateMonitorReport({ 
        url: targetUrl, 
        keywords: allKeywords.length > 0 ? allKeywords : [niche || "blog"],
        // Pass empty token; Edge Function will look it up in the database!
        googleToken: "" 
      });
      setMonitorData(result); markComplete("monitor"); toast.success("Monitoring Report generated!");
    } catch { toast.error("Failed to generate report."); }
    finally { setLoading(false); }
  };

  const runFullPipeline = async () => {
    console.log("Starting full pipeline...");
    if (!url) { toast.error("Pehle Website URL enter karo"); return; }
    if (!niche) { toast.error("Business Niche bhi enter karo"); return; }
    setAutoRunning(true);
    try {
      setAutoStep("Crawling website\u2026"); setActiveStep("crawl"); setLoading(true);
      try { const r1 = await crawlAndAudit({ url, maxPages: 10 }); setAuditData(r1); markComplete("crawl"); toast.success("\u2713 Crawl complete"); } catch { toast.error("Crawl failed \u2014 continuing"); }
      setLoading(false);

      setAutoStep("Researching keywords\u2026"); setActiveStep("keywords"); setLoading(true);
      let kws: string[] = [];
      try { const r2 = await researchKeywords({ url, niche }); setKeywordClusters(r2.clusters); setKeywordsAreReal(r2.isReal); kws = r2.clusters.flatMap((c) => c.keywords.map((k) => k.term)); if (r2.clusters[0]?.keywords[0]) setSelectedKeyword(r2.clusters[0].keywords[0].term); markComplete("keywords"); toast.success("\u2713 Keywords ready"); } catch { toast.error("Keywords failed \u2014 continuing"); }
      setLoading(false);

      const kw = kws[0] ?? niche;
      setAutoStep(`Writing content for "${kw}"\u2026`); setActiveStep("content"); setLoading(true);
      try { const r3 = await generateContent({ keyword: kw, url, tone: contentTone }); setContentData(r3); setSelectedKeyword(kw); markComplete("content"); toast.success("\u2713 Content generated"); } catch { toast.error("Content failed \u2014 continuing"); }
      setLoading(false);

      setAutoStep("Building publish plan\u2026"); setActiveStep("publish"); setPublishLoading(true);
      try { const r4 = await generatePublishPlan({ url, niche, keywords: kws.length > 0 ? kws : [niche] }); setPublishPlan(r4.weeks); markComplete("publish"); toast.success("\u2713 Publish plan ready"); } catch { toast.error("Publish plan failed \u2014 continuing"); }
      setPublishLoading(false);

      setAutoStep("Generating monitor report\u2026"); setActiveStep("monitor"); setLoading(true);
      try { const r5 = await generateMonitorReport({ url, keywords: kws.length > 0 ? kws : [niche] }); setMonitorData(r5); markComplete("monitor"); toast.success("\u2713 Monitor report ready"); } catch { toast.error("Monitor failed"); }
      setLoading(false);

      setAutoStep(""); toast.success("\ud83c\udf89 Full SEO Pipeline complete!");
    } finally { setAutoRunning(false); setLoading(false); setPublishLoading(false); setAutoStep(""); }
  };

  const difficultyColor = (d: string) => d === "Low" ? "text-chart-3" : d === "Medium" ? "text-chart-4" : "text-destructive";
  const intentColor = (i: string) => {
    const map: Record<string, string> = { Informational: "bg-chart-1/20 text-chart-1", Commercial: "bg-chart-4/20 text-chart-4", Transactional: "bg-chart-3/20 text-chart-3", Navigational: "bg-primary/20 text-primary" };
    return map[i] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="size-10 rounded-xl bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center">
            <Search size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">SEO Agent</h1>
            <p className="text-xs text-muted-foreground">AI-powered 5-step SEO pipeline</p>
          </div>
          <Badge className="ml-auto bg-chart-1/20 text-chart-1 border-chart-1/30">AI Powered</Badge>
          
          <Dialog open={showMonitoringDashboard} onOpenChange={setShowMonitoringDashboard}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="ml-4 h-8 bg-chart-4/10 text-chart-4 border-chart-4/20 hover:bg-chart-4/20" onClick={() => { if (!monitorData) runMonitor(); }}>
                <Activity size={14} className="mr-2" /> Global Dashboard
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl bg-card border-border">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Activity className="text-chart-4" /> 3-Month Monitoring Dashboard</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {loading && !monitorData ? (
                  <div className="flex flex-col items-center py-12"><Loader2 size={32} className="animate-spin text-chart-2 mb-4" /><p className="text-sm text-muted-foreground">Fetching live GSC data...</p></div>
                ) : monitorData ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 rounded-xl border border-border bg-background/50">
                        <Eye className="text-chart-2 mb-2" size={20} />
                        <p className="text-3xl font-bold text-chart-2">{monitorData.organicTraffic}</p>
                        <p className="text-xs text-muted-foreground mt-1">Organic Traffic (Last 30 Days)</p>
                      </div>
                      <div className="p-6 rounded-xl border border-border bg-background/50">
                        <Search className="text-chart-2 mb-2" size={20} />
                        <p className="text-3xl font-bold text-chart-2">{monitorData.rankings.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Keywords Tracked</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">Keyword Rankings {monitorData.isRealData ? <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/30 ml-2">Real Data</Badge> : <Badge variant="outline" className="bg-muted text-muted-foreground ml-2">AI Simulated</Badge>}</p>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {monitorData.rankings.map((r, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/40">
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="bg-primary/10 text-primary w-8 justify-center">#{r.position}</Badge>
                              <span className="text-sm font-medium text-foreground">{r.keyword}</span>
                            </div>
                            <span className={cn("text-xs font-bold flex items-center", r.change > 0 ? "text-chart-3" : r.change < 0 ? "text-destructive" : "text-muted-foreground")}>
                              {r.change > 0 ? <TrendingUp size={12} className="mr-1" /> : r.change < 0 ? <TrendingDown size={12} className="mr-1" /> : <Minus size={12} className="mr-1" />}
                              {Math.abs(r.change)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data available. Ensure your GSC is connected.</div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-2 ml-2 mr-2 bg-card/60 px-3 py-1.5 rounded-lg border border-border">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Autopilot</span>
            <Switch 
              checked={autopilotActive} 
              onCheckedChange={toggleAutopilot} 
              disabled={autopilotLoading}
              className={autopilotActive ? "data-[state=checked]:bg-chart-3" : ""}
            />
          </div>
          <>
            {(gscStatus?.connected || localGscConnected) ? (
              <button onClick={async () => { await disconnectGsc(); setLocalGscConnected(false); toast.success("Google Search Console disconnected"); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-chart-3/40 bg-chart-3/10 text-chart-3 text-xs font-semibold cursor-pointer hover:bg-chart-3/20 transition-all">
                <CheckCircle2 size={12} /> GSC Connected <Unlink size={11} className="ml-1 opacity-60" />
              </button>
            ) : (
              <button onClick={connectGsc} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card/60 text-muted-foreground text-xs font-semibold cursor-pointer hover:text-foreground hover:border-primary/40 transition-all">
                <Link size={12} /> Connect Google
              </button>
            )}
          </>
        </div>
      </motion.div>

      <Card className="border-border bg-card/60 backdrop-blur">
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Website URL</label>
              <Input placeholder="https://yourwebsite.com" value={url} onChange={(e) => setUrl(e.target.value)} className="bg-background/50 border-border" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Business Niche</label>
              <Input placeholder="e.g. Digital Marketing, SaaS" value={niche} onChange={(e) => setNiche(e.target.value)} className="bg-background/50 border-border" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <Button onClick={runFullPipeline} disabled={autoRunning || !url || !niche} className="gap-2 bg-gradient-to-r from-chart-1 to-primary hover:opacity-90 text-white font-semibold shadow-lg">
              {autoRunning ? <><Loader2 size={14} className="animate-spin" /> {autoStep || "Running pipeline\u2026"}</> : <><Zap size={14} /> Run Full SEO Pipeline (Auto)</>}
            </Button>
            {autoRunning && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex gap-0.5">{STEPS.map((s) => <div key={s.id} className={cn("size-1.5 rounded-full transition-colors", completedSteps.has(s.id) ? "bg-chart-3" : activeStep === s.id ? "bg-primary animate-pulse" : "bg-muted")} />)}</div>
                <span>{autoStep}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((step, i) => {
          const done = completedSteps.has(step.id);
          const active = activeStep === step.id;
          return (
            <div key={step.id} className="flex items-center gap-1 shrink-0">
              <button onClick={() => { if (!url) { toast.error("Pehle URL enter karo upar"); return; } setActiveStep(step.id); if (step.id === "publish" && publishPlan.length === 0 && !publishLoading) { setTimeout(() => { if (url && niche) runPublishPlan(); }, 100); } }}
                className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border", done ? "border-chart-3/40 bg-chart-3/10 text-chart-3" : active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card/40 text-muted-foreground hover:text-foreground hover:border-border/80")}>
                {done ? <CheckCircle2 size={13} /> : <step.icon size={13} />}{step.label}
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={13} className="text-muted-foreground/40 shrink-0" />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {(activeStep === "crawl" || !activeStep) && (
          <motion.div key="crawl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-border bg-card/60 backdrop-blur">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Globe size={15} className="text-chart-1" /> Crawl & Audit</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={runCrawl} disabled={loading} className="bg-chart-1 hover:bg-chart-1/80 text-white">
                  {loading && activeStep === "crawl" ? <><Loader2 size={14} className="animate-spin mr-2" /> Crawling...</> : <><Globe size={14} className="mr-2" /> Run Site Audit</>}
                </Button>
                {auditData && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[{ label: "SEO Score", value: `${auditData.score}/100`, icon: BarChart2, color: auditData.score > 70 ? "text-chart-3" : auditData.score > 40 ? "text-chart-4" : "text-destructive" }, { label: "Pages Found", value: auditData.pageCount, icon: BookOpen, color: "text-primary" }, { label: "Load Speed", value: auditData.loadSpeed, icon: Zap, color: auditData.loadSpeed === "Fast" ? "text-chart-3" : auditData.loadSpeed === "Medium" ? "text-chart-4" : "text-destructive" }, { label: "Issues", value: auditData.issues.length, icon: AlertTriangle, color: "text-destructive" }].map((m) => (
                        <Card key={m.label} className="border-border bg-background/40">
                          <CardContent className="pt-4 pb-3"><m.icon size={14} className={cn("mb-1", m.color)} /><p className={cn("text-xl font-bold", m.color)}>{m.value}</p><p className="text-[10px] text-muted-foreground mt-0.5">{m.label}</p></CardContent>
                        </Card>
                      ))}
                    </div>
                    <div>
                      <Progress value={auditData.score} className="h-2 mb-2" />
                      <div className="grid md:grid-cols-2 gap-3">
                        <div><p className="text-xs font-semibold text-muted-foreground mb-2">Page Title</p><p className="text-sm text-foreground">{auditData.title}</p></div>
                        <div><p className="text-xs font-semibold text-muted-foreground mb-2">Meta Description</p><p className="text-sm text-foreground">{auditData.description}</p></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><AlertTriangle size={11} className="text-destructive" /> Issues Found</p>
                      <div className="space-y-1.5">{auditData.issues.map((issue, i) => <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground"><span className="size-4 rounded-full bg-destructive/20 text-destructive flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</span>{issue}</div>)}</div>
                    </div>
                    <Button size="sm" onClick={() => setActiveStep("keywords")} className="bg-primary/20 text-primary hover:bg-primary/30">Next: Keyword Research <ChevronRight size={12} className="ml-1" /></Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeStep === "keywords" && (
          <motion.div key="keywords" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-border bg-card/60 backdrop-blur">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Search size={15} className="text-primary" /> Keyword Research</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={runKeywords} disabled={loading} className="bg-primary hover:bg-primary/80">
                  {loading ? <><Loader2 size={14} className="animate-spin mr-2" /> Researching...</> : <><Search size={14} className="mr-2" /> Discover Keywords</>}
                </Button>
                {keywordClusters.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      {keywordsAreReal ? <Badge className="bg-chart-3/20 text-chart-3 border-chart-3/30 text-[9px]">Real Data \u00b7 DataForSEO</Badge> : <Badge className="bg-chart-4/20 text-chart-4 border-chart-4/30 text-[9px]">AI Estimated \u00b7 Add DATAFORSEO_LOGIN secret for real data</Badge>}
                    </div>
                    {keywordClusters.map((cluster) => (
                      <div key={cluster.name}>
                        <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5"><Target size={11} className="text-primary" /> {cluster.name}</p>
                        <div className="space-y-1.5">
                          {cluster.keywords.map((kw) => (
                            <div key={kw.term} onClick={() => setSelectedKeyword(kw.term)} className={cn("flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all text-xs", selectedKeyword === kw.term ? "border-primary/50 bg-primary/10" : "border-border bg-background/40 hover:border-border/80")}>
                              {selectedKeyword === kw.term && <CheckCircle2 size={12} className="text-primary shrink-0" />}
                              <span className="flex-1 font-medium text-foreground">{kw.term}</span>
                              <span className="text-muted-foreground font-mono text-[10px]">{kw.volume}/mo</span>
                              {kw.cpc && kw.cpc !== "N/A" && <span className="text-chart-3 font-mono text-[10px]">CPC {kw.cpc}</span>}
                              <span className={cn("font-semibold", difficultyColor(kw.difficulty))}>{kw.difficulty}</span>
                              <Badge className={cn("text-[9px] px-1.5 py-0 h-4 border-0", intentColor(kw.intent))}>{kw.intent}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {selectedKeyword && <Button size="sm" onClick={() => setActiveStep("content")} className="bg-primary/20 text-primary hover:bg-primary/30">Generate Content for "{selectedKeyword}" <ChevronRight size={12} className="ml-1" /></Button>}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeStep === "content" && (
          <motion.div key="content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-border bg-card/60 backdrop-blur">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><FileText size={15} className="text-chart-4" /> Content Generation</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-48"><label className="text-xs text-muted-foreground mb-1.5 block">Target Keyword</label><Input value={selectedKeyword} onChange={(e) => setSelectedKeyword(e.target.value)} placeholder="Enter keyword..." className="bg-background/50 border-border text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground mb-1.5 block">Tone</label><select value={contentTone} onChange={(e) => setContentTone(e.target.value)} className="h-9 rounded-md border border-border bg-background/50 px-3 text-sm text-foreground"><option value="professional">Professional</option><option value="conversational">Conversational</option><option value="informative">Informative</option><option value="persuasive">Persuasive</option></select></div>
                  <div className="self-end"><Button onClick={runContent} disabled={loading} className="bg-chart-4 hover:bg-chart-4/80 text-white">{loading ? <><Loader2 size={14} className="animate-spin mr-2" /> Writing...</> : <><Zap size={14} className="mr-2" /> Generate Blog Post</>}</Button></div>
                </div>
                {contentData && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-3">{[{ label: "Word Count", value: contentData.wordCount }, { label: "Read Time", value: contentData.readTime }, { label: "SEO Optimized", value: "Yes \u2713" }].map((m) => <Card key={m.label} className="border-border bg-background/40"><CardContent className="pt-4 pb-3"><p className="text-lg font-bold text-chart-4">{m.value}</p><p className="text-[10px] text-muted-foreground">{m.label}</p></CardContent></Card>)}</div>
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg border border-border bg-background/40"><p className="text-[10px] font-semibold text-muted-foreground mb-0.5">META TITLE</p><p className="text-sm text-foreground">{contentData.metaTitle}</p></div>
                      <div className="p-3 rounded-lg border border-border bg-background/40"><p className="text-[10px] font-semibold text-muted-foreground mb-0.5">META DESCRIPTION</p><p className="text-sm text-foreground">{contentData.metaDescription}</p></div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-background/40"><p className="text-[10px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5"><FileText size={10} /> BLOG CONTENT PREVIEW</p><div className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed max-h-64 overflow-y-auto" dangerouslySetInnerHTML={{ __html: contentData.content }} /></div>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Internal Publish */}
                      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                        <p className="text-xs font-bold text-primary flex items-center gap-1.5"><FileText size={12} /> Publish to Leadzo Blog</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">Publish this post directly to your own leadzoai.com/blog page for SEO ranking.</p>
                        <Button size="sm" onClick={handlePublishToLeadzo} disabled={publishingToWebhook} className="w-full h-8 bg-primary hover:bg-primary/90 text-white shadow-sm mt-2">
                          {publishingToWebhook ? <Loader2 size={12} className="animate-spin mr-1.5" /> : <Send size={12} className="mr-1.5" />} Publish to Leadzo
                        </Button>
                      </div>

                      {/* External Webhook */}
                      <div className="p-4 rounded-lg border border-chart-2/20 bg-chart-2/5 space-y-3">
                        <p className="text-xs font-bold text-chart-2 flex items-center gap-1.5"><Zap size={12} /> Push to Client Webhook</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">Send this post to external CMS (WordPress, Shopify) via Make.com or Zapier.</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hook.make.com/..." className="h-8 text-xs flex-1 bg-background" />
                          <Button size="sm" onClick={handleAutoPublish} disabled={publishingToWebhook || !webhookUrl} className="h-8 bg-chart-2 hover:bg-chart-2/90 text-white shadow-sm">
                            Push
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button size="sm" onClick={() => { markComplete("content"); setActiveStep("publish"); if (publishPlan.length === 0) setTimeout(() => runPublishPlan(), 100); }} className="bg-chart-4/20 text-chart-4 hover:bg-chart-4/30">Next: Publish Plan <ChevronRight size={12} className="ml-1" /></Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeStep === "publish" && (
          <motion.div key="publish" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-border bg-card/60 backdrop-blur">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Rocket size={15} className="text-chart-2" /> Content Publish Plan</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">AI-generated 3-month SEO calendar based on your site, niche & keywords.</p>
                <Button onClick={runPublishPlan} disabled={publishLoading} className="bg-chart-2 hover:bg-chart-2/80 text-white w-full">
                  {publishLoading ? <><Loader2 size={14} className="animate-spin mr-2" /> Generating Plan...</> : <><Rocket size={14} className="mr-2" /> {publishPlan.length > 0 ? "Regenerate Plan" : "Generate AI Plan"}</>}
                </Button>
                {publishPlan.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Target size={16} className="text-chart-1" />
                      3-Month Content Strategy
                      
                      {autopilotActive && (
                         <Badge variant="outline" className="ml-auto bg-chart-3/10 text-chart-3 border-chart-3/20">
                            Autopilot Active 🚀
                         </Badge>
                      )}
                    </p>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {publishPlan.map((item, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border ${item.published ? 'border-chart-3/40 bg-chart-3/5' : 'border-border/50 bg-background/50'} relative group hover:border-chart-1/40 transition-colors`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{item.week}</Badge>
                              <Badge variant="outline" className="border-border text-muted-foreground">{item.type}</Badge>
                            </div>
                            <Badge variant="outline" className={cn(
                              item.priority === "High" ? "bg-chart-4/10 text-chart-4 border-chart-4/20" :
                                item.priority === "Medium" ? "bg-chart-2/10 text-chart-2 border-chart-2/20" :
                                  "bg-muted text-muted-foreground border-border/50"
                            )}>
                              {item.priority} Priority
                            </Badge>
                          </div>
                          
                          <h4 className="text-sm font-semibold text-foreground mb-2 pr-6">
                            {item.task}
                            {item.published && (
                              <span className="ml-2 inline-flex items-center text-[10px] text-chart-3 uppercase tracking-wider font-bold">
                                <CheckCircle2 size={12} className="mr-1" /> Published
                              </span>
                            )}
                          </h4>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-border flex justify-between items-center">
                    {autopilotActive ? (
                      <Button onClick={runAutopilotNow} variant="outline" size="sm" className="bg-chart-3/10 text-chart-3 hover:bg-chart-3/20 border-chart-3/30">
                         <Rocket size={14} className="mr-2" /> Run Autopilot Cron Now
                      </Button>
                    ) : (
                      <div className="text-xs text-muted-foreground">Turn on Autopilot above to auto-publish</div>
                    )}
                    <Button onClick={() => runMonitor()} disabled={loading} className="bg-chart-2 hover:bg-chart-2/80 text-white shadow-lg shadow-chart-2/20">
                      <ChevronRight size={16} className="mr-1.5" /> Continue to Monitor
                    </Button>
                  </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeStep === "monitor" && (
          <motion.div key="monitor" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-border bg-card/60 backdrop-blur">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Activity size={15} className="text-chart-3" /> Monitor & Track Rankings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button onClick={() => runMonitor()} disabled={loading} className="bg-chart-3 hover:bg-chart-3/80 text-white">
                    {loading ? <><Loader2 size={14} className="animate-spin mr-2" /> Analyzing...</> : <><RefreshCw size={14} className="mr-2" /> Generate Report</>}
                  </Button>
                  <Button onClick={connectGsc} variant="outline" className="border-chart-3 text-chart-3 hover:bg-chart-3/10">
                    <Activity size={14} className="mr-2" /> Connect Google Search Console
                  </Button>
                </div>
                {monitorData && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[{ label: "Organic Traffic", value: monitorData.organicTraffic, icon: Eye, color: "text-primary" }, { label: "Keywords Tracked", value: monitorData.rankings.length, icon: Search, color: "text-chart-1" }].map((m) => <Card key={m.label} className="border-border bg-background/40"><CardContent className="pt-4 pb-3"><m.icon size={14} className={cn("mb-1", m.color)} /><p className={cn("text-xl font-bold", m.color)}>{m.value}</p><p className="text-[10px] text-muted-foreground mt-0.5">{m.label}</p></CardContent></Card>)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">Keyword Rankings {monitorData.isRealData ? <Badge className="bg-chart-3/20 text-chart-3 border-chart-3/30 text-[9px]">Live GSC Data</Badge> : <Badge className="bg-muted text-muted-foreground text-[9px]">AI Simulated</Badge>}</p>
                      <div className="space-y-1.5">
                        {monitorData.rankings.map((r, i) => (
                          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-background/40 text-xs">
                            <span className="size-6 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">#{r.position}</span>
                            <span className="flex-1 font-medium text-foreground truncate">{r.keyword}</span>
                            {!monitorData.isRealData && <span className={cn("flex items-center gap-0.5 font-semibold", r.change > 0 ? "text-chart-3" : r.change < 0 ? "text-destructive" : "text-muted-foreground")}>{r.change > 0 ? <TrendingUp size={10} /> : r.change < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}{r.change > 0 ? `+${r.change}` : r.change}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator className="bg-border" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">AI Recommendations</p>
                      <div className="space-y-1.5">{monitorData.recommendations.map((rec, i) => <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground"><CheckCircle2 size={12} className="text-chart-3 shrink-0 mt-0.5" />{rec}</div>)}</div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
