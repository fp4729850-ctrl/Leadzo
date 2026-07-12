import { useQuery } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";
import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Users,
  TrendingUp,
  ShieldAlert,
  Zap,
  Star,
  CheckCircle2,
  BarChart4,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";

const PLATFORM_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
  telegram: "#2AABEE",
  instagram: "#E1306C",
  reddit: "#FF4500",
  x: "#e0e0e0",
  email: "#F59E0B",
};

const INTENT_COLORS: Record<string, string> = {
  BUY: "#10B981",
  SELL: "#3B82F6",
  NONE: "#6B7280",
  SPAM: "#EF4444",
};

const LANG_COLORS: Record<string, string> = {
  hinglish: "#8B5CF6",
  english: "#06B6D4",
  hindi: "#F97316",
};

function StatCard({
  label, value, sub, icon: Icon, accent, delay,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay ?? 0, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const }}
      className="rounded-xl border border-border bg-card p-4 flex items-start gap-4"
    >
      <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", accent)}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-foreground leading-tight">{value}</p>
        <p className="text-xs font-semibold text-foreground/70 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function ChartCard({ title, children, delay }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay ?? 0, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const }}
      className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4"
    >
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {children}
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const metrics = useQuery(api.leads.getMetrics, {});

  if (!metrics) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const platformData = (metrics?.platformMap ? Object.entries(metrics.platformMap) : []).map(([name, value]) => ({ name, value }));
  const intentData = (metrics?.intentMap ? Object.entries(metrics.intentMap) : []).map(([name, value]) => ({ name, value }));
  const langData = (metrics?.languageMap ? Object.entries(metrics.languageMap) : []).map(([name, value]) => ({ name, value }));

  return (
    <div className="flex flex-col gap-6 min-h-0">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <BarChart4 size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight font-serif">Analytics</h1>
          <p className="text-sm text-muted-foreground">Real-time lead intelligence</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Total Leads" value={metrics.total} icon={Users} accent="bg-primary/10 text-primary" delay={0} />
        <StatCard label="Converted" value={metrics.converted} sub={`${metrics.conversionRate}% rate`} icon={CheckCircle2} accent="bg-chart-3/10 text-chart-3" delay={0.05} />
        <StatCard label="Avg Score" value={`${metrics.avgScore}/100`} icon={Star} accent="bg-chart-4/10 text-chart-4" delay={0.1} />
        <StatCard label="New Leads" value={metrics.newLeads} icon={TrendingUp} accent="bg-accent/10 text-accent-foreground" delay={0.15} />
        <StatCard label="Urgent" value={metrics.urgent} icon={Zap} accent="bg-destructive/10 text-destructive" delay={0.2} />
        <StatCard label="Scam/Spam" value={metrics.scam + metrics.spam} icon={ShieldAlert} accent="bg-destructive/10 text-destructive" delay={0.25} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Leads — Last 7 Days" delay={0.1}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics?.dailyLeads || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" name="Leads" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pipeline Funnel" delay={0.15}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics?.statusFunnel || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={72} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Leads" radius={[0, 6, 6, 0]}>
                {metrics.statusFunnel.map((entry) => (
                  <Cell key={entry.status} fill={entry.status === "Converted" ? "#10B981" : entry.status === "Spam" || entry.status === "Lost" ? "#EF4444" : entry.status === "Negotiating" ? "#F59E0B" : "hsl(var(--primary))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Platform Distribution" delay={0.2}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={platformData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                {platformData.map((entry) => <Cell key={entry.name} fill={PLATFORM_COLORS[entry.name] ?? "hsl(var(--muted-foreground))"} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(v) => <span className="text-xs capitalize text-muted-foreground">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Intent Breakdown" delay={0.25}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={intentData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                {intentData.map((entry) => <Cell key={entry.name} fill={INTENT_COLORS[entry.name] ?? "hsl(var(--muted-foreground))"} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lead Score Distribution" delay={0.3}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={metrics?.scoreBuckets || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="range" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                {metrics.scoreBuckets.map((entry, i) => <Cell key={entry.range} fill={i < 2 ? "#EF4444" : i === 2 ? "#F59E0B" : "#10B981"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Language Distribution" delay={0.35}>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={langData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" name="Leads" radius={[6, 6, 0, 0]}>
              {langData.map((entry) => <Cell key={entry.name} fill={LANG_COLORS[entry.name] ?? "hsl(var(--muted-foreground))"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
