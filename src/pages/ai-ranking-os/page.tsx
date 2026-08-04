import React, { useState } from "react";
import { 
  BarChart, Activity, ShieldCheck, Zap, Globe, FileText, Settings, Database, 
  MessageSquare, Sliders, CheckCircle2, TrendingUp, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Badge } from "@/components/ui/badge.tsx";

const TABS = [
  { id: "ai-visibility", label: "AI Visibility Center", icon: Globe },
  { id: "content-intelligence", label: "Content Intelligence", icon: FileText },
  { id: "tech-optimization", label: "Technical Optimization", icon: Sliders },
  { id: "competitor-intel", label: "Competitor Intelligence", icon: BarChart },
  { id: "ai-agents", label: "AI Agent Center", icon: Zap },
  { id: "recommendations", label: "Recommendation Center", icon: CheckCircle2 },
  { id: "reports", label: "Reports Center", icon: Database },
  { id: "automation", label: "Automation Center", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AiRankingOsPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [domain, setDomain] = useState("https://example.com");

  return (
    <div className="flex flex-col h-full bg-background/50 overflow-hidden">
      
      {/* Header */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="text-primary" size={24} />
            AI Ranking OS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            End-to-end SEO & AI Visibility Platform
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Input 
            value={domain} 
            onChange={(e) => setDomain(e.target.value)}
            className="w-64 bg-secondary/30"
            placeholder="Enter website URL..."
          />
          <Button className="bg-primary text-primary-foreground">
            Run Scan
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Top Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ScoreCard title="AI Visibility Score" score={72} trend="+5%" icon={Globe} color="text-blue-500" />
          <ScoreCard title="LLM Readiness" score={68} trend="+2%" icon={MessageSquare} color="text-purple-500" />
          <ScoreCard title="SEO Health" score={85} trend="+12%" icon={Activity} color="text-green-500" />
          <ScoreCard title="Authority Score" score={45} trend="-1%" icon={ShieldCheck} color="text-amber-500" />
        </div>

        {/* Quick Insights Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-border/50 bg-secondary/10 rounded-xl p-5">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-red-400" />
              Top High-Impact Tasks
            </h3>
            <div className="space-y-3">
              <TaskItem priority="P0" title="Missing FAQPage Schema on Core Services" impact="High" />
              <TaskItem priority="P1" title="Resolve 3-hop redirect chain on /about" impact="Medium" />
              <TaskItem priority="P1" title="Thin content detected on 4 category pages" impact="High" />
            </div>
          </div>

          <div className="border border-border/50 bg-secondary/10 rounded-xl p-5">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-green-400" />
              Recent Improvements
            </h3>
            <div className="space-y-3">
              <ImprovementItem title="Updated Meta Titles across Blog" gain="+4 SEO Score" />
              <ImprovementItem title="Added Author Bios to all articles" gain="+8 Authority Score" />
              <ImprovementItem title="Fixed 12 broken internal links" gain="+2 Health Score" />
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-border mt-8">
          <div className="flex overflow-x-auto hide-scrollbar space-x-6 pb-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="min-h-[400px] border border-border/30 rounded-xl bg-card p-6 shadow-sm">
          {activeTab === "ai-visibility" && (
            <PlaceholderView title="AI Visibility Center" desc="Entity coverage, structured data status, citation opportunities, topic authority map and AI suggestions." />
          )}
          {activeTab === "content-intelligence" && (
            <PlaceholderView title="Content Intelligence Center" desc="Content gaps, FAQs, outlines, semantic coverage, and internal link suggestions." />
          )}
          {activeTab === "tech-optimization" && (
            <PlaceholderView title="Technical Optimization Center" desc="Index issues, schema validation, Core Web Vitals, redirects, broken links." />
          )}
          {activeTab === "competitor-intel" && (
            <PlaceholderView title="Competitor Intelligence" desc="Competitor comparison, topic gaps, authority gap, opportunity finder." />
          )}
          {activeTab === "ai-agents" && (
            <PlaceholderView title="AI Agent Center" desc="Current task, reasoning summary, suggested actions and approval queue." />
          )}
          {activeTab === "recommendations" && (
            <PlaceholderView title="Recommendation Center" desc="Master list of suggestions with priority, AI impact, SEO impact, effort and estimated time." />
          )}
          {activeTab === "reports" && (
            <PlaceholderView title="Reports Center" desc="Weekly and monthly reports, PDF and Excel exports." />
          )}
          {activeTab === "automation" && (
            <PlaceholderView title="Automation Center" desc="Scheduled scans, content refresh reminders, technical health automations." />
          )}
          {activeTab === "settings" && (
            <PlaceholderView title="Settings" desc="Teams, roles, API keys, integrations, billing." />
          )}
        </div>

      </div>
    </div>
  );
}

function ScoreCard({ title, score, trend, icon: Icon, color }: { title: string, score: number, trend: string, icon: any, color: string }) {
  return (
    <div className="border border-border/50 bg-card rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Icon size={18} className={color} />
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-foreground">{score}</span>
        <Badge variant={trend.startsWith("+") ? "default" : "destructive"} className="text-[10px] px-1.5 py-0.5">
          {trend}
        </Badge>
      </div>
    </div>
  );
}

function TaskItem({ priority, title, impact }: { priority: string, title: string, impact: string }) {
  const pColor = priority === "P0" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20";
  return (
    <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border/30 bg-background/50">
      <div className="flex items-start gap-3">
        <Badge variant="outline" className={`text-[10px] ${pColor}`}>{priority}</Badge>
        <p className="text-sm text-foreground/90 leading-tight">{title}</p>
      </div>
      <Badge variant="secondary" className="text-[10px] whitespace-nowrap shrink-0">{impact} Impact</Badge>
    </div>
  );
}

function ImprovementItem({ title, gain }: { title: string, gain: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/30 bg-background/50">
      <p className="text-sm text-foreground/90 truncate">{title}</p>
      <span className="text-xs font-semibold text-green-400 whitespace-nowrap shrink-0">{gain}</span>
    </div>
  );
}

function PlaceholderView({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-4">
      <div className="size-16 rounded-full bg-secondary/30 flex items-center justify-center">
        <Settings size={24} className="text-muted-foreground animate-spin-slow" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
          {desc}
        </p>
      </div>
      <Button variant="outline" className="mt-4" size="sm">Coming in Next Phase</Button>
    </div>
  );
}
