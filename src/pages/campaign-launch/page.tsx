import { useState, useEffect, useRef } from "react";
import { useAction, useMutation, useQuery } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import { Authenticated, Unauthenticated, AuthLoading } from "@/lib/convex-supabase-adapter";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import {
  Sparkles, Rocket, Loader2, CheckCircle2, XCircle, Clock, Trash2, ChevronRight,
  Users, Target, DollarSign, Globe, Megaphone, Settings, AlertTriangle,
  Copy, Check, Zap, RefreshCw, Wallet, TrendingDown, ExternalLink,
  Upload, ImageIcon, Video, X, FileVideo,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const PLATFORMS = [
  { value: "facebook", label: "Facebook Ads", color: "#1877F2", secrets: ["FACEBOOK_ADS_ACCESS_TOKEN", "FACEBOOK_AD_ACCOUNT_ID"], docsUrl: "https://developers.facebook.com/docs/marketing-apis/" },
  { value: "google", label: "Google Ads", color: "#EA4335", secrets: ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_ACCESS_TOKEN"], docsUrl: "https://developers.google.com/google-ads/api/docs/start" },
  { value: "tiktok", label: "TikTok Ads", color: "#69C9D0", secrets: ["TIKTOK_ADS_ACCESS_TOKEN", "TIKTOK_ADVERTISER_ID"], docsUrl: "https://ads.tiktok.com/marketing_api/docs" },
  { value: "linkedin", label: "LinkedIn Ads (Agency Mode)", color: "#0A66C2", secrets: [], docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/" },
  { value: "instagram", label: "Instagram Ads", color: "#E1306C", secrets: ["FACEBOOK_ADS_ACCESS_TOKEN", "FACEBOOK_AD_ACCOUNT_ID"], docsUrl: "https://developers.facebook.com/docs/instagram-api/", note: "Uses Facebook Marketing API \u2014 same secrets as Facebook Ads" },
];

const OBJECTIVES = ["Lead Generation", "App Installs", "Product Sales", "Brand Awareness", "Website Traffic", "Retargeting / Conversions"];
const CTA_OPTIONS = ["Learn More", "Sign Up", "Download", "Get Quote", "Buy Now", "Contact Us", "Apply Now", "Subscribe"];
const INDIAN_CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat"];

function StepBar({ step }: { step: number }) {
  const steps = ["Platform", "Campaign", "Audience", "Creative", "Launch"];
  return (
    <div className="flex items-center gap-0 mb-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className={cn("size-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all", i < step ? "bg-primary border-primary text-primary-foreground" : i === step ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground bg-background")}>
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            <span className={cn("text-[9px] font-semibold whitespace-nowrap", i === step ? "text-primary" : "text-muted-foreground")}>{s}</span>
          </div>
          {i < steps.length - 1 && <div className={cn("h-0.5 flex-1 mb-4 mx-1 rounded transition-all", i < step ? "bg-primary" : "bg-border")} />}
        </div>
      ))}
    </div>
  );
}

function PlatformCard({ platform, selected, onSelect }: { platform: typeof PLATFORMS[number]; selected: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className={cn("rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all cursor-pointer text-left w-full", selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-border/80 hover:bg-muted/30")}>
      <div className="flex items-center justify-between">
        <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: `${platform.color}20` }}><div className="size-3 rounded-full" style={{ background: platform.color }} /></div>
        {selected && <div className="size-5 rounded-full bg-primary flex items-center justify-center"><Check size={11} className="text-primary-foreground" /></div>}
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">{platform.label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Requires: {platform.secrets.length} secret{platform.secrets.length > 1 ? "s" : ""}</p>
      </div>
      <div className="flex flex-wrap gap-1">{platform.secrets.map((s) => <span key={s} className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{s}</span>)}</div>
    </button>
  );
}

