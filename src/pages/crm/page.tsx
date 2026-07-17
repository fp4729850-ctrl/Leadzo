import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Mail, Phone, Calendar, ArrowRight, ArrowLeft, Star, TrendingUp, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: "new" | "contacted" | "qualified" | "closed_won" | "closed_lost";
  ai_score: number | null;
  ai_draft: string | null;
  created_at: string;
};

const STATUS_COLUMNS = [
  { id: "new", label: "New Leads", color: "bg-blue-500" },
  { id: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { id: "qualified", label: "Qualified", color: "bg-purple-500" },
  { id: "closed_won", label: "Closed Won", color: "bg-green-500" },
];

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // New Lead Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newSource, setNewSource] = useState("Manual");

  // AI Draft Modal State
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLead = async () => {
    if (!newName) return toast.error("Name is required");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Simulate AI Score for now
      const mockScore = Math.floor(Math.random() * 40) + 60; // 60-100

      const newLead = {
        user_id: user.id,
        name: newName,
        email: newEmail,
        phone: newPhone,
        source: newSource,
        status: "new",
        ai_score: mockScore
      };

      const { error } = await supabase.from("crm_leads").insert([newLead]);
      if (error) throw error;
      
      toast.success("Lead added successfully!");
      setIsAddOpen(false);
      setNewName(""); setNewEmail(""); setNewPhone("");
      fetchLeads();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const moveLead = async (id: string, newStatus: string) => {
    try {
      setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus as any } : l));
      const { error } = await supabase.from("crm_leads").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      toast.error("Failed to move lead");
      fetchLeads(); // revert
    }
  };

  const handleGenerateFollowups = async () => {
    setIsGenerating(true);
    toast.info("Generating AI follow-ups in the background...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/crmAi_followup", {
        method: "POST",
        headers: { "Authorization": `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to generate drafts");
      toast.success("AI Follow-ups generated successfully! 🚀");
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="shrink-0 flex justify-between items-end">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Users size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI CRM Agent</h1>
            <p className="text-xs text-muted-foreground">Manage, score, and close leads on autopilot.</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleGenerateFollowups} 
            disabled={isGenerating}
            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            {isGenerating ? "Generating..." : "Generate AI Follow-ups 🤖"}
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                <Plus size={16} className="mr-2" /> Add Lead
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Full Name *</label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="John Doe" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Email</label>
                <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="john@example.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Phone</label>
                <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+1 234 567 890" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Source</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newSource} onChange={e => setNewSource(e.target.value)}
                >
                  <option value="Manual">Manual</option>
                  <option value="Reddit">Reddit</option>
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                </select>
              </div>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleAddLead}>
                Save Lead
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </motion.div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 h-full min-w-max">
          {STATUS_COLUMNS.map((col) => {
            const colLeads = leads.filter(l => l.status === col.id);
            return (
              <div key={col.id} className="w-80 flex flex-col h-full">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <div className={`size-2.5 rounded-full ${col.color}`} />
                    <h3 className="font-semibold text-sm text-foreground">{col.label}</h3>
                  </div>
                  <Badge variant="secondary" className="bg-secondary/50 text-xs">{colLeads.length}</Badge>
                </div>

                {/* Column Body */}
                <div className="flex-1 rounded-2xl bg-secondary/30 border border-border/50 p-3 space-y-3 overflow-y-auto">
                  {colLeads.map((lead) => (
                    <motion.div 
                      layoutId={lead.id}
                      key={lead.id}
                      className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-sm truncate pr-2">{lead.name}</h4>
                        {lead.ai_score && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-none ${lead.ai_score > 80 ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            <TrendingUp size={10} className="mr-1" /> {lead.ai_score}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 mb-4">
                        {lead.email && <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Mail size={10}/> {lead.email}</p>}
                        {lead.phone && <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Phone size={10}/> {lead.phone}</p>}
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Search size={10}/> Source: {lead.source}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between border-t border-border/50 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            const currentIndex = STATUS_COLUMNS.findIndex(c => c.id === lead.status);
                            if (currentIndex > 0) moveLead(lead.id, STATUS_COLUMNS[currentIndex - 1].id);
                          }}
                          disabled={col.id === STATUS_COLUMNS[0].id}
                        >
                          <ArrowLeft size={12} />
                        </Button>
                        
                        {lead.ai_draft && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-6 text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsDraftOpen(true);
                            }}
                          >
                            View AI Draft ✨
                          </Button>
                        )}

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            const currentIndex = STATUS_COLUMNS.findIndex(c => c.id === lead.status);
                            if (currentIndex < STATUS_COLUMNS.length - 1) moveLead(lead.id, STATUS_COLUMNS[currentIndex + 1].id);
                          }}
                          disabled={col.id === STATUS_COLUMNS[STATUS_COLUMNS.length - 1].id}
                        >
                          <ArrowRight size={12} />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                  
                  {colLeads.length === 0 && !isLoading && (
                    <div className="h-24 flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                      No leads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Draft Modal */}
      <Dialog open={isDraftOpen} onOpenChange={setIsDraftOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">✨</span> AI Follow-up Draft
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-secondary/30 p-4 rounded-xl border border-border/50 text-sm whitespace-pre-wrap">
              {selectedLead?.ai_draft}
            </div>
            
            <div className="flex gap-3">
              <Button 
                className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white"
                onClick={() => {
                  const url = `https://wa.me/${selectedLead?.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(selectedLead?.ai_draft || '')}`;
                  window.open(url, "_blank");
                }}
                disabled={!selectedLead?.phone}
              >
                Send via WhatsApp
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  const url = `mailto:${selectedLead?.email}?subject=Following up - Leadzo&body=${encodeURIComponent(selectedLead?.ai_draft || '')}`;
                  window.open(url, "_blank");
                }}
                disabled={!selectedLead?.email}
              >
                Send via Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
