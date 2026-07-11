import { useQuery } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { motion } from "motion/react";
import { Authenticated, Unauthenticated } from "@/lib/convex-supabase-adapter";
import { useNavigate } from "react-router-dom";
import {
  Layers, MessageSquareCode, BarChart4, LayoutDashboard,
  BarChart3, Wand2, Rocket, SlidersHorizontal, Users, Send,
  Mail, Camera, Search, TrendingUp, Zap, Brain, Target,
  ArrowRight, CheckCircle2, Clock, AlertCircle, Star,
  Activity, Globe, ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

const QUICK_ACTIONS = [
  { label: "Lead Pipeline", icon: Layers, path: "/", color: "from-violet-500 to-purple-600", desc: "Manage your leads" },
  { label: "Live Inbox", icon: MessageSquareCode, path: "/inbox", color: "from-cyan-500 to-blue-600", desc: "Real-time messages" },
  { label: "Launch Ads", icon: Rocket, path: "/campaign-launch", color: "from-orange-500 to-red-500", desc: "Run AI campaigns" },
  { label: "AI Creatives", icon: Wand2, path: "/creative-generation", color: "from-pink-500 to-rose-600", desc: "Generate ad content" },
  { label: "CEO Dashboard", icon: LayoutDashboard, path: "/ceo-dashboard", color: "from-emerald-500 to-green-600", desc: "Business overview" },
  { label: "Market Intel", icon: BarChart3, path: "/market-intelligence", color: "from-amber-500 to-yellow-500", desc: "Market insights" },
  { label: "CRM Agent", icon: Users, path: "/crm", color: "from-indigo-500 to-blue-600", desc: "Customer relations" },
  { label: "SEO Agent", icon: Search, path: "/seo-agent", color: "from-teal-500 to-cyan-600", desc: "SEO optimization" },
];

const AI_AGENTS = [
  { name: "Brain Agent", icon: Brain, status: "active", task: "Analyzing 6 leads..." },
  { name: "Launch Agent", icon: Rocket, status: "active", task: "Campaign optimizing" },
  { name: "CRM Agent", icon: Users, status: "active", task: "Scoring contacts" },
  { name: "Market Agent", icon: BarChart3, status: "idle", task: "Awaiting trigger" },
  { name: "Creative Agent", icon: Wand2, status: "idle", task: "On standby" },
  { name: "SEO Agent", icon: Globe, status: "active", task: "Crawling sites" },
];

const STAGE_COLORS: Record<string, string> = {
  new: "bg-violet-500",
  contacted: "bg-cyan-500",
  negotiating: "bg-amber-500",
  converted: "bg-emerald-500",
  lost: "bg-slate-500",
  spam: "bg-red-500",
};

function StatCard({
  label, value, icon: Icon, color, trend, delay,
}: {
  label: string; value: string | number; icon: React.ElementType;
  color: string; trend?: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-sm p-5 group hover:border-white/10 hover:bg-white/[0.05] transition-all duration-300"
    >
      <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity", color)} />
      <div className="flex items-start justify-between mb-3">
        <div className={cn("size-10 rounded-xl flex items-center justify-center", color + "/20")}>
          <Icon size={18} className={cn("opacity-90", color.replace("bg-", "text-"))} />
        </div>
        {trend && (
          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
            <TrendingUp size={9} className="mr-1" />{trend}
          </Badge>
        )}
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
    </motion.div>
  );
}

function DashboardInner() {
  const leads = useQuery(api.leads.list, {});
  const navigate = useNavigate();

  const total = leads?.length ?? 0;
  const converted = leads?.filter((l: Doc<"leads">) => l.status === "converted").length ?? 0;
  const newLeads = leads?.filter((l: Doc<"leads">) => l.status === "new").length ?? 0;
  const urgent = leads?.filter((l: Doc<"leads">) => l.isUrgent).length ?? 0;
  const convRate = total > 0 ? Math.round((converted / total) * 100) : 0;

  const recentLeads = leads?.slice(0, 5) ?? [];

  const isLoading = leads === undefined;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-semibold tracking-widest uppercase">All Systems Online</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent">
            Leadzo Command Center
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">AI-powered lead management & autonomous ad campaigns</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">6 AI Agents Active</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="lg:col-span-2 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm tracking-wide text-foreground/80 uppercase">Quick Launch</h2>
            <Zap size={14} className="text-amber-400" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(({ label, icon: Icon, path, color, desc }, i) => (
              <motion.button
                key={path}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                onClick={() => navigate(path)}
                className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200 cursor-pointer text-center"
              >
                <div className={cn("size-10 rounded-xl bg-gradient-to-br flex items-center justify-center group-hover:scale-110 transition-transform", color)}>
                  <Icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm tracking-wide text-foreground/80 uppercase">AI Agents</h2>
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
              Live
            </Badge>
          </div>
          <div className="space-y-2">
            {AI_AGENTS.map(({ name, icon: Icon, status, task }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
              >
                <div className={cn(
                  "size-8 rounded-lg flex items-center justify-center shrink-0",
                  status === "active" ? "bg-emerald-500/15" : "bg-muted/30"
                )}>
                  <Icon size={14} className={status === "active" ? "text-emerald-400" : "text-muted-foreground"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-tight">{name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{task}</p>
                </div>
                <div className={cn(
                  "size-2 rounded-full shrink-0",
                  status === "active" ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/40"
                )} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : (
          <>
            <StatCard label="Total Leads" value={total} icon={Target} color="bg-violet-500" trend="+12%" delay={0.2} />
            <StatCard label="New This Week" value={newLeads} icon={Activity} color="bg-cyan-500" trend="+5" delay={0.25} />
            <StatCard label="Converted" value={converted} icon={CheckCircle2} color="bg-emerald-500" trend={`${convRate}%`} delay={0.3} />
            <StatCard label="Urgent Leads" value={urgent} icon={AlertCircle} color="bg-red-500" delay={0.35} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm tracking-wide text-foreground/80 uppercase">Recent Leads</h2>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1 h-7" onClick={() => navigate("/")}>
              View all <ArrowRight size={12} />
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : recentLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No leads yet</div>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead: Doc<"leads">, i: number) => (
                <motion.div key={lead._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group" onClick={() => navigate("/")}>
                  <div className="size-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 text-sm font-bold text-foreground">
                    {(lead.name ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight truncate">{lead.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{lead.contact}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={cn("size-2 rounded-full", STAGE_COLORS[lead.status] ?? "bg-muted")} />
                    {lead.isUrgent && <Badge variant="outline" className="text-[9px] px-1.5 h-4 border-red-500/30 text-red-400 bg-red-500/10">Urgent</Badge>}
                    {lead.score !== undefined && <div className="flex items-center gap-0.5"><Star size={10} className="text-amber-400 fill-amber-400" /><span className="text-[10px] text-muted-foreground">{lead.score}</span></div>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm tracking-wide text-foreground/80 uppercase">Pipeline Overview</h2>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1 h-7" onClick={() => navigate("/")}>
              Open Pipeline <ArrowRight size={12} />
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-3">
              {[
                { status: "new", label: "New Leads" },
                { status: "contacted", label: "Contacted" },
                { status: "negotiating", label: "Negotiating" },
                { status: "converted", label: "Converted" },
                { status: "lost", label: "Lost / Spam" },
              ].map(({ status, label }) => {
                const count = leads?.filter((l: Doc<"leads">) => l.status === status || (status === "lost" && l.status === "spam")).length ?? 0;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className={cn("size-2.5 rounded-full shrink-0", STAGE_COLORS[status] ?? "bg-muted")} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-foreground/80">{label}</span>
                        <span className="text-xs font-bold text-foreground">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }} className={cn("h-full rounded-full", STAGE_COLORS[status] ?? "bg-muted")} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock size={11} /> Conversion Rate</span>
                <span className="text-sm font-bold text-emerald-400">{convRate}%</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <><DashboardInner /></>
      
    </>
  );
}
