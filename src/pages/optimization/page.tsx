import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Authenticated, Unauthenticated } from "convex/react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Zap, Plus, Trash2, ToggleLeft, ToggleRight, Brain,
  TrendingUp, TrendingDown, AlertTriangle, DollarSign, Activity,
  ChevronDown, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { cn } from "@/lib/utils.ts";

const METRICS = [
  { value: "ctr", label: "CTR (%)", unit: "%" },
  { value: "roas", label: "ROAS (x)", unit: "x" },
  { value: "cpc", label: "CPC (\u20b9)", unit: "\u20b9" },
  { value: "cpa", label: "CPA (\u20b9)", unit: "\u20b9" },
  { value: "conversions", label: "Conversions", unit: "" },
];

const CONDITIONS = [
  { value: "lt", label: "is less than (<)" },
  { value: "lte", label: "is less than or equal (\u2264)" },
  { value: "gt", label: "is greater than (>)" },
  { value: "gte", label: "is greater than or equal (\u2265)" },
];

const ACTIONS = [
  { value: "pause", label: "Pause Campaign" },
  { value: "scale_budget", label: "Scale Budget Up" },
  { value: "reduce_budget", label: "Reduce Budget" },
  { value: "alert", label: "Alert Only" },
];

const PLATFORMS = [
  { value: "all", label: "All Platforms" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
];

function computeMetric(
  campaign: { spend: number; revenue: number; impressions: number; clicks: number; conversions: number },
  metric: string
): number {
  switch (metric) {
    case "ctr": return campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
    case "roas": return campaign.spend > 0 ? campaign.revenue / campaign.spend : 0;
    case "cpc": return campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0;
    case "cpa": return campaign.conversions > 0 ? campaign.spend / campaign.conversions : 0;
    case "conversions": return campaign.conversions;
    default: return 0;
  }
}

function meetsCondition(value: number, condition: string, threshold: number): boolean {
  switch (condition) {
    case "lt": return value < threshold;
    case "lte": return value <= threshold;
    case "gt": return value > threshold;
    case "gte": return value >= threshold;
    default: return false;
  }
}

const actionColor: Record<string, string> = {
  pause: "text-red-400",
  scale_budget: "text-emerald-400",
  reduce_budget: "text-amber-400",
  alert: "text-blue-400",
};

const priorityColor: Record<string, string> = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

type AiResult = {
  summary: string;
  recommendations: {
    campaignName: string;
    platform: string;
    issue: string;
    suggestedAction: string;
    reason: string;
    budgetChange: number | null;
    priority: string;
  }[];
  budgetAllocation: {
    campaignName: string;
    platform: string;
    currentBudget: number;
    suggestedBudget: number;
  }[];
  topInsights: string[];
};

function OptimizationPageInner() {
  const rules = useQuery(api.optimization.listRules) ?? [];
  const actions = useQuery(api.optimization.listActions) ?? [];
  const campaigns = useQuery(api.launchedCampaigns.listLaunchedCampaigns) ?? [];
  const adCampaigns = useQuery(api.adCampaigns.list) ?? [];

  const createRule = useMutation(api.optimization.createRule);
  const toggleRule = useMutation(api.optimization.toggleRule);
  const deleteRule = useMutation(api.optimization.deleteRule);
  const recordAction = useMutation(api.optimization.recordAction);
  const overrideAction = useMutation(api.optimization.overrideAction);
  const updateBudget = useMutation(api.optimization.updateCampaignBudget);
  const analyzeAi = useAction(api.optimizationAi.analyzePerformance);

  const [showNewRule, setShowNewRule] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [metric, setMetric] = useState("ctr");
  const [condition, setCondition] = useState("lt");
  const [threshold, setThreshold] = useState("");
  const [action, setAction] = useState("pause");
  const [actionValue, setActionValue] = useState("");
  const [platform, setPlatform] = useState("all");
  const [savingRule, setSavingRule] = useState(false);

  const [runningEngine, setRunningEngine] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);

  const [overrideId, setOverrideId] = useState<Id<"optimizationActions"> | null>(null);
  const [overrideNote, setOverrideNote] = useState("");

  const handleSaveRule = async () => {
    if (!ruleName.trim() || !threshold) return;
    setSavingRule(true);
    try {
      await createRule({
        name: ruleName.trim(),
        metric,
        condition,
        threshold: parseFloat(threshold),
        action,
        actionValue: actionValue ? parseFloat(actionValue) : undefined,
        platform,
      });
      toast.success("Rule created");
      setShowNewRule(false);
      setRuleName(""); setThreshold(""); setActionValue("");
    } finally {
      setSavingRule(false);
    }
  };

  const runRulesEngine = async () => {
    if (campaigns.length === 0) { toast.info("No launched campaigns to evaluate."); return; }
    setRunningEngine(true);
    let triggered = 0;
    try {
      for (const camp of campaigns) {
        const adData = adCampaigns.filter((a) => a.platform === camp.platform).slice(-7);
        const totals = adData.reduce(
          (acc, a) => ({ spend: acc.spend + a.spend, revenue: acc.revenue + a.revenue, impressions: acc.impressions + a.impressions, clicks: acc.clicks + a.clicks, conversions: acc.conversions + a.conversions }),
          { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
        );
        const activeRules = rules.filter((r) => r.isActive && (r.platform === "all" || r.platform === camp.platform));
        for (const rule of activeRules) {
          const val = computeMetric(totals, rule.metric);
          if (meetsCondition(val, rule.condition, rule.threshold)) {
            let budgetBefore: number | undefined;
            let budgetAfter: number | undefined;
            if (rule.action === "scale_budget" || rule.action === "reduce_budget") {
              budgetBefore = camp.budget;
              const pct = rule.actionValue ?? 20;
              const change = rule.action === "scale_budget" ? (1 + pct / 100) : (1 - pct / 100);
              budgetAfter = Math.round(camp.budget * change);
              await updateBudget({ id: camp._id, budget: budgetAfter });
            }
            await recordAction({ ruleId: rule._id, ruleName: rule.name, campaignId: camp._id, campaignName: camp.name, platform: camp.platform, actionTaken: rule.action, metricName: rule.metric, metricValue: val, threshold: rule.threshold, budgetBefore, budgetAfter });
            triggered++;
          }
        }
      }
      toast.success(`Rules engine ran \u2014 ${triggered} action(s) triggered`);
    } finally {
      setRunningEngine(false);
    }
  };

  const runAiAnalysis = async () => {
    if (campaigns.length === 0) { toast.info("No campaigns to analyse."); return; }
    setAiLoading(true);
    setAiResult(null);
    try {
      const payload = campaigns.map((camp) => {
        const adData = adCampaigns.filter((a) => a.platform === camp.platform);
        const totals = adData.reduce(
          (acc, a) => ({ spend: acc.spend + a.spend, revenue: acc.revenue + a.revenue, impressions: acc.impressions + a.impressions, clicks: acc.clicks + a.clicks, conversions: acc.conversions + a.conversions }),
          { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
        );
        return { name: camp.name, platform: camp.platform, status: camp.status, budget: camp.budget, ...totals };
      });
      const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
      const result = await analyzeAi({ campaigns: payload, totalBudget });
      setAiResult(result);
      toast.success("AI analysis complete");
    } catch {
      toast.error("AI analysis failed \u2014 check HERCULES_API_KEY secret");
    } finally {
      setAiLoading(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideId) return;
    await overrideAction({ id: overrideId, overrideNote });
    toast.success("Action overridden");
    setOverrideId(null);
    setOverrideNote("");
  };

  const metricLabel = (m: string) => METRICS.find((x) => x.value === m)?.label ?? m;
  const condLabel = (c: string) => CONDITIONS.find((x) => x.value === c)?.label ?? c;
  const actionLabel = (a: string) => ACTIONS.find((x) => x.value === a)?.label ?? a;
  const platformLabel = (p: string) => PLATFORMS.find((x) => x.value === p)?.label ?? p;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight font-serif flex items-center gap-2">
            <Zap className="text-primary" size={22} />Optimization Agent
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Auto rules engine \u00b7 Budget reallocation \u00b7 AI performance advisor</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={runRulesEngine} disabled={runningEngine}>
            <RefreshCw size={14} className={cn(runningEngine && "animate-spin")} />Run Rules Engine
          </Button>
          <Button size="sm" onClick={runAiAnalysis} disabled={aiLoading}>
            <Brain size={14} className={cn(aiLoading && "animate-pulse")} />AI Advisor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Rules", value: rules.filter((r) => r.isActive).length, icon: Zap, color: "text-primary" },
          { label: "Actions Fired", value: actions.length, icon: Activity, color: "text-chart-3" },
          { label: "Campaigns", value: campaigns.length, icon: TrendingUp, color: "text-chart-4" },
          { label: "Overrides", value: actions.filter((a) => a.isOverridden).length, icon: AlertTriangle, color: "text-amber-400" },
        ].map((s) => (
          <Card key={s.label} className="bg-card/60 border-border/60">
            <CardContent className="py-4 flex items-center gap-3">
              <s.icon size={18} className={s.color} />
              <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="rules">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="rules">Rules Engine</TabsTrigger>
          <TabsTrigger value="history">Action History</TabsTrigger>
          <TabsTrigger value="ai">AI Advisor</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{rules.length} rule(s) defined</p>
            <Button size="sm" onClick={() => setShowNewRule(true)}><Plus size={14} /> New Rule</Button>
          </div>
          {rules.length === 0 ? (
            <Card className="bg-card/40 border-dashed border-border/50">
              <CardContent className="py-12 text-center"><Zap size={32} className="mx-auto text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">No rules yet \u2014 create your first automation rule</p></CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {rules.map((rule) => (
                  <motion.div key={rule._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <Card className="bg-card/60 border-border/60">
                      <CardContent className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">{rule.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5">{platformLabel(rule.platform)}</Badge>
                            {!rule.isActive && <Badge variant="secondary" className="text-[10px] px-1.5">Paused</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            If <span className="text-foreground/80">{metricLabel(rule.metric)}</span>{" "}
                            <span className="text-foreground/80">{condLabel(rule.condition)}</span>{" "}
                            <span className="text-foreground/80">{rule.threshold}</span>{" \u2192 "}
                            <span className={cn("font-medium", actionColor[rule.action] ?? "text-foreground")}>
                              {actionLabel(rule.action)}{rule.actionValue ? ` (${rule.actionValue}%)` : ""}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => toggleRule({ id: rule._id, isActive: !rule.isActive })} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                            {rule.isActive ? <ToggleRight size={20} className="text-chart-3" /> : <ToggleLeft size={20} />}
                          </button>
                          <button onClick={async () => { await deleteRule({ id: rule._id }); toast.success("Rule deleted"); }} className="text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"><Trash2 size={14} /></button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-2">
          {actions.length === 0 ? (
            <Card className="bg-card/40 border-dashed border-border/50">
              <CardContent className="py-12 text-center"><Activity size={32} className="mx-auto text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">No actions fired yet \u2014 run the rules engine to start</p></CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {actions.map((act) => (
                <motion.div key={act._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={cn("bg-card/60 border-border/60", act.isOverridden && "opacity-60")}>
                    <CardContent className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{act.campaignName}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5">{act.platform}</Badge>
                          <span className={cn("text-xs font-medium", actionColor[act.actionTaken] ?? "text-foreground")}>{actionLabel(act.actionTaken)}</span>
                          {act.isOverridden && <Badge variant="secondary" className="text-[10px] px-1.5 text-amber-400">Overridden</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Rule: <span className="text-foreground/70">{act.ruleName}</span>{" \u00b7 "}{act.metricName}: <span className="text-foreground/70">{act.metricValue.toFixed(2)}</span>{" \u00b7 "}threshold: <span className="text-foreground/70">{act.threshold}</span>
                          {act.budgetBefore !== undefined && (<> \u00b7 Budget: \u20b9{act.budgetBefore} \u2192 \u20b9{act.budgetAfter}</>)}
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">{new Date(act.executedAt).toLocaleString()}{act.isOverridden && act.overrideNote && ` \u00b7 Note: ${act.overrideNote}`}</p>
                      </div>
                      {!act.isOverridden && (
                        <Button variant="ghost" size="sm" className="shrink-0 text-xs" onClick={() => setOverrideId(act._id as Id<"optimizationActions">)}>Override</Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="ai" className="mt-4 space-y-4">
          {aiLoading ? (
            <Card className="bg-card/40"><CardContent className="py-16 text-center"><Brain size={40} className="mx-auto text-primary animate-pulse mb-4" /><p className="text-sm text-muted-foreground">AI is analysing your campaigns...</p></CardContent></Card>
          ) : aiResult ? (
            <div className="space-y-4">
              <Card className="bg-primary/5 border-primary/20"><CardContent className="py-4"><p className="text-sm font-medium text-primary mb-1">AI Summary</p><p className="text-sm text-foreground/80">{aiResult.summary}</p></CardContent></Card>
              <Card className="bg-card/60 border-border/60">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp size={15} className="text-chart-3" /> Top Insights</CardTitle></CardHeader>
                <CardContent className="space-y-1.5">{aiResult.topInsights.map((ins, i) => <div key={i} className="flex items-start gap-2 text-sm"><span className="text-chart-3 mt-0.5">\u2022</span><span className="text-foreground/80">{ins}</span></div>)}</CardContent>
              </Card>
              <Card className="bg-card/60 border-border/60">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap size={15} className="text-primary" /> Recommendations</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {aiResult.recommendations.map((rec, i) => (
                    <div key={i} className="border border-border/50 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{rec.campaignName}</span>
                        <Badge variant="outline" className="text-[10px]">{rec.platform}</Badge>
                        <Badge className={cn("text-[10px] border", priorityColor[rec.priority] ?? "")}>{rec.priority}</Badge>
                        <span className={cn("text-xs font-medium ml-auto", actionColor[rec.suggestedAction] ?? "text-foreground")}>{rec.suggestedAction.replace("_", " ").toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.issue}</p>
                      <p className="text-xs text-foreground/70">{rec.reason}</p>
                      {rec.budgetChange !== null && <p className="text-xs text-chart-3 font-medium flex items-center gap-1"><DollarSign size={11} /> Suggested budget: \u20b9{rec.budgetChange}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-card/60 border-border/60">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign size={15} className="text-chart-4" /> Budget Reallocation</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {aiResult.budgetAllocation.map((b, i) => {
                    const diff = b.suggestedBudget - b.currentBudget;
                    return (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="flex-1 truncate">{b.campaignName}</span>
                        <span className="text-muted-foreground">\u20b9{b.currentBudget}</span>
                        <ChevronDown size={12} className="text-muted-foreground rotate-[-90deg]" />
                        <span className="font-semibold">\u20b9{b.suggestedBudget}</span>
                        <span className={cn("text-xs font-medium", diff > 0 ? "text-chart-3" : "text-red-400")}>{diff > 0 ? "+" : ""}{diff}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
              <Button variant="secondary" size="sm" onClick={() => setAiResult(null)}><TrendingDown size={13} /> Clear Analysis</Button>
            </div>
          ) : (
            <Card className="bg-card/40 border-dashed border-border/50">
              <CardContent className="py-16 text-center space-y-3">
                <Brain size={40} className="mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Click <span className="text-foreground font-medium">AI Advisor</span> to get a deep AI analysis of your campaigns.</p>
                <Button size="sm" onClick={runAiAnalysis}><Brain size={14} /> Run AI Analysis</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showNewRule} onOpenChange={setShowNewRule}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Optimization Rule</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Rule Name</Label><Input placeholder="e.g. Low CTR Pause Rule" value={ruleName} onChange={(e) => setRuleName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Platform</Label><Select value={platform} onValueChange={setPlatform}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PLATFORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Metric</Label><Select value={metric} onValueChange={setMetric}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{METRICS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Condition</Label><Select value={condition} onValueChange={setCondition}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Threshold</Label><Input type="number" placeholder="e.g. 1.0" value={threshold} onChange={(e) => setThreshold(e.target.value)} /></div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Action</Label><Select value={action} onValueChange={setAction}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent></Select></div>
              {(action === "scale_budget" || action === "reduce_budget") && <div className="space-y-1.5"><Label>Change %</Label><Input type="number" placeholder="e.g. 20" value={actionValue} onChange={(e) => setActionValue(e.target.value)} /></div>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewRule(false)}>Cancel</Button>
            <Button onClick={handleSaveRule} disabled={savingRule || !ruleName.trim() || !threshold}>{savingRule ? "Saving\u2026" : "Create Rule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!overrideId} onOpenChange={() => { setOverrideId(null); setOverrideNote(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Override Action</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Provide a reason for overriding this automated action.</p>
            <Input placeholder="e.g. Manual campaign review in progress" value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOverrideId(null)}>Cancel</Button>
            <Button onClick={handleOverride} disabled={!overrideNote.trim()}>Confirm Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OptimizationPage() {
  return (
    <>
      <Authenticated><OptimizationPageInner /></Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-muted-foreground text-sm">Sign in to use the Optimization Agent</p>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
