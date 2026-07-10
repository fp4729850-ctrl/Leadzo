import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { TrendingUp, TrendingDown, DollarSign, Target, Zap, MousePointer2, Eye, BarChart2, Send, AlertTriangle, CheckCircle2, Brain, ChevronRight, Loader2, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#1877F2", google: "#EA4335", tiktok: "#010101", linkedin: "#0A66C2", instagram: "#E1306C",
};

const SUGGESTED_QUERIES = [
  "Why did ROAS drop today?", "Which platform is best performing?",
  "Should I scale budget on any campaign?", "What is my best audience?", "How can I reduce CPL?",
];

function StatCard({ label, value, sub, icon: Icon, color, trend, delay = 0 }: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string; trend?: "up" | "down" | "neutral"; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const }} className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 blur-2xl -translate-y-1/2 translate-x-1/2" style={{ background: color }} />
      <div className="flex items-center justify-between">
        <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
          <span style={{ color }}><Icon size={18} className="shrink-0" /></span>
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 text-xs font-semibold", trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-muted-foreground")}>
            {trend === "up" ? <TrendingUp size={12} /> : trend === "down" ? <TrendingDown size={12} /> : null}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-foreground tracking-tight">{value}</p>
        <p className="text-xs font-semibold text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function ChartCard({ title, children, delay = 0, className }: { title: string; children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const }} className={cn("rounded-2xl border border-border bg-card p-5 flex flex-col gap-4", className)}>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {children}
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-xl px-3 py-2 text-xs shadow-2xl">
      {label && <p className="font-bold text-foreground mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="flex gap-2">
          <span>{p.name}:</span>
          <span className="font-black">{p.name === "spend" || p.name === "revenue" ? `₹${p.value.toLocaleString("en-IN")}` : p.value}</span>
        </p>
      ))}
    </div>
  );
}

