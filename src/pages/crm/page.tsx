import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Mail, Phone, Calendar, ArrowRight, ArrowLeft, Star, TrendingUp, Search, MessageSquare, Send } from "lucide-react";
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

type CrmMessage = {
  id: string;
  lead_id: string;
  platform: string;
  direction: string;
  content: string;
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

  // Inbox & Tabs State
  const [activeTab, setActiveTab] = useState<"pipeline" | "inbox">("pipeline");
  const [messages, setMessages] = useState<CrmMessage[]>([]);
  const [activeInboxLead, setActiveInboxLead] = useState<Lead | null>(null);
  const [replyText, setReplyText] = useState("");

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

      // Fetch messages for all leads
      const leadIds = (data || []).map(l => l.id);
      if (leadIds.length > 0) {
        const { data: msgData, error: msgError } = await supabase
          .from("crm_messages")
          .select("*")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: true });
        
        if (!msgError) setMessages(msgData || []);
      }
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

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border/50 shrink-0">
        <button 
          onClick={() => setActiveTab('pipeline')}
          className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'pipeline' ? 'border-indigo-500 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Sales Pipeline
        </button>
        <button 
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center gap-2 text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'inbox' ? 'border-indigo-500 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Live Inbox <MessageSquare size={14} />
          {messages.length > 0 && (
            <Badge className="ml-1 h-5 px-1.5 bg-indigo-500 hover:bg-indigo-600 text-white border-none">{messages.length}</Badge>
          )}
        </button>
      </div>

      {activeTab === 'pipeline' ? (
        /* Kanban Board */
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
      ) : (
        /* Live Inbox */
        <div className="flex-1 flex overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
          {/* Sidebar */}
          <div className="w-80 border-r border-border/50 flex flex-col bg-secondary/10">
            <div className="p-4 border-b border-border/50">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search messages..." className="pl-9 bg-background/50 border-border/50 h-9" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {leads.filter(l => messages.some(m => m.lead_id === l.id)).map(lead => {
                const leadMsgs = messages.filter(m => m.lead_id === lead.id);
                const lastMsg = leadMsgs[leadMsgs.length - 1];
                return (
                  <div 
                    key={lead.id} 
                    onClick={() => setActiveInboxLead(lead)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${activeInboxLead?.id === lead.id ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-secondary/40 border border-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-sm truncate">{lead.name}</h4>
                      {lastMsg?.platform === 'whatsapp' ? (
                        <Phone size={12} className="text-[#25D366]" />
                      ) : (
                        <Star size={12} className="text-pink-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{lastMsg?.content}</p>
                  </div>
                );
              })}
              {leads.filter(l => messages.some(m => m.lead_id === l.id)).length === 0 && (
                <div className="text-center p-8 text-muted-foreground text-sm">
                  <MessageSquare className="mx-auto mb-2 opacity-50" size={24}/>
                  No messages yet
                </div>
              )}
            </div>
          </div>
          
          {/* Chat Window */}
          <div className="flex-1 flex flex-col bg-background/30">
            {activeInboxLead ? (
              <>
                <div className="p-4 border-b border-border/50 flex justify-between items-center bg-card/50">
                  <div>
                    <h3 className="font-bold">{activeInboxLead.name}</h3>
                    <p className="text-xs text-muted-foreground">{activeInboxLead.phone || activeInboxLead.email || "No contact info"}</p>
                  </div>
                  <Badge variant="outline">{activeInboxLead.status}</Badge>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.filter(m => m.lead_id === activeInboxLead.id).map(msg => (
                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${msg.direction === 'outbound' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-secondary text-foreground rounded-tl-sm'}`}>
                        <p>{msg.content}</p>
                        <span className="text-[10px] opacity-60 mt-1 block text-right">
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {msg.platform}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 bg-card/50 border-t border-border/50">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Type a message to send via Meta API..." 
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      className="bg-background"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && replyText) {
                          toast.error("Meta Webhook required to send outbound real messages.");
                          setReplyText("");
                        }
                      }}
                    />
                    <Button onClick={() => {
                        if(replyText) {
                           toast.error("Meta Webhook required to send outbound real messages.");
                           setReplyText("");
                        }
                      }} className="bg-indigo-600 hover:bg-indigo-700">
                      <Send size={16} />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <div className="size-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                  <MessageSquare size={24} className="opacity-50" />
                </div>
                <p>Select a conversation to start messaging</p>
                <p className="text-xs mt-2 max-w-sm text-center">Real-time Meta Webhooks will route incoming WhatsApp & Insta DMs directly here.</p>
              </div>
            )}
          </div>
        </div>
      )}

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
