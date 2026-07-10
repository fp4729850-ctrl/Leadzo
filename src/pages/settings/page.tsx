import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { Settings, Eye, EyeOff, CheckCircle2, Search, ExternalLink } from "lucide-react";

function SettingsInner() {
  const user = useQuery(api.users.getCurrentUser, {});
  const saveCredentials = useMutation(api.users.saveApiCredentials);
  const [dfsLogin, setDfsLogin] = useState("");
  const [dfsPassword, setDfsPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasCredentials = !!(user?.dataforseoLogin && user?.dataforseoPassword);

  const handleSave = async () => {
    if (!dfsLogin || !dfsPassword) { toast.error("Email aur password dono enter karo"); return; }
    setSaving(true);
    try { await saveCredentials({ dataforseoLogin: dfsLogin, dataforseoPassword: dfsPassword }); toast.success("DataForSEO credentials saved!"); setDfsLogin(""); setDfsPassword(""); }
    catch { toast.error("Save nahi hua, dobara try karo"); }
    finally { setSaving(false); }
  };

  const handleRemove = async () => {
    setSaving(true);
    try { await saveCredentials({ dataforseoLogin: undefined, dataforseoPassword: undefined }); toast.success("Credentials remove ho gaye"); }
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
          <CardTitle className="text-sm flex items-center gap-2"><Settings size={15} className="text-muted-foreground" /> Account Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Name</span><span className="text-foreground font-medium">{user.name ?? "—"}</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Email</span><span className="text-foreground font-medium">{user.email ?? "—"}</span></div>
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
      <AuthLoading><Skeleton className="h-40 w-full" /></AuthLoading>
      <Unauthenticated><Card className="border-border bg-card/60 p-6 text-center"><p className="text-sm text-muted-foreground mb-3">Settings ke liye login karo</p><SignInButton /></Card></Unauthenticated>
      <Authenticated><SettingsInner /></Authenticated>
    </div>
  );
}
