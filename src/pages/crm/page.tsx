import { useState } from "react";
import { useQuery, useMutation, useAction } from "@/lib/convex-supabase-adapter.ts";
import { api } from "@/convex/_generated/api.js";
import type { Id, Doc } from "@/convex/_generated/dataModel.js";
import { Authenticated, Unauthenticated } from "@/lib/convex-supabase-adapter.ts";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Users, Plus, Trash2, RefreshCw, Zap, Brain, Mail,
  MessageSquare, Phone, Building2, Tag, ChevronRight,
  ToggleLeft, ToggleRight, ListOrdered, Play, StopCircle,
  TrendingUp, Star, CheckCircle2, UserPlus, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { cn } from "@/lib/utils.ts";

// ─── Constants ────────────────────────────────────────────────────────────

const STAGES = [
  { value: "new", label: "New", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "engaged", label: "Engaged", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  { value: "qualified", label: "Qualified", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { value: "customer", label: "Customer", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { value: "churned", label: "Churned", color: "bg-red-500/10 text-red-400 border-red-500/20" },
];

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { value: "email", label: "Email", icon: Mail },
  { value: "sms", label: "SMS", icon: Phone },
];

const GOALS = ["nurture", "convert", "re-engage", "onboard"];
const TONES = ["friendly", "professional", "urgent"];
const LANGUAGES = ["english", "hindi", "hinglish"];

function stageColor(stage: string) {
  return STAGES.find((s) => s.value === stage)?.color ?? "bg-muted text-muted-foreground";
}

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

// ─── Sub-components ────────────────────────────────────────────────────────

type Contact = Doc<"crmContacts">;
type Sequence = Doc<"sequences">;
type Enrollment = Doc<"sequenceEnrollments">;

function ContactCard({
  contact,
  sequences,
  enrollments,
  onEnroll,
  onScore,
  onDelete,
  onStageChange,
}: {
  contact: Contact;
  sequences: Sequence[];
  enrollments: Enrollment[];
  onEnroll: (contactId: Id<"crmContacts">, sequenceId: Id<"sequences">) => void;
  onScore: (contact: Contact) => void;
  onDelete: (id: Id<"crmContacts">) => void;
  onStageChange: (id: Id<"crmContacts">, stage: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeEnrollments = enrollments.filter(
    (e) => e.contactId === contact._id && e.status === "active"
  );

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card className="bg-card/60 border-border/60">
        <CardContent className="py-3">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center shrink-0 font-bold text-sm">
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm truncate">{contact.name}</span>
                <Badge className={cn("text-[10px] border px-1.5 py-0", stageColor(contact.stage))}>
                  {contact.stage}
                </Badge>
                <span className={cn("text-xs font-bold ml-auto", scoreColor(contact.score))}>
                  {contact.score}pts
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                {contact.email && <span className="flex items-center gap-1"><Mail size={10} />{contact.email}</span>}
                {contact.phone && <span className="flex items-center gap-1"><Phone size={10} />{contact.phone}</span>}
                {contact.company && <span className="flex items-center gap-1"><Building2 size={10} />{contact.company}</span>}
              </div>
              {contact.tags.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {contact.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              {activeEnrollments.length > 0 && (
                <p className="text-[10px] text-chart-3 mt-1 flex items-center gap-1">
                  <ListOrdered size={10} /> {activeEnrollments.length} active sequence(s)
                </p>
              )}
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            <Select value={contact.stage} onValueChange={(v) => onStageChange(contact._id, v)}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setExpanded((p) => !p)}
            >
              <Play size={11} /> Enroll
              <ChevronRight size={11} className={cn("transition-transform", expanded && "rotate-90")} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onScore(contact)}
            >
              <Brain size={11} /> AI Score
            </Button>

            <button
              onClick={() => onDelete(contact._id)}
              className="ml-auto text-muted-foreground hover:text-red-400 transition-colors p-1"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Enroll panel */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Separator className="my-3 bg-border/50" />
                <p className="text-xs text-muted-foreground mb-2 font-medium">Enroll in sequence:</p>
                <div className="space-y-1.5">
                  {sequences.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60">No sequences yet — create one first</p>
                  ) : (
                    sequences.filter((s) => s.isActive).map((seq) => (
                      <div key={seq._id} className="flex items-center justify-between">
                        <span className="text-xs text-foreground/80">{seq.name}</span>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 text-[10px]"
                          onClick={() => { onEnroll(contact._id, seq._id); setExpanded(false); }}
                        >
                          Enroll
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

function CrmPageInner() {
  const contacts = useQuery(api.crm.listContacts) ?? [];
  const sequences = useQuery(api.crm.listSequences) ?? [];
  const enrollments = useQuery(api.crm.listEnrollments) ?? [];

  const createContact = useMutation(api.crm.createContact);
  const updateContact = useMutation(api.crm.updateContact);
  const deleteContact = useMutation(api.crm.deleteContact);
  const syncLeads = useMutation(api.crm.syncLeadsToCrm);
  const createSequence = useMutation(api.crm.createSequence);
  const toggleSequence = useMutation(api.crm.toggleSequence);
  const deleteSequence = useMutation(api.crm.deleteSequence);
  const enrollContact = useMutation(api.crm.enrollContact);
  const advanceEnrollment = useMutation(api.crm.advanceEnrollment);
  const stopEnrollment = useMutation(api.crm.stopEnrollment);
  const generateSeq = useAction(api.crmAi.generateSequence);
  const scoreContactAi = useAction(api.crmAi.scoreContact);

  // ── New contact dialog ──
  const [showContact, setShowContact] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cCompany, setCCompany] = useState("");
  const [cStage, setCStage] = useState("new");
  const [cNotes, setCNotes] = useState("");
  const [cTags, setCTags] = useState("");
  const [savingContact, setSavingContact] = useState(false);

  // ── New sequence dialog ──
  const [showSeq, setShowSeq] = useState(false);
  const [seqName, setSeqName] = useState("");
  const [seqChannel, setSeqChannel] = useState("whatsapp");
  const [seqTrigger, setSeqTrigger] = useState("new");
  const [seqProduct, setSeqProduct] = useState("");
  const [seqGoal, setSeqGoal] = useState("nurture");
  const [seqTone, setSeqTone] = useState("friendly");
  const [seqLang, setSeqLang] = useState("english");
  const [seqSteps, setSeqSteps] = useState("3");
  const [generatingSeq, setGeneratingSeq] = useState(false);
  const [generatedSteps, setGeneratedSteps] = useState<
    { stepNumber: number; delayDays: number; subject?: string | null; message: string }[]
  >([]);

  // ── AI Score result ──
  const [scoreResult, setScoreResult] = useState<{
    score: number; reasoning: string; nextAction: string;
  } | null>(null);
  const [scoringContact, setScoringContact] = useState<Contact | null>(null);
  const [scoringLoading, setScoringLoading] = useState(false);

  // ── Filter ──
  const [stageFilter, setStageFilter] = useState("all");
  const [syncing, setSyncing] = useState(false);

  const handleSaveContact = async () => {
    if (!cName.trim()) return;
    setSavingContact(true);
    try {
      await createContact({
        name: cName.trim(),
        email: cEmail || undefined,
        phone: cPhone || undefined,
        company: cCompany || undefined,
        source: "manual",
        stage: cStage,
        score: 50,
        tags: cTags.split(",").map((t) => t.trim()).filter(Boolean),
        notes: cNotes || undefined,
      });
      toast.success("Contact added");
      setShowContact(false);
      setCName(""); setCEmail(""); setCPhone(""); setCCompany(""); setCNotes(""); setCTags("");
    } finally {
      setSavingContact(false);
    }
  };

  const handleSyncLeads = async () => {
    setSyncing(true);
    try {
      const count = await syncLeads({});
      toast.success(`Synced ${count} new contacts from leads`);
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateSequence = async () => {
    if (!seqProduct.trim()) { toast.error("Enter a product/service name"); return; }
    setGeneratingSeq(true);
    setGeneratedSteps([]);
    try {
      const result = await generateSeq({
        productName: seqProduct.trim(),
        channel: seqChannel,
        goal: seqGoal,
        tone: seqTone,
        numSteps: parseInt(seqSteps),
        language: seqLang,
      });
      setGeneratedSteps(
        result.steps.map((s) => ({ ...s, subject: s.subject ?? undefined }))
      );
      if (!seqName) setSeqName(result.sequenceName);
      toast.success("Sequence generated by AI");
    } catch {
      toast.error("AI generation failed — check HERCULES_API_KEY");
    } finally {
      setGeneratingSeq(false);
    }
  };

  const handleSaveSequence = async () => {
    if (!seqName.trim() || generatedSteps.length === 0) return;
    await createSequence({
      name: seqName.trim(),
      channel: seqChannel,
      triggerStage: seqTrigger,
      steps: generatedSteps.map((s) => ({
        stepNumber: s.stepNumber,
        delayDays: s.delayDays,
        subject: s.subject ?? undefined,
        message: s.message,
      })),
    });
    toast.success("Sequence saved");
    setShowSeq(false);
    setSeqName(""); setSeqProduct(""); setGeneratedSteps([]);
  };

  const handleScoreContact = async (contact: Contact) => {
    setScoringContact(contact);
    setScoringLoading(true);
    setScoreResult(null);
    try {
      const contactEnrollments = enrollments.filter((e) => e.contactId === contact._id);
      const result = await scoreContactAi({
        name: contact.name,
        stage: contact.stage,
        tags: contact.tags,
        notes: contact.notes,
        lastContactedAt: contact.lastContactedAt,
        enrollmentCount: contactEnrollments.length,
      });
      setScoreResult(result);
      await updateContact({ id: contact._id, score: result.score });
      toast.success("Score updated");
    } catch {
      toast.error("Scoring failed — check HERCULES_API_KEY");
    } finally {
      setScoringLoading(false);
    }
  };

  const handleEnroll = async (contactId: Id<"crmContacts">, sequenceId: Id<"sequences">) => {
    await enrollContact({ contactId, sequenceId });
    await updateContact({ id: contactId, lastContactedAt: new Date().toISOString() });
    toast.success("Contact enrolled in sequence");
  };

  const filteredContacts = stageFilter === "all"
    ? contacts
    : contacts.filter((c) => c.stage === stageFilter);

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s.value] = contacts.filter((c) => c.stage === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  const activeEnrollments = enrollments.filter((e) => e.status === "active");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight font-serif flex items-center gap-2">
            <Users className="text-primary" size={22} />
            CRM + Sequences Agent
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Contact management · AI drip sequences · Lead scoring
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={handleSyncLeads} disabled={syncing}>
            <RefreshCw size={14} className={cn(syncing && "animate-spin")} />
            Sync Leads
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowSeq(true)}>
            <ListOrdered size={14} /> New Sequence
          </Button>
          <Button size="sm" onClick={() => setShowContact(true)}>
            <UserPlus size={14} /> Add Contact
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STAGES.map((s) => (
          <Card
            key={s.value}
            className={cn("bg-card/60 border-border/60 cursor-pointer transition-all",
              stageFilter === s.value && "ring-1 ring-primary/40")}
            onClick={() => setStageFilter(stageFilter === s.value ? "all" : s.value)}
          >
            <CardContent className="py-3 text-center">
              <p className="text-lg font-bold">{stageCounts[s.value] ?? 0}</p>
              <Badge className={cn("text-[10px] border mt-1", s.color)}>{s.label}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="contacts">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="contacts">
            Contacts <Badge variant="secondary" className="ml-1.5 text-[10px]">{contacts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sequences">
            Sequences <Badge variant="secondary" className="ml-1.5 text-[10px]">{sequences.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="enrollments">
            Active Drips <Badge variant="secondary" className="ml-1.5 text-[10px]">{activeEnrollments.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Contacts ── */}
        <TabsContent value="contacts" className="mt-4 space-y-3">
          {stageFilter !== "all" && (
            <div className="flex items-center gap-2">
              <Badge className={cn("text-[10px] border", stageColor(stageFilter))}>
                {stageFilter}
              </Badge>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setStageFilter("all")}>
                Clear filter ×
              </button>
            </div>
          )}

          {filteredContacts.length === 0 ? (
            <Card className="bg-card/40 border-dashed border-border/50">
              <CardContent className="py-12 text-center">
                <Users size={32} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  {stageFilter !== "all" ? `No contacts in "${stageFilter}" stage` : "No contacts yet"}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="secondary" onClick={handleSyncLeads}>
                    <RefreshCw size={12} /> Sync from Leads
                  </Button>
                  <Button size="sm" onClick={() => setShowContact(true)}>
                    <Plus size={12} /> Add Contact
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {filteredContacts.map((contact) => (
                <ContactCard
                  key={contact._id}
                  contact={contact}
                  sequences={sequences}
                  enrollments={enrollments}
                  onEnroll={handleEnroll}
                  onScore={handleScoreContact}
                  onDelete={async (id) => { await deleteContact({ id }); toast.success("Contact deleted"); }}
                  onStageChange={async (id, stage) => { await updateContact({ id, stage }); toast.success("Stage updated"); }}
                />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        {/* ── Sequences ── */}
        <TabsContent value="sequences" className="mt-4 space-y-3">
          {sequences.length === 0 ? (
            <Card className="bg-card/40 border-dashed border-border/50">
              <CardContent className="py-12 text-center">
                <ListOrdered size={32} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No sequences yet — create your first AI-generated drip</p>
                <Button size="sm" onClick={() => setShowSeq(true)}>
                  <Plus size={12} /> Create Sequence
                </Button>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {sequences.map((seq) => {
                const ChannelIcon = CHANNELS.find((c) => c.value === seq.channel)?.icon ?? MessageSquare;
                const enrolled = enrollments.filter((e) => e.sequenceId === seq._id && e.status === "active").length;
                return (
                  <motion.div key={seq._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card className="bg-card/60 border-border/60">
                      <CardContent className="py-3">
                        <div className="flex items-start gap-3">
                          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <ChannelIcon size={15} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{seq.name}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5">{seq.channel}</Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5">trigger: {seq.triggerStage}</Badge>
                              {!seq.isActive && <Badge variant="secondary" className="text-[10px]">Paused</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {seq.steps.length} steps · {enrolled} active enrollments
                            </p>
                            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                              {seq.steps.map((step) => (
                                <div
                                  key={step.stepNumber}
                                  className="shrink-0 bg-muted/50 rounded-lg px-2.5 py-1.5 border border-border/50 text-[10px] space-y-0.5 max-w-[140px]"
                                >
                                  <p className="font-semibold text-foreground/60">Day {step.delayDays} · Step {step.stepNumber}</p>
                                  <p className="text-foreground/70 line-clamp-2">{step.message}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 mt-1">
                            <button onClick={() => toggleSequence({ id: seq._id, isActive: !seq.isActive })}>
                              {seq.isActive
                                ? <ToggleRight size={20} className="text-chart-3" />
                                : <ToggleLeft size={20} className="text-muted-foreground" />}
                            </button>
                            <button
                              onClick={async () => { await deleteSequence({ id: seq._id }); toast.success("Sequence deleted"); }}
                              className="text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </TabsContent>

        {/* ── Active Drips ── */}
        <TabsContent value="enrollments" className="mt-4 space-y-2">
          {activeEnrollments.length === 0 ? (
            <Card className="bg-card/40 border-dashed border-border/50">
              <CardContent className="py-12 text-center">
                <Layers size={32} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No active drip enrollments — enroll contacts from the Contacts tab</p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {activeEnrollments.map((enr) => {
                const contact = contacts.find((c) => c._id === enr.contactId);
                const seq = sequences.find((s) => s._id === enr.sequenceId);
                if (!contact || !seq) return null;
                const totalSteps = seq.steps.length;
                const progress = Math.round(((enr.currentStep - 1) / totalSteps) * 100);

                return (
                  <motion.div key={enr._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card className="bg-card/60 border-border/60">
                      <CardContent className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{contact.name}</span>
                            <ChevronRight size={12} className="text-muted-foreground" />
                            <span className="text-sm text-foreground/70">{seq.name}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[180px]">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              Step {enr.currentStep}/{totalSteps}
                            </span>
                          </div>
                          {enr.lastSentAt && (
                            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                              Last sent: {new Date(enr.lastSentAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={async () => {
                              await advanceEnrollment({ id: enr._id, totalSteps });
                              toast.success("Advanced to next step");
                            }}
                          >
                            <Play size={11} /> Next Step
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={async () => {
                              await stopEnrollment({ id: enr._id });
                              toast.success("Enrollment stopped");
                            }}
                          >
                            <StopCircle size={11} /> Stop
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>

      {/* ── New Contact Dialog ── */}
      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Name *</Label>
                <Input placeholder="John Smith" value={cName} onChange={(e) => setCName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input placeholder="john@example.com" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="+91 98765 43210" value={cPhone} onChange={(e) => setCPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input placeholder="Acme Inc." value={cCompany} onChange={(e) => setCCompany(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={cStage} onValueChange={setCStage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Tags (comma separated)</Label>
                <Input placeholder="hot lead, product-a, q4" value={cTags} onChange={(e) => setCTags(e.target.value)} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Any relevant notes..."
                  rows={2}
                  value={cNotes}
                  onChange={(e) => setCNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowContact(false)}>Cancel</Button>
            <Button onClick={handleSaveContact} disabled={savingContact || !cName.trim()}>
              {savingContact ? "Saving…" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Sequence Dialog ── */}
      <Dialog open={showSeq} onOpenChange={(v) => { setShowSeq(v); if (!v) setGeneratedSteps([]); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create AI Sequence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Product / Service</Label>
                <Input placeholder="e.g. Real Estate CRM Software" value={seqProduct} onChange={(e) => setSeqProduct(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select value={seqChannel} onValueChange={setSeqChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Trigger Stage</Label>
                <Select value={seqTrigger} onValueChange={setSeqTrigger}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Goal</Label>
                <Select value={seqGoal} onValueChange={setSeqGoal}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOALS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tone</Label>
                <Select value={seqTone} onValueChange={setSeqTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select value={seqLang} onValueChange={setSeqLang}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Number of Steps</Label>
                <Select value={seqSteps} onValueChange={setSeqSteps}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["2", "3", "4", "5", "6"].map((n) => <SelectItem key={n} value={n}>{n} steps</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={handleGenerateSequence}
              disabled={generatingSeq || !seqProduct.trim()}
            >
              <Brain size={14} className={cn(generatingSeq && "animate-pulse")} />
              {generatingSeq ? "Generating…" : "Generate with AI"}
            </Button>

            {generatedSteps.length > 0 && (
              <div className="space-y-3">
                <Separator />
                <div className="space-y-1.5">
                  <Label>Sequence Name</Label>
                  <Input value={seqName} onChange={(e) => setSeqName(e.target.value)} />
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Generated Steps
                </p>
                {generatedSteps.map((step) => (
                  <div key={step.stepNumber} className="border border-border/50 rounded-lg p-3 space-y-1.5 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">Step {step.stepNumber}</Badge>
                      <span className="text-[10px] text-muted-foreground">Day {step.delayDays}</span>
                      {step.subject && (
                        <span className="text-[10px] text-foreground/60 truncate">Subj: {step.subject}</span>
                      )}
                    </div>
                    <Textarea
                      rows={3}
                      className="text-xs"
                      value={step.message}
                      onChange={(e) => {
                        setGeneratedSteps((prev) =>
                          prev.map((s) =>
                            s.stepNumber === step.stepNumber ? { ...s, message: e.target.value } : s
                          )
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowSeq(false); setGeneratedSteps([]); }}>Cancel</Button>
            <Button
              onClick={handleSaveSequence}
              disabled={generatedSteps.length === 0 || !seqName.trim()}
            >
              Save Sequence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AI Score Result Dialog ── */}
      <Dialog open={!!scoringContact} onOpenChange={() => { setScoringContact(null); setScoreResult(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain size={16} className="text-primary" />
              AI Lead Score
            </DialogTitle>
          </DialogHeader>
          {scoringLoading ? (
            <div className="py-12 text-center">
              <Brain size={32} className="mx-auto text-primary animate-pulse mb-3" />
              <p className="text-sm text-muted-foreground">Analysing {scoringContact?.name}…</p>
            </div>
          ) : scoreResult ? (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <p className={cn("text-5xl font-black", scoreColor(scoreResult.score))}>
                  {scoreResult.score}
                </p>
                <p className="text-xs text-muted-foreground mt-1">out of 100</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reasoning</p>
                <p className="text-sm text-foreground/80">{scoreResult.reasoning}</p>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-primary mb-1">Next Action</p>
                <p className="text-sm">{scoreResult.nextAction}</p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => { setScoringContact(null); setScoreResult(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CrmPage() {
  return (
    <>
      <><CrmPageInner /></>
      
    </>
  );
}
