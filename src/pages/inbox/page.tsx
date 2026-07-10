import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { motion, AnimatePresence } from "motion/react";
import { Send, Loader2, Bot, Search, Users, MessageSquareCode } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import LeadListItem from "./_components/lead-list-item.tsx";
import ChatBubble from "./_components/chat-bubble.tsx";
import LeadHeader from "./_components/lead-header.tsx";
import { cn } from "@/lib/utils.ts";

type Lead = Doc<"leads">;

export default function InboxPage() {
  const leads = useQuery(api.leads.list, {});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [autopilotLeads, setAutopilotLeads] = useState<Set<string>>(new Set());
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = useQuery(api.messages.list, selectedLead ? { leadId: selectedLead._id } : "skip");
  const sendMessage = useMutation(api.messages.send);
  const updateStatus = useMutation(api.leads.updateStatus);
  const generateReply = useAction(api.ai.generateReply);
  const classifyLead = useAction(api.ai.classifyLead);

  useEffect(() => { if (messages) { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); } }, [messages]);
  useEffect(() => { if (selectedLead) { setTimeout(() => inputRef.current?.focus(), 100); } }, [selectedLead?._id]);

  useEffect(() => {
    if (!selectedLead || !messages) return;
    const isAuto = autopilotLeads.has(selectedLead._id);
    if (!isAuto) return;
    const last = messages[messages.length - 1];
    if (last?.role !== "user") return;
    const timer = setTimeout(async () => {
      setIsGenerating(true);
      try { await generateReply({ leadId: selectedLead._id, conversationHistory: messages.map((m) => ({ role: m.role, text: m.text })), language: selectedLead.language, intent: selectedLead.intent }); }
      catch { toast.error("Autopilot reply failed"); }
      finally { setIsGenerating(false); }
    }, 800);
    return () => clearTimeout(timer);
  }, [messages?.length]);

  const filteredLeads = leads?.filter((l) => `${l.name} ${l.contact} ${l.platform}`.toLowerCase().includes(search.toLowerCase())) ?? [];

  const handleSendUserMessage = async () => {
    if (!selectedLead || !messageInput.trim()) return;
    const text = messageInput.trim();
    setMessageInput(""); setIsSending(true);
    try { await sendMessage({ leadId: selectedLead._id, role: "user", text }); }
    catch { toast.error("Message send failed"); }
    finally { setIsSending(false); }
  };

  const handleGenerateReply = async () => {
    if (!selectedLead || !messages) return;
    setIsGenerating(true);
    try { await generateReply({ leadId: selectedLead._id, conversationHistory: messages.map((m) => ({ role: m.role, text: m.text })), language: selectedLead.language, intent: selectedLead.intent }); toast.success("AI reply generated!"); }
    catch { toast.error("Reply generation failed"); }
    finally { setIsGenerating(false); }
  };

  const handleClassify = async () => {
    if (!selectedLead || !selectedLead.lastMessage) { toast.error("No last message to classify"); return; }
    setIsClassifying(true);
    try { await classifyLead({ leadId: selectedLead._id, lastMessage: selectedLead.lastMessage, name: selectedLead.name }); toast.success("Lead re-analysed by AI!"); }
    catch { toast.error("Classification failed"); }
    finally { setIsClassifying(false); }
  };

  const toggleAutopilot = () => {
    if (!selectedLead) return;
    setAutopilotLeads((prev) => {
      const next = new Set(prev);
      if (next.has(selectedLead._id)) { next.delete(selectedLead._id); toast.info("Autopilot OFF"); }
      else { next.add(selectedLead._id); toast.success("Autopilot ON — AI will auto-reply!"); }
      return next;
    });
  };

  return (
    <div className="flex h-full rounded-xl border border-border overflow-hidden bg-card">
      <div className={cn("flex flex-col border-r border-border bg-card/50", selectedLead ? "hidden md:flex md:w-80 shrink-0" : "flex-1")}>
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquareCode size={16} className="text-primary" />
            <span className="font-bold text-sm">Live Inbox</span>
            <span className="ml-auto text-xs text-muted-foreground">{leads ? `${leads.length} leads` : "..."}</span>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search leads..." className="pl-8 h-8 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {!leads ? (
            <div className="p-4 space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
          ) : filteredLeads.length === 0 ? (
            <Empty><EmptyHeader><EmptyMedia variant="icon"><Users /></EmptyMedia><EmptyTitle>No leads found</EmptyTitle><EmptyDescription>Try a different search</EmptyDescription></EmptyHeader></Empty>
          ) : (
            <AnimatePresence>
              {filteredLeads.map((lead, i) => (
                <motion.div key={lead._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03, duration: 0.2 }}>
                  <LeadListItem lead={lead} isSelected={selectedLead?._id === lead._id} onSelect={(l) => setSelectedLead(l)} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {selectedLead ? (
        <div className="flex flex-col flex-1 min-w-0">
          <LeadHeader lead={selectedLead} autopilot={autopilotLeads.has(selectedLead._id)} onToggleAutopilot={toggleAutopilot} onClassify={handleClassify} onStatusChange={async (status) => { await updateStatus({ id: selectedLead._id, status }); toast.success(`Status → ${status}`); }} isClassifying={isClassifying} />
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {!messages ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className={cn("h-12 rounded-2xl", i % 2 === 0 ? "w-2/3 ml-auto" : "w-2/3")} />)}</div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground"><Bot size={36} className="opacity-30" /><p className="text-sm">No messages yet.</p></div>
            ) : (
              <>
                {messages.map((msg) => <ChatBubble key={msg._id} message={msg} />)}
                {isGenerating && <div className="flex justify-end"><div className="bg-primary/10 rounded-2xl rounded-br-sm px-4 py-3 flex items-center gap-2"><Loader2 size={12} className="animate-spin text-primary" /><span className="text-xs text-primary font-medium">AI is typing…</span></div></div>}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          <div className="border-t border-border px-4 py-3 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleGenerateReply} disabled={isGenerating} className="shrink-0 gap-1.5 cursor-pointer text-xs">
                <Bot size={13} className={isGenerating ? "animate-pulse" : ""} /> AI Reply
              </Button>
              <Input ref={inputRef} placeholder="Type a message..." className="flex-1 text-sm h-9" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSendUserMessage(); } }} />
              <Button size="sm" onClick={handleSendUserMessage} disabled={isSending || !messageInput.trim()} className="shrink-0 cursor-pointer"><Send size={14} /></Button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-1.5 px-1">{autopilotLeads.has(selectedLead._id) ? "Autopilot active — AI replies automatically" : "Press Enter to send · Click AI Reply for agent response"}</p>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-center flex-col gap-4 text-muted-foreground">
          <MessageSquareCode size={48} className="opacity-20" />
          <div><p className="text-sm font-semibold">Select a lead to start chatting</p><p className="text-xs opacity-60 mt-1">Use AI Reply or turn on Autopilot for automated responses</p></div>
        </div>
      )}
    </div>
  );
}
