import { useState } from "react";
import { useQuery, useMutation } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "@/lib/convex-supabase-adapter";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { Settings, Eye, EyeOff, CheckCircle2, Search, ExternalLink, Link2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

function SettingsInner() {
  const user = useQuery(api.users.getCurrentUser, {});
  const saveCredentials = useMutation(api.users.saveApiCredentials);
  const [dfsLogin, setDfsLogin] = useState("");
  const [dfsPassword, setDfsPassword] = useState("");
  const [waToken, setWaToken] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showWaToken, setShowWaToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasCredentials = !!(user?.dataforseoLogin && user?.dataforseoPassword);
  const hasWaCredentials = !!(user?.whatsappApiToken && user?.whatsappPhoneId);
  
  // Use state to check token since adapter might not return it
  const [hasMetaToken, setHasMetaToken] = useState(false);

  // We can fetch directly from supabase to check if token exists
  useState(() => {
    supabase.auth.getSession().then(({data}) => {
      if (data.session?.user) {
        supabase.from("users").select("meta_access_token").eq("id", data.session.user.id).single()
          .then(({data: userData}) => {
            if (userData?.meta_access_token) setHasMetaToken(true);
          });
      }
    });
  });

  const handleSave = async () => {
    if (!dfsLogin || !dfsPassword) { toast.error("Email aur password dono enter karo"); return; }
    setSaving(true);
    try { await saveCredentials({ dataforseoLogin: dfsLogin, dataforseoPassword: dfsPassword }); toast.success("DataForSEO credentials saved!"); setDfsLogin(""); setDfsPassword(""); }
    catch { toast.error("Save nahi hua, dobara try karo"); }
    finally { setSaving(false); }
  };

  const handleWaSave = async () => {
    if (!waToken || !waPhoneId) { toast.error("Token aur Phone ID dono enter karo"); return; }
    setSaving(true);
    try { await saveCredentials({ whatsappApiToken: waToken, whatsappPhoneId: waPhoneId }); toast.success("WhatsApp credentials saved!"); setWaToken(""); setWaPhoneId(""); }
    catch { toast.error("Save nahi hua"); }
    finally { setSaving(false); }
  };

  const handleRemove = async () => {
    setSaving(true);
    try { await saveCredentials({ dataforseoLogin: null, dataforseoPassword: null }); toast.success("Credentials remove ho gaye"); }
    catch { toast.error("Remove nahi hua"); }
    finally { setSaving(false); }
  };

  const handleWaRemove = async () => {
    setSaving(true);
    try { await saveCredentials({ whatsappApiToken: null, whatsappPhoneId: null }); toast.success("WhatsApp credentials remove ho gaye"); }
    catch { toast.error("Remove nahi hua"); }
    finally { setSaving(false); }
  };

  if (!user) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card/60 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search size={15} className="text-primary" /> DataForSEO API
            {hasCredentials ? (
              <Badge className="ml-auto bg-chart-3/20 text-chart-3 border-chart-3/30 text-[9px]"><CheckCircle2 size={9} className="mr-1" /> Connected</Badge>
            ) : (
              <Badge className="ml-auto bg-muted/40 text-muted-foreground text-[9px]">Not Connected</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">DataForSEO se real keyword search volume, CPC, aur difficulty milta hai.</p>
          <a href="https://dataforseo.com/register" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <ExternalLink size={11} /> dataforseo.com pe free account banao
          </a>
          {hasCredentials ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-chart-3/30 bg-chart-3/5">
                <p className="text-xs text-chart-3 font-semibold mb-0.5">Active Account</p>
                <p className="text-xs text-muted-foreground">{user.dataforseoLogin}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs" onClick={handleRemove} disabled={saving}>Remove Credentials</Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setDfsLogin(user.dataforseoLogin ?? ""); }}>Update</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">DataForSEO Email (Login)</label>
                <Input type="email" placeholder="yourmail@example.com" value={dfsLogin} onChange={(e) => setDfsLogin(e.target.value)} className="bg-background/50 border-border text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">DataForSEO Password</label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={dfsPassword} onChange={(e) => setDfsPassword(e.target.value)} className="bg-background/50 border-border text-sm pr-9" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/80 text-xs" size="sm">{saving ? "Saving..." : "Save Credentials"}</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search size={15} className="text-[#25D366]" /> Meta WhatsApp API
            {hasWaCredentials ? (
              <Badge className="ml-auto bg-chart-3/20 text-chart-3 border-chart-3/30 text-[9px]"><CheckCircle2 size={9} className="mr-1" /> Connected</Badge>
            ) : (
              <Badge className="ml-auto bg-muted/40 text-muted-foreground text-[9px]">Not Connected</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">Meta Official WhatsApp API se bulk marketing messages bhejen.</p>
          {hasWaCredentials ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-chart-3/30 bg-chart-3/5">
                <p className="text-xs text-chart-3 font-semibold mb-0.5">Phone Number ID</p>
                <p className="text-xs text-muted-foreground">{user.whatsappPhoneId}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs" onClick={handleWaRemove} disabled={saving}>Remove Credentials</Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setWaPhoneId(user.whatsappPhoneId ?? ""); setWaToken(user.whatsappApiToken ?? ""); }}>Update</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Permanent Access Token</label>
                <div className="relative">
                  <Input type={showWaToken ? "text" : "password"} placeholder="EAAMrqYVUp..." value={waToken} onChange={(e) => setWaToken(e.target.value)} className="bg-background/50 border-border text-sm pr-9" />
                  <button type="button" onClick={() => setShowWaToken(!showWaToken)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                    {showWaToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Phone Number ID</label>
                <Input type="text" placeholder="12029158..." value={waPhoneId} onChange={(e) => setWaPhoneId(e.target.value)} className="bg-background/50 border-border text-sm" />
              </div>
              <Button onClick={handleWaSave} disabled={saving} className="bg-[#25D366] hover:bg-[#25D366]/80 text-primary-foreground text-xs" size="sm">{saving ? "Saving..." : "Save API Keys"}</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 size={15} className="text-[#E1306C]" /> Connect Meta / Instagram
            {hasMetaToken ? (
              <Badge className="ml-auto bg-chart-3/20 text-chart-3 border-chart-3/30 text-[9px]"><CheckCircle2 size={9} className="mr-1" /> Connected</Badge>
            ) : (
              <Badge className="ml-auto bg-muted/40 text-muted-foreground text-[9px]">Not Connected</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">Connect your Facebook/Instagram account to receive Direct Messages straight into the Live Inbox.</p>
          
          {hasMetaToken ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-chart-3/30 bg-chart-3/5">
                <p className="text-xs text-chart-3 font-semibold mb-0.5">Meta Account Linked</p>
                <p className="text-xs text-muted-foreground">Your account is successfully synced.</p>
              </div>
            </div>
          ) : (
            <Button 
              onClick={() => {
                const clientId = "892432016516964";
                const redirectUri = "https://www.leadzoai.com/auth/meta-callback";
                const scope = "instagram_basic,instagram_manage_messages,pages_manage_metadata,pages_read_engagement,pages_show_list";
                window.location.href = `https://www.facebook.com/v17.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
              }} 
              className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white w-full text-sm"
            >
              Connect with Facebook
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Settings size={15} className="text-muted-foreground" /> Account Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Name</span><span className="text-foreground font-medium">{user.name ?? "—"}</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Email</span><span className="text-foreground font-medium">{user.email ?? "—"}</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Leadzo Credits (Wallet)</span><span className="text-foreground font-bold text-primary">{user.credits ?? 0}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-5 p-5 max-w-xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center"><Settings size={18} className="text-primary" /></div>
        <div>
          <h1 className="text-base font-bold text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground">API credentials aur account manage karo</p>
        </div>
      </motion.div>
      <SettingsInner />
    </div>
  );
}
