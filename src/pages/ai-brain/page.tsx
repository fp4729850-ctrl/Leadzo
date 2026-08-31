import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth.ts";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BrainCircuit, Save, Sparkles, Loader2, Globe, Plus, Building2, CheckCircle2, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

type Brain = {
  id: string;
  company_name: string;
  website_url: string;
  business_details: string;
  is_active: boolean;
};

export default function AIBrainPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [brains, setBrains] = useState<Brain[]>([]);
  const [view, setView] = useState<'list' | 'edit'>('list');
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [businessDetails, setBusinessDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [isScraping, setIsScraping] = useState(false);

  useEffect(() => {
    if (user) loadBrains();
  }, [user]);

  const loadBrains = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("business_knowledge")
        .select("*")
        .eq("user_id", user?.id)
        .order('created_at', { ascending: false });
        
      if (data) setBrains(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingId(null);
    setCompanyName("");
    setWebsiteUrl("");
    setBusinessDetails("");
    setView('edit');
  };

  const handleEdit = (brain: Brain) => {
    setEditingId(brain.id);
    setCompanyName(brain.company_name);
    setWebsiteUrl(brain.website_url || "");
    setBusinessDetails(brain.business_details);
    setView('edit');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this AI Brain?")) return;
    try {
      await supabase.from("business_knowledge").delete().eq("id", id);
      setBrains(brains.filter(b => b.id !== id));
      toast.success("Brain deleted successfully.");
    } catch (e) {
      toast.error("Failed to delete brain.");
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      // Set all to inactive first
      await supabase
        .from("business_knowledge")
        .update({ is_active: false })
        .eq("user_id", user?.id);
        
      // Set selected to active
      await supabase
        .from("business_knowledge")
        .update({ is_active: true })
        .eq("id", id);
        
      toast.success("Active Brain updated! All agents will now use this project.");
      loadBrains();
    } catch (e) {
      toast.error("Failed to set active brain.");
    }
  };

  const saveBrain = async () => {
    if (!companyName.trim() || !businessDetails.trim()) {
      toast.error("Company Name and Business Details are required");
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        user_id: user?.id,
        company_name: companyName,
        website_url: websiteUrl,
        business_details: businessDetails,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        await supabase.from("business_knowledge").update(payload).eq("id", editingId);
      } else {
        // If it's the first brain, make it active by default
        const isActive = brains.length === 0;
        await supabase.from("business_knowledge").insert({ ...payload, is_active: isActive });
      }

      toast.success("AI Brain saved successfully! 🧠");
      setView('list');
      loadBrains();
    } catch (e: any) {
      toast.error(`Error saving brain: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleScrapeWebsite = async () => {
    if (!websiteUrl) {
      toast.error("Please enter a website URL first");
      return;
    }
    let url = websiteUrl;
    if (!url.startsWith('http')) url = 'https://' + url;
    
    setIsScraping(true);
    toast.info("Scraping website, please wait...");
    
    try {
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
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight font-serif flex items-center gap-2">
            <BrainCircuit className="text-purple-600" size={28} />
            Leadzo AI Brain Workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage multiple client projects. Only the <b>Active</b> brain will be used by the AI for auto-replies and template generation.
          </p>
        </div>
        
        {view === 'list' && (
          <Button onClick={handleAddNew} className="bg-purple-600 hover:bg-purple-700">
            <Plus size={16} className="mr-2" />
            Add New Project
          </Button>
        )}
      </div>

      {view === 'list' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brains.length === 0 ? (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-xl">
              <Building2 className="mx-auto text-muted-foreground/50 mb-4" size={48} />
              <h3 className="text-lg font-medium">No projects found</h3>
              <p className="text-sm text-muted-foreground mb-4">Add your first company profile to train the AI.</p>
              <Button onClick={handleAddNew} variant="outline">Create AI Brain</Button>
            </div>
          ) : (
            brains.map((brain) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                key={brain.id} 
                className={`relative rounded-xl border p-5 space-y-4 shadow-sm transition-all ${brain.is_active ? 'border-purple-500 bg-purple-500/5' : 'border-border bg-card'}`}
              >
                {brain.is_active && (
                  <Badge className="absolute top-4 right-4 bg-purple-600 font-semibold text-[10px]">
                    <CheckCircle2 size={12} className="mr-1" /> ACTIVE
                  </Badge>
                )}
                <div className="space-y-1 pr-16">
                  <h3 className="font-semibold text-lg line-clamp-1">{brain.company_name}</h3>
                  {brain.website_url && (
                    <a href={brain.website_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline line-clamp-1 flex items-center gap-1">
                      <Globe size={10} /> {brain.website_url}
                    </a>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {brain.business_details}
                </p>
                
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  {!brain.is_active && (
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => handleSetActive(brain.id)}>
                      Set Active
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto text-blue-500" onClick={() => handleEdit(brain)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(brain.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6 space-y-6 shadow-sm relative">
          <Button variant="ghost" size="sm" className="absolute top-4 right-4 text-muted-foreground" onClick={() => setView('list')}>
            <ArrowLeft size={16} className="mr-1" /> Back to list
          </Button>
          
          <div className="grid md:grid-cols-2 gap-6 mt-4">
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
      )}
    </div>
  );
}