function FacebookLiveInsights() {
  const getInsights = useAction(api.platformAds.getFacebookAdsInsights);
  const [data, setData] = useState<{ success: boolean; campaigns?: { campaign_id: string; campaign_name: string; spend: string; impressions: string; clicks: string; ctr?: string; cpc?: string }[]; totalSpend?: number; totalImpressions?: number; totalClicks?: number; avgCtr?: number; error?: string; isDemo?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState("last_30d");

  const load = async (p: string) => {
    setLoading(true);
    try { const res = await getInsights({ datePreset: p }); setData(res); }
    catch { toast.error("Could not fetch Facebook Ads insights"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(preset); }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }} className="rounded-2xl border border-[#1877F2]/20 bg-[#1877F2]/5 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-[#1877F2]/20 flex items-center justify-center"><BarChart2 size={16} className="text-[#1877F2]" /></div>
          <div>
            <p className="text-sm font-bold text-foreground flex items-center gap-2">Facebook Ads Live Performance
              {data?.isDemo && <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-400/30">DEMO</Badge>}
              {!data?.isDemo && data?.success && <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-400/30">LIVE</Badge>}
            </p>
            <p className="text-[10px] text-muted-foreground">Real-time Facebook Ads Insights API data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
            {[{ value: "last_7d", label: "7 Days" }, { value: "last_30d", label: "30 Days" }, { value: "last_90d", label: "90 Days" }, { value: "this_month", label: "This Month" }].map((p) => (
              <button key={p.value} onClick={() => { setPreset(p.value); void load(p.value); }} className={cn("px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer", preset === p.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{p.label}</button>
            ))}
          </div>
          <button onClick={() => void load(preset)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <TrendingUp size={13} />}
          </button>
        </div>
      </div>
      {data?.success && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[{ label: "Total Spend", value: `₹${(data.totalSpend ?? 0).toLocaleString("en-IN")}`, color: "#EF4444" }, { label: "Impressions", value: `${((data.totalImpressions ?? 0) / 1000).toFixed(1)}K`, color: "#3B82F6" }, { label: "Clicks", value: `${(data.totalClicks ?? 0).toLocaleString("en-IN")}`, color: "#10B981" }, { label: "Avg CTR", value: `${data.avgCtr ?? 0}%`, color: "#8B5CF6" }].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
              <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide">{s.label}</p>
              <p className="text-base font-black mt-0.5" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}
      {loading && <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>}
      {!loading && data?.success && (data.campaigns?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Campaign Breakdown</p>
          {data.campaigns!.map((c) => (
            <div key={c.campaign_id} className="rounded-xl border border-border bg-background/50 px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="size-2 rounded-full bg-[#1877F2] shrink-0" />
              <p className="text-xs font-semibold text-foreground flex-1 min-w-0 truncate">{c.campaign_name}</p>
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <span className="text-red-400 font-bold">₹{parseFloat(c.spend).toLocaleString("en-IN")}</span>
                <span>{parseInt(c.impressions).toLocaleString("en-IN")} imp</span>
                <span className="text-emerald-400">{parseInt(c.clicks).toLocaleString("en-IN")} clicks</span>
                {c.ctr && <span className="text-purple-400">{parseFloat(c.ctr).toFixed(2)}% CTR</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {data?.isDemo && <p className="text-[9px] text-muted-foreground text-center">DEMO data shown. Add <span className="font-mono text-foreground">FACEBOOK_ADS_ACCESS_TOKEN</span> in Secrets to see live data.</p>}
    </motion.div>
  );
}

function CeoQueryBox({ metrics }: { metrics: { totalSpend: number; totalRevenue: number; roas: number; cpl: number; totalConversions: number; totalImpressions: number; totalClicks: number; ctr: number } }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const askAi = useAction(api.ceoAi.answerCeoQuery);
  const saveQuery = useMutation(api.adCampaigns.saveCeoQuery);
  const history = useQuery(api.adCampaigns.listCeoQueries);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setQuestion(q); setLoading(true); setAnswer(null);
    try {
      const res = await askAi({ question: q, metrics });
      setAnswer(res);
      await saveQuery({ question: q, answer: res });
    } catch { toast.error("AI answer failed. Set HERCULES_API_KEY in Secrets."); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }} className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center"><Brain size={16} className="text-primary" /></div>
        <div>
          <p className="text-sm font-bold text-foreground">Ask Your AI CEO Brain</p>
          <p className="text-xs text-muted-foreground">Ask anything about your campaigns</p>
        </div>
      </div>
      <div className="flex gap-2">
        <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void ask(question)} placeholder="Why did ROAS drop today?" className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <Button onClick={() => void ask(question)} disabled={loading || !question.trim()} size="sm" className="rounded-xl px-4 gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Ask
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUERIES.map((q) => (
          <button key={q} onClick={() => void ask(q)} className="text-[11px] font-medium px-3 py-1 rounded-full border border-border bg-background/40 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer">{q}</button>
        ))}
      </div>
      <AnimatePresence>
        {answer && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex gap-2 mb-1"><Brain size={13} className="text-primary mt-0.5 shrink-0" /><p className="text-xs font-bold text-primary">AI Answer</p></div>
            <p className="text-sm text-foreground leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
      {history && history.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recent Queries</p>
          {history.slice(0, 3).map((q) => (
            <button key={q._id} onClick={() => { setQuestion(q.question); setAnswer(q.answer); }} className="flex items-center gap-2 text-left px-3 py-2 rounded-lg hover:bg-background/60 transition-all group cursor-pointer">
              <ChevronRight size={12} className="text-muted-foreground group-hover:text-primary shrink-0" />
              <span className="text-xs text-muted-foreground truncate group-hover:text-foreground">{q.question}</span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function CeoDashboardPage() {
  return (
    <>
      <AuthLoading><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div></AuthLoading>
      <Unauthenticated><div className="flex flex-col items-center justify-center h-64 gap-4"><p className="text-muted-foreground text-sm">Sign in to view CEO Dashboard</p><SignInButton /></div></Unauthenticated>
      <Authenticated><CeoDashboardInner /></Authenticated>
    </>
  );
}

function CeoDashboardInner() {
  const metrics = useQuery(api.adCampaigns.getDashboardMetrics);
  const seedData = useMutation(api.adCampaigns.seedSampleData);

  useEffect(() => { seedData().catch(() => null); }, [seedData]);

  if (!metrics) return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 min-h-0">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="size-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"><LayoutDashboard size={18} className="text-primary-foreground" /></div>
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight font-serif">CEO Dashboard</h1>
          <p className="text-sm text-muted-foreground">Autonomous Ads Intelligence · Last 30 Days</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium hidden sm:block">Live Data</span>
        </div>
      </motion.div>

      {metrics.alerts.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
          {metrics.alerts.slice(0, 3).map((alert, i) => (
            <div key={i} className={cn("flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium border", alert.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : alert.type === "danger" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400")}>
              {alert.type === "success" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {alert.message}
            </div>
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Spend" value={`₹${(metrics.totalSpend / 1000).toFixed(1)}K`} sub="30-day total" icon={DollarSign} color="#EF4444" trend="neutral" delay={0.0} />
        <StatCard label="Revenue" value={`₹${(metrics.totalRevenue / 1000).toFixed(1)}K`} sub="Generated" icon={TrendingUp} color="#10B981" trend="up" delay={0.05} />
        <StatCard label="ROAS" value={`${metrics.roas}x`} sub="Return on ad spend" icon={BarChart2} color={metrics.roas >= 3 ? "#10B981" : metrics.roas >= 2 ? "#F59E0B" : "#EF4444"} trend={metrics.roas >= 3 ? "up" : "down"} delay={0.1} />
        <StatCard label="CPL" value={`₹${metrics.cpl.toLocaleString("en-IN")}`} sub="Cost per lead" icon={Target} color="#8B5CF6" trend="neutral" delay={0.15} />
        <StatCard label="Conversions" value={metrics.totalConversions.toLocaleString("en-IN")} sub="Total leads" icon={Zap} color="#F59E0B" delay={0.2} />
        <StatCard label="Impressions" value={`${(metrics.totalImpressions / 1000).toFixed(0)}K`} sub="Total views" icon={Eye} color="#06B6D4" delay={0.25} />
        <StatCard label="Clicks" value={`${(metrics.totalClicks / 1000).toFixed(1)}K`} sub="Link clicks" icon={MousePointer2} color="#3B82F6" delay={0.3} />
        <StatCard label="CTR" value={`${metrics.ctr}%`} sub="Click-through rate" icon={Target} color="#EC4899" trend={metrics.ctr >= 2 ? "up" : "down"} delay={0.35} />
      </div>

      <FacebookLiveInsights />
      <CeoQueryBox metrics={{ totalSpend: metrics.totalSpend, totalRevenue: metrics.totalRevenue, roas: metrics.roas, cpl: metrics.cpl, totalConversions: metrics.totalConversions, totalImpressions: metrics.totalImpressions, totalClicks: metrics.totalClicks, ctr: metrics.ctr }} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Daily Spend vs Revenue (30 Days)" delay={0.2}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={metrics.dailyTrend}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(v) => <span className="text-xs capitalize text-muted-foreground">{v}</span>} />
              <Area type="monotone" dataKey="spend" name="spend" stroke="#EF4444" fill="url(#spendGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke="#10B981" fill="url(#revenueGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Daily ROAS Trend" delay={0.25}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={metrics.dailyTrend}>
              <defs><linearGradient id="roasGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} /><stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="roas" name="roas" stroke="#8B5CF6" fill="url(#roasGrad)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Platform Performance — ROAS" delay={0.3}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={metrics.platformBreakdown} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="platform" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={72} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="roas" name="roas" radius={[0, 8, 8, 0]}>
              {metrics.platformBreakdown.map((entry) => <Cell key={entry.platform} fill={PLATFORM_COLORS[entry.platform] ?? "#6B7280"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const }} className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Top Campaigns — Last 7 Days</h3>
          <Badge variant="secondary" className="text-xs">Sorted by ROAS</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Campaign</th><th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Spend</th><th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Revenue</th><th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">ROAS</th><th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Conv.</th><th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th></tr></thead>
            <tbody>
              {metrics.topCampaigns.map((camp, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3"><div className="flex items-center gap-2"><div className="size-2.5 rounded-full shrink-0" style={{ background: PLATFORM_COLORS[camp.platform] ?? "#6B7280" }} /><span className="font-medium text-foreground text-xs truncate max-w-[160px]">{camp.name}</span></div></td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">₹{camp.spend.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right text-xs text-emerald-400 font-semibold">₹{camp.revenue.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right"><span className={cn("text-xs font-black", camp.roas >= 3 ? "text-emerald-400" : camp.roas >= 2 ? "text-amber-400" : "text-red-400")}>{camp.roas}x</span></td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{camp.conversions}</td>
                  <td className="px-4 py-3"><Badge variant={camp.status === "active" ? "default" : "secondary"} className="text-[10px] capitalize">{camp.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <Separator />
      <p className="text-[10px] text-muted-foreground text-center pb-4">Powered by PraisonAI Agents · Data updates in real-time</p>
    </div>
  );
}
