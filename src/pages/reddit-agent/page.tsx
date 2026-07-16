import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Rocket, ShieldCheck, Sparkles, TrendingUp, Settings, Key, Link as LinkIcon, Database, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function RedditAgentPage() {
  const [authType, setAuthType] = useState<"oauth" | "developer">("oauth");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [targetSubreddits, setTargetSubreddits] = useState("");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from("reddit_accounts")
        .select("*")
        .eq("user_id", user.id)
        .single();
        
      if (data) {
        setIsConnected(true);
        setAuthType(data.auth_type as any);
        setClientId(data.client_id || "");
        setClientSecret(data.client_secret || "");
        setUsername(data.username || "");
        setPassword(data.password || "");
        setTargetSubreddits((data.target_subreddits || []).join(", "));
        setTargetKeywords((data.target_keywords || []).join(", "));
        setWebsiteUrl(data.website_url || "");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveDeveloper = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const payload = {
        user_id: user.id,
        auth_type: "developer",
        client_id: clientId,
        client_secret: clientSecret,
        username,
        password,
        target_subreddits: targetSubreddits.split(",").map(s => s.trim()).filter(Boolean),
        target_keywords: targetKeywords.split(",").map(k => k.trim()).filter(Boolean),
        website_url: websiteUrl,
        is_active: true
      };

      const { data: existing } = await supabase.from("reddit_accounts").select("id").eq("user_id", user.id).single();

      if (existing) {
        await supabase.from("reddit_accounts").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("reddit_accounts").insert([payload]);
      }
      
      setIsConnected(true);
      toast.success("Developer Credentials Saved Successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectOAuth = () => {
    toast.info("OAuth App integration coming soon! Use Developer mode for now.");
  };

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
          {isConnected && <Badge className="ml-auto bg-green-500/20 text-green-500 border-green-500/30">Connected</Badge>}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            
            {/* Connection Settings */}
            <div className="p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-sm space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="text-orange-500" size={20} />
                <h2 className="text-lg font-bold text-foreground">Connection & Settings</h2>
              </div>
              
              <div className="flex gap-2 bg-background/50 p-1 rounded-lg border border-border/50 w-fit">
                <Button 
                  variant={authType === "oauth" ? "default" : "ghost"} 
                  size="sm" 
                  className={authType === "oauth" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
                  onClick={() => setAuthType("oauth")}
                >
                  <LinkIcon size={14} className="mr-2" /> Easy Connect (OAuth)
                </Button>
                <Button 
                  variant={authType === "developer" ? "default" : "ghost"} 
                  size="sm"
                  className={authType === "developer" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
                  onClick={() => setAuthType("developer")}
                >
                  <Database size={14} className="mr-2" /> Developer Credentials
                </Button>
              </div>

              {authType === "oauth" ? (
                <div className="p-8 border border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center text-center space-y-4">
                  <div className="size-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-2">
                    <Rocket size={24} className="text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Connect with Reddit</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">One-click connect coming soon! The easiest way to let AI reply on your behalf securely.</p>
                  </div>
                  <Button onClick={handleConnectOAuth} className="bg-[#FF4500] hover:bg-[#FF4500]/90 text-white shadow-lg shadow-orange-500/20 mt-2">
                    Connect Reddit Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 p-4 border border-border/50 rounded-xl bg-background/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Key size={12}/> Client ID</label>
                      <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Enter Client ID" className="h-9 text-sm bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Key size={12}/> Client Secret</label>
                      <Input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="Enter Client Secret" className="h-9 text-sm bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Users size={12}/> Username</label>
                      <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Reddit Username" className="h-9 text-sm bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Key size={12}/> Password</label>
                      <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Reddit Password" className="h-9 text-sm bg-background" />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border/50 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Campaign Settings</h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Target Subreddits (comma separated)</label>
                    <Input value={targetSubreddits} onChange={e => setTargetSubreddits(e.target.value)} placeholder="e.g. SaaS, marketing, startups" className="bg-background text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Target Keywords</label>
                    <Input value={targetKeywords} onChange={e => setTargetKeywords(e.target.value)} placeholder="e.g. how to rank on google, best seo tools" className="bg-background text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Your Website URL (to link)</label>
                    <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://leadzoai.com/blog" className="bg-background text-sm" />
                  </div>
                </div>
              </div>

              {authType === "developer" && (
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveDeveloper} disabled={isLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
                    {isLoading ? "Saving..." : "Save Developer Settings & Activate"}
                  </Button>
                </div>
              )}

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