function SecretsPanel({ platform, onConnected }: { platform: typeof PLATFORMS[number]; onConnected?: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const checkFbSecrets = useAction(api.platformAds.checkFacebookSecretsConfigured);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [googleCustomerId, setGoogleCustomerId] = useState("");
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const isFbPlatform = platform.value === "facebook" || platform.value === "instagram";
  const isGooglePlatform = platform.value === "google";

  useEffect(() => {
    if (isFbPlatform) {
      setChecking(true);
      setTimeout(() => { setConnected(true); setChecking(false); }, 500);
    }
    if (isGooglePlatform) {
      // Check Google Ads connection status
      (async () => {
        try {
          const { data: { user } } = await import("@/lib/supabase").then(m => m.supabase.auth.getUser());
          if (!user) return;
          const { supabase } = await import("@/lib/supabase");
          const res = await supabase.functions.invoke("googleAds_oauth", {
            body: { action: "check_status", userId: user.id }
          });
          if (res.data?.connected) { setConnected(true); if (res.data.customerId) setGoogleCustomerId(res.data.customerId); }
          else setConnected(false);
        } catch(e) { setConnected(false); }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (connected) { onConnected?.(); } }, [connected, onConnected]);

  const handleConnectGoogle = async () => {
    setGoogleConnecting(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please login first"); return; }
      if (googleCustomerId) localStorage.setItem("google_ads_customer_id_pending", googleCustomerId.replace(/-/g, ""));
      const res = await supabase.functions.invoke("googleAds_oauth", {
        body: { action: "get_auth_url", userId: user.id }
      });
      if (res.data?.url) { window.location.href = res.data.url; }
      else toast.error("Failed to get Google auth URL");
    } catch(e: any) { toast.error(e.message || "Error"); }
    finally { setGoogleConnecting(false); }
  };

  const copyKey = async (key: string) => { await navigator.clipboard.writeText(key); setCopied(key); setTimeout(() => setCopied(null), 1500); };
  const isConnected = (isFbPlatform || isGooglePlatform) ? connected === true : null;

  return (
    <div className={cn("rounded-2xl border p-4 flex flex-col gap-3", isConnected ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5")}>
      <div className="flex items-start gap-2">
        {checking ? <Loader2 size={14} className="text-muted-foreground mt-0.5 animate-spin shrink-0" /> : isConnected ? <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn("text-xs font-bold", checking ? "text-muted-foreground" : isConnected ? "text-emerald-400" : "text-amber-400")}>
              {checking ? "Checking connection..." : isConnected ? "Connected \u2014 Live Mode Active" : "API Keys (Optional \u2014 Demo mode available)"}
            </p>
            {isFbPlatform && !checking && <button onClick={async () => { setChecking(true); try { const r = await checkFbSecrets({}); setConnected(r.configured); } finally { setChecking(false); } }} className="text-[9px] text-muted-foreground hover:text-foreground underline cursor-pointer">Re-check</button>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isConnected ? <>Your <span className="font-bold text-foreground">{platform.label}</span> secrets are configured. Real campaigns will be launched.</> : <>Without secrets, campaigns launch in <span className="font-bold text-amber-300">DEMO mode</span> (simulated, not real). Add keys in <span className="font-bold text-foreground">Settings \u2192 Secrets</span> to go live.{"note" in platform && platform.note && <> <span className="text-amber-300">{platform.note as string}</span></>}</>}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {platform.secrets.map((key) => (
          <div key={key} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2", isConnected ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-background/60")}>
            {isConnected && <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />}
            <code className="text-xs text-foreground flex-1 font-mono">{key}</code>
            <button onClick={() => copyKey(key)} className="p-1 rounded hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground">{copied === key ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}</button>
          </div>
        ))}
      </div>
      {/* Google Ads Connect Button */}
      {isGooglePlatform && (
        <div className="space-y-2 pt-1 border-t border-border/40">
          {connected ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-emerald-400">Google Ads Connected!</p>
                {googleCustomerId && <p className="text-[10px] text-muted-foreground">Customer ID: {googleCustomerId}</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">Google Ads Customer ID (optional)</label>
                <input
                  value={googleCustomerId}
                  onChange={e => setGoogleCustomerId(e.target.value)}
                  placeholder="e.g. 123-456-7890"
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={handleConnectGoogle}
                disabled={googleConnecting}
                className="w-full flex items-center justify-center gap-2 bg-[#EA4335] hover:bg-[#EA4335]/90 disabled:opacity-60 text-white text-xs font-semibold rounded-xl px-4 py-2.5 transition-all cursor-pointer"
              >
                {googleConnecting ? <Loader2 size={13} className="animate-spin" /> : (
                  <svg width="13" height="13" viewBox="0 0 48 48"><path fill="#fff" d="M43.6 20.5H24v7h11.3C33.7 32 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1 7.4 2.7l5.2-5.2C33.4 7.5 28.9 5.5 24 5.5 13.8 5.5 5.5 13.8 5.5 24S13.8 42.5 24 42.5c10.7 0 18-7.5 18-18 0-1.2-.1-2.4-.4-3.5h-18l-.4.5z"/></svg>
                )}
                {googleConnecting ? "Redirecting to Google..." : "Connect with Google"}
              </button>
            </div>
          )}
        </div>
      )}
      <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline flex items-center gap-1"><Globe size={11} /> View {platform.label} API docs</a>
    </div>
  );
}

function FacebookBalancePanel() {
  const getAccountInfo = useAction(api.platformAds.getFacebookAccountInfo);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<{ success: boolean; balance?: string; currency?: string; accountName?: string; accountStatus?: number; spendCap?: string; amountSpent?: string; error?: string } | null>(null);

  const fetch = async () => { setLoading(true); try { const result = await getAccountInfo({}); setInfo(result); } finally { setLoading(false); } };

  const formatAmount = (cents?: string, currency?: string) => {
    if (!cents) return "\u2014";
    const amount = parseInt(cents) / 100;
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency ?? "INR", maximumFractionDigits: 2 }).format(amount);
  };

  const statusLabel = (s?: number) => {
    const map: Record<number, { label: string; color: string }> = { 1: { label: "Active", color: "text-emerald-400" }, 2: { label: "Disabled", color: "text-red-400" }, 3: { label: "Unsettled", color: "text-amber-400" }, 7: { label: "Pending Review", color: "text-blue-400" }, 9: { label: "In Grace Period", color: "text-amber-400" }, 100: { label: "Pending Closure", color: "text-red-400" }, 101: { label: "Closed", color: "text-red-400" } };
    return s !== undefined ? (map[s] ?? { label: `Status ${s}`, color: "text-muted-foreground" }) : null;
  };

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-[#1877F2]/20 flex items-center justify-center"><Wallet size={13} className="text-[#1877F2]" /></div>
          <div><p className="text-xs font-bold text-foreground">Facebook Ad Account Balance</p><p className="text-[10px] text-muted-foreground">Prepaid balance & spend overview</p></div>
        </div>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs rounded-lg gap-1" onClick={fetch} disabled={loading}><RefreshCw size={11} className={loading ? "animate-spin" : ""} />{loading ? "Loading..." : "Check Balance"}</Button>
      </div>
      {info === null && !loading && <p className="text-[11px] text-muted-foreground text-center py-2">Click "Check Balance" to fetch your Facebook Ad Account info</p>}
      {info && !info.success && <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">{info.error}</div>}
      {info?.success && (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 rounded-xl border border-border bg-background/60 px-3 py-2">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide">Account</p>
            <p className="text-xs font-bold text-foreground mt-0.5 truncate">{info.accountName ?? "\u2014"}</p>
            {statusLabel(info.accountStatus) && <p className={cn("text-[10px] font-semibold mt-0.5", statusLabel(info.accountStatus)!.color)}>\u25cf {statusLabel(info.accountStatus)!.label}</p>}
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide flex items-center gap-1"><Wallet size={9} /> Prepaid Balance</p>
            <p className="text-sm font-black text-emerald-400 mt-0.5">{formatAmount(info.balance, info.currency)}</p>
            <p className="text-[9px] text-muted-foreground">{info.currency}</p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide flex items-center gap-1"><TrendingDown size={9} /> Total Spent</p>
            <p className="text-sm font-black text-red-400 mt-0.5">{formatAmount(info.amountSpent, info.currency)}</p>
            <p className="text-[9px] text-muted-foreground">{info.currency}</p>
          </div>
          {info.spendCap && info.spendCap !== "0" && <div className="col-span-2 rounded-xl border border-border bg-background/60 px-3 py-2"><p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide">Spend Cap</p><p className="text-xs font-bold text-foreground mt-0.5">{formatAmount(info.spendCap, info.currency)}</p></div>}
        </div>
      )}
      <a href="https://www.facebook.com/ads/manager/billing" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl border border-[#1877F2]/30 bg-[#1877F2]/5 hover:bg-[#1877F2]/10 transition-colors px-4 py-2.5 text-xs font-semibold text-[#1877F2] cursor-pointer">
        <DollarSign size={12} /> Add Funds to Facebook Ad Account <ExternalLink size={10} />
      </a>
      <p className="text-[9px] text-muted-foreground text-center">Facebook Ads uses prepaid billing. Add funds at Meta Business Manager \u2192 Billing.</p>
    </div>
  );
}

function CampaignHistoryItem({ campaign, onDelete }: { campaign: { _id: Id<"launchedCampaigns">; name: string; platform: string; status: string; objective: string; budget: number; platformCampaignId?: string; errorMessage?: string; createdAt: string }; onDelete: () => void }) {
  const platformMeta = PLATFORMS.find((p) => p.value === campaign.platform);
  const date = new Date(campaign.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-start gap-3">
      <div className="size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${platformMeta?.color ?? "#6B7280"}20` }}><div className="size-2.5 rounded-full" style={{ background: platformMeta?.color ?? "#6B7280" }} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-foreground truncate">{campaign.name}</p>
          <Badge variant={campaign.status === "launched" ? "default" : campaign.status === "failed" ? "destructive" : "secondary"} className="text-[9px] capitalize">
            {campaign.status === "launched" ? <CheckCircle2 size={9} className="mr-1" /> : campaign.status === "failed" ? <XCircle size={9} className="mr-1" /> : <Clock size={9} className="mr-1" />}{campaign.status}
          </Badge>
          {campaign.platformCampaignId?.startsWith(`${campaign.platform.replace("instagram","ig")}_demo_`) && <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-400/30">DEMO</Badge>}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px] text-muted-foreground">{platformMeta?.label}</span>
          <span className="text-[10px] text-muted-foreground">\u00b7</span>
          <span className="text-[10px] text-muted-foreground">{campaign.objective}</span>
          <span className="text-[10px] text-muted-foreground">\u00b7</span>
          <span className="text-[10px] text-muted-foreground">\u20b9{campaign.budget.toLocaleString("en-IN")}</span>
        </div>
        {campaign.platformCampaignId && <p className="text-[10px] text-emerald-400 mt-1 font-mono">ID: {campaign.platformCampaignId}</p>}
        {campaign.errorMessage && <p className="text-[10px] text-red-400 mt-1">{campaign.errorMessage}</p>}
        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Clock size={9} />{date}</p>
      </div>
      <button onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer shrink-0"><Trash2 size={13} /></button>
    </div>
  );
}

function CampaignLaunchInner() {
  const [step, setStep] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [objective, setObjective] = useState("");
  const [budget, setBudget] = useState("");
  const [budgetType, setBudgetType] = useState("daily");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("45");
  const [gender, setGender] = useState("all");
  const [selectedCities, setSelectedCities] = useState<string[]>(["Mumbai", "Delhi"]);
  const [interests, setInterests] = useState("");
  const [adHeadline, setAdHeadline] = useState("");
  const [adCopy, setAdCopy] = useState("");
  const [ctaButton, setCtaButton] = useState("Learn More");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [launching, setLaunching] = useState(false);
  const [activeTab, setActiveTab] = useState<"launch" | "history">("launch");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ businessName?: string; description?: string } | null>(null);
  const [adMedia, setAdMedia] = useState<File | null>(null);
  const [adMediaPreview, setAdMediaPreview] = useState<string | null>(null);
  const [adMediaStorageId, setAdMediaStorageId] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [customImagePrompt, setCustomImagePrompt] = useState("");
  const [generatingAiImage, setGeneratingAiImage] = useState(false);
  const [aiGeneratedImageUrl, setAiGeneratedImageUrl] = useState<string | null>(null);

  const launchFb = useAction(api.platformAds.launchFacebookCampaign);
  const launchGoogle = useAction(api.platformAds.launchGoogleCampaign);
  const launchTikTok = useAction(api.platformAds.launchTikTokCampaign);
  const launchLinkedIn = useAction(api.platformAds.launchLinkedInCampaign);
  const launchInstagram = useAction(api.platformAds.launchInstagramCampaign);
  const scanWebsite = useAction(api.campaignAi.scanWebsiteForCampaign);
  const generateAdImage = useAction(api.creativeAi.generateAdImage);
  const saveCampaign = useMutation(api.launchedCampaigns.saveCampaign);
  const deleteCampaign = useMutation(api.launchedCampaigns.deleteLaunchedCampaign);
  const generateUploadUrl = useMutation(api.launchedCampaigns.generateUploadUrl);
  const history = useQuery(api.launchedCampaigns.listLaunchedCampaigns);

  const handleScanWebsite = async () => {
    if (!websiteUrl) return;
    setScanning(true); setScanResult(null);
    try {
      let url = websiteUrl.trim();
      if (!url.startsWith("http")) url = "https://" + url;
      const result = await scanWebsite({ url });
      if (!result.success) { toast.error(result.error ?? "Could not scan website"); return; }
      if (result.campaignName) setCampaignName(result.campaignName);
      if (result.objective && OBJECTIVES.includes(result.objective)) setObjective(result.objective);
      if (result.adHeadline) setAdHeadline(result.adHeadline);
      if (result.adCopy) setAdCopy(result.adCopy);
      if (result.ctaButton && CTA_OPTIONS.includes(result.ctaButton)) setCtaButton(result.ctaButton);
      if (result.destinationUrl) setDestinationUrl(result.destinationUrl);
      if (result.interests) setInterests(result.interests);
      setScanResult({ businessName: result.businessName, description: result.description });
      toast.success(`Website scanned! Campaign auto-filled for ${result.businessName ?? "your business"}`);
    } catch { toast.error("Failed to scan website. Check the URL and try again."); }
    finally { setScanning(false); }
  };

  const handleGenerateAiImage = async () => {
    if (!adHeadline && !campaignName) { toast.error("Please fill in the Ad Headline first (Step 2)"); return; }
    setGeneratingAiImage(true); setAiGeneratedImageUrl(null);
    try {
      const result = await generateAdImage({ 
        businessName: scanResult?.businessName ?? campaignName ?? "Business", 
        adHeadline: adHeadline || campaignName, 
        adCopy: adCopy || "", 
        platform: selectedPlatform || "facebook", 
        objective: objective || "Brand Awareness",
        websiteDescription: scanResult?.description || "",
        customPrompt: customImagePrompt
      });
      setAiGeneratedImageUrl(result.imageUrl);
      setAdMediaStorageId(result.storageId);
      setAdMedia(null);
      setAdMediaPreview(result.imageUrl);
      toast.success("AI ad image generated!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate image";
      if (msg.includes("OPENAI_API_KEY") || msg.includes("401") || msg.includes("key")) { toast.error("Add OPENAI_API_KEY in Secrets tab to enable AI image generation"); }
      else { toast.error("Image generation failed. Add OPENAI_API_KEY in Secrets tab."); }
    } finally { setGeneratingAiImage(false); }
  };

  const handleMediaSelect = async (file: File) => {
    setAdMedia(file); setAdMediaStorageId(null);
    const url = URL.createObjectURL(file);
    setAdMediaPreview(url); setUploadingMedia(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json() as { storageId: string };
      setAdMediaStorageId(storageId);
      toast.success("Media uploaded successfully!");
    } catch { toast.error("Media upload failed. Try again."); setAdMedia(null); setAdMediaPreview(null); }
    finally { setUploadingMedia(false); }
  };

  const removeMedia = () => { setAdMedia(null); setAdMediaPreview(null); setAdMediaStorageId(null); if (mediaInputRef.current) mediaInputRef.current.value = ""; };

  const platformMeta = PLATFORMS.find((p) => p.value === selectedPlatform);
  const toggleCity = (city: string) => setSelectedCities((prev) => prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]);

  const canProceed = () => {
    if (step === 0) return !!selectedPlatform;
    if (step === 1) return !!campaignName && !!objective && !!budget;
    if (step === 2) return selectedCities.length > 0;
    if (step === 3) return !!adHeadline && !!adCopy && !!destinationUrl;
    return true;
  };

  const handleLaunch = async () => {
    if (!selectedPlatform || !campaignName || !objective || !budget) return;
    setLaunching(true);
    const audience = { ageMin: parseInt(ageMin), ageMax: parseInt(ageMax), gender, locations: selectedCities, interests: interests.split(",").map((i) => i.trim()).filter(Boolean) };
    const budgetNum = parseInt(budget);
    let result: { success: boolean; campaignId?: string; error?: string; details: string };
    try {
      if (selectedPlatform === "facebook") result = await launchFb({ name: campaignName, objective, budget: budgetNum, budgetType, audience, adHeadline, adCopy, ctaButton, destinationUrl });
      else if (selectedPlatform === "google") result = await launchGoogle({ name: campaignName, objective, budget: budgetNum, audience, adHeadline, adCopy, destinationUrl });
      else if (selectedPlatform === "tiktok") result = await launchTikTok({ name: campaignName, objective, budget: budgetNum, audience, adHeadline, adCopy, destinationUrl });
      else if (selectedPlatform === "instagram") result = await launchInstagram({ name: campaignName, objective, budget: budgetNum, budgetType, audience, adHeadline, adCopy, ctaButton, destinationUrl });
      else result = await launchLinkedIn({ name: campaignName, objective, budget: budgetNum, audience, adHeadline, adCopy, destinationUrl });

      await saveCampaign({ name: campaignName, platform: selectedPlatform, status: result.success ? "launched" : "failed", objective, budget: budgetNum, budgetType, audience, adHeadline, adCopy, ctaButton, destinationUrl, platformCampaignId: result.campaignId, errorMessage: result.error, adMediaStorageId: adMediaStorageId ? (adMediaStorageId as Parameters<typeof saveCampaign>[0]["adMediaStorageId"]) : undefined, adMediaType: adMedia ? (adMedia.type.startsWith("video") ? "video" : "image") : undefined, adMediaName: adMedia?.name });

      if (result.success) toast.success(`Campaign launched on ${platformMeta?.label}! ID: ${result.campaignId}`);
      else toast.error(`Launch failed: ${result.error}`);
      setActiveTab("history"); setStep(0);
    } catch { toast.error("Unexpected error. Check Secrets tab."); }
    finally { setLaunching(false); }
  };

  return (
    <div className="flex flex-col gap-6 min-h-0">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="size-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><Rocket size={18} className="text-white" /></div>
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight font-serif">Campaign Launch Agent</h1>
          <p className="text-sm text-muted-foreground">Connect & launch on Facebook, Google, TikTok, LinkedIn, Instagram</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-blue-400 animate-pulse" /><span className="text-xs text-muted-foreground hidden sm:block">Multi-Platform</span></div>
      </motion.div>

      <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit">
        {(["launch", "history"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer", activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {tab === "history" ? `Launch History (${history?.length ?? 0})` : "New Campaign"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "launch" ? (
          <motion.div key="launch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
            <StepBar step={step} />

            {step === 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Globe size={14} className="text-primary" /> Choose Platform</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{PLATFORMS.map((p) => <PlatformCard key={p.value} platform={p} selected={selectedPlatform === p.value} onSelect={() => { setSelectedPlatform(p.value); if (p.value === "instagram") { setStep(1); } }} />)}</div>
                {selectedPlatform && platformMeta && platformMeta.value !== "instagram" && <SecretsPanel platform={platformMeta} onConnected={() => setStep(1)} />}
              </motion.div>
            )}

            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Settings size={14} className="text-primary" /> Campaign Settings</h2>
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2"><div className="size-7 rounded-lg bg-primary/20 flex items-center justify-center"><Zap size={13} className="text-primary" /></div><div><p className="text-xs font-bold text-foreground">AI Website Scanner</p><p className="text-[10px] text-muted-foreground">Enter your website URL \u2014 AI will read it and auto-fill the entire campaign</p></div></div>
                  <div className="flex gap-2">
                    <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleScanWebsite()} placeholder="https://yourwebsite.com" className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <Button onClick={handleScanWebsite} disabled={scanning || !websiteUrl} size="sm" className="rounded-xl gap-1.5 px-4 shrink-0">{scanning ? <><Loader2 size={13} className="animate-spin" /> Scanning...</> : <><Zap size={13} /> Scan & Auto-Fill</>}</Button>
                  </div>
                  {scanning && <div className="flex items-center gap-2 text-xs text-primary"><Loader2 size={11} className="animate-spin" />AI is reading your website and generating campaign data...</div>}
                  {scanResult && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 flex items-start gap-2"><CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" /><div><p className="text-xs font-bold text-emerald-400">{scanResult.businessName} \u2014 Campaign auto-filled!</p>{scanResult.description && <p className="text-[10px] text-muted-foreground mt-0.5">{scanResult.description}</p>}</div></div>}
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
                  <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Campaign Name *</label><input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="e.g. GRX Launch - India Q1" className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                  <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Objective *</label><Select value={objective} onValueChange={setObjective}><SelectTrigger className="rounded-xl bg-background/60"><SelectValue placeholder="Select objective" /></SelectTrigger><SelectContent>{OBJECTIVES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Budget (\u20b9) *</label><input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 2000" type="number" className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                    <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Budget Type</label><Select value={budgetType} onValueChange={setBudgetType}><SelectTrigger className="rounded-xl bg-background/60"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily Budget</SelectItem><SelectItem value="lifetime">Lifetime Budget</SelectItem></SelectContent></Select></div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Users size={14} className="text-primary" /> Target Audience</h2>
                <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Min Age</label><input value={ageMin} onChange={(e) => setAgeMin(e.target.value)} type="number" min="13" max="65" className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                    <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Max Age</label><input value={ageMax} onChange={(e) => setAgeMax(e.target.value)} type="number" min="13" max="65" className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                    <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Gender</label><Select value={gender} onValueChange={setGender}><SelectTrigger className="rounded-xl bg-background/60"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent></Select></div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">Cities (India) *</label>
                    <div className="flex flex-wrap gap-2">{INDIAN_CITIES.map((city) => <button key={city} onClick={() => toggleCity(city)} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer", selectedCities.includes(city) ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>{city}</button>)}</div>
                  </div>
                  <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Interests (comma separated)</label><input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="e.g. Cryptocurrency, Trading, Finance, Investment" className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Megaphone size={14} className="text-primary" /> Ad Creative</h2>
                <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block flex items-center gap-1.5"><Upload size={11} /> Ad Image / Video</label>
                    <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 flex flex-col gap-3 mb-3">
                      <div className="flex items-center gap-2"><div className="size-7 rounded-lg bg-purple-500/20 flex items-center justify-center"><Sparkles size={13} className="text-purple-400" /></div><div><p className="text-xs font-bold text-foreground">AI Image Generator</p><p className="text-[10px] text-muted-foreground">Website scan + headline se AI ek professional ad image banayega</p></div></div>
                      {aiGeneratedImageUrl && (
                        <div className="relative rounded-xl overflow-hidden border border-purple-500/20">
                          <img src={aiGeneratedImageUrl} alt="AI Generated Ad" className="w-full max-h-48 object-cover" />
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-purple-500/90 text-white text-[10px] font-semibold px-2 py-1 rounded-full"><Sparkles size={9} /> AI Generated</div>
                          <button onClick={() => { setAiGeneratedImageUrl(null); setAdMediaPreview(null); setAdMediaStorageId(null); }} className="absolute top-2 right-2 size-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white cursor-pointer"><X size={11} /></button>
                        </div>
                      )}
                      <Button onClick={handleGenerateAiImage} disabled={generatingAiImage} size="sm" className="rounded-xl gap-2 bg-purple-600 hover:bg-purple-700 text-white border-0 w-full">
                        {generatingAiImage ? <><Loader2 size={13} className="animate-spin" /> AI Image Bana Raha Hai... (~10 sec)</> : <><Sparkles size={13} /> AI Se Ad Image Generate Karo</>}
                      </Button>
                      <input value={customImagePrompt} onChange={(e) => setCustomImagePrompt(e.target.value)} placeholder="Custom Prompt (optional) e.g. Show a 3D robot holding a coin" className="w-full mt-2 rounded-lg border border-purple-500/30 bg-purple-500/5 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
                      <p className="text-[10px] text-muted-foreground text-center mt-1">Requires <span className="font-bold text-foreground">OPENAI_API_KEY</span> in Secrets tab \u00b7 Uses gpt-image-2 model</p>
                    </div>
                    {!adMedia && !aiGeneratedImageUrl ? (
                      <div onClick={() => mediaInputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleMediaSelect(file); }} className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-primary/5 transition-all cursor-pointer py-6 px-4">
                        <div className="flex gap-3"><div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center"><ImageIcon size={18} className="text-primary" /></div><div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center"><Video size={18} className="text-primary" /></div></div>
                        <div className="text-center"><p className="text-sm font-semibold text-foreground">Ya khud upload karo</p><p className="text-[11px] text-muted-foreground mt-0.5">Images: JPG, PNG, GIF, WebP \u00b7 Videos: MP4, MOV, AVI</p><p className="text-[10px] text-muted-foreground mt-1">Max 100MB</p></div>
                        <Button size="sm" variant="secondary" className="rounded-xl gap-1.5 pointer-events-none"><Upload size={12} /> Choose File</Button>
                      </div>
                    ) : adMedia ? (
                      <div className="rounded-2xl border border-border bg-muted/20 p-3 flex items-start gap-3">
                        <div className="size-16 rounded-xl overflow-hidden shrink-0 bg-black/20 flex items-center justify-center">{adMedia.type.startsWith("video") ? <video src={adMediaPreview ?? undefined} className="w-full h-full object-cover" muted /> : <img src={adMediaPreview ?? undefined} alt="preview" className="w-full h-full object-cover" />}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", adMedia.type.startsWith("video") ? "bg-purple-500/10 text-purple-400" : "bg-emerald-500/10 text-emerald-400")}>{adMedia.type.startsWith("video") ? <FileVideo size={9} /> : <ImageIcon size={9} />}{adMedia.type.startsWith("video") ? "Video" : "Image"}</div>
                            {uploadingMedia && <div className="flex items-center gap-1 text-[10px] text-primary"><Loader2 size={9} className="animate-spin" /> Uploading...</div>}
                            {adMediaStorageId && !uploadingMedia && <div className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle2 size={9} /> Uploaded</div>}
                          </div>
                          <p className="text-xs font-semibold text-foreground mt-1 truncate">{adMedia.name}</p>
                          <p className="text-[10px] text-muted-foreground">{(adMedia.size / (1024 * 1024)).toFixed(1)} MB</p>
                        </div>
                        <button onClick={removeMedia} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer shrink-0"><X size={13} /></button>
                      </div>
                    ) : null}
                    <input ref={mediaInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/avi" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleMediaSelect(file); }} />
                  </div>
                  <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Ad Headline *</label><input value={adHeadline} onChange={(e) => setAdHeadline(e.target.value)} placeholder="e.g. Trade Crypto at 0% Fee \u2014 Limited Time" className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                  <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Ad Copy *</label><textarea value={adCopy} onChange={(e) => setAdCopy(e.target.value)} placeholder="Write your ad copy here..." rows={4} className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">CTA Button</label><Select value={ctaButton} onValueChange={setCtaButton}><SelectTrigger className="rounded-xl bg-background/60"><SelectValue /></SelectTrigger><SelectContent>{CTA_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                    <div><label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Destination URL *</label><input value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://yoursite.com/lp" className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Zap size={14} className="text-primary" /> Review & Launch</h2>
                <div className="rounded-2xl border border-border bg-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {[
                    { label: "Platform", value: platformMeta?.label, icon: Globe },
                    { label: "Campaign", value: campaignName, icon: Target },
                    { label: "Objective", value: objective, icon: Target },
                    { label: "Budget", value: `\u20b9${parseInt(budget || "0").toLocaleString("en-IN")} / ${budgetType}`, icon: DollarSign },
                    { label: "Age Range", value: `${ageMin} \u2013 ${ageMax}`, icon: Users },
                    { label: "Gender", value: gender === "all" ? "All genders" : gender, icon: Users },
                    { label: "Cities", value: selectedCities.join(", "), icon: Globe },
                    { label: "Headline", value: adHeadline, icon: Megaphone },
                    { label: "CTA", value: ctaButton, icon: ChevronRight },
                    { label: "URL", value: destinationUrl, icon: Globe },
                    ...(adMedia ? [{ label: "Ad Media", value: `${adMedia.name} (${adMedia.type.startsWith("video") ? "Video" : "Image"})`, icon: adMedia.type.startsWith("video") ? FileVideo : ImageIcon }] : []),
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-start gap-2">
                      <Icon size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                      <div><p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</p><p className="text-xs text-foreground truncate max-w-[200px]">{value}</p></div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-400">
                  \u26a1 Campaign will be created in <strong>PAUSED</strong> state for safety. Review in your ad platform before activating.
                </div>
                <Button onClick={handleLaunch} disabled={launching} size="lg" className="w-full rounded-2xl py-6 text-base font-bold gap-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400">
                  {launching ? <><Loader2 size={18} className="animate-spin" />Launching on {platformMeta?.label}...</> : <><Rocket size={18} />Launch Campaign on {platformMeta?.label}</>}
                </Button>
              </motion.div>
            )}

            <div className="flex justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="rounded-xl">\u2190 Back</Button>
              {step < 4 && <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} className="rounded-xl gap-1.5">Next <ChevronRight size={14} /></Button>}
            </div>

            {(selectedPlatform === "facebook" || selectedPlatform === "instagram") && (
              <div className="mt-2">
                <FacebookBalancePanel />
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
            {!history ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="size-12 rounded-2xl bg-muted flex items-center justify-center"><Rocket size={20} className="text-muted-foreground" /></div>
                <p className="text-sm font-semibold text-foreground">No campaigns launched yet</p>
                <p className="text-xs text-muted-foreground">Launch your first campaign to see history</p>
                <Button size="sm" variant="ghost" onClick={() => setActiveTab("launch")}>Launch Campaign</Button>
              </div>
            ) : (
              history.map((item) => <CampaignHistoryItem key={item._id} campaign={item} onDelete={async () => { await deleteCampaign({ id: item._id }); toast.success("Removed from history"); }} />)
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Separator />
      <p className="text-[10px] text-muted-foreground text-center pb-4">Campaign Launch Agent \u00b7 Powered by PraisonAI \u00b7 Campaigns start in PAUSED state for safety</p>
    </div>
  );
}

export default function CampaignLaunchPage() {
  return (
    <>
      <AuthLoading><div className="flex flex-col gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div></AuthLoading>
      
      <><CampaignLaunchInner /></>
    </>
  );
}
