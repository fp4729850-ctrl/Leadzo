import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { motion, AnimatePresence } from "motion/react";
import { Plus, RefreshCw, Users, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { toast } from "sonner";
import LeadCard from "./_components/lead-card.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";

type Lead = Doc<"leads">;

const COLUMNS = [
  { status: "new", label: "New", color: "bg-primary" },
  { status: "contacted", label: "Contacted", color: "bg-accent" },
  { status: "negotiating", label: "Negotiating", color: "bg-chart-4" },
  { status: "converted", label: "Converted", color: "bg-chart-3" },
  { status: "lost", label: "Lost", color: "bg-muted-foreground" },
  { status: "spam", label: "Spam", color: "bg-destructive" },
] as const;

const defaultForm = { name: "", contact: "", platform: "whatsapp", intent: "BUY", language: "hinglish", lastMessage: "", isUrgent: false };

export default function PipelinePage() {
  const leads = useQuery(api.leads.list, {});
  const seedDemoData = useMutation(api.leads.seedDemoData);
  const createLead = useMutation(api.leads.create);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [adding, setAdding] = useState(false);

  const handleSeedDemo = async () => { await seedDemoData(); toast.success("Demo leads loaded!"); };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.contact.trim()) { toast.error("Name aur contact required hai"); return; }
    setAdding(true);
    try { await createLead({ ...form, status: "new", score: 50, isScam: false }); setAddOpen(false); setForm(defaultForm); toast.success("Lead added!"); }
    finally { setAdding(false); }
  };

  const totalLeads = leads?.length ?? 0;

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center"><LayoutGrid size={18} className="text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight font-serif">Lead Pipeline</h1>
            <p className="text-sm text-muted-foreground">{leads ? `${totalLeads} leads` : "Loading..."} across 6 stages</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleSeedDemo} className="text-muted-foreground hover:text-foreground cursor-pointer"><RefreshCw size={14} />Load Demo</Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="cursor-pointer"><Plus size={14} />Add Lead</Button>
        </div>
      </div>

      {!leads ? (
        <div className="flex gap-4 overflow-x-auto pb-4">{COLUMNS.map((col) => (<div key={col.status} className="shrink-0 w-64 space-y-3"><Skeleton className="h-9 w-full rounded-lg" />{[1,2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}</div>))}</div>
      ) : leads.length === 0 ? (
        <Empty><EmptyHeader><EmptyMedia variant="icon"><Users /></EmptyMedia><EmptyTitle>Koi lead nahi hai abhi</EmptyTitle><EmptyDescription>Demo data load karo ya manually lead add karo</EmptyDescription></EmptyHeader><EmptyContent><Button size="sm" onClick={handleSeedDemo} className="cursor-pointer"><RefreshCw size={14} />Load Demo Data</Button></EmptyContent></Empty>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {COLUMNS.map((col) => {
            const colLeads = leads.filter((l) => l.status === col.status);
            return (
              <div key={col.status} className="shrink-0 w-64 flex flex-col gap-3">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2"><span className={cn("size-2 rounded-full", col.color)} /><span className="text-xs font-semibold text-foreground uppercase tracking-wide">{col.label}</span></div>
                  <Badge variant="secondary" className="text-[10px] font-bold px-1.5 h-5">{colLeads.length}</Badge>
                </div>
                <div className="flex flex-col gap-3 flex-1">
                  {colLeads.length === 0 ? (
                    <div className="h-20 border border-dashed border-border rounded-xl flex items-center justify-center"><span className="text-xs text-muted-foreground/40">Empty</span></div>
                  ) : (
                    <AnimatePresence>{colLeads.map((lead, i) => <motion.div key={lead._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const }}><LeadCard lead={lead} onSelect={setSelectedLead} /></motion.div>)}</AnimatePresence>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedLead} onOpenChange={(o) => !o && setSelectedLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Lead Detail</DialogTitle><DialogDescription>{selectedLead?.name} — {selectedLead?.platform}</DialogDescription></DialogHeader>
          {selectedLead && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {(["name","contact","platform","intent","status","language"] as const).map((k) => <div key={k} className="space-y-0.5"><p className="text-xs text-muted-foreground capitalize">{k}</p><p className="text-sm font-medium text-foreground capitalize">{selectedLead[k]}</p></div>)}
                <div className="space-y-0.5"><p className="text-xs text-muted-foreground">Score</p><p className="text-sm font-medium text-foreground">{selectedLead.score}/100</p></div>
                <div className="space-y-0.5"><p className="text-xs text-muted-foreground">Urgent</p><p className="text-sm font-medium text-foreground">{selectedLead.isUrgent ? "Yes" : "No"}</p></div>
              </div>
              {selectedLead.isScam && (<><Separator /><div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive p-3 text-xs font-medium">Scam Detected: {selectedLead.scamReason}</div></>)}
              {selectedLead.lastMessage && (<><Separator /><div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground italic">&ldquo;{selectedLead.lastMessage}&rdquo;</div></>)}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Lead Add Karo</DialogTitle><DialogDescription>Lead ki basic details bharo</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="lead-name">Name</Label><Input id="lead-name" placeholder="Rahul Sharma" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="lead-contact">Contact</Label><Input id="lead-contact" placeholder="+919876543210" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Platform</Label><Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["whatsapp","telegram","instagram","reddit","x","email"].map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Intent</Label><Select value={form.intent} onValueChange={(v) => setForm({ ...form, intent: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["BUY","SELL","NONE"].map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="last-msg">Last Message (optional)</Label><Input id="last-msg" placeholder="10k USDT chahiye aaj..." value={form.lastMessage} onChange={(e) => setForm({ ...form, lastMessage: e.target.value })} /></div>
            <Button onClick={handleAdd} disabled={adding} className="w-full cursor-pointer">{adding ? "Adding..." : "Lead Add Karo"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
