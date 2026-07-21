import { Outlet, NavLink, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Trophy, Layers, MessageSquareCode, BarChart4, Settings2,
  Send, Mail, Camera, Search, Zap, LayoutDashboard, BarChart3, Wand2, Rocket, SlidersHorizontal, Users, Settings, Brain, Phone, TrendingUp, LogIn, LogOut, MessageCircle, CreditCard
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth.ts";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Separator } from "@/components/ui/separator.tsx";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/wa-sender", label: "Bulk Whatsapp", icon: Send },
  { path: "/bulk-calling", label: "Bulk Calling", icon: Phone },
  { path: "/ai-reminders", label: "AI Reminders", icon: Settings2 }, // Using Settings2 as placeholder, will update later if needed
  { path: "/seo-agent", label: "SEO Agent", icon: Search },
  { path: "/campaign-launch", label: "Insta & Google Campaign", icon: Rocket },
  { path: "/insta-campaign", label: "Insta DM Campaign", icon: Camera },
  { path: "/pipeline", label: "Pipeline", icon: Layers },
  { path: "/inbox", label: "Live Inbox", icon: MessageSquareCode },
  { path: "/analytics", label: "Analytics", icon: BarChart4 },
  { path: "/ceo-dashboard", label: "CEO Dashboard", icon: LayoutDashboard },
  { path: "/market-intelligence", label: "Market Intel", icon: BarChart3 },
  { path: "/creative-generation", label: "AI Creatives", icon: Wand2 },
  { path: "/optimization", label: "Optimize Agent", icon: SlidersHorizontal },
  { path: "/learning-agent", label: "Learning Agent", icon: Brain },
  { path: "/crm", label: "CRM Agent", icon: Users },
  { path: "/scrapers", label: "Scrapers", icon: Settings2 },
  { path: "/email-campaign", label: "AI Email", icon: Mail },
  { path: "/reddit-agent", label: "Reddit Agent", icon: MessageCircle },
  { path: "/gsc-dashboard", label: "GSC Rankings", icon: TrendingUp },
  { path: "/pricing", label: "Billing & Plans", icon: CreditCard },
  { path: "/settings", label: "Settings", icon: Settings },
] as const;

const LIVE_PATHS = ["/dashboard", "/pipeline", "/inbox", "/analytics", "/ceo-dashboard", "/market-intelligence", "/creative-generation", "/campaign-launch", "/optimization", "/learning-agent", "/crm", "/wa-sender", "/email-campaign", "/insta-campaign", "/bulk-calling", "/ai-reminders", "/seo-agent", "/reddit-agent", "/gsc-dashboard", "/pricing", "/settings"];

import InstallBanner from "@/components/install-banner.tsx";

export default function AppLayout() {
  const location = useLocation();
  const { user, signin, signout } = useAuth();

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
            <div className="size-9 rounded-xl overflow-hidden shrink-0 border border-border">
              <img src="/leadzo-logo.png" alt="Leadzo Logo" className="w-full h-full object-cover" />
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
            const active = isActive(path, (rest as any).end || false);
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
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-chart-4" />
            <span className="text-xs text-sidebar-foreground/40">PraisonAI Agents</span>
          </div>
          {user ? (
            <Button variant="outline" size="sm" onClick={signout} className="w-full justify-start text-xs h-8 border-sidebar-border bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground">
              <LogOut size={14} className="mr-2" />
              Logout ({user.email?.split('@')[0]})
            </Button>
          ) : (
            <Button size="sm" onClick={signin} className="w-full justify-start text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground">
              <LogIn size={14} className="mr-2" />
              Login with Supabase
            </Button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 md:px-6 h-14 border-b border-border bg-background/80 backdrop-blur-sm shrink-0 md:hidden">
          <div className="size-8 rounded-xl overflow-hidden border border-border">
            <img src="/leadzo-logo.png" alt="Leadzo Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-extrabold text-sm tracking-tight font-serif">Leadzo AI</span>
          <div className="flex items-center gap-1 ml-1 mr-auto">
            <span className="size-1.5 rounded-full bg-chart-3 animate-pulse" />
            <span className="text-[10px] text-muted-foreground hidden sm:inline">AI Active</span>
          </div>
          {user ? (
            <Button variant="ghost" size="icon" onClick={signout} className="size-8 rounded-lg shrink-0" title="Logout">
              <LogOut size={16} className="text-muted-foreground" />
            </Button>
          ) : (
            <Button size="sm" onClick={signin} className="h-8 text-xs rounded-lg shrink-0 px-3 bg-primary hover:bg-primary/90">
              <LogIn size={14} className="mr-2 hidden sm:inline" />
              Login
            </Button>
          )}
        </header>

        {/* Mobile horizontal nav */}
        <div className="md:hidden flex gap-1 overflow-x-auto px-3 py-2 border-b border-border bg-background/60 backdrop-blur-sm shrink-0">
          {NAV_ITEMS.map(({ path, label, icon: Icon, ...rest }) => {
            const active = isActive(path, (rest as any).end || false);
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
