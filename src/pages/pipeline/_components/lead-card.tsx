import { useMutation } from "@/lib/convex-supabase-adapter.ts";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { cn } from "@/lib/utils.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { ShieldAlert, Zap, Star, Shield, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";
import { Button } from "@/components/ui/button.tsx";

type Lead = Doc<"leads">;

const STATUS_OPTIONS = [
  { value: "new", label: "New", className: "text-primary" },
  { value: "contacted", label: "Contacted", className: "text-accent" },
  { value: "negotiating", label: "Negotiating", className: "text-chart-4" },
  { value: "converted", label: "Converted", className: "text-chart-3" },
  { value: "lost", label: "Lost", className: "text-muted-foreground" },
  { value: "spam", label: "Spam", className: "text-destructive" },
] as const;

const STATUS_BADGE: Record<string, string> = {
  new: "bg-primary/10 text-primary border-primary/20", contacted: "bg-accent/10 text-accent border-accent/20",
  negotiating: "bg-chart-4/10 text-chart-4 border-chart-4/20", converted: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  lost: "bg-muted text-muted-foreground border-border", spam: "bg-destructive/10 text-destructive border-destructive/20",
};

const INTENT_BADGE: Record<string, string> = {
  BUY: "bg-chart-3/10 text-chart-3 border-chart-3/20", SELL: "bg-primary/10 text-primary border-primary/20",
  NONE: "bg-muted text-muted-foreground border-border", SPAM: "bg-destructive/10 text-destructive border-destructive/20",
};

const PLATFORM_ICON: Record<string, string> = { whatsapp: "💬", telegram: "✈️", instagram: "📸", reddit: "🤖", x: "✕", email: "📧" };

export default function LeadCard({ lead, onSelect }: { lead: Lead; onSelect: (lead: Lead) => void }) {
  const updateStatus = useMutation(api.leads.updateStatus);

  const handleStatusChange = async (newStatus: string) => {
    await updateStatus({ id: lead._id, status: newStatus });
    toast.success(`Lead moved to ${newStatus}`);
  };

  return (
    <div onClick={() => onSelect(lead)} className="group relative bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-sm">{PLATFORM_ICON[lead.platform] ?? "🔗"}</div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate leading-tight">{lead.name}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{lead.contact}</p>
          </div>
        </div>
        {lead.isScam ? <ShieldAlert size={15} className="text-destructive shrink-0 mt-0.5" /> : <Shield size={15} className="text-chart-3/50 shrink-0 mt-0.5" />}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border", INTENT_BADGE[lead.intent] ?? INTENT_BADGE.NONE)}>{lead.intent}</span>
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border", STATUS_BADGE[lead.status] ?? STATUS_BADGE.new)}>{lead.status}</span>
        {lead.isUrgent && <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border bg-chart-4/10 text-chart-4 border-chart-4/20"><Zap size={9} />Urgent</span>}
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Star size={11} className="text-chart-4 fill-chart-4 shrink-0" />
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${lead.score}%` }} /></div>
        <span className="text-xs font-semibold text-muted-foreground w-6 text-right">{lead.score}</span>
      </div>
      {lead.lastMessage && <p className="text-xs text-muted-foreground truncate italic border-t border-border pt-2.5 mt-2.5">&ldquo;{lead.lastMessage}&rdquo;</p>}
      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground cursor-pointer">Move to<ChevronRight size={11} /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Change Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.filter((s) => s.value !== lead.status).map((s) => (
              <DropdownMenuItem key={s.value} onClick={() => handleStatusChange(s.value)} className={cn("text-xs cursor-pointer", s.className)}>{s.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-[10px] text-muted-foreground capitalize">{lead.platform}</span>
      </div>
    </div>
  );
}
