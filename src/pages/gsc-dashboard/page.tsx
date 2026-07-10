import { useState, useCallback } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated } from "convex/react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Minus, Globe, Search, MousePointer, Eye, BarChart2, RefreshCw, Link2, Unlink2, ExternalLink, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils.ts";

function toDateStr(d: Date): string { return d.toISOString().split("T")[0]; }
function daysAgo(n: number): string { const d = new Date(); d.setDate(d.getDate() - n); return toDateStr(d); }

type RankingRow = { keyword: string; position: number; clicks: number; impressions: number; ctr: number };
type PageRow = { page: string; clicks: number; impressions: number; position: number; ctr: number };
type PeriodStats = { clicks: number; impressions: number; avgPosition: number };
type ComparisonData = { current: PeriodStats; previous: PeriodStats; change: { clicks: number; impressions: number; position: number } };

const DATE_RANGES = [{ label: "Last 7 days", days: 7 }, { label: "Last 28 days", days: 28 }, { label: "Last 90 days", days: 90 }];

function ChangeChip({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const positive = inverted ? value < 0 : value > 0;
  const neutral = value === 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full", neutral ? "bg-muted text-muted-foreground" : positive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
      {neutral ? <Minus className="w-3 h-3" /> : positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{value > 0 ? "+" : ""}{value}%
    </span>
  );
}

function StatCard({ label, value, sub, change, icon: Icon, inverted = false }: { label: string; value: string | number; sub?: string; change?: number; icon: React.ElementType; inverted?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold mt-1">{value}</p>{sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}</div>
          <div className="p-2 rounded-lg bg-primary/10"><Icon className="w-5 h-5 text-primary" /></div>
        </div>
        {change !== undefined && <div className="mt-3"><ChangeChip value={change} inverted={inverted} /><span className="text-xs text-muted-foreground ml-1">vs previous period</span></div>}
      </CardContent>
    </Card>
  );
}

function GscDashboardInner() {
  const gscStatus = useQuery(api.gsc.getGscStatus, {});
  const disconnectGsc = useMutation(api.gsc.disconnectGsc);
  const getGscOAuthUrl = useAction(api.gscActions.getGscOAuthUrl);
  const getGscSites = useAction(api.gscActions.getGscSites);
  const getRealRankings = useAction(api.gscActions.getRealRankings);
  const getPagePerformance = useAction(api.gscActions.getPagePerformance);
  const getTrafficComparison = useAction(api.gscActions.getTrafficComparison);

  const [sites, setSites] = useState<string[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [dateRange, setDateRange] = useState(28);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const connectGsc = async () => {
    const redirectUri = `${window.location.origin}/auth/gsc-callback`;
    const result = await getGscOAuthUrl({ redirectUri });
    if (!result.url) { toast.error(result.error ?? "GOOGLE_CLIENT_ID aur GOOGLE_CLIENT_SECRET Secrets tab mein add karo"); return; }
    window.location.href = result.url;
  };

  const loadSites = useCallback(async () => {
    setLoadingSites(true);
    try {
      const result = await getGscSites({});
      if (result.error) { toast.error(result.error); return; }
      setSites(result.sites);
      if (result.sites.length > 0) setSelectedSite(result.sites[0]);
      else toast.info("Google Search Console mein koi verified site nahi mili.");
    } finally { setLoadingSites(false); }
  }, [getGscSites]);

  const loadData = useCallback(async (site?: string, days?: number) => {
    const siteUrl = site ?? selectedSite;
    const d = days ?? dateRange;
    if (!siteUrl) { toast.error("Pehle ek site select karo"); return; }
    setLoadingData(true); setDataLoaded(false);
    try {
      const endDate = daysAgo(3);
      const startDate = daysAgo(d + 3);
      const prevStart = daysAgo(d * 2 + 3);
      const prevEnd = daysAgo(d + 4);
      const [rankResult, pageResult, compResult] = await Promise.all([
        getRealRankings({ siteUrl, startDate, endDate, rowLimit: 25 }),
        getPagePerformance({ siteUrl, startDate, endDate, rowLimit: 20 }),
        getTrafficComparison({ siteUrl, currentStart: startDate, currentEnd: endDate, previousStart: prevStart, previousEnd: prevEnd }),
      ]);
      if (rankResult.error) toast.error(`Rankings error: ${rankResult.error}`); else setRankings(rankResult.rows);
      if (pageResult.error) toast.error(`Pages error: ${pageResult.error}`); else setPages(pageResult.rows);
      if (!compResult.error) setComparison(compResult);
      setDataLoaded(true); toast.success("Real GSC data loaded!");
    } catch { toast.error("Data load failed"); }
    finally { setLoadingData(false); }
  }, [selectedSite, dateRange, getRealRankings, getPagePerformance, getTrafficComparison]);

  if (!gscStatus?.connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"><BarChart2 className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl font-bold mb-2">Google Search Console Connect Karo</h2>
          <p className="text-muted-foreground mb-6">Apni website ke real rankings, clicks, aur impressions dekho \u2014 directly Google se.</p>
          <div className="bg-muted/50 rounded-xl p-4 text-left text-sm space-y-2 mb-6">
            <p className="font-semibold">Ye data milega:</p>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Top ranking keywords</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Clicks & impressions (real)</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Average position per keyword</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Top performing pages</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Traffic comparison (this vs last period)</div>
          </div>
          <Button size="lg" onClick={connectGsc} className="w-full gap-2"><Globe className="w-4 h-4" /> Google Search Console Connect Karo</Button>
          <p className="text-xs text-muted-foreground mt-3">Zaroorat: GOOGLE_CLIENT_ID aur GOOGLE_CLIENT_SECRET Secrets tab mein</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold">GSC Dashboard</h1><p className="text-muted-foreground text-sm">Real-time data from Google Search Console</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" />Connected</Badge>
          <Button variant="ghost" size="sm" onClick={() => disconnectGsc()} className="text-destructive hover:text-destructive gap-1"><Unlink2 className="w-4 h-4" /> Disconnect</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1.5">Site Select Karo</p>
              {sites.length === 0 ? (
                <Button variant="outline" onClick={loadSites} disabled={loadingSites} className="w-full sm:w-auto gap-2">{loadingSites ? <><RefreshCw className="w-4 h-4 animate-spin" /> Loading\u2026</> : <><Globe className="w-4 h-4" /> Sites Load Karo</>}</Button>
              ) : (
                <Select value={selectedSite} onValueChange={setSelectedSite}><SelectTrigger className="w-full sm:w-80"><SelectValue placeholder="Site select karo" /></SelectTrigger><SelectContent>{sites.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              )}
            </div>
            <div>
              <p className="text-sm font-medium mb-1.5">Date Range</p>
              <Select value={String(dateRange)} onValueChange={(v) => setDateRange(Number(v))}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{DATE_RANGES.map((r) => <SelectItem key={r.days} value={String(r.days)}>{r.label}</SelectItem>)}</SelectContent></Select>
            </div>
            <Button onClick={() => loadData()} disabled={loadingData || !selectedSite} className="gap-2">{loadingData ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}{loadingData ? "Loading\u2026" : "Data Load Karo"}</Button>
          </div>
        </CardContent>
      </Card>

      {loadingData && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>}

      {dataLoaded && comparison && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Clicks" value={comparison.current.clicks.toLocaleString()} sub="Actual website visits from Google" change={comparison.change.clicks} icon={MousePointer} />
          <StatCard label="Impressions" value={comparison.current.impressions.toLocaleString()} sub="Times site appeared in Google" change={comparison.change.impressions} icon={Eye} />
          <StatCard label="Avg. Position" value={comparison.current.avgPosition.toFixed(1)} sub="Average rank on Google" change={comparison.change.position} inverted icon={TrendingUp} />
          <StatCard label="Keywords Ranking" value={rankings.length} sub="Keywords with impressions" icon={Search} />
        </motion.div>
      )}

      {dataLoaded && rankings.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Search className="w-4 h-4 text-primary" /> Top Keywords (Real Google Data)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-muted-foreground border-b text-xs"><th className="text-left pb-2 font-medium">#</th><th className="text-left pb-2 font-medium">Keyword</th><th className="text-right pb-2 font-medium">Position</th><th className="text-right pb-2 font-medium">Clicks</th><th className="text-right pb-2 font-medium">Impressions</th><th className="text-right pb-2 font-medium">CTR</th></tr></thead>
                  <tbody>
                    {rankings.map((r, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="py-2.5 font-medium max-w-[200px] truncate">{r.keyword}</td>
                        <td className="py-2.5 text-right"><span className={cn("font-semibold", r.position <= 3 ? "text-green-600" : r.position <= 10 ? "text-yellow-600" : "text-muted-foreground")}>#{r.position}</span></td>
                        <td className="py-2.5 text-right">{r.clicks.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{r.impressions.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{r.ctr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {dataLoaded && pages.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Link2 className="w-4 h-4 text-primary" /> Top Performing Pages</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-muted-foreground border-b text-xs"><th className="text-left pb-2 font-medium">Page URL</th><th className="text-right pb-2 font-medium">Clicks</th><th className="text-right pb-2 font-medium">Impressions</th><th className="text-right pb-2 font-medium">Avg. Pos.</th><th className="text-right pb-2 font-medium">CTR</th></tr></thead>
                  <tbody>
                    {pages.map((p, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 max-w-[240px]"><a href={p.page} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 truncate"><span className="truncate">{p.page.replace(/^https?:\/\/[^/]+/, "") || "/"}</span><ExternalLink className="w-3 h-3 flex-shrink-0" /></a></td>
                        <td className="py-2.5 text-right font-medium">{p.clicks.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{p.impressions.toLocaleString()}</td>
                        <td className="py-2.5 text-right"><span className={cn("font-semibold", p.position <= 3 ? "text-green-600" : p.position <= 10 ? "text-yellow-600" : "text-muted-foreground")}>#{p.position}</span></td>
                        <td className="py-2.5 text-right text-muted-foreground">{p.ctr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {dataLoaded && rankings.length === 0 && pages.length === 0 && (
        <Card><CardContent className="py-12 text-center"><BarChart2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="font-medium">Koi data nahi mila</p><p className="text-sm text-muted-foreground mt-1">Is site ka GSC mein koi data nahi hai ya site naya hai. Google ko index karne mein 2-4 hafta lagta hai.</p></CardContent></Card>
      )}

      {dataLoaded && <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1"><ArrowUpRight className="w-3 h-3" />GSC data mein ~3 din ki delay hoti hai. Ye data directly Google se aata hai.</p>}
    </div>
  );
}

export default function GscDashboardPage() {
  return (
    <>
      <GscDashboardInner />
    </>
  );
}
