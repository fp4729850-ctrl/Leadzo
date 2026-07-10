import { Outlet, NavLink, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Trophy, Layers, MessageSquareCode, BarChart4, Settings2,
  Send, Mail, Camera, Search, Zap, LayoutDashboard, BarChart3, Wand2, Rocket, SlidersHorizontal, Users, Settings, Brain, Phone, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Separator } from "@/components/ui/separator.tsx";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { path: "/pipeline", label: "Pipeline", icon: Layers },
  { path: "/inbox", label: "Live Inbox", icon: MessageSquareCode },
  { path: "/analytics", label: "Analytics", icon: BarChart4 },
  { path: "/ceo-dashboard", label: "CEO Dashboard", icon: LayoutDashboard },
  { path: "/market-intelligence", label: "Market Intel", icon: BarChart3 },
  { path: "/creative-generation", label: "AI Creatives", icon: Wand2 },
  { path: "/campaign-launch", label: "Launch Agent", icon: Rocket },
  { path: "/optimization", label: "Optimize Agent", icon: SlidersHorizontal },
  { path: "/learning-agent", label: "Learning Agent", icon: Brain },
  { path: "/crm", label: "CRM Agent", icon: Users },
  { path: "/scrapers", label: "Scrapers", icon: Settings2 },
  { path: "/wa-sender", label: "Personal WA", icon: Send },
  { path: "/email-campaign", label: "AI Email", icon: Mail },
  { path: "/insta-campaign", label: "Insta Campaign", icon: Camera },
  { path: "/bulk-calling", label: "Bulk Calling", icon: Phone },
  { path: "/seo-agent", label: "SEO Agent", icon: Search },
  { path: "/gsc-dashboard", label: "GSC Rankings", icon: TrendingUp },
  { path: "/settings", label: "Settings", icon: Settings },
] as const;

const LIVE_PATHS = ["/", "/pipeline", "/inbox", "/analytics", "/ceo-dashboard", "/market-intelligence", "/creative-generation", "/campaign-launch", "/optimization", "/learning-agent", "/crm", "/wa-sender", "/email-campaign", "/insta-campaign", "/bulk-calling", "/seo-agent", "/gsc-dashboard", "/settings"];

import InstallBanner from "@/components/install-banner.tsx";

export default function AppLayout() {
  const location = useLocation();

  const comingSoon = (e: React.MouseEvent, label: string) => {
    e.preventDefault();
    toast.info(`${label} — coming soon in a future milestone!`);
  };

  const isActive = (path: string, end?: boolean) =>
    end ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Ambient bg */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-sidebar shrink-0">
        {/* Logo */}
        <div className="px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <Trophy size={18} className="text-primary-foreground" />
            </div>
            <div>
              <p className="font-extrabold text-sm tracking-tight text-sidebar-foreground font-serif">
                Leadzo AI
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="size-1.5 rounded-full bg-chart-3 animate-pulse" />
                <span className="text-[10px] text-sidebar-foreground/50 font-medium">
                  AI Agents Active
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          <p className="px-2 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Workspace
          </p>
          {NAV_ITEMS.map(({ path, label, icon: Icon, ...rest }) => {
            const active = isActive(path, "end" in rest ? rest.end : false);
            const isComingSoon = !LIVE_PATHS.includes(path);
            return (
              <NavLink
                key={path}
                to={path}
                onClick={isComingSoon ? (e) => comingSoon(e, label) : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
                  active
                    ? "bg-sidebar-primary/10 text-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon size={15} className="shrink-0" />
                <span>{label}</span>
                {isComingSoon && (
                  <Badge variant="secondary" className="ml-auto text-[9px] px-1 py-0 h-4 font-semibold">
                    Soon
                  </Badge>
                )}
              </NavLink>
            );
          })}
        </nav>

        <Separator className="bg-sidebar-border" />
        <div className="px-4 py-3 flex items-center gap-2">
          <Zap size={12} className="text-chart-4" />
          <span className="text-xs text-sidebar-foreground/40">PraisonAI Agents</span>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 md:px-6 h-14 border-b border-border bg-background/80 backdrop-blur-sm shrink-0 md:hidden">
          <div className="size-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Trophy size={15} className="text-primary-foreground" />
          </div>
          <span className="font-extrabold text-sm tracking-tight font-serif">Leadzo AI</span>
          <div className="flex items-center gap-1 ml-1">
            <span className="size-1.5 rounded-full bg-chart-3 animate-pulse" />
            <span className="text-[10px] text-muted-foreground">AI Active</span>
          </div>
        </header>

        {/* Mobile horizontal nav */}
        <div className="md:hidden flex gap-1 overflow-x-auto px-3 py-2 border-b border-border bg-background/60 backdrop-blur-sm shrink-0">
          {NAV_ITEMS.map(({ path, label, icon: Icon, ...rest }) => {
            const active = isActive(path, "end" in rest ? rest.end : false);
            const mobileIsComingSoon = !LIVE_PATHS.includes(path);
            return (
              <NavLink
                key={path}
                to={path}
                onClick={mobileIsComingSoon ? (e) => comingSoon(e, label) : undefined}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon size={12} />
                {label}
              </NavLink>
            );
          })}
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <InstallBanner />
    </div>
  );
}
