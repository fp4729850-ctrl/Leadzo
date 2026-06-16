import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { cn } from "@/lib/utils.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Brain,
  Zap,
  ChevronDown,
  ShieldAlert,
  Star,
} from "lucide-react";

type Lead = Doc<"leads">;

const STATUS_OPTIONS = [
  "new",
  "contacted",
  "negotiating",
  "converted",
  "lost",
  "spam",
] as const;

const STATUS_COLOR: Record<string, string> = {
  new: "bg-primary/10 text-primary border-primary/20",
  contacted: "bg-accent/10 text-accent-foreground border-accent/20",
  negotiating: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  converted: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  lost: "bg-muted text-muted-foreground border-border",
  spam: "bg-destructive/10 text-destructive border-destructive/20",
};

interface LeadHeaderProps {
  lead: Lead;
  autopilot: boolean;
  onToggleAutopilot: () => void;
  onClassify: () => void;
  onStatusChange: (status: string) => void;
  isClassifying: boolean;
}

export default function LeadHeader({
  lead,
  autopilot,
  onToggleAutopilot,
  onClassify,
  onStatusChange,
  isClassifying,
}: LeadHeaderProps) {
  const scoreColor =
    lead.score >= 75
      ? "text-chart-3"
      : lead.score >= 50
      ? "text-chart-4"
      : "text-destructive";

  return (
    <div className="border-b border-border px-4 py-3 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-lg font-bold text-primary border border-primary/20 shrink-0">
          {lead.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-sm text-foreground truncate">
              {lead.name}
            </h2>
            <span className="text-xs text-muted-foreground">{lead.contact}</span>
            {lead.isScam && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 gap-1">
                <ShieldAlert size={9} />
                SCAM
              </Badge>
            )}
            {lead.isUrgent && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                URGENT
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className={cn("text-xs font-semibold", scoreColor)}>
              <Star size={10} className="inline mr-0.5" />
              {lead.score}/100
            </span>
            <Separator orientation="vertical" className="h-3" />
            <div className="relative group">
              <button
                className={cn(
                  "flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer capitalize",
                  STATUS_COLOR[lead.status] ?? STATUS_COLOR["new"]
                )}
              >
                {lead.status}
                <ChevronDown size={9} />
              </button>
              <div className="absolute top-full left-0 mt-1 z-10 hidden group-hover:flex flex-col bg-popover border border-border rounded-lg shadow-xl py-1 min-w-32">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    className={cn(
                      "px-3 py-1.5 text-xs capitalize text-left hover:bg-muted cursor-pointer transition-colors",
                      lead.status === s && "font-bold text-primary"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClassify}
            disabled={isClassifying}
            className="text-xs h-8 cursor-pointer gap-1.5"
          >
            <Brain size={13} className={cn(isClassifying && "animate-pulse text-primary")} />
            {isClassifying ? "Analysing..." : "Re-Analyse"}
          </Button>

          <button
            onClick={onToggleAutopilot}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer",
              autopilot
                ? "bg-chart-3/10 text-chart-3 border-chart-3/30 shadow-[0_0_12px_rgba(0,255,120,0.15)]"
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            <Zap size={11} />
            {autopilot ? "Autopilot ON" : "Autopilot OFF"}
          </button>
        </div>
      </div>
    </div>
  );
}
