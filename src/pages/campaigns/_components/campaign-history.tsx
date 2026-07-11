import { useMutation } from "@/lib/convex-supabase-adapter";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { Trash2, Users, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type Campaign = Doc<"campaigns">;

const STATUS_STYLE: Record<string, string> = {
  running: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  completed: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

function CampaignItem({ c }: { c: Campaign }) {
  const remove = useMutation(api.campaigns.remove);
  const progress = c.totalRecipients > 0 ? Math.round((c.sentCount / c.totalRecipients) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize", STATUS_STYLE[c.status] ?? STATUS_STYLE["running"])}>
              {c.status === "running" ? <Loader2 size={10} className="animate-spin" /> : c.status === "completed" ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
              {c.status}
            </span>
            <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c._creationTime), { addSuffix: true })}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">&ldquo;{c.prompt}&rdquo;</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { void remove({ id: c._id }); toast.success("Deleted"); }} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer shrink-0">
          <Trash2 size={12} />
        </Button>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Users size={10} />{c.sentCount} / {c.totalRecipients} sent</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      {c.logs.length > 0 && <p className="text-[10px] text-muted-foreground/60 border-t border-border pt-2">{c.logs[c.logs.length - 1]}</p>}
    </div>
  );
}

export default function CampaignHistoryList({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <div className="space-y-3">
      {campaigns.map((c) => (
        <motion.div key={c._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <CampaignItem c={c} />
        </motion.div>
      ))}
    </div>
  );
}
