import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth.ts";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BrainCircuit, Save, Sparkles, Loader2, Globe } from "lucide-react";
import { motion } from "framer-motion";

export default function AIBrainPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [businessDetails, setBusinessDetails] = useState("");

  useEffect(() => {
    if (user) {
      loadBrain();
    }
  }, [user]);

  const loadBrain = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("business_knowledge")
        .select("*")
        .eq("user_id", user?.id)
        .single();
        
      if (data) {
        setCompanyName(data.company_name);
        setWebsiteUrl(data.website_url || "");
        setBusinessDetails(data.business_details);
      }
    } catch (e) {
      // Might not exist yet, that's fine
    } finally {
      setLoading(false);
    }
  };

  const saveBrain = async () => {
    if (!companyName.trim() || !businessDetails.trim()) {
      toast.error("Company Name aur Business Details likhna zaroori hai");
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("business_knowledge")
        .upsert({
          user_id: user?.id,
          company_name: companyName,
          website_url: websiteUrl,
          business_details: businessDetails,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("AI Brain updated successfully! 🧠");
    } catch (e: any) {
      toast.error(`Error saving brain: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleScrapeWebsite = async () => {
    if (!websiteUrl) {
      toast.error("Pehle website URL daalein");
      return;
    }
    
    let url = websiteUrl;
    if (!url.startsWith('http')) url = 'https://' + url;
    
    setIsScraping(true);
    toast.info("Scraping website, please wait...");
    
    try {
      // Using the existing ai_scrape_website edge function
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai_scrape_website`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      
      if (data.prompt) {
        setBusinessDetails((prev) => prev ? prev + "\n\n--- Website Data ---\n" + data.prompt : data.prompt);
        toast.success("Website knowledge loaded successfully!");
      } else {
        toast.error(data.error || "Failed to scrape website");
      }
    } catch (e) {
      toast.error("Error scraping website");
    } finally {
      setIsScraping(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight font-serif flex items-center gap-2">
          <BrainCircuit className="text-purple-600" size={28} />
          Leadzo AI Brain (Central Knowledge)
        </h1>
        <p className="text-sm text-muted-foreground">
          Yeh ek central 'Single Brain' hai. Aap jo bhi details yahan daalenge, aapke sabhi AI Agents (WhatsApp, Email, etc.) yahi se padh kar customers ko reply karenge.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6 space-y-6 shadow-sm">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Company Name <span className="text-red-500">*</span></Label>
            <Input 
              placeholder="e.g. Leadzo AI, Nike, etc." 
              value={companyName} 
              onChange={(e) => setCompanyName(e.target.value)} 
            />
          </div>
          
          <div className="space-y-2">
            <Label>Website URL (Optional)</Label>
            <div className="flex gap-2">
              <Input 
                placeholder="https://example.com" 
                value={websiteUrl} 
                onChange={(e) => setWebsiteUrl(e.target.value)} 
              />
              <Button 
                variant="secondary" 
                className="gap-2 shrink-0" 
                onClick={handleScrapeWebsite} 
                disabled={isScraping}
              >
                {isScraping ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                Scrape
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Business Context, Policies & Pricing <span className="text-red-500">*</span></Label>
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              <Sparkles size={10} className="text-purple-500" /> Used by all AI Agents
            </span>
          </div>
          <Textarea 
            placeholder="Apni company ke baare mein sab kuch yahan likhein. Products kya hain, price kya hai, refund policy kya hai, customer se kis tone mein baat karni hai..." 
            rows={12} 
            className="resize-none leading-relaxed"
            value={businessDetails}
            onChange={(e) => setBusinessDetails(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Aapki website scrape karne par jo bhi text aayega, wo is box mein add ho jayega. Aap use manually edit bhi kar sakte hain.
          </p>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button 
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white cursor-pointer px-8" 
            onClick={saveBrain}
            disabled={saving}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : "Save AI Brain"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
