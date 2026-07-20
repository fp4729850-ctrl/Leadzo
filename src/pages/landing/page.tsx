import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { ArrowRight, Bot, BarChart, Rocket, ShieldCheck, MessageCircle, LayoutDashboard } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Navbar */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-xl overflow-hidden border border-border">
              <img src="/leadzo-logo.png" alt="Leadzo Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-extrabold text-xl tracking-tight font-serif">Leadzo AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#integrations" className="hover:text-foreground transition-colors">Integrations</a>
          </nav>
          <Link to="/dashboard">
            <Button className="rounded-full px-6">
              Go to Dashboard <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-24 px-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-tight">
            The Ultimate AI Marketing <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-chart-2">Platform for SMBs</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Leadzo AI automates your digital marketing across Google, Meta, and more. Launch campaigns in minutes, let AI optimize your budget, and watch your business grow.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/dashboard">
              <Button size="lg" className="rounded-full text-base px-8 h-12">
                Start for Free
              </Button>
            </Link>
          </div>
        </section>

        {/* About Section for Google Reviewers */}
        <section id="about" className="py-20 bg-muted/30 border-y border-border">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">How Leadzo AI Works</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Leadzo AI is designed to democratize advanced digital marketing for small and medium businesses globally, including the MENA region. Our platform acts as a centralized dashboard where business owners can launch and track cross-platform campaigns without needing technical marketing expertise.
                </p>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Rocket className="size-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Automated Campaign Creation</h4>
                      <p className="text-sm text-muted-foreground">Users input their goals, and our AI constructs optimized campaigns across networks.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="size-10 rounded-lg bg-chart-2/10 flex items-center justify-center shrink-0">
                      <BarChart className="size-5 text-chart-2" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Unified Reporting</h4>
                      <p className="text-sm text-muted-foreground">Consolidated analytics showing spend, clicks, and conversions across all ad accounts.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-background border border-border rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="size-6 text-chart-3" />
                  <h3 className="text-xl font-bold">Google Ads API Integration</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Leadzo AI integrates directly with the Google Ads API using OAuth 2.0. This allows our platform to act on behalf of our users to:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6 list-disc pl-5">
                  <li>Create and manage Search, Display, and Performance Max campaigns.</li>
                  <li>Set daily budgets and manage automated bidding strategies.</li>
                  <li>Perform keyword research via Google Keyword Planner services.</li>
                  <li>Fetch performance metrics for our unified analytics dashboard.</li>
                </ul>
                <p className="text-xs text-muted-foreground italic">
                  * All actions require explicit user authorization. Leadzo AI complies strictly with Google's API Terms of Service.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="container mx-auto px-4 max-w-5xl text-center">
            <h2 className="text-3xl font-bold mb-12">Powerful AI Features</h2>
            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div className="p-6 border border-border rounded-2xl bg-card">
                <Bot className="size-8 text-primary mb-4" />
                <h3 className="font-bold text-lg mb-2">Autonomous AI Agents</h3>
                <p className="text-muted-foreground text-sm">Deploy intelligent agents to handle SEO, Reddit outreach, and CRM follow-ups automatically.</p>
              </div>
              <div className="p-6 border border-border rounded-2xl bg-card">
                <MessageCircle className="size-8 text-chart-2 mb-4" />
                <h3 className="font-bold text-lg mb-2">Bulk Messaging</h3>
                <p className="text-muted-foreground text-sm">Send personalized bulk campaigns via WhatsApp, Email, and SMS with AI-generated copy.</p>
              </div>
              <div className="p-6 border border-border rounded-2xl bg-card">
                <LayoutDashboard className="size-8 text-chart-3 mb-4" />
                <h3 className="font-bold text-lg mb-2">Unified CEO Dashboard</h3>
                <p className="text-muted-foreground text-sm">Get a bird's-eye view of your entire business pipeline, from lead generation to conversion.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Integrations Section */}
        <section id="integrations" className="py-20 bg-muted/30 border-y border-border">
          <div className="container mx-auto px-4 max-w-5xl text-center">
            <h2 className="text-3xl font-bold mb-12">Seamless Integrations</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex flex-col items-center p-6 border border-border rounded-2xl bg-background shadow-sm hover:shadow-md transition-shadow">
                <div className="size-12 mb-3 bg-muted rounded-full flex items-center justify-center font-bold text-xl">G</div>
                <h4 className="font-bold text-sm">Google Ads</h4>
              </div>
              <div className="flex flex-col items-center p-6 border border-border rounded-2xl bg-background shadow-sm hover:shadow-md transition-shadow">
                <div className="size-12 mb-3 bg-muted rounded-full flex items-center justify-center font-bold text-xl">M</div>
                <h4 className="font-bold text-sm">Meta Ads</h4>
              </div>
              <div className="flex flex-col items-center p-6 border border-border rounded-2xl bg-background shadow-sm hover:shadow-md transition-shadow">
                <div className="size-12 mb-3 bg-muted rounded-full flex items-center justify-center font-bold text-xl">T</div>
                <h4 className="font-bold text-sm">TikTok Ads</h4>
              </div>
              <div className="flex flex-col items-center p-6 border border-border rounded-2xl bg-background shadow-sm hover:shadow-md transition-shadow">
                <div className="size-12 mb-3 bg-muted rounded-full flex items-center justify-center font-bold text-xl">in</div>
                <h4 className="font-bold text-sm">LinkedIn Ads</h4>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Bot className="size-5" />
            <span>&copy; {new Date().getFullYear()} Leadzo AI. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
