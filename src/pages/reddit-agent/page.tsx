import { motion } from "framer-motion";
import { MessageCircle, Rocket, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function RedditAgentPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="size-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <MessageCircle size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Reddit Agent</h1>
            <p className="text-xs text-muted-foreground">Community-driven AI Lead Generation</p>
          </div>
          <Badge className="ml-auto bg-orange-500/20 text-orange-500 border-orange-500/30">Coming Soon</Badge>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="p-8 rounded-2xl border border-border bg-card/40 backdrop-blur-sm relative overflow-hidden flex flex-col items-center justify-center text-center py-20">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 pointer-events-none" />
              
              <div className="size-20 rounded-full bg-orange-500/10 flex items-center justify-center mb-6 ring-8 ring-orange-500/5">
                <Rocket size={40} className="text-orange-500 animate-bounce" />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-3">The Future of AI Lead Generation</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                We are currently building the most advanced AI agent for Reddit and community marketing. It will autonomously find relevant conversations, write human-like helpful answers, and subtly drive high-quality traffic to your website.
              </p>

              <div className="flex gap-4">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20" disabled>
                  <Sparkles className="mr-2" size={16} /> Join Waitlist
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-foreground mb-4">Planned Capabilities</h3>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="size-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <SearchIcon size={14} className="text-orange-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Subreddit Scouting</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">AI automatically scans thousands of subreddits to find high-intent questions in your niche.</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <MessageCircle size={14} className="text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Human-like Responses</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Generates highly valuable, non-spammy answers that Reddit communities love and upvote.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="size-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                    <TrendingUp size={14} className="text-green-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Traffic & Leads</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Subtly embeds your website links to drive targeted, high-converting organic traffic.</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <ShieldCheck size={14} className="text-purple-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Safe & Compliant</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Strict adherence to Reddit rules to prevent bans and build long-term brand authority.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function SearchIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
