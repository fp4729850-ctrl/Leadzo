import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { cn } from "@/lib/utils.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { formatDistanceToNow } from "date-fns";

type Lead = Doc<"leads">;

const PLATFORM_EMOJI: Record<string, string> = { whatsapp: "💬", telegram: "✈️", instagram: "📸", reddit: "🔴", x: "𝕏", email: "📧" };
const INTENT_COLOR: Record<string, string> = { BUY: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", SELL: "bg-blue-500/15 text-blue-400 border-blue-500/20", NONE: "bg-muted text-muted-foreground border-border", SPAM: "bg-destructive/15 text-destructive border-destructive/20" };

export default function LeadListItem({ lead, isSelected, onSelect, unreadCount = 0 }: { lead: Lead; isSelected: boolean; onSelect: (lead: Lead) => void; unreadCount?: number }) {
  const timeAgo = formatDistanceToNow(new Date(lead._creationTime), { addSuffix: false });

  return (
    <button onClick={() => onSelect(lead)} className={cn("w-full text-left px-4 py-3 flex items-start gap-3 transition-all border-b border-border cursor-pointer", isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/50")}>
      <div className="size-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-lg shrink-0 font-bold text-primary border border-primary/20">
        {lead.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-semibold text-sm text-foreground truncate">{lead.name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo}</span>
        </div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs">{PLATFORM_EMOJI[lead.platform] ?? "📱"}</span>
          <span className="text-[10px] text-muted-foreground capitalize">{lead.platform}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", INTENT_COLOR[lead.intent] ?? INTENT_COLOR["NONE"])}>{lead.intent}</span>
          {lead.isUrgent && <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">URGENT</Badge>}
        </div>
        <p className="text-xs text-muted-foreground truncate">{lead.lastMessage ?? "No message yet"}</p>
      </div>
      {unreadCount > 0 && <div className="size-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0 mt-1">{unreadCount}</div>}
    </button>
  );
}
